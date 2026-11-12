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

// ---------- menu chính ----------
const MENU = [["san-pham", "Sản phẩm", "/san-pham/"], ["tin-tuc", "Tin tức", "/tin-tuc/"], ["tuyen-dung", "Tuyển dụng", "/tuyen-dung/"]];
function siteHeader(active = "") {
  return `<header class="site-header">
  <div class="wrap sh-inner">
    ${brand()}
    <input type="checkbox" id="mnav" class="mnav-toggle" aria-label="Mở menu">
    <label for="mnav" class="mnav-btn" aria-hidden="true"><span></span><span></span><span></span></label>
    <nav class="mainnav" aria-label="Menu chính">
      ${MENU.map(([k, t, u]) => `<a href="${u}"${k === active ? ' class="on" aria-current="page"' : ""}>${t}</a>`).join("")}
      <a class="btn-sm" href="tel:${esc(P0.tel)}">☎ ${esc(P0.display)}</a>
    </nav>
  </div>
</header>`;
}

// ---------- markdown tối giản (không cần thư viện) ----------
function inline(t) {
  return esc(t)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, u) => `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ""}>${a}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
function md(src) {
  const out = []; let list = null;
  const flush = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join("")}</${list.t}>`); list = null; } };
  for (const block of src.replace(/\r/g, "").split(/\n{2,}/)) {
    for (const line of block.split("\n")) {
      let m;
      if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (!list || list.t !== "ul") { flush(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (!list || list.t !== "ol") { flush(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
      flush();
      if ((m = line.match(/^(#{2,4})\s+(.*)/))) out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
      else if ((m = line.match(/^>\s?(.*)/))) out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      else if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) out.push(`<figure>${inline(line.trim())}</figure>`);
      else if (line.trim()) {
        const last = out[out.length - 1];
        if (last && last.startsWith("<p>") && !last.endsWith("</p>\n")) out[out.length - 1] = last.replace(/<\/p>$/, " " + inline(line) + "</p>");
        else out.push(`<p>${inline(line)}</p>`);
      }
    }
    flush();
    if (out.length && out[out.length - 1].startsWith("<p>")) out[out.length - 1] += "\n";
  }
  return out.join("\n");
}
function readPosts(dir) {
  const full = path.join(ROOT, "content", dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter(f => f.endsWith(".md") && !f.startsWith("_")).map(f => {
    const raw = fs.readFileSync(path.join(full, f), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error(`${dir}/${f}: thiếu phần đầu --- ... ---`);
    const meta = {};
    for (const line of m[1].split(/\r?\n/)) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
    if (!meta.title) throw new Error(`${dir}/${f}: thiếu "title"`);
    meta.slug = f.replace(/\.md$/, "");
    meta.body = m[2].trim();
    meta.link = meta.url || `/${dir}/${meta.slug}/`;
    return meta;
  }).filter(p => p.published !== "false").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
const fmtDate = d => (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) ? d.split("-").reverse().join("/") : (d || "");
const news = readPosts("tin-tuc");
const jobs = readPosts("tuyen-dung");

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
    <nav class="f-menu" aria-label="Menu chân trang"><a href="/">Trang chủ</a>${MENU.map(([, t, u]) => `<a href="${u}">${t}</a>`).join("")}</nav>
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
    <div class="meta"><span>${p.priceFrom && !p.priceExact ? "Từ " : "Giá: "}<b>${esc(fmtPrice(p))}</b></span><span>${esc(fmtArea(p))}</span></div>
  </div>
</a>`;
}
const uniq = k => [...new Set(projects.map(k).filter(Boolean))];
function sectionHead(kicker, title, more) {
  return `<div class="sec-head"><div><p class="kicker">${kicker}</p><h2>${title}</h2></div>${more ? `<a class="more" href="${more}">Xem tất cả →</a>` : ""}</div>`;
}
function newsCard(n) {
  return `<a class="ncard" href="${esc(n.link)}">
  <div class="ncard-img" style="background-image:url('${esc(n.cover || site.ogImage)}')">${n.category ? `<span class="chip">${esc(n.category)}</span>` : ""}</div>
  <div class="ncard-body"><time>${esc(fmtDate(n.date))}</time><h3>${esc(n.title)}</h3><p>${esc(n.summary || "")}</p><span class="read">Đọc tiếp →</span></div>
</a>`;
}
function jobCard(j) {
  const open = (j.status || "Đang tuyển") !== "Đã đóng";
  return `<a class="jcard" href="${esc(j.link)}">
  ${j.cover ? `<img src="${esc(j.cover)}" alt="" loading="lazy">` : ""}
  <div class="jcard-body">
    <span class="badge ${open ? "open" : "sold"}">${esc(j.status || "Đang tuyển")}</span>
    <h3>${esc(j.title)}</h3>
    <ul class="jmeta">${[["📍", j.location], ["🕒", j.type], ["💰", j.salary], ["👥", j.quantity && `Số lượng: ${j.quantity}`], ["⏳", j.deadline && `Hạn nộp: ${fmtDate(j.deadline)}`]].filter(x => x[1]).map(([i, t]) => `<li>${i} ${esc(t)}</li>`).join("")}</ul>
    <p>${esc(j.summary || "")}</p>
    <span class="btn-sm">${open ? "Ứng tuyển ngay →" : "Xem chi tiết →"}</span>
  </div>
</a>`;
}
function pageShell({ title, description, image, urlPath, css = "portal", active, body, scripts = "" }) {
  return `${head({ title, description, image: image || site.ogImage, url: site.domain + urlPath, css })}
<body>
${siteHeader(active)}
${body}
${footer()}${contactFloat()}
${scripts}
</body></html>`;
}

// ---------- TRANG CHỦ ----------
function homePage() {
  const featured = [...projects.filter(p => p.featured), ...projects.filter(p => !p.featured)].slice(0, 6);
  return pageShell({
    title: `${site.siteName} – Sản phẩm, tin tức & tuyển dụng`, description: site.description, urlPath: "/", active: "",
    body: `<section class="hero">
  <div class="wrap hero-inner">
    <h1>${esc(site.slogan)}</h1>
    <p>${esc(site.description)}</p>
    <div class="hero-btns"><a class="btn" href="/san-pham/">Xem sản phẩm</a><a class="btn ghost" href="https://zalo.me/${esc(site.zalo)}" target="_blank" rel="noopener">Tư vấn qua Zalo</a></div>
    <div class="stats"><div><b>${projects.length}</b><span>sản phẩm</span></div><div><b>${projects.filter(p => p.status === "Đang mở bán").length}</b><span>đang mở bán</span></div><div><b>${jobs.filter(j => j.status !== "Đã đóng").length}</b><span>vị trí đang tuyển</span></div></div>
  </div>
</section>
<main>
  <section class="hsec"><div class="wrap">
    ${sectionHead("SẢN PHẨM", "Bất động sản đang giới thiệu", "/san-pham/")}
    <div class="grid">${featured.map(card).join("") || `<p class="empty">Sản phẩm đang được cập nhật.</p>`}</div>
  </div></section>
  <section class="hsec alt"><div class="wrap">
    ${sectionHead("TIN TỨC", "Tin mới từ Hoàng Trang", "/tin-tuc/")}
    <div class="ngrid">${news.slice(0, 3).map(newsCard).join("") || `<p class="empty">Chưa có bài viết.</p>`}</div>
  </div></section>
  <section class="hsec"><div class="wrap">
    ${sectionHead("TUYỂN DỤNG", "Cùng Hoàng Trang phát triển sự nghiệp", "/tuyen-dung/")}
    <div class="jgrid">${jobs.slice(0, 3).map(jobCard).join("") || `<p class="empty">Hiện chưa có vị trí tuyển dụng.</p>`}</div>
  </div></section>
</main>`
  });
}

// ---------- SẢN PHẨM ----------
function productsPage() {
  const opt = arr => arr.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  return pageShell({
    title: `Sản phẩm – ${site.siteName}`, description: `Danh mục bất động sản ${site.siteName}: ${uniq(p => p.type).join(", ")}.`, urlPath: "/san-pham/", active: "san-pham",
    body: `<section class="phero"><div class="wrap"><p class="kicker">SẢN PHẨM</p><h1>Bất động sản đang giới thiệu</h1><p>Thông tin pháp lý, vị trí, giá bán rõ ràng. Bấm vào từng sản phẩm để xem chi tiết.</p></div></section>
<main class="wrap">
  <section class="filters" aria-label="Bộ lọc">
    <input id="q" type="search" placeholder="Tìm theo tên, khu vực…">
    <select id="fType"><option value="">Tất cả loại hình</option>${opt(uniq(p => p.type))}</select>
    <select id="fStatus"><option value="">Mọi trạng thái</option>${opt(uniq(p => p.status))}</select>
    <select id="fCity"><option value="">Mọi khu vực</option>${opt(uniq(p => p.location?.city))}</select>
    <select id="fPrice"><option value="">Mọi mức giá</option><option value="0-2">Dưới 2 tỷ</option><option value="2-5">2 – 5 tỷ</option><option value="5-10">5 – 10 tỷ</option><option value="10-9999">Trên 10 tỷ</option></select>
  </section>
  <p id="count" class="count"></p>
  <section id="grid" class="grid">${projects.map(card).join("")}</section>
  <p id="empty" class="empty" hidden>Không có sản phẩm phù hợp với bộ lọc.</p>
</main>`,
    scripts: `<script src="/assets/js/portal.js" defer></script>`
  });
}

// ---------- TIN TỨC ----------
function newsList() {
  const cats = [...new Set(news.map(n => n.category).filter(Boolean))];
  return pageShell({
    title: `Tin tức – ${site.siteName}`, description: `Tin tức, hoạt động và thị trường bất động sản từ ${site.siteName}.`, urlPath: "/tin-tuc/", active: "tin-tuc",
    body: `<section class="phero"><div class="wrap"><p class="kicker">TIN TỨC</p><h1>Tin tức & hoạt động</h1><p>Hoạt động của đội ngũ, sản phẩm mới và thông tin thị trường bất động sản Huế.</p></div></section>
<main class="wrap">
  ${cats.length > 1 ? `<div class="chips" id="cats"><button class="on" data-c="">Tất cả</button>${cats.map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
  <div class="ngrid list">${news.map(n => newsCard(n).replace('<a class="ncard"', `<a class="ncard" data-c="${esc(n.category || "")}"`)).join("") || `<p class="empty">Chưa có bài viết.</p>`}</div>
</main>`,
    scripts: cats.length > 1 ? `<script>document.querySelectorAll("#cats button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#cats button").forEach(x=>x.classList.toggle("on",x===b));document.querySelectorAll(".ncard").forEach(c=>c.hidden=!!b.dataset.c&&c.dataset.c!==b.dataset.c)})</script>` : ""
  });
}
function article(n, section, label) {
  const others = (section === "tin-tuc" ? news : jobs).filter(x => x.slug !== n.slug).slice(0, 3);
  const isJob = section === "tuyen-dung";
  return pageShell({
    title: `${n.title} – ${site.siteName}`, description: n.summary || n.title, image: n.cover, urlPath: `/${section}/${n.slug}/`, active: section, css: "portal",
    body: `<main class="wrap article">
  <nav class="crumbs"><a href="/">Trang chủ</a> › <a href="/${section}/">${label}</a></nav>
  <h1>${esc(n.title)}</h1>
  <p class="art-meta">${[n.category, fmtDate(n.date)].filter(Boolean).map(esc).join(" · ")}</p>
  ${isJob ? `<ul class="jmeta big">${[["📍 Địa điểm", n.location], ["🕒 Hình thức", n.type], ["💰 Thu nhập", n.salary], ["👥 Số lượng", n.quantity], ["⏳ Hạn nộp", fmtDate(n.deadline)]].filter(x => x[1]).map(([k, v]) => `<li><span>${k}</span><b>${esc(v)}</b></li>`).join("")}</ul>` : ""}
  ${n.cover ? `<img class="art-cover" src="${esc(n.cover)}" alt="${esc(n.title)}">` : ""}
  <div class="prose">${md(n.body)}</div>
  ${isJob ? `<div class="apply"><h3>Ứng tuyển</h3><p>Gửi CV hoặc nhắn tin trực tiếp để được trao đổi.</p><a class="btn" href="https://zalo.me/${esc(site.zalo)}" target="_blank" rel="noopener">Nhắn Zalo ${esc((site.phones.find(p => p.tel === site.zalo) || P0).display)}</a> <a class="btn ghost-dark" href="tel:${esc(P0.tel)}">Gọi ${esc(P0.display)}</a></div>` : ""}
  ${others.length ? `<section class="more-list"><h2>${isJob ? "Vị trí khác" : "Bài viết khác"}</h2><div class="${isJob ? "jgrid" : "ngrid"}">${others.map(isJob ? jobCard : newsCard).join("")}</div></section>` : ""}
</main>`
  });
}

// ---------- TUYỂN DỤNG ----------
function jobsList() {
  return pageShell({
    title: `Tuyển dụng – ${site.siteName}`, description: `Cơ hội nghề nghiệp bất động sản tại ${site.siteName}.`, urlPath: "/tuyen-dung/", active: "tuyen-dung",
    body: `<section class="phero"><div class="wrap"><p class="kicker">TUYỂN DỤNG</p><h1>Cùng Hoàng Trang phát triển sự nghiệp</h1><p>Môi trường làm việc minh bạch, được đào tạo bài bản, thu nhập xứng đáng.</p></div></section>
<main class="wrap">
  <div class="jgrid list">${jobs.map(jobCard).join("") || `<p class="empty">Hiện chưa có vị trí tuyển dụng.</p>`}</div>
  <div class="apply wide"><h3>Chưa thấy vị trí phù hợp?</h3><p>Hãy gửi thông tin cho chúng tôi, Hoàng Trang sẽ liên hệ khi có cơ hội phù hợp.</p><a class="btn" href="https://zalo.me/${esc(site.zalo)}" target="_blank" rel="noopener">Gửi hồ sơ qua Zalo</a></div>
</main>`
  });
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
${siteHeader("san-pham")}
<header class="lp-hero" style="background-image:linear-gradient(180deg,rgba(0,0,122,.35),rgba(0,0,122,.85)),url('${esc(p.cover)}')">
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
write("index.html", homePage());
write("san-pham/index.html", productsPage());
write("tin-tuc/index.html", newsList());
write("tuyen-dung/index.html", jobsList());
for (const n of news) if (!n.url) write(`tin-tuc/${n.slug}/index.html`, article(n, "tin-tuc", "Tin tức"));
for (const j of jobs) if (!j.url) write(`tuyen-dung/${j.slug}/index.html`, article(j, "tuyen-dung", "Tuyển dụng"));
for (const p of projects) {
  const custom = path.join(ROOT, "content/custom", p.slug);
  if (p.customPage && fs.existsSync(custom)) copyDir(custom, path.join(OUT, "du-an", p.slug)); // landing page tự thiết kế
  else write(`du-an/${p.slug}/index.html`, landing(p));
}
write("data/projects.json", JSON.stringify(projects.map(({ slug, name, type, status, location, priceFrom, priceUnit, areaFrom, areaTo, cover, tagline }) => ({ slug, name, type, status, location, priceFrom, priceUnit, areaFrom, areaTo, cover, tagline, url: `/du-an/${slug}/` })), null, 2));
const urls = ["/", "/san-pham/", "/tin-tuc/", "/tuyen-dung/", ...projects.map(p => `/du-an/${p.slug}/`), ...news.map(n => n.link), ...jobs.map(j => j.link)].filter(u => u.startsWith("/"));
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map(u => `  <url><loc>${site.domain}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);
console.log(`✔ Trang chủ + ${projects.length} sản phẩm + ${news.length} tin tức + ${jobs.length} tuyển dụng → dist/`);
