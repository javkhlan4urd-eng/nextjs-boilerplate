"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { avgByDomain, type ObsRow } from "@/lib/analysis";
import { buildGaraaSummaryPrompt } from "@/lib/garaaSummaryAI";
import { callGemini } from "@/lib/observationAI";
import type { SummaryDraftResult, SaveResult } from "@/lib/summaryDraft";

export async function saveGaraaSummary(groupId: string, content: string): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Нэвтрээгүй байна" };

    const { error } = await supabase.from("garaa_summaries").upsert(
      {
        group_id: groupId,
        teacher_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" }
    );
    if (error) return { ok: false, error: error.message };

    revalidatePath("/assessment/garaa");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа" };
  }
}

export async function generateGaraaSummaryDraft(groupId: string): Promise<SummaryDraftResult> {
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

    const { data: domains } = await supabase
      .from("learning_domains")
      .select("id, name, sort_order")
      .eq("teacher_id", user.id)
      .order("sort_order");
    const domainList = domains ?? [];

    const { data: obsRaw } = await supabase
      .from("observations")
      .select("child_id, domain_id, level, observed_on, children!inner(group_id, groups!inner(teacher_id))")
      .eq("children.group_id", groupId)
      .eq("children.groups.teacher_id", user.id)
      .eq("stage", "garaa")
      .not("level", "is", null);

    const rows: ObsRow[] = (obsRaw ?? [])
      .filter((r): r is typeof r & { level: number } => r.level !== null)
      .map((r) => ({ domain_id: r.domain_id, level: r.level, observed_on: r.observed_on }));

    const childCount = new Set((obsRaw ?? []).map((r) => r.child_id)).size;
    if (childCount === 0) return { ok: false, error: "Энэ бүлэгт гарааны үнэлгээ бүртгэгдээгүй байна" };

    const domainStats = avgByDomain(rows, domainList);

    const prompt = buildGaraaSummaryPrompt({
      groupName: group.name,
      schoolYear: group.school_year,
      childCount,
      domainStats,
    });

    const content = await callGemini(apiKey, prompt);
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI дүгнэлт бэлтгэхэд алдаа гарлаа" };
  }
}
