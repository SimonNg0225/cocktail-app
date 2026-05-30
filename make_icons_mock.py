# -*- coding: utf-8 -*-
"""Mockup: gold line-icon set (premium) to replace emoji."""
from PIL import Image, ImageDraw, ImageFont
import math

FONT="/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def f(s): return ImageFont.truetype(FONT,s,index=0)
S=3  # supersample
GOLD=(244,214,153); G2=(224,173,83); MUT=(150,132,104)

def newtile(): return Image.new("RGBA",(150*S,150*S),(0,0,0,0))

def line(dr,pts,w=4,c=GOLD): dr.line([(x*S,y*S) for x,y in pts],fill=c,width=w*S,joint="curve")
def arc(dr,box,a0,a1,w=4,c=GOLD): dr.arc([v*S for v in box],a0,a1,fill=c,width=w*S)
def circ(dr,cx,cy,r,w=4,c=GOLD): dr.ellipse([(cx-r)*S,(cy-r)*S,(cx+r)*S,(cy+r)*S],outline=c,width=w*S)
def dot(dr,cx,cy,r,c=GOLD): dr.ellipse([(cx-r)*S,(cy-r)*S,(cx+r)*S,(cy+r)*S],fill=c)

def martini(d):
    line(d,[(45,45),(105,45),(75,82)]); line(d,[(45,45),(105,45)])
    line(d,[(75,82),(75,108)]); line(d,[(58,108),(92,108)])
def coupe(d):
    arc(d,[48,40,102,86],0,180); line(d,[(75,73),(75,108)]); line(d,[(58,108),(92,108)])
def shaker(d):
    line(d,[(58,52),(92,52),(88,108),(62,108),(58,52)]); line(d,[(60,52),(90,52)])
    line(d,[(64,40),(86,40),(84,52),(66,52),(64,40)])
def trophy(d):
    line(d,[(58,46),(92,46),(90,66)]); arc(d,[58,46,92,86],0,180)
    arc(d,[40,48,60,72],270,90); arc(d,[90,48,110,72],90,270)
    line(d,[(75,84),(75,98)]); line(d,[(60,108),(90,108)]); line(d,[(66,98),(84,98),(84,108),(66,108)])
def book(d):
    line(d,[(50,44),(100,44),(100,106),(50,106),(50,44)]); line(d,[(62,44),(62,106)])
    line(d,[(72,58),(92,58)]); line(d,[(72,72),(92,72)]); line(d,[(72,86),(86,86)])
def receipt(d):
    pts=[(52,40),(98,40),(98,104)]
    line(d,[(52,40),(98,40)]); line(d,[(52,40),(52,104)]); line(d,[(98,40),(98,104)])
    # zigzag bottom
    zz=[(52,104)]
    for i in range(5): zz.append((52+ (i+0.5)*9.2, 110 if i%2==0 else 104))
    zz.append((98,104)); line(d,zz)
    line(d,[(60,58),(90,58)]); line(d,[(60,72),(90,72)]); line(d,[(60,86),(80,86)])
def star(d):
    pts=[]
    for i in range(10):
        a=math.radians(-90+i*36); r=30 if i%2==0 else 13
        pts.append((75+r*math.cos(a),75+r*math.sin(a)))
    pts.append(pts[0]); line(d,pts)
def flame(d):
    line(d,[(75,40),(95,68),(90,95)]); arc(d,[55,72,95,112],0,180)
    line(d,[(55,92),(60,70),(75,40)])
def droplet(d):
    line(d,[(75,42),(95,80)]); arc(d,[55,62,95,102],0,180); line(d,[(55,82),(75,42)])
def dice(d):
    d.rounded_rectangle([50*S,50*S,100*S,100*S],radius=10*S,outline=GOLD,width=4*S)
    for (cx,cy) in [(62,62),(75,75),(88,88),(88,62),(62,88)]: dot(d,cx,cy,3.2)
def sparkle(d):
    line(d,[(75,44),(81,69),(106,75),(81,81),(75,106),(69,81),(44,75),(69,69),(75,44)])

icons=[("Martini",martini),("Coupe",coupe),("Shaker",shaker),("Trophy 之星",trophy),
       ("圖鑑",book),("我的單",receipt),("收藏",star),("烈",flame),
       ("淡",droplet),("隨機",dice),("AI",sparkle)]

cols=4; rows=math.ceil(len(icons)/cols)
TW,TH=230,210
W=cols*TW+40; H=rows*TH+150
img=Image.new("RGB",(W,H),(15,11,8)); dd=ImageDraw.Draw(img)
for y in range(H):
    t=y/H; dd.line([(0,y),(W,y)],fill=(int(30-16*t),int(22-12*t),int(16-9*t)))
def ctext(cx,y,s,fnt,fill):
    w=dd.textbbox((0,0),s,font=fnt)[2]; dd.text((cx-w/2,y),s,font=fnt,fill=fill)
ctext(W/2,40,"金色線性圖示（取代 emoji）",f(34),GOLD)
ctext(W/2,86,"跨裝置一致 · 同黑金主題夾 · 可調粗幼大小",f(22),MUT)

for i,(name,fn) in enumerate(icons):
    c=i%cols; r=i//cols
    x=20+c*TW; y=130+r*TH
    dd.rounded_rectangle([x,y,x+TW-20,y+TH-30],radius=22,fill=(28,21,15),outline=(224,173,83,60),width=1)
    t=newtile(); td=ImageDraw.Draw(t); fn(td)
    t=t.resize((150,150),Image.LANCZOS)
    img.paste(t,(int(x+(TW-20)/2-75),int(y+18)),t)
    ctext(x+(TW-20)/2,y+TH-58,name,f(24),(247,239,226))

img.save("/home/user/cocktail-app/docs/mock_icons.png"); print("saved")
