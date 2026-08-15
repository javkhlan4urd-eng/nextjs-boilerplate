const CONCLUSION_THRESHOLD = 3;
const MAX_NOTES_CONSIDERED = 4;
const MAX_IMAGES_CONSIDERED = 6;

export { CONCLUSION_THRESHOLD };

interface NoteInput {
  observed_on: string;
  observed_fact?: string | null;
  development_direction?: string | null;
  child_performance?: string | null;
  note: string | null;
  teacher_conclusion?: string | null;
  next_action?: string | null;
  methodology_note?: string | null;
  media?: { url: string; type: string }[];
}

export interface OutcomeAssessment {
  conclusion: string;
  nextSteps: string;
}

async function imageToInlinePart(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { inline_data: { mime_type: contentType, data: buffer.toString("base64") } };
  } catch {
    return null;
  }
}

export async function generateOutcomeAssessment({
  childName,
  outcomeCode,
  outcomeDescription,
  notes,
}: {
  childName: string;
  outcomeCode: string;
  outcomeDescription: string;
  notes: NoteInput[];
}): Promise<OutcomeAssessment | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const recentNotes = notes.slice(-MAX_NOTES_CONSIDERED);
  const notesText = recentNotes
    .map((n, i) => {
      const lines = [`${i + 1}) [${n.observed_on}]`];
      if (n.observed_fact) lines.push(`   Ажиглагдсан баримт: ${n.observed_fact}`);
      if (n.development_direction) lines.push(`   Хөгжлийн чиглэл: ${n.development_direction}`);
      if (n.child_performance) lines.push(`   Гүйцэтгэл: ${n.child_performance}`);
      lines.push(`   Тэмдэглэл: ${n.note || "(тэмдэглэлгүй, зөвхөн зураг)"}`);
      if (n.teacher_conclusion) lines.push(`   Багшийн ажиглалтын дүгнэлт: ${n.teacher_conclusion}`);
      if (n.next_action) lines.push(`   Цаашид (тухайн ажиглалт): ${n.next_action}`);
      if (n.methodology_note) lines.push(`   Арга зүйн санал: ${n.methodology_note}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const imageUrls = recentNotes
    .flatMap((n) => (n.media ?? []).filter((m) => m.type === "image").map((m) => m.url))
    .slice(0, MAX_IMAGES_CONSIDERED);

  const imageParts = (
    await Promise.all(imageUrls.map((url) => imageToInlinePart(url)))
  ).filter((p): p is NonNullable<typeof p> => p !== null);

  const prompt = `Та цэцэрлэгийн туслах багш. СӨБ сургалтын хөтөлбөр, хүүхдийн хөгжлийн үнэлгээний аргачлалын дагуу дараах мэдээлэлд (тэмдэглэл болон хавсаргасан зураг) үндэслэн дүгнэлт, цаашдын алхмыг бич.

Хүүхэд: ${childName}
Суралцахуйн үр дүн (СҮД): ${outcomeCode} — ${outcomeDescription}

Багшийн бичсэн ажиглалтын тэмдэглэлүүд:
${notesText}
${imageParts.length > 0 ? `\n(Мөн ${imageParts.length} ажиглалтын зураг хавсаргасан болно, эдгээрийг харгалзан үз.)` : ""}

Даалгавар: Дээрх бүх ажиглалтуудыг (баримт, гүйцэтгэл, тэмдэглэл, зураг зэргийг) нэгтгэн харгалзаж, тухайн хүүхэд энэ СҮД-ийг хэрхэн эзэмшиж байгааг мэргэжлийн багшийн түвшинд, объектив бөгөөд тодорхой үнэлж, монгол хэлээр бич. Хариултаа яг дараах форматаар, хоёр хэсэгтэй бич:

ДҮГНЭЛТ:
(2-3 өгүүлбэрээр, объектив бөгөөд СӨБ-ийн үнэлгээний хэллэгээр — "эзэмшсэн", "хөгжиж байгаа", "дэмжлэг шаардлагатай" гэх мэт — дүгнэлт бич)

ЦААШИД:
(1-2 өгүүлбэрээр, багш цаашид ямар дэмжлэг, үйл ажиллагаа хийвэл тухайн хүүхэд энэ СҮД-ийг илүү сайн эзэмших талаар зөвлөмж бич)`;

  try {
    const parts: Record<string, unknown>[] = [{ text: prompt }, ...imageParts];
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      }
    );
    if (!res.ok) {
      console.error("Gemini assessment error:", await res.text());
      return null;
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;

    const conclusionMatch = text.match(/ДҮГНЭЛТ:\s*([\s\S]*?)(?:ЦААШИД:|$)/i);
    const nextStepsMatch = text.match(/ЦААШИД:\s*([\s\S]*)$/i);

    const conclusion = conclusionMatch?.[1]?.trim() || text;
    const nextSteps = nextStepsMatch?.[1]?.trim() || "";

    return { conclusion, nextSteps };
  } catch (e) {
    console.error("generateOutcomeAssessment error:", e);
    return null;
  }
}
