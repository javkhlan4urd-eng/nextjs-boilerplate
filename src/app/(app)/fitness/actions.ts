"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type AgeGroup, type Gender, getTestDefs, scoreValue, levelFromTotal } from "@/lib/fitnessCriteria";

export async function createFitnessTest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const child_id = String(formData.get("child_id"));
  const age_group = Number(formData.get("age_group")) as AgeGroup;
  const gender = String(formData.get("gender")) as Gender;
  const tested_on = String(formData.get("tested_on") || new Date().toISOString().slice(0, 10));
  const note = String(formData.get("note") || "").trim();

  if (!child_id) throw new Error("Хүүхдийг сонгоно уу");
  if (![3, 4, 5].includes(age_group)) throw new Error("Насны ангиллыг сонгоно уу");
  if (gender !== "эрэгтэй" && gender !== "эмэгтэй") throw new Error("Хүйсийг сонгоно уу");

  const speed_sec = parseFloat(String(formData.get("speed_value")));
  const strength_value = parseFloat(String(formData.get("strength_value")));
  const agility_value = parseFloat(String(formData.get("agility_value")));
  const balance_sec = parseFloat(String(formData.get("balance_value")));

  if ([speed_sec, strength_value, agility_value, balance_sec].some((v) => Number.isNaN(v))) {
    throw new Error("Сорил бүрийн үзүүлэлтийг оруулна уу");
  }

  const defs = getTestDefs(age_group, gender);
  const values = { speed: speed_sec, strength: strength_value, agility: agility_value, balance: balance_sec };
  const scores = Object.fromEntries(
    defs.map((d) => [d.key, scoreValue(d, values[d.key])])
  ) as Record<string, number>;
  const total_score = scores.speed + scores.strength + scores.agility + scores.balance;
  const level = levelFromTotal(total_score);

  const { error } = await supabase.from("fitness_tests").insert({
    child_id,
    teacher_id: user.id,
    tested_on,
    age_group,
    gender,
    speed_sec,
    speed_score: scores.speed,
    strength_value,
    strength_score: scores.strength,
    agility_value,
    agility_score: scores.agility,
    balance_sec,
    balance_score: scores.balance,
    total_score,
    level,
    note: note || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/fitness");
  redirect("/fitness");
}

export async function deleteFitnessTest(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("fitness_tests").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/fitness");
}
