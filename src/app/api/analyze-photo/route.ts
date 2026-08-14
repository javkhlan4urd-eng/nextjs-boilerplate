import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROMPT = `Та цэцэрлэгийн багшийн туслах. Хавсаргасан зурган дээр хүүхэд ямар үйл ажиллагаа хийж байгааг ажигла. Багшид зориулж, ажиглалтын тэмдэглэл болгон ашиглаж болохоор, 1-2 өгүүлбэрээр, монгол хэлээр, объектив тайлбар бич. Зөвхөн тэмдэглэлийн текстийг бич, өөр юу ч нэмэлт бичих шаардлагагүй.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI үйлчилгээ тохируулагдаагүй байна" }, { status: 500 });
  }

  const { imageUrl } = await request.json();
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "Зурагны хаяг дутуу байна" }, { status: 400 });
  }

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Зурагыг татаж чадсангүй");
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString("base64");

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: contentType, data: base64 } },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return NextResponse.json({ error: "AI дүн шинжилгээ амжилтгүй боллоо" }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const note: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!note) {
      return NextResponse.json({ error: "AI хариу өгсөнгүй" }, { status: 502 });
    }

    return NextResponse.json({ note });
  } catch (e) {
    console.error("analyze-photo error:", e);
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}
