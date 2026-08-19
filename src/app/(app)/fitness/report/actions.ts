"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { avgByTest, levelDistribution, compareSeasons, type FitnessRow } from "@/lib/fitnessAnalysis";
import { buildFitnessSummaryPrompt, buildFitnessOverallSummaryPrompt } from "@/lib/fitnessSummaryAI";
import { callGemini } from "@/lib/observationAI";
import type { SummaryDraftResult, SaveResult } from "@/lib/summaryDraft";

export async function saveFitnessSummary(groupId: string, content: string): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

    const { error } = await supabase.from("fitness_summaries").upsert(
      {
        group_id: groupId,
        teacher_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath("/fitness/report");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа" };
  }
}

export async function generateFitnessSummaryDraft(groupId: string): Promise<SummaryDraftResult> {
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

    const { data: rawRows } = await supabase
      .from("fitness_tests")
      .select(
        "child_id, tested_on, age_group, gender, speed_score, strength_score, agility_score, balance_score, total_score, level, children!inner(group_id, groups!inner(teacher_id))"
      )
      .eq("children.group_id", groupId)
      .eq("children.groups.teacher_id", user.id);

    const rows = (rawRows ?? []) as unknown as FitnessRow[];
    const childCount = new Set(rows.map((r) => r.child_id)).size;
    if (childCount === 0) return { ok: false, error: "Энэ бүлэгт биеийн тамирын сорил бүртгэгдээгүй байна" };

    const seasons = compareSeasons(rows);
    const latestYear = seasons.length > 0 ? seasons[seasons.length - 1].schoolYear : null;
    const namar = seasons.find((s) => s.schoolYear === latestYear && s.season === "намар") ?? null;
    const hawar = seasons.find((s) => s.schoolYear === latestYear && s.season === "хавар") ?? null;

    const testAvgAll = avgByTest(rows);
    const distribution = levelDistribution(rows);

    const prompt = buildFitnessSummaryPrompt({
      groupName: group.name,
      schoolYear: latestYear ?? group.school_year,
      childCount,
      namar,
      hawar,
      testAvgAll,
      distribution,
    });

    const content = await callGemini(apiKey, prompt);
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI дүгнэлт бэлтгэхэд алдаа гарлаа" };
  }
}

// Бүх бүлгийг хамарсан нэгдсэн дүгнэлт — teacher_id-р хадгалагдана (group_id шаардахгүй),
// GroupSummaryEditor-той нийцүүлэхийн тулд ашиглагдаггүй эхний groupId параметрийг зөвшөөрнө.
export async function saveFitnessOverallSummary(_groupId: string, content: string): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

    const { error } = await supabase.from("fitness_overall_summaries").upsert(
      {
        teacher_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "teacher_id" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath("/fitness/report");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа" };
  }
}

export async function generateFitnessOverallSummaryDraft(_groupId: string): Promise<SummaryDraftResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false, error: "AI тохиргоо дутуу байна" };

    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, school_year")
      .eq("teacher_id", user.id)
      .order("name");
    if (!groups || groups.length === 0) return { ok: false, error: "Бүлэг олдсонгүй" };

    const { data: savedSummaries } = await supabase
      .from("fitness_summaries")
      .select("group_id, content")
      .eq("teacher_id", user.id);
    const savedMap = new Map((savedSummaries ?? []).map((s) => [s.group_id, s.content]));

    const groupBlocks: string[] = [];
    for (const g of groups) {
      const label = `### ${g.name}${g.school_year ? ` (${g.school_year})` : ""}`;
      const saved = savedMap.get(g.id);
      if (saved && saved.trim()) {
        groupBlocks.push(`${label}\n${saved.trim()}`);
        continue;
      }

      const { data: rawRows } = await supabase
        .from("fitness_tests")
        .select(
          "child_id, tested_on, age_group, gender, speed_score, strength_score, agility_score, balance_score, total_score, level, children!inner(group_id, groups!inner(teacher_id))"
        )
        .eq("children.group_id", g.id)
        .eq("children.groups.teacher_id", user.id);
      const rows = (rawRows ?? []) as unknown as FitnessRow[];
      if (rows.length === 0) continue;

      const seasons = compareSeasons(rows);
      const latestYear = seasons.length > 0 ? seasons[seasons.length - 1].schoolYear : null;
      const namar = seasons.find((s) => s.schoolYear === latestYear && s.season === "намар") ?? null;
      const hawar = seasons.find((s) => s.schoolYear === latestYear && s.season === "хавар") ?? null;
      const dist = levelDistribution(rows);
      const distText = dist.map((d) => `${d.level} ${d.count} (${d.pct}%)`).join(", ");
      const progressText =
        namar && hawar
          ? `намарын дундаж ${namar.avgTotal} → хаврын дундаж ${hawar.avgTotal}`
          : namar
            ? `зөвхөн намрын сорил бүртгэгдсэн, дундаж ${namar.avgTotal}`
            : hawar
              ? `зөвхөн хаврын сорил бүртгэгдсэн, дундаж ${hawar.avgTotal}`
              : "намар/хавар мэдээлэл дутуу";

      groupBlocks.push(
        `${label}\nАхиц (12-оос): ${progressText}. Үнэлгээний хуваарилалт: ${distText}.`
      );
    }

    if (groupBlocks.length === 0) {
      return { ok: false, error: "Ямар ч бүлэгт биеийн тамирын сорил бүртгэгдээгүй байна" };
    }

    const prompt = buildFitnessOverallSummaryPrompt({ groupBlocks });
    const content = await callGemini(apiKey, prompt);
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI дүгнэлт бэлтгэхэд алдаа гарлаа" };
  }
}
