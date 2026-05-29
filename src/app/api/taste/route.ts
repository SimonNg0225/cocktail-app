import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// PUBLIC: returns a short, shareable "taste persona" blurb for a guest's 圖鑑.
// Falls back to a template when no API key / on error, so the share card always
// has copy.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const persona = (body?.persona ?? "").toString().slice(0, 40).trim();
  const drinks: string[] = Array.isArray(body?.drinks)
    ? body.drinks.map((x: unknown) => String(x)).slice(0, 8)
    : [];

  const fallback = persona
    ? `你係「${persona}」，識飲識享受，派對上嘅靈魂人物。`
    : "識飲之選，越夜越精彩。";

  if (!process.env.GEMINI_API_KEY || !persona) {
    return NextResponse.json({ blurb: fallback });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `用繁體中文（廣東話亦可）寫「一句」35 字以內、生動有性格嘅「品味人格」描述，俾飲家分享上社交媒體。佢嘅人格係「${persona}」${
      drinks.length ? `，飲過：${drinks.join("、")}` : ""
    }。只回一句，唔好加引號或標題。`;
    const r = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const t = (r.text ?? "").replace(/^["「『]|["」』]$/g, "").trim().slice(0, 120);
    return NextResponse.json({ blurb: t || fallback });
  } catch {
    return NextResponse.json({ blurb: fallback });
  }
}
