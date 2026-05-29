# -*- coding: utf-8 -*-
"""Mockup of the AI taste-persona share card (IG portrait)."""
from PIL import Image, ImageDraw, ImageFont
import math

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def f(s): return ImageFont.truetype(FONT, s, index=0)

GOLD=(224,173,83); GOLDL=(244,214,153); GOLD2=(200,137,58)
MUTED=(160,142,112); CREAM=(247,239,226); INK=(26,18,6)
W,H=1080,1350
img=Image.new("RGB",(W,H),(14,10,7)); d=ImageDraw.Draw(img,"RGBA")

# bg gradient + glow
for y in range(H):
    t=y/H; d.line([(0,y),(W,y)],fill=(int(37-25*t),int(28-19*t),int(21-15*t)))
for rr in range(760,0,-8):
    a=int(26*(760-rr)/760)
    d.ellipse([W/2-rr,150-rr,W/2+rr,150+rr],fill=(224,173,83,max(a-18,0)))

def ctext(cx,y,s,fnt,fill):
    w=d.textbbox((0,0),s,font=fnt)[2]; d.text((cx-w/2,y),s,font=fnt,fill=fill); return w

def glass(dr,cx,cy,r,color,lw=5):
    b=[(cx-r*0.55,cy-r*0.45),(cx+r*0.55,cy-r*0.45),(cx,cy+r*0.18)]
    dr.line(b+[b[0]],fill=color,width=lw,joint="curve")
    dr.line([(cx,cy+r*0.18),(cx,cy+r*0.5)],fill=color,width=lw)
    dr.line([(cx-r*0.32,cy+r*0.5),(cx+r*0.32,cy+r*0.5)],fill=color,width=lw)

# gold double frame
d.rounded_rectangle([40,40,W-40,H-40],radius=40,outline=(224,173,83,150),width=2)
d.rounded_rectangle([54,54,W-54,H-54],radius=34,outline=(224,173,83,70),width=1)

# header
ctext(W/2,96,"T A S T I N G   P A S S P O R T",f(26),GOLD)
ctext(W/2,150,"屋 企 調 酒 吧",f(30),MUTED)

# divider
d.line([(W/2-90,232),(W/2+90,232)],fill=(224,173,83,160),width=2)

ctext(W/2,275,"我 的 品 味 人 格",f(30),MUTED)
# hero persona
ctext(W/2,335,"清爽控",f(110),GOLDL)
ctext(W/2,470,"兼 氣泡愛好者",f(46),GOLD)

# blurb
blurb=["鍾意清爽、有氣、唔太甜嘅酒，","係派對上嘅 refreshing 擔當。",
       "識飲之選，越夜越精彩。"]
y=575
for ln in blurb:
    ctext(W/2,y,ln,f(34),CREAM); y+=52

# stat chips
chips=["品酒師 Lv.3","收集 7 / 20 款","12 杯落肚"]
fnt=f(30); gap=24
ws=[d.textbbox((0,0),c,font=fnt)[2]+56 for c in chips]
total=sum(ws)+gap*(len(chips)-1); x=(W-total)/2; cy=770
for c,w in zip(chips,ws):
    d.rounded_rectangle([x,cy,x+w,cy+62],radius=31,fill=(224,173,83,28),outline=(224,173,83,110),width=2)
    ctext(x+w/2,cy+14,c,fnt,GOLD); x+=w+gap

# top 3 drink seals
ctext(W/2,890,"最 常 飲",f(26),MUTED)
names=["Mojito","Spritz","Highball"]
for i,nm in enumerate(names):
    cx=W/2+(i-1)*220; cy=1010
    d.ellipse([cx-72,cy-72,cx+72,cy+72],fill=(36,27,19,255))
    d.ellipse([cx-72,cy-72,cx+72,cy+72],outline=GOLD,width=4)
    d.ellipse([cx-60,cy-60,cx+60,cy+60],outline=(224,173,83,90),width=1)
    glass(d,cx,cy,56,GOLDL,5)
    ctext(cx,cy+86,nm,f(28),CREAM)

# footer: faux QR + CTA
qx,qy,qs=92,H-220,150
d.rounded_rectangle([qx,qy,qx+qs,qy+qs],radius=12,fill=CREAM)
import random; random.seed(7)
cell=qs/9
for r in range(9):
    for c in range(9):
        if random.random()<0.5:
            d.rectangle([qx+8+c*cell,qy+8+r*cell,qx+8+(c+1)*cell-2,qy+8+(r+1)*cell-2],fill=INK)
for (ox,oy) in [(8,8),(qs-8-cell*3,8),(8,qs-8-cell*3)]:
    d.rectangle([qx+ox,qy+oy,qx+ox+cell*3,qy+oy+cell*3],fill=INK)
    d.rectangle([qx+ox+cell*0.8,qy+oy+cell*0.8,qx+ox+cell*2.2,qy+oy+cell*2.2],fill=CREAM)

d.text((qx+qs+40,qy+24),"掃碼即叫即調",font=f(40),fill=GOLDL)
d.text((qx+qs+40,qy+86),"整一杯屬於你嘅雞尾酒",font=f(28),fill=MUTED)

img.save("/home/user/cocktail-app/docs/mock_persona_card.png"); print("saved")
