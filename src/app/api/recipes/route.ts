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

  // Existing menu drinks — so the AI doesn't propose duplicates of what's
  // already on the menu, and as a safety net we filter them out afterwards.
  const { data: existing } = await supabase.from("drinks").select("name");
  const existingNames = (existing ?? [])
    .map((d) => (d.name ?? "").toString().trim())
    .filter(Boolean);
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const existingSet = new Set(existingNames.map(norm));

  const stockList = inventory
    .map((i) => `- ${i.name} (${i.category})`)
    .join("\n");

  const excludeBlock = existingNames.length
    ? `\n\n酒單上已經有以下呢啲酒，請「唔好」重複推薦（要構思同呢啲唔一樣嘅酒）：\n${existingNames
        .map((n) => `- ${n}`)
        .join("\n")}`
    : "";

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `你係一位專業調酒師。以下係屋企吧台現有嘅材料：

${stockList}

請只用上面列出嘅材料（可以假設有水、冰、糖／糖漿等基本嘢），構思 4 至 6 款可以即刻調到嘅雞尾酒。${
    preference ? `客人偏好：${preference}。` : ""
  }${excludeBlock}

每款請提供：名、一句簡介、所需材料清單、簡單做法步驟、0 至 3 個風格標籤，同埋估計每杯嘅酒精濃度 abv（百分比數字，例如 0、5、18；無酒精就 0）。

⚠️ 材料清單每一項都「必須」寫明份量，格式為「材料名 + 空格 + 份量」，例如：「白氈酒 45ml」、「青檸汁 20ml」、「糖漿 15ml」、「安格仕苦精 2 dash」。蘇打水／湯力水之類可寫「適量」或「填滿」，但都要有份量字眼。絕對唔好淨係寫材料名而冇份量。

標籤淨係可以由呢幾個揀（用英文 id）：mocktail（無酒精）、strong（烈）、refreshing（清爽）、sweet（甜）、sour（酸）、sparkling（有氣）。用繁體中文（廣東話亦可）。唔好推薦需要冇列出材料嘅酒。`;

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
                    description:
                      "每項材料都要含份量，例如「白氈酒 45ml」「青檸汁 20ml」「糖漿 15ml」「苦精 2 dash」；唔可以淨係材料名。",
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
    // Safety net: drop any recipe whose name already exists on the menu.
    const recipes = (parsed.recipes ?? []).filter(
      (r: { name?: string }) => !existingSet.has(norm((r?.name ?? "").toString())),
    );
    return NextResponse.json({ recipes });
  } catch (err) {
    console.error("Gemini error", err);
    return NextResponse.json(
      { error: "AI 生成失敗，請再試。" },
      { status: 502 },
    );
  }
}
