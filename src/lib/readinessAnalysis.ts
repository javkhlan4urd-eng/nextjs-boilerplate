export const READINESS_CATEGORIES = ["Мэдлэг", "Чадвар", "Төлөвшил"] as const;
export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

export interface ReadinessCheckRow {
  child_id: string;
  criterion_id: string;
  checked_on: string; // YYYY-MM-DD
}

export interface CriterionMeta {
  id: string;
  level: number;
  category: string;
}

export interface ChildLevelMeta {
  id: string;
  level: number | null;
}

export function availableReadinessYears(checks: ReadinessCheckRow[]): string[] {
  return Array.from(new Set(checks.map((c) => c.checked_on.slice(0, 4)))).sort();
}

function possibleByCategory(children: ChildLevelMeta[], criteria: CriterionMeta[]) {
  const byCategory: Record<string, number> = { Мэдлэг: 0, Чадвар: 0, Төлөвшил: 0 };
  let overall = 0;
  for (const child of children) {
    if (!child.level) continue;
    for (const cat of READINESS_CATEGORIES) {
      const count = criteria.filter((c) => c.level === child.level && c.category === cat).length;
      byCategory[cat] += count;
      overall += count;
    }
  }
  return { byCategory, overall };
}

export function compareReadinessByYear(
  checks: ReadinessCheckRow[],
  criteria: CriterionMeta[],
  children: ChildLevelMeta[],
  yearA: string,
  yearB: string
) {
  const criterionById = new Map(criteria.map((c) => [c.id, c]));
  const childIds = new Set(children.map((c) => c.id));

  function achievedForYear(year: string) {
    const byCategory: Record<string, number> = { Мэдлэг: 0, Чадвар: 0, Төлөвшил: 0 };
    let overall = 0;
    for (const chk of checks) {
      if (chk.checked_on.slice(0, 4) !== year) continue;
      if (!childIds.has(chk.child_id)) continue;
      const crit = criterionById.get(chk.criterion_id);
      if (!crit) continue;
      byCategory[crit.category] = (byCategory[crit.category] ?? 0) + 1;
      overall += 1;
    }
    return { byCategory, overall };
  }

  const possible = possibleByCategory(children, criteria);
  const a = achievedForYear(yearA);
  const b = achievedForYear(yearB);
  const labelA = `${yearA} он`;
  const labelB = `${yearB} он`;

  const categoryData = READINESS_CATEGORIES.map((cat) => ({
    category: cat,
    [labelA]: possible.byCategory[cat] > 0 ? Math.round((a.byCategory[cat] / possible.byCategory[cat]) * 100) : 0,
    [labelB]: possible.byCategory[cat] > 0 ? Math.round((b.byCategory[cat] / possible.byCategory[cat]) * 100) : 0,
  }));

  const overallPctA = possible.overall > 0 ? Math.round((a.overall / possible.overall) * 100) : 0;
  const overallPctB = possible.overall > 0 ? Math.round((b.overall / possible.overall) * 100) : 0;

  return { categoryData, labelA, labelB, overallPctA, overallPctB };
}
