"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildOutcomeSummaryPrompt, type OutcomeDomainStat } from "@/lib/outcomeSummaryAI";
import { callGemini } from "@/lib/observationAI";
import type { SummaryDraftResult, SaveResult } from "@/lib/summaryDraft";

export async function saveOutcomeSummary(groupId: string, content: string): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

    const { error } = await supabase.from("outcome_summaries").upsert(
      {
        group_id: groupId,
        teacher_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath("/reports/outcomes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа" };
  }
}

export async function generateOutcomeSummaryDraft(groupId: string): Promise<SummaryDraftResult> {
  try {
    return await generateOutcomeSummaryDraftInner(groupId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI дүгнэлт бэлтгэхэд алдаа гарлаа" };
  }
}

async function generateOutcomeSummaryDraftInner(groupId: string): Promise<SummaryDraftResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI тохиргоо дутуу байна" };

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, school_year, level")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .single();
  if (!group) return { ok: false, error: "Бүлэг олдсонгүй" };

  const { data: childrenRaw } = await supabase
    .from("children")
    .select("id")
    .eq("group_id", groupId);
  const childIds = (childrenRaw ?? []).map((c) => c.id);
  if (childIds.length === 0) return { ok: false, error: "Энэ бүлэгт хүүхэд алга байна" };

  const { data: domains } = await supabase
    .from("learning_domains")
    .select("id, name, sort_order")
    .eq("teacher_id", user.id)
    .order("sort_order");
  const domainList = domains ?? [];

  const { data: outcomesRaw } = await supabase
    .from("learning_outcomes")
    .select("id, domain_id, level, learning_domains!inner(teacher_id)")
    .eq("learning_domains.teacher_id", user.id);
  const outcomes = outcomesRaw ?? [];

  const { data: conclusionsRaw } = await supabase
    .from("outcome_conclusions")
    .select("child_id, outcome_id, level")
    .in("child_id", childIds);
  const conclusions = conclusionsRaw ?? [];
  const conclusionMap = new Map<string, (typeof conclusions)[number]>();
  for (const c of conclusions) conclusionMap.set(`${c.child_id}|${c.outcome_id}`, c);

  const domainStats: OutcomeDomainStat[] = domainList.map((d) => {
    let total = 0;
    let withConclusion = 0;
    let levelSum = 0;
    let levelCount = 0;
    for (const childId of childIds) {
      const applicable = outcomes.filter(
        (o) => o.domain_id === d.id && (!group.level || !o.level || o.level === group.level)
      );
      total += applicable.length;
      for (const o of applicable) {
        const conc = conclusionMap.get(`${childId}|${o.id}`);
        if (conc) {
          withConclusion += 1;
          if (conc.level != null) {
            levelSum += conc.level;
            levelCount += 1;
          }
        }
      }
    }
    return {
      domain: d.name,
      total,
      withConclusion,
      avgLevel: levelCount > 0 ? Number((levelSum / levelCount).toFixed(2)) : null,
    };
  });

  const totalPossible = domainStats.reduce((s, d) => s + d.total, 0);
  const totalWithConclusion = domainStats.reduce((s, d) => s + d.withConclusion, 0);
  const overallPct = totalPossible > 0 ? Math.round((totalWithConclusion / totalPossible) * 100) : 0;

  const prompt = buildOutcomeSummaryPrompt({
    groupName: group.name,
    schoolYear: group.school_year,
    childCount: childIds.length,
    domainStats,
    overallPct,
  });

  const content = await callGemini(apiKey, prompt);
  return { ok: true, content };
}
