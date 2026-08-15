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
    .select("id, observed_on, note, level")
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
    media: mediaByObs[r.id] ?? [],
  }));

  const notesCount = observations.filter((o) => o.note && o.note.trim()).length;

  const { data: conclusionRow } = await supabase
    .from("outcome_conclusions")
    .select("conclusion, observation_count, next_steps, level")
    .eq("child_id", childId)
    .eq("outcome_id", outcomeId)
    .maybeSingle();

  return NextResponse.json({
    observations,
    count: notesCount,
    threshold: CONCLUSION_THRESHOLD,
    conclusion: conclusionRow?.conclusion ?? null,
    nextSteps: conclusionRow?.next_steps ?? null,
    level: conclusionRow?.level ?? null,
  });
}
