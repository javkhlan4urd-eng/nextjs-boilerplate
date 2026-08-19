import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase/PostgREST caps a single select response at 1000 rows by default.
// readiness_checks can easily exceed that once several groups/years are combined
// (e.g. ~1600+ achieved rows across all groups), so paginate instead of a plain select.
export async function fetchAllAchievedChecks(
  supabase: SupabaseClient,
  childIds: string[]
): Promise<{ child_id: string; criterion_id: string; achieved: boolean; checked_on: string }[]> {
  if (childIds.length === 0) return [];
  const pageSize = 1000;
  const all: { child_id: string; criterion_id: string; achieved: boolean; checked_on: string }[] = [];
  let from = 0;
  for (;;) {
    const { data } = await supabase
      .from("readiness_checks")
      .select("child_id, criterion_id, achieved, checked_on")
      .in("child_id", childIds)
      .eq("achieved", true)
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export const GROUP_LEVEL_LABELS: Record<number, string> = {
  1: "1 — Бага бүлэг (2 нас)",
  2: "2 — Дунд бүлэг (3 нас)",
  3: "3 — Ахлах бүлэг (4 нас)",
  4: "4 — Бэлтгэл бүлэг (5 нас)",
};

export const CATEGORY_ORDER = ["Мэдлэг", "Чадвар", "Төлөвшил"] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

export function readinessVerdict(pct: number): string {
  if (pct >= 90) return "Бүрэн эзэмшсэн";
  if (pct >= 70) return "Хангасан";
  if (pct >= 50) return "Хөгжиж байгаа";
  return "Эхэлж байгаа";
}

export function verdictStyle(verdict: string): { bg: string; text: string } {
  switch (verdict) {
    case "Бүрэн эзэмшсэн":
      return { bg: "bg-emerald-100", text: "text-emerald-700" };
    case "Хангасан":
      return { bg: "bg-cyan-100", text: "text-cyan-700" };
    case "Хөгжиж байгаа":
      return { bg: "bg-amber-100", text: "text-amber-700" };
    default:
      return { bg: "bg-red-100", text: "text-red-700" };
  }
}
