// Builds the AI "taste persona" share card (IG portrait) from a guest's 圖鑑
// summary and hands it to the native share sheet (or downloads it). Black & gold
// to match the Tasting Passport. Includes a QR back to the menu for viral reach.
import QRCode from "qrcode";
import { toast } from "./toast";
import { haptic } from "./haptics";

const BRAND = "屋企調酒吧";

export type PersonaSummary = {
  persona: string;
  level: number;
  collected: number;
  total: number;
  cups: number;
  top: string[]; // up to 3 drink names
  blurb: string;
};

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

function glass(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  lw = 5,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy - r * 0.45);
  ctx.lineTo(cx + r * 0.55, cy - r * 0.45);
  ctx.lineTo(cx, cy + r * 0.18);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.18);
  ctx.lineTo(cx, cy + r * 0.5);
  ctx.moveTo(cx - r * 0.32, cy + r * 0.5);
  ctx.lineTo(cx + r * 0.32, cy + r * 0.5);
  ctx.stroke();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function draw(s: PersonaSummary): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const SERIF = "'WenQuanYi Zen Hei', Georgia, serif";

  // bg + glow
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#251c15");
  bg.addColorStop(1, "#0e0a07");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 150, 40, W / 2, 150, 780);
  glow.addColorStop(0, "rgba(224,173,83,0.20)");
  glow.addColorStop(1, "rgba(224,173,83,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // gold double frame
  ctx.strokeStyle = "rgba(224,173,83,0.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 40, W - 80, H - 80, 40);
  ctx.stroke();
  ctx.strokeStyle = "rgba(224,173,83,0.25)";
  ctx.lineWidth = 1;
  roundRect(ctx, 54, 54, W - 108, H - 108, 34);
  ctx.stroke();

  const C = W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#e0ad53";
  ctx.font = `600 26px ${SERIF}`;
  ctx.fillText("TASTING PASSPORT", C, 120);
  ctx.fillStyle = "#a0907a";
  ctx.font = `30px ${SERIF}`;
  ctx.fillText(BRAND, C, 168);

  ctx.strokeStyle = "rgba(224,173,83,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(C - 90, 210);
  ctx.lineTo(C + 90, 210);
  ctx.stroke();

  ctx.fillStyle = "#a0907a";
  ctx.font = `30px ${SERIF}`;
  ctx.fillText("我的品味人格", C, 268);

  // persona (auto-fit width)
  let psz = 110;
  ctx.font = `700 ${psz}px ${SERIF}`;
  while (ctx.measureText(s.persona).width > W - 180 && psz > 48) {
    psz -= 6;
    ctx.font = `700 ${psz}px ${SERIF}`;
  }
  ctx.fillStyle = "#f4d699";
  ctx.fillText(s.persona, C, 410);

  // blurb (wrap)
  ctx.fillStyle = "#e9dcc4";
  ctx.font = `34px ${SERIF}`;
  const words = [...(s.blurb || "")];
  const lines: string[] = [];
  let line = "";
  for (const ch of words) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    const t = line + ch;
    if (ctx.measureText(t).width > W - 200 && line) {
      lines.push(line);
      line = ch;
    } else line = t;
  }
  if (line) lines.push(line);
  let by = 500;
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, C, by);
    by += 52;
  }

  // stat chips
  const chips = [
    s.level > 0 ? `品酒師 Lv.${s.level}` : "新手",
    `收集 ${s.collected} / ${s.total} 款`,
    `${s.cups} 杯落肚`,
  ];
  ctx.font = `30px ${SERIF}`;
  const cw = chips.map((c) => ctx.measureText(c).width + 56);
  const totalW = cw.reduce((a, b) => a + b, 0) + 24 * (chips.length - 1);
  let cx = C - totalW / 2;
  const cy = by + 30;
  chips.forEach((c, i) => {
    ctx.fillStyle = "rgba(224,173,83,0.16)";
    roundRect(ctx, cx, cy, cw[i], 62, 31);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,173,83,0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, cx, cy, cw[i], 62, 31);
    ctx.stroke();
    ctx.fillStyle = "#e0ad53";
    ctx.fillText(c, cx + cw[i] / 2, cy + 41);
    cx += cw[i] + 24;
  });

  // top drinks seals
  if (s.top.length > 0) {
    ctx.fillStyle = "#a0907a";
    ctx.font = `26px ${SERIF}`;
    ctx.fillText("最常飲", C, cy + 150);
    const n = Math.min(s.top.length, 3);
    s.top.slice(0, 3).forEach((nm, i) => {
      const sx = C + (i - (n - 1) / 2) * 220;
      const sy = cy + 270;
      ctx.fillStyle = "#241b13";
      ctx.beginPath();
      ctx.arc(sx, sy, 72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e0ad53";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, 72, 0, Math.PI * 2);
      ctx.stroke();
      glass(ctx, sx, sy, 56, "#f4d699", 5);
      ctx.fillStyle = "#e9dcc4";
      ctx.font = `28px ${SERIF}`;
      ctx.textAlign = "center";
      const name = nm.length > 8 ? nm.slice(0, 8) + "…" : nm;
      ctx.fillText(name, sx, sy + 110);
    });
  }

  // footer: QR + CTA
  const url =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 300,
      color: { dark: "#1a1206", light: "#f7efe2" },
    });
    const qr = await loadImage(dataUrl);
    if (qr) {
      const qs = 150;
      const qx = 92;
      const qy = H - 230;
      ctx.fillStyle = "#f7efe2";
      roundRect(ctx, qx - 8, qy - 8, qs + 16, qs + 16, 14);
      ctx.fill();
      ctx.drawImage(qr, qx, qy, qs, qs);
      ctx.textAlign = "left";
      ctx.fillStyle = "#f4d699";
      ctx.font = `40px ${SERIF}`;
      ctx.fillText("掃碼即叫即調", qx + qs + 40, qy + 56);
      ctx.fillStyle = "#a0907a";
      ctx.font = `28px ${SERIF}`;
      ctx.fillText("整一杯屬於你嘅雞尾酒", qx + qs + 40, qy + 104);
    }
  } catch {
    // QR optional
  }

  return cv;
}

function toBlob(cv: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      cv.toBlob((b) => resolve(b), "image/png");
    } catch {
      resolve(null);
    }
  });
}

export async function shareTasteCard(summary: PersonaSummary) {
  haptic("light");
  try {
    const cv = await draw(summary);
    const blob = await toBlob(cv);
    if (!blob) throw new Error("render failed");
    const file = new File([blob], "我的品味人格.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
      share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({
        files: [file],
        title: "我的品味人格",
        text: `我喺 ${BRAND} 嘅品味人格係「${summary.persona}」🍸`,
      });
    } else {
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = "我的品味人格.png";
      a.click();
      URL.revokeObjectURL(u);
      toast("已下載品味人格卡 🖼️");
    }
  } catch (e) {
    if ((e as Error)?.name !== "AbortError") toast("整唔到卡，遲啲再試 🙏");
  }
}
