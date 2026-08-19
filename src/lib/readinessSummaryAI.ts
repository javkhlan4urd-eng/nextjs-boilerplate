import type { ReadinessGroupStats } from "./readiness";

export function buildReadinessSummaryPrompt({
  groupName,
  schoolYear,
  stats,
}: {
  groupName: string;
  schoolYear: string | null;
  stats: ReadinessGroupStats;
}): string {
  const overallPct = stats.overallTotal > 0 ? Math.round((stats.overallAchieved / stats.overallTotal) * 100) : 0;

  const categoryLines = stats.categoryTotals
    .map((c) => `- ${c.category}: ${c.achieved}/${c.total} (${c.total > 0 ? Math.round((c.achieved / c.total) * 100) : 0}%)`)
    .join("\n");

  const sorted = [...stats.criterionStats].sort((a, b) => b.pct - a.pct);
  const strongest = sorted.slice(0, 5);
  const weakest = [...sorted].reverse().slice(0, 5);
  const sample = stats.criterionStats.slice(0, 8);

  const strongestLines = strongest.map((c) => `- ${c.description} (${c.pct}%)`).join("\n");
  const weakestLines = weakest.map((c) => `- ${c.description} (${c.pct}%)`).join("\n");
  const sampleLines = sample.map((c) => `- [${c.category}] ${c.description}`).join("\n");

  return `Та Сургуулийн өмнөх боловсролын (СӨБ) цэцэрлэгийн ахлах багш. Дараах бодит статистик мэдээлэлд үндэслэн "${groupName}"${schoolYear ? ` бүлгийн ${schoolYear} хичээлийн жилийн` : ""} Үр дүнгийн үнэлгээний жилийн эцсийн дүгнэлт бичнэ үү.

Мэдээлэл:
- Нийт хамрагдсан хүүхэд: ${stats.childCount}
- Ангилал тус бүрийн эзэмшилт:
${categoryLines}
- Нийт дундаж эзэмшилтийн хувь: ${overallPct}%
- Үнэлгээнд ашигласан шалгуур/даалгаврын жишээ:
${sampleLines}
- Хамгийн өндөр үзүүлэлттэй (сайн эзэмшсэн) чадварууд:
${strongestLines}
- Хамгийн доогуур үзүүлэлттэй (дэмжлэг шаардлагатай) чадварууд:
${weakestLines}

Даалгавар: Дээрх мэдээлэлд үндэслэн, монгол хэлээр, зөв бичгийн дүрмийг баримтлан, объектив бөгөөд мэргэжлийн багшийн түвшинд дараах бүтэцтэй жилийн эцсийн дүгнэлт бич. Тэмдэглэгээ бүрийг яг доорх форматаар тусад нь бич:

ХАМРАГДАЛТ: (Нийт хэдэн хүүхэд, Мэдлэг/Чадвар/Төлөвшлийн шалгуураар ямар аргачлалаар үнэлэгдсэн тухай товч)
ДААЛГАВАР: (Үнэлгээний явцад ямар төрлийн дасгал, даалгавар, чадвар шалгасан тухай, дээрх жишээнд үндэслэн)
ҮР ДҮН: (Ангилал тус бүрийн болон нийт дундаж эзэмшилтийн хувийг дүгнэн бич)
ДАВУУ ТАЛ: (Сайн эзэмшсэн, өндөр үзүүлэлттэй чадварууд)
СУЛ ТАЛ: (Дэмжлэг шаардлагатай, доогуур үзүүлэлттэй чадварууд)
ЦААШИД: (Ирэх хугацаанд анхаарах, дэмжлэг үзүүлэх талаарх зөвлөмж)`;
}
