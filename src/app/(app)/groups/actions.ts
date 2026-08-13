"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const name = String(formData.get("name") || "").trim();
  const schoolYear = String(formData.get("school_year") || "").trim();
  if (!name) throw new Error("Бүлгийн нэрийг оруулна уу");

  const { error } = await supabase.from("groups").insert({
    teacher_id: user.id,
    name,
    school_year: schoolYear || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/groups");
}

export async function updateGroup(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const schoolYear = String(formData.get("school_year") || "").trim();
  if (!name) throw new Error("Бүлгийн нэрийг оруулна уу");

  const { error } = await supabase
    .from("groups")
    .update({ name, school_year: schoolYear || null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/groups");
}

export async function deleteGroup(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/groups");
}
