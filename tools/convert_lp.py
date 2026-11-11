# Chuyển landing page xuất từ công cụ thiết kế (đã render) thành HTML tĩnh cho Vercel
import re, sys, os, shutil, json
rendered, src_dir, out_dir, meta_path = sys.argv[1:5]
meta = json.load(open(meta_path))
h = open(rendered, encoding="utf-8").read()
m = re.search(r'<div id="dc-root">(.*)</div>\s*<script', h, re.S)
body = m.group(1) if m else h[h.find('<div id="dc-root">'):h.rfind('</body>')]
body = re.sub(r'\sdata-dc-tpl="\d+"', '', body)
body = re.sub(r'\sdata-sc-name="[^"]*"', '', body)
body = re.sub(r'<span class="sc-interp">(.*?)</span>', r'\1', body, flags=re.S)
os.makedirs(out_dir + "/assets", exist_ok=True)
have = {os.path.splitext(f)[0]: f for f in os.listdir(src_dir + "/assets")}
extra = meta.get("extraDir")
if extra and os.path.isdir(extra):
    for f in os.listdir(extra): have[os.path.splitext(f)[0]] = f; shutil.copy(os.path.join(extra, f), out_dir + "/assets/" + f)
for f in os.listdir(src_dir + "/assets"): shutil.copy(os.path.join(src_dir, "assets", f), out_dir + "/assets/" + f)
missing = []
def fix_fig(mm):
    fig = mm.group(0); b = re.search(r'src="/_blob/([0-9a-f]+)"', fig)
    if not b: return fig
    bid = b.group(1)
    if bid in have: return fig.replace(f'/_blob/{bid}', f'./assets/{have[bid]}').replace('<img ', '<img loading="lazy" ', 1)
    missing.append(bid); return fig.replace('<figure ', f'<figure data-missing="{bid}" hidden ', 1).replace(' src="/_blob/', ' data-src="/_blob/')
body = re.sub(r'<figure\b.*?</figure>', fix_fig, body, flags=re.S)
# nhóm phòng không còn ảnh nào → ẩn cả nhóm (tiêu đề + lưới ảnh)
G = '<div style="display: flex; flex-direction: column; gap: 14px;">'
parts = body.split(G)
for i in range(1, len(parts)):
    seg = parts[i].split('</section>')[0]
    if seg.count('<figure ') and seg.count('<figure ') == seg.count('data-missing='):
        parts[i] = '\x00HIDE' + parts[i]
body = parts[0] + ''.join((G.replace('<div ', '<div hidden data-empty-group ') + p[5:]) if p.startswith('\x00HIDE') else G + p for p in parts[1:])
for v in meta.get("replace", []): body = body.replace(v[0], v[1])
zalo, tel = meta["zalo"], meta["tel"]
page = f'''<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{meta["title"]}</title>
<meta name="description" content="{meta["description"]}">
<link rel="canonical" href="{meta["url"]}">
<meta property="og:type" content="website">
<meta property="og:title" content="{meta["title"]}">
<meta property="og:description" content="{meta["description"]}">
<meta property="og:image" content="{meta["url"]}assets/{meta["ogImage"]}">
<meta property="og:url" content="{meta["url"]}">
<link rel="icon" type="image/png" href="/images/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#FAF6EE}}a{{color:#7A5A22}}a:hover{{color:#5C4215}}html{{scroll-behavior:smooth}}
[hidden]{{display:none!important}}img,video{{max-width:100%}}section[id]{{scroll-margin-top:80px}}
.ht-float{{position:fixed;right:16px;bottom:20px;display:flex;flex-direction:column;gap:10px;z-index:50}}
.ht-fc{{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;color:#fff!important;font:800 13px Montserrat,sans-serif;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.25)}}
.ht-fc.z{{background:#0068ff}}.ht-fc.c{{background:#1f9d55;font-size:22px}}
.ht-back{{position:fixed;left:16px;bottom:20px;z-index:50;background:#091622;color:#D6B67A!important;padding:10px 16px;border-radius:999px;font:600 13px Montserrat,sans-serif;text-decoration:none;border:1px solid rgba(214,182,122,.5)}}
.ht-mcta{{display:none}}
@media(max-width:760px){{
 h1{{font-size:44px!important}} h2{{font-size:34px!important}}
 figure img{{height:280px!important}}
 .ht-mcta{{display:grid;grid-template-columns:1fr 1fr;position:fixed;left:0;right:0;bottom:0;z-index:49}}
 .ht-mcta a{{padding:15px;text-align:center;font:700 15px Montserrat,sans-serif;text-decoration:none;background:#1f9d55;color:#fff!important}}
 .ht-mcta a+a{{background:#0068ff}}
 .ht-float{{bottom:70px}} .ht-back{{display:none}} body{{padding-bottom:52px}}
 header nav>div{{display:none!important}} header nav{{padding:10px 16px!important}}
}}
</style>
</head>
<body>
{body}
<a class="ht-back" href="/">← Xem các BĐS khác</a>
<div class="ht-float"><a class="ht-fc z" href="https://zalo.me/{zalo}" target="_blank" rel="noopener" aria-label="Chat Zalo">Zalo</a><a class="ht-fc c" href="tel:{tel}" aria-label="Gọi điện">☎</a></div>
<div class="ht-mcta"><a href="tel:{tel}">☎ Gọi ngay</a><a href="https://zalo.me/{zalo}" target="_blank" rel="noopener">Chat Zalo</a></div>
</body>
</html>
'''
open(out_dir + "/index.html", "w", encoding="utf-8").write(page)
print("missing:", len(missing), missing)
