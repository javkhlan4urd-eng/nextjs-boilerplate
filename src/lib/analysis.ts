export interface ObsRow {
  domain_id: string;
  level: number;
  observed_on: string; // YYYY-MM-DD
}

export interface DomainMeta {
  id: string;
  name: string;
}

const MONTH_LABELS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

export function avgByDomain(rows: ObsRow[], domains: DomainMeta[]) {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const cur = sums.get(r.domain_id) ?? { sum: 0, count: 0 };
    cur.sum += r.level;
    cur.count += 1;
    sums.set(r.domain_id, cur);
  }
  return domains.map((d) => {
    const s = sums.get(d.id);
    return {
      domain: d.name,
      avg: s ? Number((s.sum / s.count).toFixed(2)) : 0,
      count: s?.count ?? 0,
    };
  });
}

export function monthlyTrend(rows: ObsRow[], domains: DomainMeta[], year: number) {
  const buckets = new Map<string, { sum: number; count: number }>(); // key = "M-domainId"
  const overallBuckets = new Map<number, { sum: number; count: number }>();

  for (const r of rows) {
    const d = new Date(r.observed_on);
    if (d.getFullYear() !== year) continue;
    const month = d.getMonth(); // 0-11
    const key = `${month}-${r.domain_id}`;
    const cur = buckets.get(key) ?? { sum: 0, count: 0 };
    cur.sum += r.level;
    cur.count += 1;
    buckets.set(key, cur);

    const ocur = overallBuckets.get(month) ?? { sum: 0, count: 0 };
    ocur.sum += r.level;
    ocur.count += 1;
    overallBuckets.set(month, ocur);
  }

  return Array.from({ length: 12 }, (_, month) => {
    const point: Record<string, number | string> = { month: MONTH_LABELS[month] };
    for (const d of domains) {
      const b = buckets.get(`${month}-${d.id}`);
      point[d.name] = b ? Number((b.sum / b.count).toFixed(2)) : (null as unknown as number);
    }
    const overall = overallBuckets.get(month);
    point["Ерөнхий дундаж"] = overall ? Number((overall.sum / overall.count).toFixed(2)) : (null as unknown as number);
    return point;
  });
}

export function quarterOf(monthIndex0: number) {
  return Math.floor(monthIndex0 / 3) + 1; // 1..4
}

export function periodKey(dateStr: string, granularity: "month" | "quarter") {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  if (granularity === "month") {
    return `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${y}-Q${quarterOf(d.getMonth())}`;
}

export function periodLabel(key: string, granularity: "month" | "quarter") {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${y} оны ${MONTH_LABELS[Number(m) - 1]}`;
  }
  const [y, q] = key.split("-");
  return `${y} оны ${q}`;
}

export function availablePeriods(rows: ObsRow[], granularity: "month" | "quarter") {
  const set = new Set<string>();
  for (const r of rows) set.add(periodKey(r.observed_on, granularity));
  return Array.from(set).sort();
}

export function comparePeriods(
  rows: ObsRow[],
  domains: DomainMeta[],
  granularity: "month" | "quarter",
  periodA: string,
  periodB: string
) {
  const a = rows.filter((r) => periodKey(r.observed_on, granularity) === periodA);
  const b = rows.filter((r) => periodKey(r.observed_on, granularity) === periodB);
  const avgA = avgByDomain(a, domains);
  const avgB = avgByDomain(b, domains);
  return domains.map((d, i) => ({
    domain: d.name,
    [periodLabel(periodA, granularity)]: avgA[i].avg,
    [periodLabel(periodB, granularity)]: avgB[i].avg,
  }));
}
