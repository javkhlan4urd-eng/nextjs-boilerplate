import { ROUTINE_PERIODS, LEVEL_LABELS } from "@/types/database";

export interface ObservationAIFields {
  observed_fact: string;
  development_direction: string;
  child_performance: string;
  note: string;
  teacher_conclusion: string;
  next_action: string;
  methodology_note: string;
  routine_period: string;
}

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

export function buildObservationPrompt({
  domainName,
  outcomeCode,
  outcomeDescription,
  planText,
  hasMedia,
  isVideo,
  targetLevel,
}: {
  domainName?: string;
  outcomeCode?: string;
  outcomeDescription?: string;
  planText?: string;
  hasMedia: boolean;
  isVideo: boolean;
  targetLevel?: number;
}) {
  const levelInstruction =
    targetLevel && LEVEL_LABELS[targetLevel]
      ? ` Хүүхэд энэ чиглэл/СҮД-ээр яг "${LEVEL_LABELS[targetLevel]}" (${targetLevel}-р түвшин) гэсэн хөгжлийн түвшинд байгааг тэмдэглэлдээ тод харуулж бич — тухайн түвшинд өвөрмөц, өөр түвшнөөс ялгаатай бодит жишээ, гүйцэтгэлийн нарийвчлалаар дүрсэлнэ үү (жишээ нь "Эхэлж байгаа" бол дэмжлэгтэйгээр эсвэл хэсэгчлэн гүйцэтгэж буйг, "Бүрэн эзэмшсэн" бол бие даан, тогтвортой гүйцэтгэж буйг тодорхой бичих).`
      : "";

  const outcomeContext =
    outcomeCode && outcomeDescription
      ? `Ажиглаж буй суралцахуйн үр дүн (СҮД): ${outcomeCode} — ${outcomeDescription} (${domainName ?? ""} чиглэл).`
      : domainName
        ? `Ажиглаж буй суралцахуйн чиглэл: ${domainName}.`
        : "";

  const mediaWord = isVideo ? "бичлэг" : "зураг";
  const trimmedPlan = planText?.trim();

  const intro: string[] = [];
  if (hasMedia) {
    intro.push(`Хавсаргасан ${mediaWord}ан дээр хүүхэд ямар үйл ажиллагаа хийж байгааг сайтар ажигла.`);
  }
  if (trimmedPlan) {
    intro.push(
      `Багшийн төлөвлөсөн үйл ажиллагаа: "${trimmedPlan}". Энэ төлөвлөлтөд үндэслэн, хүүхэд уг үйл ажиллагааг хийж гүйцэтгэхэд юу ажиглагдах, ямар чадвар илрэх магадлалтайг бодит, түгээмэл жишээгээр төсөөлж бич.`
    );
  }

  const unseenHint = hasMedia
    ? `${mediaWord === "бичлэг" ? "Бичлэгээс" : "Зургаас"} шууд харагдахгүй зүйлийг (жишээ нь хүүхдийн яриа) боломжит, түгээмэл жишээ маягаар бич, эсвэл товч орхиж болно.`
    : "Хүүхдийн өөрийн тайлбар, яриаг боломжит, түгээмэл жишээ маягаар бич.";

  const periodOptions = ROUTINE_PERIODS.join(", ");

  return `Та Сургуулийн өмнөх боловсролын (СӨБ) цэцэрлэгийн туслах багш. ${intro.join(" ")} ${outcomeContext}${levelInstruction} Тэмдэглэлдээ хүүхдийн нэрийг зохиож бичихгүй байх — зөвхөн "хүүхэд" гэж дурдана уу.

Даалгавар: Дараах 8 хэсгийг СӨБ-ийн ажиглалтын стандартын дагуу, монгол хэлээр, зөв бичгийн дүрмийг баримтлан, объектив бөгөөд тодорхой бичнэ үү. ${unseenHint} Хариултаа яг доорх форматаар, 8 тэмдэглэгээгээр тусад нь бич (тэмдэглэгээ бүрийн дараа 1-2 өгүүлбэр):

БАРИМТ: (Ажиглагдсан баримт — хүүхэд юу хийж байгаа, ямар орчинд байгаа бодит байдал)
ЧИГЛЭЛ: (Хөгжлийн чиглэл — энэ үйлдлээр ямар чадвар хөгжиж байгаа нь)
ГҮЙЦЭТГЭЛ: (Хүүхдийн гүйцэтгэл — хийсэн бүтээл, үйлдлийн чанар, нарийвчлал)
ТЭМДЭГЛЭЛ: (Ажиглалтын тэмдэглэл — хүүхдийн өөрийн тайлбар, яриа байж болзошгүй зүйл; эсвэл юу хийж буйгаа товч дүрсэл)
ДҮГНЭЛТ: (Багшийн дүгнэлт — тухайн ажиглалтаар ажиглагдсан хөгжлийн түвшин)
ЦААШИД: (Цаашдын үйл ажиллагаа — багшийн үзүүлэх дэмжлэг)
АРГАЗҮЙ: (Арга зүйн санал — арга зүйд тусгах санаа)
ЦАГ: (Дээрх агуулгад үндэслэн, өдрийн дэглэмийн аль цагийн хэсэгт хамгийн тохиромжтойг дараах жагсаалтаас яг үг үсгээр нь сонгож бич, өөр юу ч нэмэлт бичихгүй: ${periodOptions})`;
}

export function extractObservationFields(text: string): ObservationAIFields {
  const keys = ["БАРИМТ", "ЧИГЛЭЛ", "ГҮЙЦЭТГЭЛ", "ТЭМДЭГЛЭЛ", "ДҮГНЭЛТ", "ЦААШИД", "АРГАЗҮЙ", "ЦАГ"];
  function extractSection(key: string, nextKeys: string[]) {
    const nextPattern = nextKeys.length > 0 ? `(?:${nextKeys.join("|")}):|$` : "$";
    const re = new RegExp(`${key}:\\s*([\\s\\S]*?)(?:${nextPattern})`, "i");
    const m = text.match(re);
    return m?.[1]?.trim() || "";
  }
  const rawPeriod = extractSection(keys[7], []);
  const routine_period = (ROUTINE_PERIODS as readonly string[]).find(
    (p) => p.toLowerCase() === rawPeriod.toLowerCase()
  ) ?? "";

  return {
    observed_fact: extractSection(keys[0], keys.slice(1)),
    development_direction: extractSection(keys[1], keys.slice(2)),
    child_performance: extractSection(keys[2], keys.slice(3)),
    note: extractSection(keys[3], keys.slice(4)),
    teacher_conclusion: extractSection(keys[4], keys.slice(5)),
    next_action: extractSection(keys[5], keys.slice(6)),
    methodology_note: extractSection(keys[6], keys.slice(7)),
    routine_period,
  };
}

export async function callGemini(
  apiKey: string,
  prompt: string,
  media?: { mimeType: string; base64: string }
): Promise<string> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (media) parts.push({ inline_data: { mime_type: media.mimeType, data: media.base64 } });

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini error:", errText);
    throw new Error("AI дүн шинжилгээ амжилтгүй боллоо");
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    console.error("Gemini empty response:", JSON.stringify(data));
    throw new Error(blockReason ? `AI хариу өгсөнгүй (${blockReason})` : "AI хариу өгсөнгүй");
  }
  return text;
}
