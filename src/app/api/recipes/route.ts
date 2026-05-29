import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Host-only: must be logged in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "未設定 GEMINI_API_KEY" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const preference: string = (body?.preference ?? "").toString().slice(0, 300);

  const { data: inventory } = await supabase
    .from("inventory")
    .select("name, category, in_stock")
    .eq("in_stock", true);

  if (!inventory || inventory.length === 0) {
    return NextResponse.json(
      { error: "庫存係空，先去『庫存』加入你有嘅酒。" },
      { status: 400 },
    );
  }

  const stockList = inventory
    .map((i) => `- ${i.name} (${i.category})`)
    .join("\n");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `你係一位專業調酒師。以下係屋企吧台現有嘅材料：

${stockList}

請只用上面列出嘅材料（可以假設有水、冰、糖／糖漿等基本嘢），構思 4 至 6 款可以即刻調到嘅雞尾酒。${
    preference ? `客人偏好：${preference}。` : ""
  }

每款請提供：名、一句簡介、所需材料清單、簡單做法步驟、0 至 3 個風格標籤，同埋估計每杯嘅酒精濃度 abv（百分比數字，例如 0、5、18；無酒精就 0）。標籤淨係可以由呢幾個揀（用英文 id）：mocktail（無酒精）、strong（烈）、refreshing（清爽）、sweet（甜）、sour（酸）、sparkling（有氣）。用繁體中文（廣東話亦可）。唔好推薦需要冇列出材料嘅酒。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  ingredients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  abv: { type: Type.NUMBER },
                },
                required: [
                  "name",
                  "description",
                  "ingredients",
                  "steps",
                  "tags",
                  "abv",
                ],
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
          },
          required: ["recipes"],
        },
      },
    });

    const text = response.text ?? "{}";
    const parsed = JSON.parse(text);
    return NextResponse.json({ recipes: parsed.recipes ?? [] });
  } catch (err) {
    console.error("Gemini error", err);
    return NextResponse.json(
      { error: "AI 生成失敗，請再試。" },
      { status: 502 },
    );
  }
}
