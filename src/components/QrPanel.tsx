"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Compose a printable / shareable poster (dark speakeasy look) around the QR.
function drawPoster(qr: HTMLImageElement, guestUrl: string): string | null {
  const W = 1080;
  const H = 1620;
  const cx = W / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#100b07");
  bg.addColorStop(1, "#1b1410");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // warm glow behind the QR
  const glow = ctx.createRadialGradient(cx, 800, 40, cx, 800, 540);
  glow.addColorStop(0, "rgba(224,173,83,0.18)");
  glow.addColorStop(1, "rgba(224,173,83,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 260, W, 1080);

  // gold frame
  ctx.strokeStyle = "rgba(224,173,83,0.4)";
  ctx.lineWidth = 3;
  roundRect(ctx, 46, 46, W - 92, H - 92, 40);
  ctx.stroke();

  ctx.textAlign = "center";

  // eyebrow
  ctx.fillStyle = "#e0ad53";
  ctx.font = "600 30px Georgia, 'Times New Roman', serif";
  ctx.fillText("H O M E   C O C K T A I L   B A R", cx, 205);

  // title
  ctx.fillStyle = "#e0ad53";
  ctx.font = "700 108px Georgia, 'Times New Roman', serif";
  ctx.fillText("屋企調酒吧", cx, 335);

  // subtitle
  ctx.fillStyle = "#b6a386";
  ctx.font = "400 40px system-ui, -apple-system, 'PingFang HK', sans-serif";
  ctx.fillText("掃一掃，今晚我請你飲 🍸", cx, 415);

  // cream QR card
  const cardSize = 660;
  const cardX = cx - cardSize / 2;
  const cardY = 480;
  ctx.fillStyle = "#f5ede0";
  roundRect(ctx, cardX, cardY, cardSize, cardSize, 44);
  ctx.fill();
  const pad = 36;
  ctx.drawImage(qr, cardX + pad, cardY + pad, cardSize - pad * 2, cardSize - pad * 2);

  // instruction
  ctx.fillStyle = "#f7efe2";
  ctx.font = "600 46px system-ui, -apple-system, 'PingFang HK', sans-serif";
  ctx.fillText("📷 用相機掃我入落單頁", cx, cardY + cardSize + 100);

  // url
  ctx.fillStyle = "#8a7860";
  ctx.font = "400 32px ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.fillText(guestUrl.replace(/^https?:\/\//, ""), cx, cardY + cardSize + 156);

  // footer
  const fy = H - 150;
  const line = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
  line.addColorStop(0, "rgba(224,173,83,0)");
  line.addColorStop(0.5, "rgba(224,173,83,0.7)");
  line.addColorStop(1, "rgba(224,173,83,0)");
  ctx.fillStyle = line;
  ctx.fillRect(cx - 200, fy, 400, 2);

  ctx.fillStyle = "#b6a386";
  ctx.font = "400 34px system-ui, -apple-system, 'PingFang HK', sans-serif";
  ctx.fillText("揀酒 · 落單 · 等上枱", cx, fy + 58);

  return canvas.toDataURL("image/png");
}

export default function QrPanel() {
  const [url, setUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const guestUrl = window.location.origin + "/";
    const share =
      typeof navigator !== "undefined" && typeof navigator.share === "function";
    let cancelled = false;
    (async () => {
      let poster = "";
      try {
        const qrDataUrl = await QRCode.toDataURL(guestUrl, {
          width: 760,
          margin: 1,
          color: { dark: "#1a1206", light: "#f5ede0" },
        });
        const qr = await loadImage(qrDataUrl);
        poster = drawPoster(qr, guestUrl) ?? "";
      } catch {
        // QR / canvas unavailable — copy-link still works
      }
      if (cancelled) return;
      setUrl(guestUrl);
      setCanShare(share);
      setPosterUrl(poster);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — guest can still long-press the link
    }
  }

  async function sharePoster() {
    if (!posterUrl) return;
    try {
      const blob = await (await fetch(posterUrl)).blob();
      const file = new File([blob], "cocktail-poster.png", {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "屋企調酒吧",
          text: "掃我落單飲嘢 🍸",
        });
        return;
      }
      await navigator.share({
        title: "屋企調酒吧",
        text: "掃我落單飲嘢 🍸",
        url,
      });
    } catch {
      // user cancelled the share sheet — no-op
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">客人 QR 海報</h2>
        <p className="text-sm text-muted">
          印出嚟、擺枱面或者傳俾朋友，掃完直接入落單頁。
        </p>
      </div>

      <div className="card flex flex-col items-center gap-4 p-6">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt="客人落單 QR 海報"
            className="w-full max-w-[20rem] rounded-2xl shadow-lg shadow-black/40 animate-fade-up"
          />
        ) : (
          <div className="aspect-[2/3] w-full max-w-[20rem] animate-pulse rounded-2xl bg-surface-2" />
        )}

        {url && (
          <p className="break-all text-center text-sm text-muted">{url}</p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={posterUrl || undefined}
            download="cocktail-poster.png"
            aria-disabled={!posterUrl}
            className={`btn-gold rounded-xl px-5 py-2.5 text-sm ${
              posterUrl ? "" : "pointer-events-none opacity-60"
            }`}
          >
            ⬇️ 下載海報
          </a>
          {canShare && (
            <button
              onClick={sharePoster}
              disabled={!posterUrl}
              className="btn-ghost rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"
            >
              📤 分享海報
            </button>
          )}
          <button
            onClick={copyLink}
            className="btn-ghost rounded-xl px-5 py-2.5 text-sm"
          >
            {copied ? "已複製 ✓" : "🔗 複製連結"}
          </button>
        </div>
      </div>

      <p className="card p-4 text-sm text-muted">
        提示：部署到 Vercel 之後，呢個連結就會變成公開網址，朋友用任何手機掃都用到。
      </p>
    </div>
  );
}
