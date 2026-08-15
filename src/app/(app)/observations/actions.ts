"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateOutcomeAssessment, CONCLUSION_THRESHOLD } from "@/lib/outcomeConclusion";
import { formatChildName } from "@/lib/childName";
import { buildObservationPrompt, extractObservationFields, callGemini } from "@/lib/observationAI";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function maybeAutoGenerateConclusion(
  supabase: SupabaseServerClient,
  teacherId: string,
  childId: string,
  outcomeId: string
) {
  try {
    const { data: outcomeRows } = await supabase
      .from("observations")
      .select(
        "id, note, observed_on, observed_fact, development_direction, child_performance, teacher_conclusion, next_action, methodology_note"
      )
      .eq("child_id", childId)
      .eq("outcome_id", outcomeId)
      .not("note", "is", null)
      .order("observed_on", { ascending: true });

    const notes = (outcomeRows ?? []).filter((r) => r.note && r.note.trim());
    if (notes.length < CONCLUSION_THRESHOLD) return;

    const [{ data: child }, { data: outcome }, { data: mediaRows }] = await Promise.all([
      supabase.from("children").select("first_name, last_name").eq("id", childId).single(),
      supabase.from("learning_outcomes").select("code, description").eq("id", outcomeId).single(),
      supabase
        .from("observation_media")
        .select("observation_id, file_url, media_type")
        .in("observation_id", notes.map((n) => n.id)),
    ]);
    if (!child || !outcome) return;

    const mediaByObs = new Map<string, { url: string; type: string }[]>();
    for (const m of mediaRows ?? []) {
      const arr = mediaByObs.get(m.observation_id) ?? [];
      arr.push({ url: m.file_url, type: m.media_type });
      mediaByObs.set(m.observation_id, arr);
    }

    const childName = formatChildName(child.first_name, child.last_name);
    const assessment = await generateOutcomeAssessment({
      childName,
      outcomeCode: outcome.code,
      outcomeDescription: outcome.description,
      notes: notes.map((n) => ({
        observed_on: n.observed_on,
        observed_fact: n.observed_fact,
        development_direction: n.development_direction,
        child_performance: n.child_performance,
        note: n.note,
        teacher_conclusion: n.teacher_conclusion,
        next_action: n.next_action,
        methodology_note: n.methodology_note,
        media: mediaByObs.get(n.id) ?? [],
      })),
    });

    if (assessment) {
      await supabase.from("outcome_conclusions").upsert(
        {
          child_id: childId,
          outcome_id: outcomeId,
          teacher_id: teacherId,
          conclusion: assessment.conclusion,
          next_steps: assessment.nextSteps || null,
          observation_count: notes.length,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "child_id,outcome_id" }
      );
    }
  } catch (e) {
    console.error("outcome conclusion generation failed:", e);
  }
}

export async function createObservation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const id = String(formData.get("id"));
  const child_id = String(formData.get("child_id"));
  const domain_id = String(formData.get("domain_id"));
  const outcomeRaw = String(formData.get("outcome_id") || "");
  const outcome_id = outcomeRaw || null;
  const levelRaw = String(formData.get("level") || "");
  const level = levelRaw ? Number(levelRaw) : null;
  const observed_on = String(formData.get("observed_on") || new Date().toISOString().slice(0, 10));
  const note = String(formData.get("note") || "").trim();
  const observed_fact = String(formData.get("observed_fact") || "").trim();
  const development_direction = String(formData.get("development_direction") || "").trim();
  const child_performance = String(formData.get("child_performance") || "").trim();
  const teacher_conclusion = String(formData.get("teacher_conclusion") || "").trim();
  const next_action = String(formData.get("next_action") || "").trim();
  const methodology_note = String(formData.get("methodology_note") || "").trim();
  const stageRaw = String(formData.get("stage") || "");
  const stage = stageRaw === "garaa" || stageRaw === "yavts" ? stageRaw : null;
  const mediaJson = String(formData.get("media") || "[]");

  let media: { url: string; type: "image" | "video" }[] = [];
  try {
    media = JSON.parse(mediaJson);
  } catch {
    media = [];
  }

  if (!child_id) throw new Error("Хүүхдийг сонгоно уу");
  if (!domain_id) throw new Error("Чиглэлийг сонгоно уу");
  if (!outcome_id && (!level || level < 1 || level > 4)) throw new Error("Түвшинг сонгоно уу");
  if (level !== null && (level < 1 || level > 4)) throw new Error("Түвшин буруу байна");

  const { error } = await supabase.from("observations").insert({
    id,
    child_id,
    domain_id,
    outcome_id,
    teacher_id: user.id,
    observed_on,
    level,
    note: note || null,
    observed_fact: observed_fact || null,
    development_direction: development_direction || null,
    child_performance: child_performance || null,
    teacher_conclusion: teacher_conclusion || null,
    next_action: next_action || null,
    methodology_note: methodology_note || null,
    stage,
  });
  if (error) throw new Error(error.message);

  if (media.length > 0) {
    const rows = media.map((m) => ({
      observation_id: id,
      file_url: m.url,
      media_type: m.type,
    }));
    const { error: mediaErr } = await supabase.from("observation_media").insert(rows);
    if (mediaErr) throw new Error(mediaErr.message);
  }

  revalidatePath("/assessment/yavts");
  revalidatePath(`/children/${child_id}`);

  if (outcome_id) {
    await maybeAutoGenerateConclusion(supabase, user.id, child_id, outcome_id);
  }

  if (String(formData.get("no_redirect") || "") === "1") {
    return;
  }

  if (stage === "garaa") {
    revalidatePath("/assessment/garaa");
    redirect("/assessment/garaa");
  }
  if (stage === "yavts") {
    revalidatePath("/assessment/yavts");
    redirect("/assessment/yavts");
  }
  redirect(`/children/${child_id}`);
}

export async function updateOutcomeConclusion(
  childId: string,
  outcomeId: string,
  conclusion: string,
  nextSteps: string,
  level: number | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  if (level !== null && (level < 1 || level > 4)) throw new Error("Түвшин буруу байна");

  const { data: existing } = await supabase
    .from("outcome_conclusions")
    .select("observation_count")
    .eq("child_id", childId)
    .eq("outcome_id", outcomeId)
    .maybeSingle();

  const { error } = await supabase.from("outcome_conclusions").upsert(
    {
      child_id: childId,
      outcome_id: outcomeId,
      teacher_id: user.id,
      conclusion: conclusion.trim(),
      next_steps: nextSteps.trim() || null,
      level,
      observation_count: existing?.observation_count ?? 0,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,outcome_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/reports/outcomes");
}

export interface ObservationFields {
  note: string;
  observed_fact: string;
  development_direction: string;
  child_performance: string;
  teacher_conclusion: string;
  next_action: string;
  methodology_note: string;
}

export async function updateObservation(
  id: string,
  fields: ObservationFields,
  media: { url: string; type: "image" | "video" }[],
  observedOn: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  if (!observedOn) throw new Error("Огноог сонгоно уу");

  const { data: obs, error } = await supabase
    .from("observations")
    .update({
      note: fields.note.trim() || null,
      observed_fact: fields.observed_fact.trim() || null,
      development_direction: fields.development_direction.trim() || null,
      child_performance: fields.child_performance.trim() || null,
      teacher_conclusion: fields.teacher_conclusion.trim() || null,
      next_action: fields.next_action.trim() || null,
      methodology_note: fields.methodology_note.trim() || null,
      observed_on: observedOn,
    })
    .eq("id", id)
    .select("child_id, outcome_id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("observation_media").delete().eq("observation_id", id);
  if (media.length > 0) {
    await supabase.from("observation_media").insert(
      media.map((m) => ({ observation_id: id, file_url: m.url, media_type: m.type }))
    );
  }

  revalidatePath("/assessment/yavts");
  if (obs?.child_id) revalidatePath(`/children/${obs.child_id}`);
}

export async function generateOutcomeAssessmentNow(childId: string, outcomeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const { data: rows } = await supabase
    .from("observations")
    .select(
      "id, note, observed_on, observed_fact, development_direction, child_performance, teacher_conclusion, next_action, methodology_note"
    )
    .eq("child_id", childId)
    .eq("outcome_id", outcomeId)
    .order("observed_on", { ascending: true });

  const notes = rows ?? [];
  if (notes.length === 0) throw new Error("Энэ СҮД-д ажиглалт бүртгэгдээгүй байна");

  const [{ data: child }, { data: outcome }, { data: mediaRows }] = await Promise.all([
    supabase.from("children").select("first_name, last_name").eq("id", childId).single(),
    supabase.from("learning_outcomes").select("code, description").eq("id", outcomeId).single(),
    supabase
      .from("observation_media")
      .select("observation_id, file_url, media_type")
      .in("observation_id", notes.map((n) => n.id)),
  ]);
  if (!child || !outcome) throw new Error("Мэдээлэл олдсонгүй");

  const mediaByObs = new Map<string, { url: string; type: string }[]>();
  for (const m of mediaRows ?? []) {
    const arr = mediaByObs.get(m.observation_id) ?? [];
    arr.push({ url: m.file_url, type: m.media_type });
    mediaByObs.set(m.observation_id, arr);
  }

  const childName = formatChildName(child.first_name, child.last_name);
  const assessment = await generateOutcomeAssessment({
    childName,
    outcomeCode: outcome.code,
    outcomeDescription: outcome.description,
    notes: notes.map((n) => ({
      observed_on: n.observed_on,
      observed_fact: n.observed_fact,
      development_direction: n.development_direction,
      child_performance: n.child_performance,
      note: n.note,
      teacher_conclusion: n.teacher_conclusion,
      next_action: n.next_action,
      methodology_note: n.methodology_note,
      media: mediaByObs.get(n.id) ?? [],
    })),
  });
  if (!assessment) throw new Error("AI дүгнэлт үүсгэж чадсангүй");

  return assessment;
}

export interface PlanTarget {
  domainId: string;
  outcomeId: string;
  domainName: string;
  code: string;
  description: string;
}

export async function createObservationsFromRecordedActivity(
  childId: string,
  recordedActivity: string,
  observedOn: string,
  stage: "garaa" | "yavts" | undefined,
  targets: PlanTarget[]
): Promise<{ created: number; failed: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");
  if (!recordedActivity.trim()) throw new Error("Энэ СҮД-д дор хаяж нэг ажиглалт бичиж хадгална уу");
  if (targets.length === 0) throw new Error("Холбоотой СҮД алга");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI үйлчилгээ тохируулагдаагүй байна");

  let created = 0;
  let failed = 0;

  for (const t of targets) {
    try {
      const prompt = buildObservationPrompt({
        domainName: t.domainName,
        outcomeCode: t.code,
        outcomeDescription: t.description,
        recordedActivity,
        hasMedia: false,
        isVideo: false,
      });
      const text = await callGemini(apiKey, prompt);
      const fields = extractObservationFields(text);

      const { error } = await supabase.from("observations").insert({
        id: crypto.randomUUID(),
        child_id: childId,
        domain_id: t.domainId,
        outcome_id: t.outcomeId,
        teacher_id: user.id,
        observed_on: observedOn,
        level: null,
        note: fields.note || null,
        observed_fact: fields.observed_fact || null,
        development_direction: fields.development_direction || null,
        child_performance: fields.child_performance || null,
        teacher_conclusion: fields.teacher_conclusion || null,
        next_action: fields.next_action || null,
        methodology_note: fields.methodology_note || null,
        stage: stage ?? null,
      });
      if (error) throw new Error(error.message);
      created += 1;

      await maybeAutoGenerateConclusion(supabase, user.id, childId, t.outcomeId);
    } catch (e) {
      console.error("createObservationsFromRecordedActivity failed for outcome", t.outcomeId, e);
      failed += 1;
    }
  }

  revalidatePath("/assessment/yavts");
  revalidatePath(`/children/${childId}`);

  return { created, failed };
}

export async function deleteObservation(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const childId = String(formData.get("child_id") || "");

  const { error } = await supabase.from("observations").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/observations");
  if (childId) revalidatePath(`/children/${childId}`);
}
