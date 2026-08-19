import { LEVEL_LABELS } from "@/types/database";

export interface OutcomeDomainStat {
  domain: string;
  total: number;
  withConclusion: number;
  avgLevel: number | null; // average of conclusion.level (1-4) among ones that have a level
}

function levelLabel(avg: number): string {
  const rounded = Math.min(4, Math.max(1, Math.round(avg)));
  return LEVEL_LABELS[rounded];
}

export function buildOutcomeSummaryPrompt({
  groupName,
  schoolYear,
  childCount,
  domainStats,
  overallPct,
}: {
  groupName: string;
  schoolYear: string | null;
  childCount: number;
  domainStats: OutcomeDomainStat[];
  overallPct: number;
}): string {
  const domainLines = domainStats
    .map((d) => {
      const coveragePct = d.total > 0 ? Math.round((d.withConclusion / d.total) * 100) : 0;
      const levelPart = d.avgLevel !== null ? `, дундаж түвшин ${d.avgLevel} (${levelLabel(d.avgLevel)})` : "";
      return `- ${d.domain}: ${d.withConclusion}/${d.total} СҮД дүгнэгдсэн (${coveragePct}%)${levelPart}`;
    })
    .join("\n");

  const withLevel = domainStats.filter((d) => d.avgLevel !== null);
  const sorted = [...withLevel].sort((a, b) => (b.avgLevel ?? 0) - (a.avgLevel ?? 0));
  const strongest = sorted.slice(0, 3);
  const weakest = [...sorted].reverse().slice(0, 3);

  return `Та Сургуулийн өмнөх боловсролын (СӨБ) цэцэрлэгийн ахлах багш. Дараах бодит статистик мэдээлэлд үндэслэн "${groupName}"${schoolYear ? ` бүлгийн ${schoolYear} хичээлийн жилийн` : ""} Суралцахуйн үр дүнгийн (СҮД) дүгнэлтийн нэгдсэн тайлан бичнэ үү.

Мэдээлэл:
- Нийт хамрагдсан хүүхэд: ${childCount}
- Суралцахуйн 7 чиглэл тус бүрийн дүгнэлтийн явц ба дундаж түвшин (1=Эхэлж байгаа, 2=Хөгжиж байгаа, 3=Хангасан, 4=Бүрэн эзэмшсэн):
${domainLines}
- Нийт дундаж хамрах хувь: ${overallPct}%
- Хамгийн өндөр дундаж түвшинтэй чиглэлүүд: ${strongest.map((d) => `${d.domain} (${d.avgLevel})`).join(", ") || "—"}
- Хамгийн доогуур дундаж түвшинтэй чиглэлүүд: ${weakest.map((d) => `${d.domain} (${d.avgLevel})`).join(", ") || "—"}

Даалгавар: Дээрх мэдээлэлд үндэслэн, монгол хэлээр, зөв бичгийн дүрмийг баримтлан, объектив бөгөөд мэргэжлийн багшийн түвшинд дараах бүтэцтэй СҮД дүгнэлтийн нэгдсэн тайлан бич. Тэмдэглэгээ бүрийг яг доорх форматаар тусад нь бич:

ХАМРАГДАЛТ: (Нийт хэдэн хүүхэд, суралцахуйн 7 чиглэлээр СҮД-үүдийг хэрхэн ажиглаж дүгнэсэн тухай товч)
ҮР ДҮН: (Чиглэл тус бүрийн болон нийт дундаж хамрах хувь, түвшинг дүгнэн бич)
ДАВУУ ТАЛ: (Сайн эзэмшсэн, өндөр түвшинтэй чиглэлүүд)
СУЛ ТАЛ: (Дэмжлэг шаардлагатай, доогуур түвшинтэй чиглэлүүд)
ЦААШИД: (Ирэх хугацаанд анхаарах, дэмжлэг үзүүлэх талаарх зөвлөмж)`;
}
