import type { SeasonStat } from "@/lib/fitnessAnalysis";

export function buildFitnessSummaryPrompt({
  groupName,
  schoolYear,
  childCount,
  namar,
  hawar,
  testAvgAll,
  distribution,
}: {
  groupName: string;
  schoolYear: string | null;
  childCount: number;
  namar: SeasonStat | null;
  hawar: SeasonStat | null;
  testAvgAll: { test: string; avg: number; count: number }[];
  distribution: { level: string; count: number; pct: number }[];
}): string {
  const testLines = testAvgAll
    .map((t) => (t.count > 0 ? `- ${t.test}: дундаж оноо ${t.avg} (3-аас) — ${t.count} сорил` : `- ${t.test}: мэдээлэл алга`))
    .join("\n");

  const distLines = distribution.map((d) => `- ${d.level}: ${d.count} хүүхэд (${d.pct}%)`).join("\n");

  const progressLine =
    namar && hawar
      ? `- Намарын дундаж (12-оос): ${namar.avgTotal} → Хаврын дундаж: ${hawar.avgTotal} (ахиц: ${(hawar.avgTotal - namar.avgTotal >= 0 ? "+" : "") + (hawar.avgTotal - namar.avgTotal).toFixed(1)})`
      : namar
        ? `- Зөвхөн намрын сорил бүртгэгдсэн байна: дундаж ${namar.avgTotal} (12-оос)`
        : hawar
          ? `- Зөвхөн хаврын сорил бүртгэгдсэн байна: дундаж ${hawar.avgTotal} (12-оос)`
          : "- Намар, хаврын харьцуулах мэдээлэл алга";

  return `Та СӨБ-ийн цэцэрлэгийн биеийн тамирын багш. Дараах бодит статистикт үндэслэн "${groupName}"${schoolYear ? ` бүлгийн ${schoolYear} хичээлийн жилийн` : ""} Биеийн тамирын сорилын (Хурд, Хүч, Авхаалж самбаа, Тэнцвэр) нэгдсэн дүгнэлт бичнэ үү.

Мэдээлэл:
- Хамрагдсан хүүхэд: ${childCount}
${progressLine}
- Сорил тус бүрийн дундаж оноо (1-3):
${testLines}
- Үнэлгээний хуваарилалт:
${distLines}

Даалгавар: Дээрх мэдээлэлд үндэслэн, монгол хэлээр, зөв бичгийн дүрмийг баримтлан, объектив бөгөөд мэргэжлийн багшийн түвшинд дараах бүтэцтэй дүгнэлт бич. Тэмдэглэгээ бүрийг яг доорх форматаар тусад нь бич:

ХАМРАГДАЛТ: (Нийт хэдэн хүүхэд хамрагдсан, хэдэн удаа сорил авсан тухай товч)
АХИЦ: (Намар, хаврын дүнг харьцуулж, бүлгийн ерөнхий ахиц/өөрчлөлтийг дүгнэ)
ДАВУУ ТАЛ: (Хамгийн сайн гүйцэтгэлтэй сорилууд)
СУЛ ТАЛ: (Анхаарал шаардсан, доогуур гүйцэтгэлтэй сорилууд)
ЦААШИД: (Дараагийн хагас жилд ямар дасгал, үйл ажиллагаанд илүү анхаарч ажиллах тухай зөвлөмж)`;
}
