"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fields(formData: FormData) {
  const str = (key: string) => {
    const v = String(formData.get(key) || "").trim();
    return v || null;
  };
  return {
    group_id: String(formData.get("group_id")),
    last_name: str("last_name"),
    first_name: String(formData.get("first_name") || "").trim(),
    gender: str("gender") as "эрэгтэй" | "эмэгтэй" | null,
    birth_date: str("birth_date"),
    photo_url: str("photo_url"),
    father_name: str("father_name"),
    father_phone: str("father_phone"),
    father_workplace: str("father_workplace"),
    mother_name: str("mother_name"),
    mother_phone: str("mother_phone"),
    mother_workplace: str("mother_workplace"),
    home_address: str("home_address"),
    notes: str("notes"),
  };
}

export async function createChild(formData: FormData) {
  const supabase = await createClient();
  const data = fields(formData);
  if (!data.first_name) throw new Error("Хүүхдийн нэрийг оруулна уу");
  if (!data.group_id) throw new Error("Бүлгийг сонгоно уу");

  const { error } = await supabase.from("children").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath("/children");
  redirect(`/children?group=${data.group_id}`);
}

export async function updateChild(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const data = fields(formData);
  if (!data.first_name) throw new Error("Хүүхдийн нэрийг оруулна уу");

  const { error } = await supabase.from("children").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/children");
  revalidatePath(`/children/${id}`);
}

export async function deleteChild(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const groupId = String(formData.get("group_id") || "");

  const { error } = await supabase.from("children").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/children");
  redirect(groupId ? `/children?group=${groupId}` : "/children");
}
