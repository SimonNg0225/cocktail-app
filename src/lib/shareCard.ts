// Generates a branded, share-ready image card for a drink and hands it to the
// native share sheet (or downloads it as a fallback). Drives organic reach:
// every shared card carries the bar's brand. Pure canvas — no server round-trip.
import { strengthInfo } from "./strength";
import { tagLabel } from "./tags";
import type { Drink } from "./types";
import { toast } from "./toast";
import { haptic } from "./haptics";

// TODO(commercial): make this per-venue once multi-tenant lands.
const BRAND = "屋企調酒吧";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // allow drawing to an untainted canvas
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Character-based wrapping — works for both CJK and Latin text.
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function draw(drink: Drink, img: HTMLImageElement | null): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const pad = 80;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background + warm gold glow
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#251c15");
  bg.addColorStop(1, "#0e0a07");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 120, 40, W / 2, 120, 760);
  glow.addColorStop(0, "rgba(224,173,83,0.22)");
  glow.addColorStop(1, "rgba(224,173,83,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Brand line
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e0ad53";
  ctx.font = "600 32px Georgia, 'WenQuanYi Zen Hei', serif";
  ctx.fillText("🍸 " + BRAND, pad, 96);

  // Image / placeholder
  const ix = pad,
    iy = 140,
    iw = W - pad * 2,
    ih = 620;
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, 36);
  ctx.clip();
  if (img) {
    drawCover(ctx, img, ix, iy, iw, ih);
  } else {
    const pg = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
    pg.addColorStop(0, "#4a2c1a");
    pg.addColorStop(1, "#c8893a");
    ctx.fillStyle = pg;
    ctx.fillRect(ix, iy, iw, ih);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "260px serif";
    ctx.fillText("🍸", ix + iw / 2, iy + ih / 2 + 10);
  }
  ctx.restore();
  // subtle bottom fade over the image for legibility
  const fade = ctx.createLinearGradient(0, iy + ih - 140, 0, iy + ih);
  fade.addColorStop(0, "rgba(14,10,7,0)");
  fade.addColorStop(1, "rgba(14,10,7,0.55)");
  ctx.fillStyle = fade;
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, 36);
  ctx.clip();
  ctx.fillRect(ix, iy + ih - 140, iw, 140);
  ctx.restore();

  // Name
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = iy + ih + 96;
  ctx.fillStyle = "#f7efe2";
  ctx.font = "700 72px Georgia, 'WenQuanYi Zen Hei', serif";
  for (const line of wrap(ctx, drink.name, W - pad * 2).slice(0, 2)) {
    ctx.fillText(line, pad, y);
    y += 86;
  }

  // Chips: strength + tags
  const strength = strengthInfo(drink.abv);
  const chips: string[] = [];
  if (strength) chips.push(`${strength.emoji} ${strength.label}`);
  for (const t of (drink.tags ?? []).slice(0, 3)) chips.push(tagLabel(t));
  if (chips.length) {
    y += 14;
    ctx.font = "30px Georgia, 'WenQuanYi Zen Hei', serif";
    let cx = pad;
    const ch = 52;
    for (const c of chips) {
      const tw = ctx.measureText(c).width;
      const cw = tw + 44;
      if (cx + cw > W - pad) break;
      ctx.fillStyle = "rgba(224,173,83,0.16)";
      roundRect(ctx, cx, y - ch + 14, cw, ch, ch / 2);
      ctx.fill();
      ctx.fillStyle = "#e0ad53";
      ctx.fillText(c, cx + 22, y + 12);
      cx += cw + 16;
    }
    y += 54;
  }

  // Description
  if (drink.description) {
    y += 14;
    ctx.fillStyle = "#c9b89a";
    ctx.font = "36px Georgia, 'WenQuanYi Zen Hei', serif";
    for (const line of wrap(ctx, drink.description, W - pad * 2).slice(0, 3)) {
      ctx.fillText(line, pad, y);
      y += 50;
    }
  }

  // Footer call-to-action
  ctx.fillStyle = "#8a7860";
  ctx.font = "30px Georgia, 'WenQuanYi Zen Hei', serif";
  ctx.fillText("掃碼落單 · 即叫即調", pad, H - 72);

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null); // tainted canvas (cross-origin image without CORS)
    }
  });
}

async function buildCard(drink: Drink): Promise<Blob> {
  const img = drink.image_url ? await loadImage(drink.image_url) : null;
  let blob = await toBlob(draw(drink, img));
  // If the photo tainted the canvas, fall back to the gradient version.
  if (!blob && img) blob = await toBlob(draw(drink, null));
  if (!blob) throw new Error("card render failed");
  return blob;
}

export async function shareDrinkCard(drink: Drink) {
  haptic("light");
  try {
    const blob = await buildCard(drink);
    const file = new File([blob], `${drink.name}.png`, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
      share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({
        files: [file],
        title: drink.name,
        text: `${drink.name} · ${BRAND}`,
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${drink.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast("已下載分享卡 🖼️");
    }
  } catch (e) {
    // User cancelling the native share sheet throws AbortError — that's fine.
    if ((e as Error)?.name !== "AbortError") {
      toast("分享卡整唔到，遲啲再試 🙏");
    }
  }
}
