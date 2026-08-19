import { LEVEL_LABELS } from "@/types/database";

export interface GaraaDomainStat {
  domain: string;
  avg: number;
  count: number;
}

function levelLabel(avg: number): string {
  const rounded = Math.min(4, Math.max(1, Math.round(avg)));
  return LEVEL_LABELS[rounded];
}

export function buildGaraaSummaryPrompt({
  groupName,
  schoolYear,
  childCount,
  domainStats,
}: {
  groupName: string;
  schoolYear: string | null;
  childCount: number;
  domainStats: GaraaDomainStat[];
}): string {
  const assessed = domainStats.filter((d) => d.count > 0);
  const overallSum = assessed.reduce((s, d) => s + d.avg * d.count, 0);
  const overallCount = assessed.reduce((s, d) => s + d.count, 0);
  const overallAvg = overallCount > 0 ? Number((overallSum / overallCount).toFixed(2)) : 0;

  const domainLines = domainStats
    .map((d) =>
      d.count > 0
        ? `- ${d.domain}: дундаж түвшин ${d.avg} (${levelLabel(d.avg)}) — ${d.count} ажиглалт`
        : `- ${d.domain}: ажиглалт бүртгэгдээгүй`
    )
    .join("\n");

  const sorted = [...assessed].sort((a, b) => b.avg - a.avg);
  const strongest = sorted.slice(0, 3);
  const weakest = [...sorted].reverse().slice(0, 3);

  return `Та Сургуулийн өмнөх боловсролын (СӨБ) цэцэрлэгийн ахлах багш. Дараах бодит статистик мэдээлэлд үндэслэн "${groupName}"${schoolYear ? ` бүлгийн ${schoolYear} хичээлийн жилийн` : ""} Гарааны үнэлгээний (хичээлийн жилийн эхэнд суралцахуйн 7 чиглэлээр тогтоосон анхны түвшин) нэгдсэн дүгнэлт бичнэ үү.

Мэдээлэл:
- Нийт хамрагдсан хүүхэд: ${childCount}
- Чиглэл тус бүрийн дундаж түвшин (1=Эхэлж байгаа, 2=Хөгжиж байгаа, 3=Хангасан, 4=Бүрэн эзэмшсэн):
${domainLines}
- Бүх чиглэлийн нийт дундаж түвшин: ${overallAvg} (${overallCount > 0 ? levelLabel(overallAvg) : "мэдээлэл алга"})
- Хамгийн өндөр түвшинтэй эхэлсэн чиглэлүүд: ${strongest.map((d) => `${d.domain} (${d.avg})`).join(", ") || "—"}
- Хамгийн доогуур түвшинтэй эхэлсэн чиглэлүүд: ${weakest.map((d) => `${d.domain} (${d.avg})`).join(", ") || "—"}

Даалгавар: Дээрх мэдээлэлд үндэслэн, монгол хэлээр, зөв бичгийн дүрмийг баримтлан, объектив бөгөөд мэргэжлийн багшийн түвшинд дараах бүтэцтэй Гарааны үнэлгээний нэгдсэн дүгнэлт бич. Тэмдэглэгээ бүрийг яг доорх форматаар тусад нь бич:

ХАМРАГДАЛТ: (Нийт хэдэн хүүхэд, суралцахуйн 7 чиглэлээр хэрхэн анхны түвшин тогтоосон тухай товч)
ҮР ДҮН: (Чиглэл тус бүрийн болон нийт дундаж түвшинг дүгнэн бич)
ДАВУУ ТАЛ: (Өндөр түвшинтэй эхэлсэн, сайн хөгжсөн чиглэлүүд)
СУЛ ТАЛ: (Доогуур түвшинтэй эхэлсэн, анхаарал шаардсан чиглэлүүд)
ЦААШИД: (Энэ хичээлийн жилд аль чиглэлд илүү анхаарч ажиллах, ямар үйл ажиллагаа төлөвлөх тухай зөвлөмж)`;
}
