import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function buildPrompt({
  domainName,
  outcomeCode,
  outcomeDescription,
}: {
  domainName?: string;
  outcomeCode?: string;
  outcomeDescription?: string;
}) {
  const outcomeContext =
    outcomeCode && outcomeDescription
      ? `Ажиглаж буй суралцахуйн үр дүн (СҮД): ${outcomeCode} — ${outcomeDescription} (${domainName ?? ""} чиглэл).`
      : domainName
        ? `Ажиглаж буй суралцахуйн чиглэл: ${domainName}.`
        : "";

  return `Та Сургуулийн өмнөх боловсролын (СӨБ) цэцэрлэгийн туслах багш. Хавсаргасан зурган дээр хүүхэд ямар үйл ажиллагаа хийж байгааг сайтар ажигла. ${outcomeContext}

Даалгавар: Дараах 7 хэсгийг СӨБ-ийн ажиглалтын стандартын дагуу, монгол хэлээр, объектив бөгөөд тодорхой бичнэ үү. Зургаас шууд харагдахгүй зүйлийг (жишээ нь хүүхдийн яриа) боломжит, түгээмэл жишээ маягаар бич, эсвэл товч орхиж болно. Хариултаа яг доорх форматаар, 7 тэмдэглэгээгээр тусад нь бич (тэмдэглэгээ бүрийн дараа 1-2 өгүүлбэр):

БАРИМТ: (Ажиглагдсан баримт — хүүхэд юу хийж байгаа, ямар орчинд байгаа бодит байдал)
ЧИГЛЭЛ: (Хөгжлийн чиглэл — энэ үйлдлээр ямар чадвар хөгжиж байгаа нь)
ГҮЙЦЭТГЭЛ: (Хүүхдийн гүйцэтгэл — хийсэн бүтээл, үйлдлийн чанар, нарийвчлал)
ТЭМДЭГЛЭЛ: (Ажиглалтын тэмдэглэл — хүүхдийн өөрийн тайлбар, яриа байж болзошгүй зүйл; эсвэл юу хийж буйгаа товч дүрсэл)
ДҮГНЭЛТ: (Багшийн дүгнэлт — тухайн ажиглалтаар ажиглагдсан хөгжлийн түвшин)
ЦААШИД: (Цаашдын үйл ажиллагаа — багшийн үзүүлэх дэмжлэг)
АРГАЗҮЙ: (Арга зүйн санал — арга зүйд тусгах санаа)`;
}

function extractSection(text: string, key: string, nextKeys: string[]) {
  const nextPattern = nextKeys.length > 0 ? `(?:${nextKeys.join("|")}):|$` : "$";
  const re = new RegExp(`${key}:\\s*([\\s\\S]*?)(?:${nextPattern})`, "i");
  const m = text.match(re);
  return m?.[1]?.trim() || "";
}

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

  const { imageUrl, domainName, outcomeCode, outcomeDescription } = await request.json();
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "Зурагны хаяг дутуу байна" }, { status: 400 });
  }

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Зурагыг татаж чадсангүй");
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString("base64");

    const prompt = buildPrompt({ domainName, outcomeCode, outcomeDescription });

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
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
    const text: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "AI хариу өгсөнгүй" }, { status: 502 });
    }

    const keys = ["БАРИМТ", "ЧИГЛЭЛ", "ГҮЙЦЭТГЭЛ", "ТЭМДЭГЛЭЛ", "ДҮГНЭЛТ", "ЦААШИД", "АРГАЗҮЙ"];
    const result = {
      observed_fact: extractSection(text, keys[0], keys.slice(1)),
      development_direction: extractSection(text, keys[1], keys.slice(2)),
      child_performance: extractSection(text, keys[2], keys.slice(3)),
      note: extractSection(text, keys[3], keys.slice(4)),
      teacher_conclusion: extractSection(text, keys[4], keys.slice(5)),
      next_action: extractSection(text, keys[5], keys.slice(6)),
      methodology_note: extractSection(text, keys[6], []),
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("analyze-observation error:", e);
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}
