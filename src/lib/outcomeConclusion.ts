const CONCLUSION_THRESHOLD = 3;
const MAX_NOTES_CONSIDERED = 4;

export { CONCLUSION_THRESHOLD };

export async function generateOutcomeConclusion({
  childName,
  outcomeCode,
  outcomeDescription,
  notes,
}: {
  childName: string;
  outcomeCode: string;
  outcomeDescription: string;
  notes: { observed_on: string; note: string }[];
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const recentNotes = notes.slice(-MAX_NOTES_CONSIDERED);
  const notesText = recentNotes
    .map((n, i) => `${i + 1}) [${n.observed_on}] ${n.note}`)
    .join("\n");

  const prompt = `Та цэцэрлэгийн туслах багш. СӨБ сургалтын хөтөлбөр, хүүхдийн хөгжлийн үнэлгээний аргачлалын дагуу дараах мэдээлэлд үндэслэн дүгнэлт бич.

Хүүхэд: ${childName}
Суралцахуйн үр дүн (СҮД): ${outcomeCode} — ${outcomeDescription}

Багшийн бичсэн ажиглалтын тэмдэглэлүүд:
${notesText}

Даалгавар: Дээрх ${recentNotes.length} ажиглалтад үндэслэн, тухайн хүүхэд энэ СҮД-ийг хэрхэн эзэмшиж байгааг 2-3 өгүүлбэрээр, монгол хэлээр, объектив бөгөөд СӨБ-ийн үнэлгээний хэллэгээр (жишээ нь: "эзэмшсэн", "хөгжиж байгаа", "дэмжлэг шаардлагатай" гэх мэт) дүгнэлт бич. Зөвхөн дүгнэлтийн текстийг бич, өөр юу ч нэмэлт бичих шаардлагагүй.`;

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    if (!res.ok) {
      console.error("Gemini conclusion error:", await res.text());
      return null;
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (e) {
    console.error("generateOutcomeConclusion error:", e);
    return null;
  }
}
