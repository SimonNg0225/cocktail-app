-- 一次性範例資料：清走測試單 + 加庫存 + 加酒單
-- 喺 Supabase SQL Editor 貼一次跑就得。重複跑唔會整壞嘢（drinks/inventory 用名去防重複）。

-- 清走之前測試整嘅單（連 order_items cascade）
delete from public.orders where guest_name = '測試客人';

-- 庫存（AI 配方會根據呢度有貨嘅材料）
insert into public.inventory (name, category)
select v.name, v.category
from (values
  ('Bombay Sapphire 氈酒', 'spirit'),
  ('Absolut 伏特加', 'spirit'),
  ('Bacardi 白冧酒', 'spirit'),
  ('Campari', 'liqueur'),
  ('甜苦艾酒 (Sweet Vermouth)', 'liqueur'),
  ('Angostura 苦精', 'bitters'),
  ('Tonic Water', 'mixer'),
  ('梳打水 (Soda)', 'mixer'),
  ('青檸', 'garnish'),
  ('薄荷葉', 'garnish'),
  ('糖漿 (Simple Syrup)', 'other')
) as v(name, category)
where not exists (select 1 from public.inventory i where i.name = v.name);

-- 酒單（供應中，客人即刻見到）
insert into public.drinks (name, description, recipe, source, is_available)
select v.name, v.description, v.recipe, 'manual', true
from (values
  ('Gin Tonic',
   '清爽氈湯力，青檸點綴',
   '材料：\n· 45ml 氈酒\n· Tonic Water 注滿\n· 青檸角\n\n做法：\n1. 杯入滿冰\n2. 落氈酒，再注滿 Tonic\n3. 擠少少青檸汁，落青檸角'),
  ('Negroni',
   '苦甜平衡嘅意式經典',
   '材料：\n· 30ml 氈酒\n· 30ml Campari\n· 30ml 甜苦艾酒\n· 橙皮\n\n做法：\n1. 加冰攪勻三款酒\n2. 倒入加冰嘅杯\n3. 扭橙皮出油'),
  ('Mojito',
   '薄荷青檸冧酒，夏日必備',
   '材料：\n· 45ml 白冧酒\n· 青檸半個\n· 8 塊薄荷葉\n· 2 茶匙糖漿\n· 梳打水\n\n做法：\n1. 薄荷、青檸、糖漿輕搗\n2. 落冰同冧酒攪勻\n3. 注滿梳打水，薄荷裝飾')
) as v(name, description, recipe)
where not exists (select 1 from public.drinks d where d.name = v.name);
