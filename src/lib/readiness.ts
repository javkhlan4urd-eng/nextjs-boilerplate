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

export interface ReadinessGroupStats {
  childCount: number;
  categoryTotals: { category: string; achieved: number; total: number }[];
  overallAchieved: number;
  overallTotal: number;
  criterionStats: {
    id: string;
    description: string;
    category: string;
    achieved: number;
    total: number;
    pct: number;
  }[];
}

export function computeReadinessGroupStats(
  children: { id: string; level: number | null }[],
  criteria: { id: string; level: number; category: string; description: string }[],
  achievedSet: Set<string>
): ReadinessGroupStats {
  const categoryTotals = CATEGORY_ORDER.map((cat) => {
    let total = 0;
    let achieved = 0;
    for (const child of children) {
      if (!child.level) continue;
      const items = criteria.filter((c) => c.level === child.level && c.category === cat);
      total += items.length;
      achieved += items.filter((c) => achievedSet.has(`${child.id}|${c.id}`)).length;
    }
    return { category: cat, achieved, total };
  });

  const overallAchieved = categoryTotals.reduce((s, c) => s + c.achieved, 0);
  const overallTotal = categoryTotals.reduce((s, c) => s + c.total, 0);

  const criterionStatsMap = new Map<string, { achieved: number; total: number }>();
  for (const child of children) {
    if (!child.level) continue;
    for (const c of criteria.filter((c) => c.level === child.level)) {
      const cur = criterionStatsMap.get(c.id) ?? { achieved: 0, total: 0 };
      cur.total += 1;
      if (achievedSet.has(`${child.id}|${c.id}`)) cur.achieved += 1;
      criterionStatsMap.set(c.id, cur);
    }
  }
  const criterionStats = criteria
    .filter((c) => criterionStatsMap.has(c.id))
    .map((c) => {
      const s = criterionStatsMap.get(c.id)!;
      return {
        id: c.id,
        description: c.description,
        category: c.category,
        achieved: s.achieved,
        total: s.total,
        pct: s.total > 0 ? Math.round((s.achieved / s.total) * 100) : 0,
      };
    });

  return { childCount: children.length, categoryTotals, overallAchieved, overallTotal, criterionStats };
}
