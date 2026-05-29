import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { tagLabel } from "@/lib/tags";
import type { Drink } from "@/lib/types";

// PUBLIC endpoint (no login) — guests use this to get an AI pick.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drinks")
    .select("*")
    .eq("is_available", true);
  const drinks = (data as Drink[]) ?? [];

  if (drinks.length === 0) {
    return NextResponse.json({ error: "而家未有酒可揀。" }, { status: 400 });
  }

  const random = () => drinks[Math.floor(Math.random() * drinks.length)];

  const body = await request.json().catch(() => ({}));
  const mood: string = (body?.mood ?? "").toString().slice(0, 200).trim();

  // No mood, or no API key → cheap random pick (still useful).
  if (!mood || !process.env.GEMINI_API_KEY) {
    const pick = random();
    return NextResponse.json({
      drinkId: pick.id,
      name: pick.name,
      reason: "幫你隨機揀咗一杯 🎲",
    });
  }

  const menu = drinks
    .map((d, i) => {
      const tags = (d.tags ?? []).map(tagLabel).join("、");
      const ing = (d.ingredients ?? []).join("、");
      return `${i + 1}. ${d.name}${d.description ? ` — ${d.description}` : ""}${
        tags ? `（${tags}）` : ""
      }${ing ? `；材料：${ing}` : ""}`;
    })
    .join("\n");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `你係屋企吧台嘅調酒師。以下係而家即刻整到嘅酒單：

${menu}

客人話佢想要：「${mood}」

請由上面酒單揀「一杯」最啱佢嘅。淨係可以揀名單上面有嘅酒，要原字照抄杯名。再用繁體中文（廣東話亦可）寫一句 30 字內、親切啲嘅推薦理由。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ["name", "reason"],
          propertyOrdering: ["name", "reason"],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? "{}");
    const picked: string = (parsed.name ?? "").toString().trim();
    const match =
      drinks.find((d) => d.name === picked) ??
      (picked
        ? drinks.find(
            (d) => d.name.includes(picked) || picked.includes(d.name),
          )
        : undefined);
    const pick = match ?? random();

    return NextResponse.json({
      drinkId: pick.id,
      name: pick.name,
      reason: (parsed.reason ?? "啱你今晚心情 🍸").toString().slice(0, 120),
    });
  } catch (err) {
    console.error("suggest error", err);
    const pick = random();
    return NextResponse.json({
      drinkId: pick.id,
      name: pick.name,
      reason: "幫你隨機揀咗一杯 🎲",
    });
  }
}
