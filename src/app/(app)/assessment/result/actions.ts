"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchAllAchievedChecks, computeReadinessGroupStats } from "@/lib/readiness";
import { buildReadinessSummaryPrompt } from "@/lib/readinessSummaryAI";
import { callGemini } from "@/lib/observationAI";
import type { SummaryDraftResult, SaveResult } from "@/lib/summaryDraft";

export async function toggleReadinessCheck(childId: string, criterionId: string, achieved: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Нэвтрээгүй байна");

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("readiness_checks").upsert(
    {
      child_id: childId,
      criterion_id: criterionId,
      teacher_id: user.id,
      achieved,
      checked_on: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,criterion_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/assessment/result");
  revalidatePath(`/assessment/result/${childId}`);
}

export async function saveReadinessSummary(groupId: string, content: string): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

    const { error } = await supabase.from("readiness_summaries").upsert(
      {
        group_id: groupId,
        teacher_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath("/assessment/result");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа" };
  }
}

export async function generateReadinessSummaryDraft(groupId: string): Promise<SummaryDraftResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false, error: "AI тохиргоо дутуу байна" };

    const { data: group } = await supabase
      .from("groups")
      .select("id, name, school_year")
      .eq("id", groupId)
      .eq("teacher_id", user.id)
      .single();
    if (!group) return { ok: false, error: "Бүлэг олдсонгүй" };

    const { data: childrenRaw } = await supabase
      .from("children")
      .select("id, groups!inner(teacher_id, level)")
      .eq("group_id", groupId)
      .eq("groups.teacher_id", user.id);
    const children = (childrenRaw ?? []) as unknown as { id: string; groups: { level: number | null } }[];
    const childLevels = children.map((c) => ({ id: c.id, level: c.groups?.level ?? null }));

    const { data: criteriaRaw } = await supabase
      .from("readiness_criteria")
      .select("id, level, category, description")
      .eq("teacher_id", user.id);
    const criteria = criteriaRaw ?? [];

    const childIds = childLevels.map((c) => c.id);
    const checks = await fetchAllAchievedChecks(supabase, childIds);

    const latestByKey = new Map<string, (typeof checks)[number]>();
    for (const c of checks) {
      const key = `${c.child_id}|${c.criterion_id}`;
      const existing = latestByKey.get(key);
      if (!existing || c.checked_on > existing.checked_on) latestByKey.set(key, c);
    }
    const achievedSet = new Set(latestByKey.keys());

    const stats = computeReadinessGroupStats(childLevels, criteria, achievedSet);
    if (stats.childCount === 0) return { ok: false, error: "Энэ бүлэгт хүүхэд алга байна" };

    const prompt = buildReadinessSummaryPrompt({
      groupName: group.name,
      schoolYear: group.school_year,
      stats,
    });

    const content = await callGemini(apiKey, prompt);
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI дүгнэлт бэлтгэхэд алдаа гарлаа" };
  }
}
