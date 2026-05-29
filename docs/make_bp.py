# -*- coding: utf-8 -*-
"""Render the Coupe business plan to a styled, CJK-capable PDF via reportlab."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
    TableStyle, PageBreak, ListFlowable, ListItem, HRFlowable, KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle

# --- Fonts -----------------------------------------------------------------
FONT = "WQY"
pdfmetrics.registerFont(TTFont(FONT, "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", subfontIndex=0))

DARK = HexColor("#1b140d")
INK = HexColor("#1f1a14")
GOLD = HexColor("#8a5a18")
GOLDLINE = HexColor("#d9b25a")
CREAM = HexColor("#f3e6c8")
SOFT = HexColor("#f7f1e4")
MUTED = HexColor("#6b5d45")
BORDER = HexColor("#cdbfa6")

W, H = A4

# --- Styles ----------------------------------------------------------------
def ps(name, **kw):
    kw.setdefault("fontName", FONT)
    kw.setdefault("wordWrap", "CJK")
    kw.setdefault("leading", kw.get("fontSize", 11) * 1.5)
    return ParagraphStyle(name, **kw)

body = ps("body", fontSize=10.5, textColor=INK, spaceAfter=7)
lead = ps("lead", fontSize=11.5, textColor=HexColor("#3a2e1c"), spaceAfter=8, leading=18)
h2 = ps("h2", fontSize=16, textColor=GOLD, spaceBefore=4, spaceAfter=8, leading=20)
h3 = ps("h3", fontSize=12.5, textColor=HexColor("#5a3e12"), spaceBefore=10, spaceAfter=3, leading=16)
small = ps("small", fontSize=8.5, textColor=MUTED, spaceAfter=6, leading=12)
cell = ps("cell", fontSize=9, textColor=INK, leading=12.5)
cellh = ps("cellh", fontSize=9, textColor=CREAM, leading=12.5)
boxst = ps("box", fontSize=10.5, textColor=HexColor("#3a2e1c"), leading=16)

story = []

def P(t, st=body):
    story.append(Paragraph(t, st))

def H2(t):
    story.append(PageBreak())
    story.append(Paragraph(t, h2))
    story.append(HRFlowable(width="100%", thickness=1.4, color=GOLDLINE, spaceAfter=8))

def H2first(t):
    story.append(Paragraph(t, h2))
    story.append(HRFlowable(width="100%", thickness=1.4, color=GOLDLINE, spaceAfter=8))

def H3(t):
    story.append(Paragraph(t, h3))

def bullets(items):
    li = [ListItem(Paragraph(x, body), leftIndent=6) for x in items]
    story.append(ListFlowable(li, bulletType="bullet", bulletColor=GOLD,
                              bulletFontName=FONT, leftIndent=14, spaceAfter=6))

def numbered(items):
    li = [ListItem(Paragraph(x, body), leftIndent=6) for x in items]
    story.append(ListFlowable(li, bulletType="1", bulletColor=GOLD,
                              bulletFontName=FONT, leftIndent=16, spaceAfter=6))

def box(t):
    tb = Table([[Paragraph(t, boxst)]], colWidths=[17 * cm])
    tb.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SOFT),
        ("LINEBEFORE", (0, 0), (0, -1), 3, GOLDLINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(Spacer(1, 4))
    story.append(tb)
    story.append(Spacer(1, 6))

def table(rows, widths):
    data = []
    for r, row in enumerate(rows):
        st = cellh if r == 0 else cell
        data.append([Paragraph(str(c), st) for c in row])
    t = Table(data, colWidths=[w * cm for w in widths], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for r in range(1, len(rows)):
        if r % 2 == 0:
            style.append(("BACKGROUND", (0, r), (-1, r), SOFT))
    t.setStyle(TableStyle(style))
    story.append(t)
    story.append(Spacer(1, 6))

# ===== CONTENT (cover handled on canvas; first flowable is a break) =====
story.append(PageBreak())

# 1
H2first("一、執行摘要 Executive Summary")
P("Coupe 是一個以消費現場為核心的飲品智能平台。我們從「掃碼落單」這個輕量入口切入活動與場所市場，但真正的目標，是成為飲品消費的<b>系統記錄（System of Record）</b>，並累積一個無可取替的資產——<b>口味圖譜（Taste Graph）</b>。", lead)
P("在 AI 已成為大路商品的年代，單一「AI 功能」毫無防禦力，數週內即被複製。Coupe 的護城河不在演算法，而在三層複利資產：<b>（1）對手買不到的專屬消費數據飛輪、（2）跨場所跟隨飲家的網絡效應、（3）作為場所營運大腦的高轉換成本。</b>AI 在此扮演的角色，是把這三層護城河放大、令飛輪轉得比所有人快的引擎。")
box("<b>一句話定位：</b>我們不做「落單 App」，我們做<b>「飲品界的口味身份層 + AI 調酒大腦」</b>——由活動／場所切入，累積 Taste Graph，最終向酒商變現洞察。")
table([
    ["項目", "內容"],
    ["切入楔子", "活動／派對（婚禮、私人派對、Pop-up Bar）——貼近現有產品、避開酒吧合規與收銀地獄"],
    ["核心資產", "口味圖譜（Taste Graph）：意圖 × 情境 × 結果的真實消費數據"],
    ["收入模式", "B 端 SaaS 訂閱 + 用量計費 + 交易抽成；長線：酒商數據洞察"],
    ["三段策略", "① 擁有場所（起步）→ ② 擁有飲家（網絡效應）→ ③ 擁有數據通路（最高毛利）"],
], [3.2, 13.8])

# 2
H2("二、問題與機會 Problem &amp; Opportunity")
H3("2.1 真實痛點")
P("飲品消費現場長期存在三個未被解決、且夠痛、夠頻密的問題：")
bullets([
    "<b>場所端：</b>點單混亂、人手成本高、庫存與毛利黑箱、無法預測需求；現有 POS 笨重昂貴，並不為「飲品體驗」而設。",
    "<b>飲家端：</b>面對酒單選擇困難，「我唔知飲咩好」；換一間店就要重新被認識，過往喜好歸零。",
    "<b>酒商端：</b>只看得到出貨數據，看不到「誰、在什麼心情與場合下、喝了、喜不喜歡」的真實 ground truth，行銷如同盲射。",
])
H3("2.2 為何是現在（Why Now）")
bullets([
    "生成式 AI 成熟，個人化推薦與代理式營運首次在低成本下可行。",
    "掃碼點單、無接觸消費在疫情後成為常態，市場教育已完成。",
    "體驗型消費（婚禮、私宴、品牌活動）持續增長，願為「難忘體驗」付費。",
])
H3("2.3 市場規模（示意，待精算）")
table([
    ["層級", "定義", "估算（示意）"],
    ["TAM", "全球飲品服務場所 + 活動飲品市場軟體與支付", "數百億美元級"],
    ["SAM", "亞太區中小型酒吧／餐廳 + 活動策劃", "數十億美元級"],
    ["SOM（3 年）", "香港 + 大灣區 + 東南亞早期採用者", "初期可達數千萬港元年收"],
], [2.6, 9.4, 5.0])
P("※ 上述為策略示意級別，正式募資前需以由下而上（bottom-up）方式精算。", small)

# 3
H2("三、產品與獨特價值主張")
H3("3.1 我們手上的罕有資產")
P("Coupe 坐在一個黃金位置——<b>消費發生的那一刻</b>，同時捕捉三樣全世界極少人能同時擁有的數據：")
table([
    ["維度", "捕捉內容"],
    ["意圖 Intent", "客人想要什麼、什麼心情、口味偏好與禁忌"],
    ["情境 Context", "地點、場合、同行者、時間、天氣、活動類型"],
    ["結果 Outcome", "實際點了什麼、是否續杯、評分、是否回購"],
], [3.4, 13.6])
box("三者結合，即為<b>「口味 × 社交消費」的真實數據（Taste Graph）</b>。Apple 沒有消費現場、Google 只知搜尋、酒商只見出貨——<b>這正是無可取替之物，而非那個落單介面。</b>")
H3("3.2 三層 AI 玩法（以商業價值排序）")
table([
    ["層級", "功能", "商業效果"],
    ["① 個人化引擎", "越用越懂你：口味檔案、酒量、偏好、跨場所記憶", "<b>鎖客 Lock-in</b>：離開即失去「最懂你」的身份"],
    ["② 代理式營運", "需求預測、自動補貨、庫存感知配方、自動定價與散場報告", "<b>取代人力</b>：賣的是省下的人手與毛利"],
    ["③ 生成式體驗", "即場發明專屬招牌酒 + 生成分享卡", "<b>溢價 + 病毒獲客</b>（自帶品牌傳播）"],
], [2.8, 7.6, 6.6])
H3("3.3 旗艦獨家功能")
bullets([
    "<b>庫存感知 AI 調酒：</b>「用我手上有的材料，幫我設計一杯」——串接庫存即時生成可行配方，對手極難複製此閉環。",
    "<b>跟身口味檔案：</b>飲家的 Taste Graph 跨場所通用，去到任何採用 Coupe 的場地都被認得。",
    "<b>飲品券／Tab 收費：</b>主人預付額度，客人掃碼扣券；逐杯收費、小費、拆帳。",
    "<b>營運分析：</b>熱銷榜、時段分析、Pour Cost 毛利、消耗預測與補貨提醒、散場自動報告。",
])

# 4
H2("四、護城河與競爭優勢 Moat")
P("資深鐵律：<b>功能會被抄，護城河不會。</b>我們在無法被複製的層面競爭。", lead)
table([
    ["護城河類型", "對 Coupe 的意義", "強度"],
    ["專屬數據飛輪", "消費現場的意圖×情境×結果，越多場所越準", "★★★★★"],
    ["網絡效應", "口味檔案跟隨飲家跨場所，雙邊複利", "★★★★☆"],
    ["轉換成本", "成為場所的系統記錄、收銀與庫存大腦", "★★★★☆"],
    ["品牌與信任", "體驗品牌 + 數據合規定位", "★★★☆☆"],
    ["合規定位", "定位為工具/SaaS（店家持牌），擋住懶得處理合規的對手", "★★★☆☆"],
], [3.0, 10.6, 3.4])
H3("4.1 數據飛輪（複利結構）")
box("更多場所採用　→　更多消費數據　→　推薦更準　→　客人體驗更好　→　更多場所想用<br/><br/>＋（橫向）飲家帶住口味檔案去任何一間用 Coupe 的場所　→　酒商肯付費買洞察　→　補貼獲客")
P("類比：<b>Toast／Square</b> 如何以「系統記錄 + 支付」鎖死餐廳；<b>Spotify</b> 如何以「越聽越準」鎖死聽眾。Coupe 要做的，是<b>飲品界這兩者的合體</b>。")

# 5
H2("五、商業模式與收費 Business Model")
table([
    ["方案", "對象", "內容", "定價（示意）"],
    ["Free", "引流", "每月 1 個活動、基本點單、排行榜", "免費"],
    ["Pro", "活動策劃 / 進階主人", "無限活動、AI 調酒師、分析、品牌客製", "HK$X / 月"],
    ["Venue", "真實酒吧 / 餐廳", "多工作站 KDS、收費/Tab、API、自訂網域、SLA", "HK$XXX / 月"],
    ["用量計費", "全部", "AI 生成、簡訊通知、超量交易", "按量"],
    ["數據洞察（長線）", "酒商 / 品牌", "匿名化口味與消費洞察、新品測試", "專案 / 年費"],
], [2.6, 3.6, 7.4, 3.4])
P("<b>收入組合演進：</b>短線靠 B 端 SaaS 月費養數；中線靠交易抽成 + 用量；長線最大一塊來自酒商數據變現（毛利最高）。")

# 6
H2("六、目標客群與進入市場策略 GTM")
H3("6.1 楔子選擇")
table([
    ["方向", "客戶", "付費意願", "難度", "建議"],
    ["活動／派對", "婚禮、私宴、Pop-up", "中", "低", "<b>起步首選</b>"],
    ["真實酒吧/餐廳", "小酒吧、酒店", "高", "高", "第二階段"],
    ["家庭娛樂", "調酒愛好者", "低", "低", "引流/品牌"],
], [3.0, 5.2, 2.4, 2.0, 4.4])
H3("6.2 獲客策略")
bullets([
    "<b>病毒迴圈：</b>客人分享自帶品牌的招牌酒卡片到社交平台 → 免費曝光。",
    "<b>活動策劃合作：</b>與婚禮統籌、活動公司、調酒師接案者結盟分潤。",
    "<b>KOL / 體驗式行銷：</b>調酒師與生活風格 KOL 實測背書。",
    "<b>由下而上：</b>單場活動體驗極佳 → 主辦方成為長期付費客。",
])

# 7
H2("七、AI 技術策略（商業視角）")
bullets([
    "<b>AI 是引擎，不是賣點：</b>對外溝通價值（省人手、多賺毛利、難忘體驗），而非「我們用了某某模型」。",
    "<b>數據護城河優先：</b>所有 AI 互動都回饋 Taste Graph，形成複利。",
    "<b>成本與濫用治理：</b>對 AI 端點施加配額、限流與快取，控制單位經濟，避免被刷爆成本。",
    "<b>合規與私隱：</b>口味數據匿名化、年齡驗證、符合 PDPO/GDPR——合規本身即護城河。",
])

# 8
H2("八、產品路線圖 Roadmap")
table([
    ["階段", "時間", "重點"],
    ["地基", "0–3 月", "多租戶架構、角色權限、訂閱計費、AI 成本護欄"],
    ["商業 MVP", "3–6 月", "活動模式、自助開店、庫存感知 AI 調酒"],
    ["變現", "6–9 月", "飲品券/Tab 收費、散場分析報告"],
    ["規模化", "9–18 月", "KDS 多工作站、離線同步、跟身口味檔案、多語言"],
    ["數據變現", "18 月+", "酒商洞察產品、新品測試平台"],
], [2.6, 2.6, 11.8])

# 9
H2("九、競爭格局 Competitive Landscape")
table([
    ["類型", "代表", "弱點 / 我們的差異"],
    ["傳統 POS", "Toast、Square 等", "笨重、非為飲品體驗而設、無口味智能"],
    ["掃碼點單工具", "各地 QR 點餐", "純工具、無數據飛輪與網絡效應"],
    ["調酒食譜 App", "消費級 App", "無消費現場、無營運閉環、變現弱"],
    ["<b>Coupe</b>", "—", "<b>消費現場 + 口味圖譜 + AI 營運閉環，三者合一</b>"],
], [3.2, 4.4, 9.4])

# 10
H2("十、財務預測（示意 Illustrative）")
table([
    ["指標", "第 1 年", "第 2 年", "第 3 年"],
    ["付費客戶數", "50–150", "500–1,000", "2,000+"],
    ["年經常性收入 ARR", "低（種子）", "數百萬港元", "千萬港元級"],
    ["毛利率", "約 60%", "約 70%", "約 75%+"],
    ["主要收入來源", "SaaS 訂閱", "訂閱 + 交易", "+ 酒商數據"],
], [4.0, 4.3, 4.3, 4.4])
P("※ 數字為策略示意，非承諾；正式版需以單位經濟、轉化率、流失率與 CAC/LTV 模型支撐。", small)

# 11
H2("十一、風險與緩解 Risks &amp; Mitigation")
table([
    ["風險", "緩解"],
    ["功能被複製", "競爭核心移至數據、網絡與信任等需時累積的層面"],
    ["家庭市場付費意願低", "聚焦場所/活動/酒商，家庭僅作引流"],
    ["AI 成本失控", "配額、限流、快取，嚴控單位經濟"],
    ["酒類法規/責任", "定位為 SaaS 工具，店家持牌；年齡驗證、合規設計"],
    ["通路/獲客", "病毒迴圈 + 活動策劃結盟 + KOL，降低 CAC"],
    ["數據私隱", "匿名化、合規認證，化為護城河而非負擔"],
], [5.0, 12.0])

# 12
H2("十二、結語與下一步")
P("如果只記住一句：<b>商業化的成敗不在功能多寡，而在能否先建立「多租戶 + 資料隔離 + 計費」的地基，並把每一次 AI 互動轉化為複利的口味圖譜。</b>", lead)
P("我們的下注：以<b>活動/場所</b>切入做系統記錄，累積 <b>Taste Graph</b>，建立雙邊網絡效應，最終向<b>酒商</b>變現洞察。AI 是令這個飛輪轉得比所有人快的引擎，而非一張功能清單。")
H3("需要拍板的策略分叉")
numbered([
    "<b>擁有場所</b>（Vertical SaaS，似 Toast）：穩、付費高，但須落手營運與合規。",
    "<b>擁有飲家</b>（口味身份 + 網絡效應，似 Spotify）：護城河深、爆發力大，但須燒錢搶用戶、變現較慢。",
    "<b>擁有數據通路</b>（向酒商賣洞察）：毛利最高，但須先有規模。",
])
box("建議路徑：<b>以 ① 起步、鋪 ② 的軌、瞄準 ③ 的水井。</b>")
P("本文件由策略討論整理而成，內含示意性假設，僅供方向性參考，不構成投資承諾或財務保證。", small)


# --- Cover + footer canvas -------------------------------------------------
def cover(c, doc):
    c.saveState()
    c.setFillColor(DARK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLDLINE)
    c.setFont(FONT, 10)
    c.drawString(2.2 * cm, H - 4.2 * cm, "商業計劃書  ·  BUSINESS PLAN")
    c.setFillColor(CREAM)
    c.setFont(FONT, 46)
    c.drawString(2.1 * cm, H - 7.4 * cm, "Coupe")
    c.setFillColor(GOLDLINE)
    c.setFont(FONT, 16)
    c.drawString(2.2 * cm, H - 8.7 * cm, "飲品界的口味身份層與 AI 調酒大腦")
    c.setFillColor(HexColor("#b9a888"))
    c.setFont(FONT, 11)
    c.drawString(2.2 * cm, H - 9.6 * cm, "The Taste Graph & AI Bartending Brain for the Beverage World")
    # gold rule
    c.setStrokeColor(GOLDLINE)
    c.setLineWidth(1)
    c.line(2.2 * cm, H - 10.4 * cm, 9 * cm, H - 10.4 * cm)
    c.setFillColor(HexColor("#b9a888"))
    c.setFont(FONT, 11)
    lines = [
        "由「掃碼點單 App」進化為",
        "擁有專屬消費數據飛輪的飲品智能平台",
        "",
        "版本 v1.0   ·   2026 年 5 月",
        "機密文件 — 僅供內部與潛在投資人審閱",
        "（品牌名「Coupe」為暫定，可調整）",
    ]
    y = H - 12.2 * cm
    for ln in lines:
        c.drawString(2.2 * cm, y, ln)
        y -= 0.7 * cm
    c.restoreState()

def footer(c, doc):
    c.saveState()
    c.setStrokeColor(GOLDLINE)
    c.setLineWidth(0.6)
    c.line(2 * cm, 1.5 * cm, W - 2 * cm, 1.5 * cm)
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawString(2 * cm, 1.05 * cm, "Coupe · 商業計劃書 · 機密")
    c.drawRightString(W - 2 * cm, 1.05 * cm, "第 %d 頁" % (doc.page - 1))
    c.restoreState()

frame = Frame(2 * cm, 1.8 * cm, W - 4 * cm, H - 4 * cm, id="main")
doc = BaseDocTemplate("business-plan.pdf", pagesize=A4,
                      title="Coupe 商業計劃書", author="Coupe")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame], onPage=cover),
    PageTemplate(id="content", frames=[frame], onPage=footer),
])
# switch to content template after the cover
from reportlab.platypus.doctemplate import NextPageTemplate
story.insert(0, NextPageTemplate("content"))
doc.build(story)
print("PDF built OK")
