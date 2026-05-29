# -*- coding: utf-8 -*-
"""Polished mockup of the new black-and-gold Tasting Passport 圖鑑 design."""
from PIL import Image, ImageDraw, ImageFont
import math

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def f(s): return ImageFont.truetype(FONT, s, index=0)

GOLD=(224,173,83); GOLDL=(244,214,153); MUTED=(150,132,104); CREAM=(247,239,226)
W,H=480,940
img=Image.new("RGB",(W,H),(14,10,7))
d=ImageDraw.Draw(img,"RGBA")

# bg gradient
for y in range(H):
    t=y/H; c=(int(30-18*t),int(22-13*t),int(16-10*t)); d.line([(0,y),(W,y)],fill=c)

def ctext(cx,y,s,fnt,fill):
    w=d.textbbox((0,0),s,font=fnt)[2]; d.text((cx-w/2,y),s,font=fnt,fill=fill)

def glass(dr,cx,cy,r,color,lw=3):
    b=[(cx-r*0.55,cy-r*0.45),(cx+r*0.55,cy-r*0.45),(cx,cy+r*0.18)]
    dr.line(b+[b[0]],fill=color,width=lw,joint="curve")
    dr.line([(cx,cy+r*0.18),(cx,cy+r*0.5)],fill=color,width=lw)
    dr.line([(cx-r*0.32,cy+r*0.5),(cx+r*0.32,cy+r*0.5)],fill=color,width=lw)

def panel(x0,y0,x1,y1):
    d.rounded_rectangle([x0,y0,x1,y1],radius=20,fill=(28,21,15))
    # guilloché faint arcs
    for cx,cy in [(x0+50,y0+40),(x1-50,y1-40)]:
        for rr in range(8,90,7):
            d.ellipse([cx-rr,cy-rr,cx+rr,cy+rr],outline=(224,173,83,16),width=1)
    for off in range(-H,W,14):
        d.line([(x0,y0+off),(x0+ (y1-y0),y0+off+(y1-y0))],fill=(224,173,83,8),width=1)
    # gold double frame
    d.rounded_rectangle([x0+9,y0+9,x1-9,y1-9],radius=14,outline=(224,173,83,90),width=1)
    d.rounded_rectangle([x0+13,y0+13,x1-13,y1-13],radius=11,outline=(224,173,83,40),width=1)

# header
ctext(W/2,28,"T A S T I N G   P A S S P O R T",f(13),GOLD)
ctext(W/2,52,"品 味 護 照",f(34),GOLDL)
ctext(W/2,100,"每飲完一杯，蓋一個專屬印章。",f(14),MUTED)

# hero panel
panel(24,140,W-24,270)
# wax ring
cx,cy,r=85,205,42
d.ellipse([cx-r,cy-r,cx+r,cy+r],outline=(224,173,83,40),width=8)
d.arc([cx-r,cy-r,cx+r,cy+r],-90,-90+360*0.35,fill=GOLD,width=8)
d.ellipse([cx-30,cy-30,cx+30,cy+30],fill=(18,13,8))
ctext(cx,cy-16,"7",f(24),GOLDL); ctext(cx,cy+10,"/ 20",f(12),MUTED)
d.text((150,168),"持有人",font=f(12),fill=MUTED)
d.text((150,184),"品酒師 Lv.3",font=f(22),fill=CREAM)
d.rounded_rectangle([150,222,150+96,222+26],radius=13,outline=(224,173,83,150),width=1)
ctext(150+48,227,"清爽控",f(13),GOLD)
d.text((258,226),"共 12 杯落肚",font=f(12),fill=MUTED)

# badges
d.text((28,292),"徽章",font=f(13),fill=MUTED)
bx=28
for lab in ["首杯入賬","試齊 5 款","老主顧"]:
    w=d.textbbox((0,0),lab,font=f(13))[2]+34
    d.rounded_rectangle([bx,314,bx+w,344],radius=15,fill=(224,173,83,30),outline=(224,173,83,70),width=1)
    d.text((bx+26,320),lab,font=f(13),fill=GOLD); d.text((bx+8,320),"🏅",font=f(13),fill=GOLD); bx+=w+10

# stamp page
panel(24,366,W-24,H-28)
got=[1,1,0,1,0,1, 1,0,1,0,1,0]
names=["Negroni","Mojito","—","Margarita","—","Sour","Highball","—","Spritz","—","Tonic","—"]
import datetime
for i,g in enumerate(got):
    c=i%3; row=i//3
    px=24+(W-48)/3*(c+0.5); py=420+row*128
    ang=((i*37)%9)-4
    if g:
        tok=Image.new("RGBA",(120,120),(0,0,0,0)); td=ImageDraw.Draw(tok)
        td.ellipse([18,18,102,102],fill=(36,27,19,255))
        td.ellipse([18,18,102,102],outline=(224,173,83,255),width=3)
        td.ellipse([26,26,94,94],outline=(224,173,83,90),width=1)
        glass(td,60,60,40,GOLDL,3)
        tok=tok.rotate(ang,resample=Image.BICUBIC)
        img.paste(tok,(int(px-60),int(py-60)),tok)
        ctext(px,py+52,names[i],f(13),CREAM)
        ctext(px,py+70,"29.05.26",f(11),MUTED)
    else:
        tok=Image.new("RGBA",(120,120),(0,0,0,0)); td=ImageDraw.Draw(tok)
        for o in range(0,360,20):
            a=math.radians(o)
            td.ellipse([60+42*math.cos(a)-2,60+42*math.sin(a)-2,60+42*math.cos(a)+2,60+42*math.sin(a)+2],fill=(224,173,83,70))
        glass(td,60,60,38,(224,173,83,45),3)
        tok=tok.rotate(ang,resample=Image.BICUBIC)
        img.paste(tok,(int(px-60),int(py-60)),tok)
        ctext(px,py+52,"待蓋章",f(13),MUTED)

img.save("/home/user/cocktail-app/docs/mock_passport_final.png")
print("saved")
