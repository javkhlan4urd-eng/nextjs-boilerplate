"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleReadinessCheck(childId: string, criterionId: string, achieved: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const { error } = await supabase.from("readiness_checks").upsert(
    {
      child_id: childId,
      criterion_id: criterionId,
      teacher_id: user.id,
      achieved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,criterion_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/assessment/result");
  revalidatePath(`/assessment/result/${childId}`);
}
