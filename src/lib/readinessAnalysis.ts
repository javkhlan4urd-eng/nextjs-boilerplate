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

export interface GroupChildMeta {
  id: string;
  level: number | null;
  groupId: string;
  groupName: string;
  schoolYear: string | null;
}

export interface GroupReadinessStat {
  groupId: string;
  groupName: string;
  schoolYear: string | null;
  categoryPct: Record<ReadinessCategory, number>;
  overallPct: number;
  childCount: number;
}

// Бүх бүлгийг тус тусад нь (сургалтын чиглэл/ангилал тус бүрээр) харьцуулах — бүлэг бүр өөрийн
// хичээлийн жилийг агуулдаг тул энэ нэг харьцуулалт бүлэг ба хичээлийн жил хоёрыг зэрэг харуулна.
export function compareReadinessByGroup(
  checks: ReadinessCheckRow[],
  criteria: CriterionMeta[],
  children: GroupChildMeta[]
): GroupReadinessStat[] {
  const achievedSet = new Set(checks.map((c) => `${c.child_id}|${c.criterion_id}`));

  const groups = new Map<string, { groupName: string; schoolYear: string | null; children: GroupChildMeta[] }>();
  for (const c of children) {
    const g = groups.get(c.groupId) ?? { groupName: c.groupName, schoolYear: c.schoolYear, children: [] };
    g.children.push(c);
    groups.set(c.groupId, g);
  }

  return Array.from(groups.entries())
    .map(([groupId, g]) => {
      const categoryPct = {} as Record<ReadinessCategory, number>;
      let overallAchieved = 0;
      let overallTotal = 0;
      for (const cat of READINESS_CATEGORIES) {
        let achieved = 0;
        let total = 0;
        for (const child of g.children) {
          if (!child.level) continue;
          const items = criteria.filter((c) => c.level === child.level && c.category === cat);
          total += items.length;
          achieved += items.filter((c) => achievedSet.has(`${child.id}|${c.id}`)).length;
        }
        categoryPct[cat] = total > 0 ? Math.round((achieved / total) * 100) : 0;
        overallAchieved += achieved;
        overallTotal += total;
      }
      return {
        groupId,
        groupName: g.groupName,
        schoolYear: g.schoolYear,
        categoryPct,
        overallPct: overallTotal > 0 ? Math.round((overallAchieved / overallTotal) * 100) : 0,
        childCount: g.children.length,
      };
    })
    .sort((a, b) => (a.schoolYear ?? "").localeCompare(b.schoolYear ?? "") || a.groupName.localeCompare(b.groupName));
}
