// Shared drink style tags — used by host (assign) and guest (filter/display).
export const DRINK_TAGS = [
  { id: "mocktail", label: "無酒精", emoji: "🚫" },
  { id: "strong", label: "烈", emoji: "🔥" },
  { id: "refreshing", label: "清爽", emoji: "🍹" },
  { id: "sweet", label: "甜", emoji: "🍯" },
  { id: "sour", label: "酸", emoji: "🍋" },
  { id: "sparkling", label: "有氣", emoji: "🫧" },
] as const;

export type DrinkTagId = (typeof DRINK_TAGS)[number]["id"];

const TAG_BY_ID = new Map(DRINK_TAGS.map((t) => [t.id, t]));

export function tagLabel(id: string): string {
  const t = TAG_BY_ID.get(id as DrinkTagId);
  return t ? `${t.emoji} ${t.label}` : id;
}

// --- Menu sections -------------------------------------------------------
// Group the menu like a printed drinks list. Each drink lands in exactly one
// section: the first matching tag by priority, else 招牌特調 as the fallback.
const SECTION_PRIORITY = [
  "mocktail",
  "strong",
  "refreshing",
  "sweet",
  "sour",
  "sparkling",
] as const;

export const SECTION_ORDER = [
  "signature",
  ...SECTION_PRIORITY,
] as const;

export const SECTION_META: Record<string, { label: string; emoji: string }> = {
  signature: { label: "招牌特調", emoji: "🍸" },
  mocktail: { label: "無酒精", emoji: "🚫" },
  strong: { label: "烈一啲", emoji: "🔥" },
  refreshing: { label: "清爽", emoji: "🍹" },
  sweet: { label: "香甜", emoji: "🍯" },
  sour: { label: "酸爽", emoji: "🍋" },
  sparkling: { label: "有氣", emoji: "🫧" },
};

export function drinkSectionId(tags: string[]): string {
  for (const id of SECTION_PRIORITY) if (tags.includes(id)) return id;
  return "signature";
}

// Keep only recognised tag ids (used to sanitise AI / user input).
export function validTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const v of input) {
    const id = String(v).trim();
    if (TAG_BY_ID.has(id as DrinkTagId)) seen.add(id);
  }
  return [...seen];
}
