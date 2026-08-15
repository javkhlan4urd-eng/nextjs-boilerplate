import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONCLUSION_THRESHOLD } from "@/lib/outcomeConclusion";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("child_id");
  const outcomeId = searchParams.get("outcome_id");
  if (!childId || !outcomeId) {
    return NextResponse.json({ error: "child_id, outcome_id шаардлагатай" }, { status: 400 });
  }

  const { data: rows, error } = await supabase
    .from("observations")
    .select(
      "id, observed_on, note, level, observed_fact, development_direction, child_performance, teacher_conclusion, next_action, methodology_note"
    )
    .eq("child_id", childId)
    .eq("outcome_id", outcomeId)
    .order("observed_on", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const obsIds = (rows ?? []).map((r) => r.id);
  let mediaByObs: Record<string, { url: string; type: string }[]> = {};
  if (obsIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("observation_media")
      .select("observation_id, file_url, media_type")
      .in("observation_id", obsIds);
    mediaByObs = {};
    for (const m of mediaRows ?? []) {
      const arr = mediaByObs[m.observation_id] ?? [];
      arr.push({ url: m.file_url, type: m.media_type });
      mediaByObs[m.observation_id] = arr;
    }
  }

  const observations = (rows ?? []).map((r) => ({
    id: r.id,
    observed_on: r.observed_on,
    note: r.note,
    level: r.level,
    observed_fact: r.observed_fact,
    development_direction: r.development_direction,
    child_performance: r.child_performance,
    teacher_conclusion: r.teacher_conclusion,
    next_action: r.next_action,
    methodology_note: r.methodology_note,
    media: mediaByObs[r.id] ?? [],
  }));

  const notesCount = observations.filter((o) => o.note && o.note.trim()).length;

  const { data: conclusionRow } = await supabase
    .from("outcome_conclusions")
    .select("conclusion, observation_count, next_steps, level")
    .eq("child_id", childId)
    .eq("outcome_id", outcomeId)
    .maybeSingle();

  const { data: correlationRows } = await supabase
    .from("outcome_correlations")
    .select(
      "related_outcome_id, learning_outcomes!outcome_correlations_related_outcome_id_fkey(id, code, description, domain_id, learning_domains(name))"
    )
    .eq("outcome_id", outcomeId);

  const related = (correlationRows ?? [])
    .map((r) => {
      const o = (
        r as unknown as {
          learning_outcomes: {
            id: string;
            code: string;
            description: string;
            domain_id: string;
            learning_domains: { name: string } | null;
          };
        }
      ).learning_outcomes;
      if (!o) return null;
      return {
        outcomeId: o.id,
        domainId: o.domain_id,
        domainName: o.learning_domains?.name ?? "",
        code: o.code,
        description: o.description,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.domainName.localeCompare(b.domainName) || a.code.localeCompare(b.code));

  const relatedOutcomeIds = related.map((r) => r.outcomeId);
  type RelatedObsGroup = (typeof related)[number] & { observations: (typeof observations)[number][] };
  let relatedObservations: RelatedObsGroup[] = [];

  if (relatedOutcomeIds.length > 0) {
    const { data: relRows } = await supabase
      .from("observations")
      .select(
        "id, outcome_id, observed_on, note, level, observed_fact, development_direction, child_performance, teacher_conclusion, next_action, methodology_note"
      )
      .eq("child_id", childId)
      .in("outcome_id", relatedOutcomeIds)
      .order("observed_on", { ascending: true });

    const relObsIds = (relRows ?? []).map((r) => r.id);
    let relMediaByObs: Record<string, { url: string; type: string }[]> = {};
    if (relObsIds.length > 0) {
      const { data: relMediaRows } = await supabase
        .from("observation_media")
        .select("observation_id, file_url, media_type")
        .in("observation_id", relObsIds);
      relMediaByObs = {};
      for (const m of relMediaRows ?? []) {
        const arr = relMediaByObs[m.observation_id] ?? [];
        arr.push({ url: m.file_url, type: m.media_type });
        relMediaByObs[m.observation_id] = arr;
      }
    }

    const byOutcome = new Map<string, (typeof observations)[number][]>();
    for (const r of relRows ?? []) {
      const arr = byOutcome.get(r.outcome_id) ?? [];
      arr.push({
        id: r.id,
        observed_on: r.observed_on,
        note: r.note,
        level: r.level,
        observed_fact: r.observed_fact,
        development_direction: r.development_direction,
        child_performance: r.child_performance,
        teacher_conclusion: r.teacher_conclusion,
        next_action: r.next_action,
        methodology_note: r.methodology_note,
        media: relMediaByObs[r.id] ?? [],
      });
      byOutcome.set(r.outcome_id, arr);
    }

    relatedObservations = related
      .filter((r) => byOutcome.has(r.outcomeId))
      .map((r) => ({ ...r, observations: byOutcome.get(r.outcomeId)! }));
  }

  return NextResponse.json({
    observations,
    count: notesCount,
    threshold: CONCLUSION_THRESHOLD,
    conclusion: conclusionRow?.conclusion ?? null,
    nextSteps: conclusionRow?.next_steps ?? null,
    level: conclusionRow?.level ?? null,
    related,
    relatedObservations,
  });
}
