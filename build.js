// ============================================================
//  BĐS Portal – trình sinh trang tĩnh (không cần cài thư viện)
//  Chạy:  node build.js   →  kết quả nằm trong thư mục dist/
//  Vercel tự chạy lệnh này mỗi lần anh push lên GitHub.
// ============================================================
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const site = readJSON(path.join(ROOT, "content/site.json"));

// ---------- tiện ích ----------
function readJSON(f) {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); }
  catch (e) { throw new Error(`Lỗi đọc JSON ${f}: ${e.message}`); }
}
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
const fmtPrice = p => p.priceFrom ? `${String(p.priceFrom).replace(".", ",")} ${p.priceUnit || "tỷ"}` : "Liên hệ";
const fmtArea = p => p.areaFrom ? (p.areaTo && p.areaTo !== p.areaFrom ? `${p.areaFrom} – ${p.areaTo} m²` : `${p.areaFrom} m²`) : "";
const statusClass = s => ({ "Đang mở bán": "open", "Sắp mở bán": "soon", "Đã bán hết": "sold" }[s] || "open");
const P0 = site.phones[0];
const phoneLinks = (sep = " | ") => site.phones.map(p => `<a href="tel:${esc(p.tel)}">${esc(p.display)}</a>`).join(sep);
const brand = (back = "") => `<a class="logo" href="/">${back}<img src="${esc(site.logo)}" alt="Logo ${esc(site.siteName)}" width="44" height="44"><span>${esc(site.siteName)}</span></a>`;
const abs = u => (u && u.startsWith("/") ? site.domain.replace(/\/$/, "") + u : u);

// ---------- đọc dữ liệu dự án ----------
const projDir = path.join(ROOT, "content/projects");
const projects = fs.readdirSync(projDir)
  .filter(f => f.endsWith(".json") && !f.startsWith("_"))
  .map(f => {
    const p = readJSON(path.join(projDir, f));
    for (const k of ["slug", "name", "type", "status"]) if (!p[k]) throw new Error(`${f}: thiếu trường "${k}"`);
    if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`${f}: slug chỉ dùng chữ thường không dấu, số, gạch ngang`);
    return p;
  })
  .filter(p => p.published !== false)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

// ---------- phần dùng chung ----------
function head({ title, description, image, url, css }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(abs(image))}">
<meta property="og:url" content="${esc(url)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/images/favicon.png">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
<meta name="theme-color" content="#0000ff">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/${css}.css">
</head>`;
}
const contactFloat = () => `
<div class="float-contact">
  <a class="fc zalo" href="https://zalo.me/${esc(site.zalo)}" target="_blank" rel="noopener" aria-label="Chat Zalo">Zalo</a>
  <a class="fc call" href="tel:${esc(P0.tel)}" aria-label="Gọi điện">☎</a>
</div>`;
const footer = () => `
<footer class="site-footer">
  <div class="wrap">
    <div class="f-brand"><img src="${esc(site.logo)}" alt="" width="64" height="64"><div><strong>${esc(site.siteName)}</strong><br>${esc(site.address)}</div></div>
    <div>Hotline: ${phoneLinks()}<br>Zalo: <a href="https://zalo.me/${esc(site.zalo)}" target="_blank" rel="noopener">${esc((site.phones.find(p => p.tel === site.zalo) || { display: site.zalo }).display)}</a>${site.email ? `<br>Email: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ""}</div>
    <div class="muted">Thông tin mang tính tham khảo, vui lòng liên hệ để nhận báo giá và hồ sơ pháp lý chính thức.<br>© ${new Date().getFullYear()} ${esc(site.siteName)}</div>
  </div>
</footer>`;

// ---------- trang tổng (portal) ----------
function card(p) {
  return `<a class="card" href="/du-an/${p.slug}/" data-type="${esc(p.type)}" data-status="${esc(p.status)}" data-city="${esc(p.location?.city || "")}" data-price="${p.priceFrom || 0}" data-name="${esc((p.name + " " + (p.location?.district || "") + " " + (p.location?.city || "")).toLowerCase())}">
  <div class="card-img" style="background-image:url('${esc(p.cover)}')">
    <span class="badge ${statusClass(p.status)}">${esc(p.status)}</span>
    <span class="type">${esc(p.type)}</span>
  </div>
  <div class="card-body">
    <h3>${esc(p.name)}</h3>
    <p class="loc">📍 ${esc([p.location?.district, p.location?.city].filter(Boolean).join(", "))}</p>
    <p class="tag">${esc(p.tagline || "")}</p>
    <div class="meta"><span>${p.priceFrom ? "Từ " : "Giá: "}<b>${esc(fmtPrice(p))}</b></span><span>${esc(fmtArea(p))}</span></div>
  </div>
</a>`;
}
function portal() {
  const uniq = k => [...new Set(projects.map(k).filter(Boolean))];
  const opt = arr => arr.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  return `${head({ title: `${site.siteName} – Danh mục dự án bất động sản`, description: site.description, image: site.ogImage, url: site.domain + "/", css: "portal" })}
<body>
<header class="hero">
  <nav class="wrap nav">${brand()}<a class="btn-sm" href="tel:${esc(P0.tel)}">☎ ${esc(P0.display)}</a></nav>
  <div class="wrap hero-inner">
    <h1>${esc(site.slogan)}</h1>
    <p>${esc(site.description)}</p>
    <div class="stats"><div><b>${projects.length}</b><span>dự án</span></div><div><b>${projects.filter(p => p.status === "Đang mở bán").length}</b><span>đang mở bán</span></div><div><b>${uniq(p => p.type).length}</b><span>loại hình</span></div></div>
  </div>
</header>
<main class="wrap">
  <a href="/vinh-danh/1-tuan-4-vu-chot/" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:24px 0;padding:16px 20px;border-radius:16px;background:#A3131A;color:#FFF6E6;text-decoration:none">
    <img src="/vinh-danh/1-tuan-4-vu-chot/assets/vinh-danh-trang.jpg" alt="" width="64" height="64" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:2px solid #F2C14E">
    <span style="flex:1 1 240px"><b style="display:block;color:#F2C14E;font-size:13px;letter-spacing:.1em">VINH DANH · SỔ ĐỎ HUẾ</b><span style="font-size:18px;font-weight:800">1 tuần 4 vụ chốt – Chúc mừng Chuyên gia Trang!</span></span>
    <span style="background:#F2C14E;color:#3E0609;font-weight:800;padding:10px 18px;border-radius:999px">Xem ngay →</span>
  </a>
  <section class="filters" aria-label="Bộ lọc">
    <input id="q" type="search" placeholder="Tìm theo tên dự án, khu vực…">
    <select id="fType"><option value="">Tất cả loại hình</option>${opt(uniq(p => p.type))}</select>
    <select id="fStatus"><option value="">Mọi trạng thái</option>${opt(uniq(p => p.status))}</select>
    <select id="fCity"><option value="">Mọi khu vực</option>${opt(uniq(p => p.location?.city))}</select>
    <select id="fPrice"><option value="">Mọi mức giá</option><option value="0-2">Dưới 2 tỷ</option><option value="2-5">2 – 5 tỷ</option><option value="5-10">5 – 10 tỷ</option><option value="10-9999">Trên 10 tỷ</option></select>
  </section>
  <p id="count" class="count"></p>
  <section id="grid" class="grid">${projects.map(card).join("")}</section>
  <p id="empty" class="empty" hidden>Không có dự án phù hợp với bộ lọc.</p>
</main>
${footer()}${contactFloat()}
<script src="/assets/js/portal.js" defer></script>
</body></html>`;
}

// ---------- landing page từng dự án ----------
function ytEmbed(u) {
  const m = (u || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : "";
}
function landing(p) {
  const url = `${site.domain}/du-an/${p.slug}/`;
  const L = p.location || {};
  const map = L.lat && L.lng ? `https://maps.google.com/maps?q=${L.lat},${L.lng}&z=15&output=embed` : (L.address ? `https://maps.google.com/maps?q=${encodeURIComponent(L.address)}&z=15&output=embed` : "");
  const yt = ytEmbed(p.videoUrl);
  const sec = (id, title, body, cond = true) => cond ? `<section id="${id}" class="sec"><div class="wrap"><h2>${title}</h2>${body}</div></section>` : "";
  const navItems = [["tong-quan", "Tổng quan"], ["vi-tri", "Vị trí"], ["tien-ich", "Tiện ích"], ["san-pham", "Sản phẩm"], ["thanh-toan", "Thanh toán"], ["lien-he", "Liên hệ"]];
  return `${head({ title: `${p.name} – ${p.tagline || p.type}`, description: `${p.name}: ${p.type} tại ${[L.district, L.city].filter(Boolean).join(", ")}. Giá từ ${fmtPrice(p)}. ${p.overview || ""}`.slice(0, 300), image: p.cover, url, css: "landing" })}
<body data-project="${esc(p.name)}">
<header class="lp-hero" style="background-image:linear-gradient(180deg,rgba(10,22,40,.35),rgba(10,22,40,.85)),url('${esc(p.cover)}')">
  <nav class="wrap nav">${brand("← ")}<a class="btn-sm" href="tel:${esc(P0.tel)}">☎ ${esc(P0.display)}</a></nav>
  <div class="wrap lp-hero-inner">
    <span class="badge ${statusClass(p.status)}">${esc(p.status)}</span>
    <h1>${esc(p.name)}</h1>
    <p class="tagline">${esc(p.tagline || "")}</p>
    <p class="loc">📍 ${esc(L.address || [L.district, L.city].filter(Boolean).join(", "))}</p>
    <div class="hero-kpi"><div><span>Giá từ</span><b>${esc(fmtPrice(p))}</b></div><div><span>Diện tích</span><b>${esc(fmtArea(p))}</b></div><div><span>Loại hình</span><b>${esc(p.type)}</b></div></div>
    <a class="btn" href="#lien-he">Nhận bảng giá &amp; tư vấn</a>
  </div>
</header>
<nav class="subnav"><div class="wrap">${navItems.map(([id, t]) => `<a href="#${id}">${t}</a>`).join("")}</div></nav>

${sec("tong-quan", "Tổng quan dự án", `
  <p class="lead">${esc(p.overview || "")}</p>
  <div class="hl">${(p.highlights || []).map(h => `<div><span>${esc(h.label)}</span><b>${esc(h.value)}</b></div>`).join("")}</div>
  ${yt ? `<div class="video"><iframe src="${yt}" title="Video ${esc(p.name)}" allowfullscreen loading="lazy"></iframe></div>` : ""}
  ${(p.gallery || []).length ? `<div class="gallery">${p.gallery.map(g => `<img src="${esc(g)}" alt="${esc(p.name)}" loading="lazy">`).join("")}</div>` : ""}
`)}
${sec("vi-tri", "Vị trí & kết nối", `
  <div class="two">
    <ul class="points">${(p.locationPoints || []).map(x => `<li><span>${esc(x.place)}</span><b>${esc(x.time)}</b></li>`).join("")}</ul>
    ${map ? `<iframe class="map" src="${map}" loading="lazy" title="Bản đồ vị trí" referrerpolicy="no-referrer-when-downgrade"></iframe>` : ""}
  </div>`)}
${sec("tien-ich", "Tiện ích", `<ul class="amen">${(p.amenities || []).map(a => `<li>✓ ${esc(a)}</li>`).join("")}</ul>`, (p.amenities || []).length)}
${sec("san-pham", "Sản phẩm & giá tham khảo", `
  <table class="tbl"><thead><tr><th>Loại sản phẩm</th><th>Diện tích</th><th>Giá</th></tr></thead>
  <tbody>${(p.products || []).map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.area)}</td><td><b>${esc(r.price)}</b></td></tr>`).join("")}</tbody></table>
  ${p.priceNote ? `<p class="note">* ${esc(p.priceNote)}</p>` : ""}`, (p.products || []).length)}
${sec("thanh-toan", "Chính sách thanh toán", `<ol class="pay">${(p.payment || []).map(x => `<li>${esc(x)}</li>`).join("")}</ol>`, (p.payment || []).length)}

<section id="lien-he" class="sec cta">
  <div class="wrap two">
    <div>
      <h2>Đăng ký nhận bảng giá & tư vấn</h2>
      <p>Để lại thông tin, chuyên viên sẽ liên hệ trong 30 phút (giờ hành chính).</p>
      <div class="agent"><img src="${esc(site.logo)}" alt="${esc(site.siteName)}" width="110" height="110"><div><b>${esc(site.siteName)}</b><span>Tư vấn trực tiếp – hỗ trợ xem nhà miễn phí</span>${site.phones.map(p => `<a class="agent-tel" href="tel:${esc(p.tel)}">☎ ${esc(p.display)}</a>`).join("")}</div></div>
    </div>
    <form id="leadForm" class="form" data-endpoint="${esc(site.formEndpoint || "")}" data-zalo="${esc(site.zalo)}">
      <input name="name" required placeholder="Họ và tên *">
      <input name="phone" required type="tel" pattern="[0-9+ .]{9,15}" placeholder="Số điện thoại *">
      <select name="need"><option>Nhận bảng giá</option><option>Đặt lịch tham quan</option><option>Tư vấn vay vốn</option><option>Khác</option></select>
      <textarea name="note" rows="3" placeholder="Ghi chú (không bắt buộc)"></textarea>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
      <button class="btn" type="submit">Gửi thông tin</button>
      <p class="form-msg" role="status"></p>
    </form>
  </div>
</section>
${footer()}${contactFloat()}
<div class="mobile-cta"><a href="tel:${esc(P0.tel)}">☎ Gọi ngay</a><a href="#lien-he">Nhận báo giá</a></div>
<script src="/assets/js/landing.js" defer></script>
</body></html>`;
}

// ---------- chạy build ----------
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, "static"), OUT);
write("index.html", portal());
for (const p of projects) {
  const custom = path.join(ROOT, "content/custom", p.slug);
  if (p.customPage && fs.existsSync(custom)) copyDir(custom, path.join(OUT, "du-an", p.slug)); // landing page tự thiết kế
  else write(`du-an/${p.slug}/index.html`, landing(p));
}
write("data/projects.json", JSON.stringify(projects.map(({ slug, name, type, status, location, priceFrom, priceUnit, areaFrom, areaTo, cover, tagline }) => ({ slug, name, type, status, location, priceFrom, priceUnit, areaFrom, areaTo, cover, tagline, url: `/du-an/${slug}/` })), null, 2));
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", ...projects.map(p => `/du-an/${p.slug}/`)].map(u => `  <url><loc>${site.domain}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);
console.log(`✔ Đã tạo trang tổng + ${projects.length} landing page → dist/`);
