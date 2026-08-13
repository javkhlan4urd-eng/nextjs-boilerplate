"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createDomain(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Чиглэлийн нэрийг оруулна уу");

  const { count } = await supabase
    .from("learning_domains")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", user.id);

  const { error } = await supabase
    .from("learning_domains")
    .insert({ teacher_id: user.id, name, sort_order: (count ?? 0) + 1 });
  if (error) throw new Error(error.message);

  revalidatePath("/reports");
}

export async function updateDomainName(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Чиглэлийн нэрийг оруулна уу");

  const { error } = await supabase.from("learning_domains").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reports");
}

export async function reorderDomain(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const sortOrder = Number(formData.get("sort_order"));

  const { error } = await supabase
    .from("learning_domains")
    .update({ sort_order: sortOrder })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reports");
}

export async function deleteDomain(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("learning_domains").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reports");
}
