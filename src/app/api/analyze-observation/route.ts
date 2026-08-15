import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  "3gp": "video/3gpp",
};

function guessMimeFromUrl(url: string): string | null {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return (ext && EXT_MIME[ext]) || null;
}

const MAX_INLINE_BYTES = 18 * 1024 * 1024; // Gemini inline_data limit is ~20MB per request

function buildPrompt({
  domainName,
  outcomeCode,
  outcomeDescription,
  isVideo,
}: {
  domainName?: string;
  outcomeCode?: string;
  outcomeDescription?: string;
  isVideo: boolean;
}) {
  const outcomeContext =
    outcomeCode && outcomeDescription
      ? `Ажиглаж буй суралцахуйн үр дүн (СҮД): ${outcomeCode} — ${outcomeDescription} (${domainName ?? ""} чиглэл).`
      : domainName
        ? `Ажиглаж буй суралцахуйн чиглэл: ${domainName}.`
        : "";

  const mediaWord = isVideo ? "бичлэг" : "зураг";

  return `Та Сургуулийн өмнөх боловсролын (СӨБ) цэцэрлэгийн туслах багш. Хавсаргасан ${mediaWord}ан дээр хүүхэд ямар үйл ажиллагаа хийж байгааг сайтар ажигла. ${outcomeContext}

Даалгавар: Дараах 7 хэсгийг СӨБ-ийн ажиглалтын стандартын дагуу, монгол хэлээр, зөв бичгийн дүрмийг баримтлан, объектив бөгөөд тодорхой бичнэ үү. ${mediaWord === "бичлэг" ? "Бичлэгээс шууд харагдахгүй зүйлийг (жишээ нь хүүхдийн яриа)" : "Зургаас шууд харагдахгүй зүйлийг (жишээ нь хүүхдийн яриа)"} боломжит, түгээмэл жишээ маягаар бич, эсвэл товч орхиж болно. Хариултаа яг доорх форматаар, 7 тэмдэглэгээгээр тусад нь бич (тэмдэглэгээ бүрийн дараа 1-2 өгүүлбэр):

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

  const body = await request.json();
  const mediaUrl: string | undefined = body.mediaUrl || body.imageUrl;
  const { domainName, outcomeCode, outcomeDescription } = body;
  if (!mediaUrl || typeof mediaUrl !== "string") {
    return NextResponse.json({ error: "Зураг/бичлэгийн хаяг дутуу байна" }, { status: 400 });
  }

  try {
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) throw new Error("Зураг/бичлэгийг татаж чадсангүй");

    let contentType = mediaRes.headers.get("content-type") || "";
    if (!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") {
      contentType = guessMimeFromUrl(mediaUrl) || "image/jpeg";
    }
    const isVideo = contentType.startsWith("video/");

    const buffer = Buffer.from(await mediaRes.arrayBuffer());
    if (buffer.byteLength > MAX_INLINE_BYTES) {
      return NextResponse.json(
        { error: "Файлын хэмжээ хэт том байна (20MB-с бага бичлэг/зураг ашиглана уу)" },
        { status: 413 }
      );
    }
    const base64 = buffer.toString("base64");

    const prompt = buildPrompt({ domainName, outcomeCode, outcomeDescription, isVideo });

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
      console.error("Gemini error:", contentType, errText);
      return NextResponse.json({ error: "AI дүн шинжилгээ амжилтгүй боллоо" }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const text: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      const blockReason = geminiData?.promptFeedback?.blockReason;
      console.error("Gemini empty response:", JSON.stringify(geminiData));
      return NextResponse.json(
        { error: blockReason ? `AI хариу өгсөнгүй (${blockReason})` : "AI хариу өгсөнгүй" },
        { status: 502 }
      );
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
    const message = e instanceof Error ? e.message : "Алдаа гарлаа";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
