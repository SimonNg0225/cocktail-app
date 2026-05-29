# -*- coding: utf-8 -*-
"""Render three 圖鑑 (collection) UI design mockups for the user to choose."""
from PIL import Image, ImageDraw, ImageFont
import math

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def f(sz): return ImageFont.truetype(FONT, sz, index=0)

# Brand palette
BG = (12, 9, 6)
SURFACE = (37, 28, 21)
SURF2 = (45, 34, 25)
GOLD = (224, 173, 83)
GOLDL = (244, 214, 153)
GOLD2 = (200, 137, 58)
CREAM = (247, 239, 226)
MUTED = (150, 132, 104)
DIM = (70, 60, 48)
INK = (26, 18, 6)

W, H = 480, 880

def vgrad(img, top, bot, box=None):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box or (0, 0, img.width, img.height)
    h = y1 - y0
    for i in range(h):
        t = i / max(h - 1, 1)
        c = tuple(int(top[k] + (bot[k] - top[k]) * t) for k in range(3))
        d.line([(x0, y0 + i), (x1, y0 + i)], fill=c)

def center(d, cx, y, text, font, fill):
    w = d.textbbox((0, 0), text, font=font)[2]
    d.text((cx - w / 2, y), text, font=font, fill=fill)

def glass(d, cx, cy, r, color, lw=3):
    # simple martini-glass icon
    bowl = [(cx - r * 0.55, cy - r * 0.45), (cx + r * 0.55, cy - r * 0.45),
            (cx, cy + r * 0.18)]
    d.line(bowl + [bowl[0]], fill=color, width=lw, joint="curve")
    d.line([(cx, cy + r * 0.18), (cx, cy + r * 0.5)], fill=color, width=lw)
    d.line([(cx - r * 0.35, cy + r * 0.5), (cx + r * 0.35, cy + r * 0.5)],
           fill=color, width=lw)

def ring(d, cx, cy, r, color, w=4):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)

def header(img, title, sub):
    d = ImageDraw.Draw(img)
    center(d, W / 2, 30, "我 的 圖 鑑", f(30), GOLD)
    center(d, W / 2, 72, sub, f(15), MUTED)
    # progress ring hero
    cx, cy, r = W / 2, 165, 56
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=DIM, width=9)
    d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * 0.35, fill=GOLD, width=9)
    center(d, cx, cy - 22, "7/20", f(26), CREAM)
    center(d, cx, cy + 10, "品酒師 Lv.3", f(13), GOLD)

def base_panel():
    img = Image.new("RGB", (W, H), BG)
    vgrad(img, (34, 25, 18), (12, 9, 6))
    return img

# ---------- Option A: 酒櫃陳列 (lit liquor cabinet) ----------
def option_a():
    img = base_panel()
    d = ImageDraw.Draw(img)
    header(img, "方案 A · 酒櫃陳列", "玻璃酒櫃，集齊嗰杯會著燈")
    top = 250
    shelf_h = 185
    cols = 3
    drinks = [True, True, False, True, False, False, True, True, False]
    for s in range(3):
        sy = top + s * shelf_h
        # cabinet back panel
        d.rounded_rectangle([24, sy, W - 24, sy + shelf_h - 22], radius=10,
                            fill=(28, 21, 15))
        # glass shelf line
        d.line([(28, sy + shelf_h - 30), (W - 28, sy + shelf_h - 30)],
               fill=(90, 110, 120), width=3)
        for c in range(cols):
            idx = s * cols + c
            cx = 24 + (W - 48) / cols * (c + 0.5)
            cy = sy + 70
            got = drinks[idx]
            if got:
                # glow
                for rr in range(46, 30, -2):
                    a = int(18 * (46 - rr) / 16)
                    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                              fill=(min(60 + a, 90), 50 + a // 2, 24))
                d.ellipse([cx - 34, cy - 34, cx + 34, cy + 34], fill=SURF2)
                ring(d, cx, cy, 34, GOLD, 3)
                glass(d, cx, cy, 34, GOLDL, 3)
            else:
                d.ellipse([cx - 34, cy - 34, cx + 34, cy + 34], fill=(24, 19, 14))
                glass(d, cx, cy, 34, DIM, 2)
                center(d, cx, cy - 8, "?", f(22), DIM)
    return img

# ---------- Option B: 護照蓋章冊 (passport / wax seals) ----------
def option_b():
    img = base_panel()
    d = ImageDraw.Draw(img)
    header(img, "方案 B · 護照蓋章冊", "似旅行護照，蓋蠟封印章")
    # parchment page
    d.rounded_rectangle([24, 245, W - 24, H - 30], radius=18, fill=(234, 222, 198))
    d.rounded_rectangle([24, 245, W - 24, H - 30], radius=18, outline=(120, 95, 60), width=2)
    seals = [(True, -8), (True, 6), (False, 0),
             (True, 10), (False, 0), (True, -6),
             (False, 0), (True, 4), (True, -10)]
    for i, (got, ang) in enumerate(seals):
        c = i % 3
        r0 = i // 3
        cx = 24 + (W - 48) / 3 * (c + 0.5)
        cy = 320 + r0 * 130
        if got:
            seal = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
            sd = ImageDraw.Draw(seal)
            sd.ellipse([10, 10, 110, 110], fill=(200, 137, 58, 255))
            sd.ellipse([10, 10, 110, 110], outline=(150, 100, 40, 255), width=4)
            sd.ellipse([24, 24, 96, 96], outline=(120, 80, 30, 200), width=2)
            glass(sd, 60, 60, 40, (90, 55, 18), 4)
            seal = seal.rotate(ang, resample=Image.BICUBIC, expand=False)
            img.paste(seal, (int(cx - 60), int(cy - 60)), seal)
        else:
            # empty embossed slot
            for off in range(0, 360, 24):
                a = math.radians(off)
                d.ellipse([cx + 38 * math.cos(a) - 2, cy + 38 * math.sin(a) - 2,
                           cx + 38 * math.cos(a) + 2, cy + 38 * math.sin(a) + 2],
                          fill=(170, 150, 120))
    return img

# ---------- Option C: 稀有度卡冊 (rarity TCG binder) ----------
def option_c():
    img = base_panel()
    d = ImageDraw.Draw(img)
    header(img, "方案 C · 稀有度卡冊", "似卡牌冊，分普通/稀有/傳說")
    rar = [GOLD, (150, 120, 200), (120, 130, 145),
           (150, 120, 200), (120, 130, 145), None,
           GOLD, (120, 130, 145), None]
    cols = 3
    cw = (W - 48 - 2 * 16) / cols
    ch = 150
    for i, col in enumerate(rar):
        c = i % 3
        r0 = i // 3
        x = 24 + c * (cw + 16)
        y = 250 + r0 * (ch + 16)
        if col is None:
            d.rounded_rectangle([x, y, x + cw, y + ch], radius=12,
                                fill=(22, 17, 12), outline=DIM, width=2)
            center(d, x + cw / 2, y + ch / 2 - 12, "?", f(30), DIM)
            continue
        # card
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=12, fill=SURFACE,
                            outline=col, width=4)
        # foil hint for legendary (gold)
        if col == GOLD:
            for k in range(0, int(cw), 10):
                d.line([(x + k, y + 4), (x + k + 6, y + 4)], fill=GOLDL, width=2)
        glass(d, x + cw / 2, y + ch / 2 - 6, 38, col if col != GOLD else GOLDL, 3)
        label = "傳說" if col == GOLD else ("稀有" if col[0] == 150 else "普通")
        center(d, x + cw / 2, y + ch - 26, label, f(13), col if col != GOLD else GOLDL)
    return img

for name, fn in [("a_cabinet", option_a), ("b_passport", option_b), ("c_rarity", option_c)]:
    fn().save(f"/home/user/cocktail-app/docs/mock_{name}.png")
    print("saved", name)
