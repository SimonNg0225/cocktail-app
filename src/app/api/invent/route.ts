import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

// PUBLIC: invents ONE brand-new, named cocktail for a guest's vibe, using the
// bar's ingredient palette (drawn from existing drinks). Not added to the menu —
// it's a one-off "為你而調".
export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "未設定 AI" }, { status: 500 });
  }
  const body = await request.json().catch(() => ({}));
  const vibe: string = (body?.vibe ?? "").toString().slice(0, 200).trim();

  const supabase = await createClient();
  const { data } = await supabase
    .from("drinks")
    .select("name, ingredients")
    .eq("is_available", true);
  const drinks = (data as { name: string; ingredients?: string[] }[]) ?? [];
  const palette = Array.from(
    new Set(
      drinks
        .flatMap((d) => d.ingredients ?? [])
        // strip amounts so we get bare ingredient names
        .map((s) => s.replace(/[\d.]+\s*(ml|oz|dash|drop|份|滴|茶匙|湯匙)?/gi, "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 40);
  const existingNames = drinks.map((d) => d.name);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `你係一位有創意嘅調酒師。請即場「發明一杯全新」嘅雞尾酒，俾一位客人。

客人想要嘅感覺：「${vibe || "畀調酒師自由發揮"}」

${palette.length ? `吧台大致有呢啲材料（可自由組合，亦可假設有水、冰、糖漿等基本嘢）：\n${palette.join("、")}` : ""}

要求：
- 改一個「有創意、好記、似招牌特調」嘅名（繁體中文，可帶英文）。
- 唔好同呢啲現有酒撞名：${existingNames.join("、") || "（暫無）"}。
- 一句吸引嘅簡介。
- 材料清單：每項都要寫明份量（例如「白氈酒 45ml」「青檸汁 20ml」「糖漿 15ml」）。
- 簡單做法步驟。
- 0 至 3 個風格標籤（英文 id）：mocktail、strong、refreshing、sweet、sour、sparkling。
- 估計 abv 百分比數字（無酒精 0）。
用繁體中文（廣東話亦可）。`;

  try {
    const r = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            abv: { type: Type.NUMBER },
          },
          required: ["name", "description", "ingredients", "steps", "tags", "abv"],
          propertyOrdering: [
            "name",
            "description",
            "ingredients",
            "steps",
            "tags",
            "abv",
          ],
        },
      },
    });
    const p = JSON.parse(r.text ?? "{}");
    if (!p?.name) {
      return NextResponse.json({ error: "AI 諗唔到，再試吓" }, { status: 502 });
    }
    return NextResponse.json({
      name: String(p.name).slice(0, 60),
      description: String(p.description ?? "").slice(0, 200),
      ingredients: Array.isArray(p.ingredients)
        ? p.ingredients.map((x: unknown) => String(x)).slice(0, 12)
        : [],
      steps: Array.isArray(p.steps)
        ? p.steps.map((x: unknown) => String(x)).slice(0, 10)
        : [],
      tags: Array.isArray(p.tags) ? p.tags.map((x: unknown) => String(x)) : [],
      abv: typeof p.abv === "number" ? p.abv : null,
    });
  } catch (err) {
    console.error("invent error", err);
    return NextResponse.json({ error: "AI 生成失敗，請再試。" }, { status: 502 });
  }
}
