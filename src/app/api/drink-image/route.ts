import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Host-only.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "未設定 GEMINI_API_KEY" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const name: string = (body?.name ?? "").toString().slice(0, 120).trim();
  const description: string = (body?.description ?? "").toString().slice(0, 300).trim();
  if (!name) {
    return NextResponse.json({ error: "缺少酒名" }, { status: 400 });
  }

  const prompt = `Professional studio product photograph of a cocktail named "${name}".${
    description ? ` Description: ${description}.` : ""
  } Served in the correct glassware with appropriate garnish, photographed on a dark moody speakeasy bar top, warm golden rim lighting, shallow depth of field, elegant and appetizing, no text, no watermark, square composition.`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);
    const b64 = imgPart?.inlineData?.data;
    if (!b64) {
      return NextResponse.json(
        { error: "AI 冇返到圖片，請再試。" },
        { status: 502 },
      );
    }

    const compressed = await sharp(Buffer.from(b64, "base64"))
      .resize(800, 800, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82 })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${compressed.toString("base64")}`;
    return NextResponse.json({ imageUrl: dataUrl });
  } catch (err) {
    console.error("drink-image error", err);
    return NextResponse.json(
      { error: "圖片生成失敗，可能 model 暫時唔得，請再試。" },
      { status: 502 },
    );
  }
}
