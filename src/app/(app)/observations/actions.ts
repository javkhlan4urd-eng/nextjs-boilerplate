"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateOutcomeConclusion, CONCLUSION_THRESHOLD } from "@/lib/outcomeConclusion";

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
  const level = Number(formData.get("level"));
  const observed_on = String(formData.get("observed_on") || new Date().toISOString().slice(0, 10));
  const note = String(formData.get("note") || "").trim();
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
  if (!level || level < 1 || level > 4) throw new Error("Түвшинг сонгоно уу");

  const { error } = await supabase.from("observations").insert({
    id,
    child_id,
    domain_id,
    outcome_id,
    teacher_id: user.id,
    observed_on,
    level,
    note: note || null,
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

  revalidatePath("/observations");
  revalidatePath(`/children/${child_id}`);

  if (outcome_id) {
    try {
      const { data: outcomeRows } = await supabase
        .from("observations")
        .select("note, observed_on")
        .eq("child_id", child_id)
        .eq("outcome_id", outcome_id)
        .not("note", "is", null)
        .order("observed_on", { ascending: true });

      const notes = (outcomeRows ?? []).filter((r) => r.note && r.note.trim());

      if (notes.length >= CONCLUSION_THRESHOLD) {
        const [{ data: child }, { data: outcome }] = await Promise.all([
          supabase.from("children").select("first_name, last_name").eq("id", child_id).single(),
          supabase.from("learning_outcomes").select("code, description").eq("id", outcome_id).single(),
        ]);

        if (child && outcome) {
          const childName = `${child.last_name ? child.last_name + " " : ""}${child.first_name}`;
          const conclusion = await generateOutcomeConclusion({
            childName,
            outcomeCode: outcome.code,
            outcomeDescription: outcome.description,
            notes: notes.map((n) => ({ observed_on: n.observed_on, note: n.note as string })),
          });

          if (conclusion) {
            await supabase.from("outcome_conclusions").upsert(
              {
                child_id,
                outcome_id,
                teacher_id: user.id,
                conclusion,
                observation_count: notes.length,
                generated_at: new Date().toISOString(),
              },
              { onConflict: "child_id,outcome_id" }
            );
          }
        }
      }
    } catch (e) {
      console.error("outcome conclusion generation failed:", e);
    }
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
  nextSteps: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

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
      observation_count: existing?.observation_count ?? 0,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,outcome_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/reports/outcomes");
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
