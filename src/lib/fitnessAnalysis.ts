import { LEVEL_LABELS } from "@/lib/fitnessCriteria";

export interface FitnessRow {
  child_id: string;
  tested_on: string;
  age_group: number;
  gender: string;
  speed_score: number | null;
  strength_score: number | null;
  agility_score: number | null;
  balance_score: number | null;
  total_score: number | null;
  level: string | null;
}

const TEST_LABELS: { key: keyof Pick<FitnessRow, "speed_score" | "strength_score" | "agility_score" | "balance_score">; label: string }[] = [
  { key: "speed_score", label: "Хурд" },
  { key: "strength_score", label: "Хүч" },
  { key: "agility_score", label: "Авхаалж самбаа" },
  { key: "balance_score", label: "Тэнцвэр" },
];

export function avgByTest(rows: FitnessRow[]) {
  return TEST_LABELS.map(({ key, label }) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => v !== null);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { test: label, avg: Number(avg.toFixed(2)), count: vals.length };
  });
}

export function levelDistribution(rows: FitnessRow[]) {
  const order = [LEVEL_LABELS.high, LEVEL_LABELS.ok, LEVEL_LABELS.support];
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.level) continue;
    counts.set(r.level, (counts.get(r.level) ?? 0) + 1);
  }
  const total = rows.filter((r) => r.level).length;
  return order.map((level) => {
    const count = counts.get(level) ?? 0;
    return { level, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

export function latestPerChild(rows: FitnessRow[]) {
  const map = new Map<string, FitnessRow>();
  for (const r of rows) {
    const existing = map.get(r.child_id);
    if (!existing || r.tested_on > existing.tested_on) {
      map.set(r.child_id, r);
    }
  }
  return map;
}
