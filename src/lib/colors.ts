// Чиглэл болон түвшний өнгөний тохиргоо — Analysis chart-ын COLORS-той нийцүүлсэн
export const DOMAIN_PALETTE = [
  { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200", dot: "#4f46e5" },
  { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200", dot: "#0891b2" },
  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "#16a34a" },
  { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", dot: "#ca8a04" },
  { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", dot: "#dc2626" },
  { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200", dot: "#9333ea" },
  { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200", dot: "#0d9488" },
];

export function domainColor(nameOrIndex: string | number) {
  if (typeof nameOrIndex === "number") {
    return DOMAIN_PALETTE[nameOrIndex % DOMAIN_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < nameOrIndex.length; i++) {
    hash = (hash * 31 + nameOrIndex.charCodeAt(i)) % DOMAIN_PALETTE.length;
  }
  return DOMAIN_PALETTE[hash];
}

export const LEVEL_STYLES: Record<number, { bg: string; text: string; ring: string; solid: string }> = {
  1: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", solid: "bg-rose-500" },
  2: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", solid: "bg-amber-500" },
  3: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200", solid: "bg-cyan-500" },
  4: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", solid: "bg-emerald-500" },
};
