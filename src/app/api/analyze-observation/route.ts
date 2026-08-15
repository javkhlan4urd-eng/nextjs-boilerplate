import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildObservationPrompt, extractObservationFields, callGemini } from "@/lib/observationAI";

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
  const mediaUrl: string | undefined = body.mediaUrl || body.imageUrl || undefined;
  const planText: string | undefined = typeof body.planText === "string" ? body.planText : undefined;
  const { domainName, outcomeCode, outcomeDescription } = body;

  if (!mediaUrl && !planText?.trim()) {
    return NextResponse.json(
      { error: "Зураг/бичлэг эсвэл үйл ажиллагааны төлөвлөлт шаардлагатай" },
      { status: 400 }
    );
  }

  try {
    let media: { mimeType: string; base64: string } | undefined;
    let isVideo = false;

    if (mediaUrl) {
      const mediaRes = await fetch(mediaUrl);
      if (!mediaRes.ok) throw new Error("Зураг/бичлэгийг татаж чадсангүй");

      let contentType = mediaRes.headers.get("content-type") || "";
      if (!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") {
        contentType = guessMimeFromUrl(mediaUrl) || "image/jpeg";
      }
      isVideo = contentType.startsWith("video/");

      const buffer = Buffer.from(await mediaRes.arrayBuffer());
      if (buffer.byteLength > MAX_INLINE_BYTES) {
        return NextResponse.json(
          { error: "Файлын хэмжээ хэт том байна (20MB-с бага бичлэг/зураг ашиглана уу)" },
          { status: 413 }
        );
      }
      media = { mimeType: contentType, base64: buffer.toString("base64") };
    }

    const prompt = buildObservationPrompt({
      domainName,
      outcomeCode,
      outcomeDescription,
      planText,
      hasMedia: !!media,
      isVideo,
    });

    const text = await callGemini(apiKey, prompt, media);
    const result = extractObservationFields(text);
    return NextResponse.json(result);
  } catch (e) {
    console.error("analyze-observation error:", e);
    const message = e instanceof Error ? e.message : "Алдаа гарлаа";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
