"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createObservation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const id = String(formData.get("id"));
  const child_id = String(formData.get("child_id"));
  const domain_id = String(formData.get("domain_id"));
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

export async function deleteObservation(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const childId = String(formData.get("child_id") || "");

  const { error } = await supabase.from("observations").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/observations");
  if (childId) revalidatePath(`/children/${childId}`);
}
