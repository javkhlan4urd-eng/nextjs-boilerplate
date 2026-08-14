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
