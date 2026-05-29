import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

// Host-only: take one drink whose ingredients are missing amounts and return the
// same ingredients with sensible quantities added, plus an updated recipe text.
export async function POST(request: Request) {
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
  const description: string = (body?.description ?? "").toString().slice(0, 300);
  const ingredients: string[] = Array.isArray(body?.ingredients)
    ? body.ingredients.map((x: unknown) => String(x)).slice(0, 30)
    : [];
  const recipe: string = (body?.recipe ?? "").toString().slice(0, 1500);
  if (!name || ingredients.length === 0) {
    return NextResponse.json({ error: "缺少酒名或材料" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `你係專業調酒師。下面一杯酒嘅材料缺咗份量，請為「每一種材料」補返合理份量。

規則：
- 材料嘅「種類同數量」必須保持一樣、次序唔變，淨係喺每項加返份量。
- 份量格式：「材料名 + 空格 + 份量」，例如「白氈酒 45ml」「青檸汁 20ml」「糖漿 15ml」「苦精 2 dash」；蘇打水／湯力水可寫「適量」或「填滿」。
- 同時輸出一段做法（如有原做法就沿用，順手對齊份量），用繁體中文（廣東話亦可）。

酒名：${name}
${description ? `簡介：${description}\n` : ""}原材料：${ingredients.join("、")}
${recipe ? `原做法／配方：\n${recipe}` : ""}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredients: {
              type: Type.ARRAY,
              description: "同原本一樣嘅材料，但每項都加咗份量",
              items: { type: Type.STRING },
            },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["ingredients", "steps"],
          propertyOrdering: ["ingredients", "steps"],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? "{}");
    const outIng: string[] = Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
    const steps: string[] = Array.isArray(parsed.steps)
      ? parsed.steps.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
    if (outIng.length === 0) {
      return NextResponse.json({ error: "AI 無法補份量" }, { status: 502 });
    }
    const recipeText = [
      "材料：\n" + outIng.map((i) => `· ${i}`).join("\n"),
      steps.length
        ? "做法：\n" + steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return NextResponse.json({ ingredients: outIng, recipe: recipeText });
  } catch (err) {
    console.error("amend error", err);
    return NextResponse.json({ error: "AI 生成失敗，請再試。" }, { status: 502 });
  }
}
