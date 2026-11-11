// Tương tác landing page: menu dính, xem ảnh lớn, gửi form đăng ký
(() => {
  // 1) Đánh dấu mục đang xem trên thanh menu
  const links = [...document.querySelectorAll(".subnav a")];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-40% 0px -55% 0px" });
  links.forEach(a => { const s = document.querySelector(a.getAttribute("href")); s && io.observe(s); });

  // 2) Xem ảnh lớn
  document.querySelectorAll(".gallery img").forEach(img => img.addEventListener("click", () => {
    const box = document.createElement("div");
    box.className = "lightbox"; box.innerHTML = `<img src="${img.src}" alt="">`;
    box.onclick = () => box.remove(); document.body.appendChild(box);
  }));

  // 3) Form đăng ký: gửi về Google Sheet (Apps Script) nếu có cấu hình, nếu không thì mở Zalo
  const f = document.getElementById("leadForm");
  if (!f) return;
  const msg = f.querySelector(".form-msg");
  f.addEventListener("submit", async ev => {
    ev.preventDefault();
    if (f.website.value) return; // chống spam bot
    const data = Object.fromEntries(new FormData(f));
    delete data.website;
    data.project = document.body.dataset.project;
    data.page = location.href;
    data.time = new Date().toISOString();
    const ep = f.dataset.endpoint;
    const btn = f.querySelector("button"); btn.disabled = true;
    try {
      if (ep) {
        await fetch(ep, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
        msg.className = "form-msg ok";
        msg.textContent = "Cảm ơn anh/chị! Chuyên viên sẽ liên hệ sớm.";
        f.reset();
      } else {
        const text = `Tôi quan tâm dự án ${data.project}. Họ tên: ${data.name}, SĐT: ${data.phone}. Nhu cầu: ${data.need}. ${data.note || ""}`;
        try { await navigator.clipboard.writeText(text); } catch (_) {}
        msg.className = "form-msg ok";
        msg.textContent = "Đã sao chép nội dung — đang mở Zalo, anh/chị dán vào tin nhắn để gửi.";
        window.open(`https://zalo.me/${f.dataset.zalo}`, "_blank");
      }
    } catch (e) {
      msg.className = "form-msg err";
      msg.textContent = "Chưa gửi được, vui lòng gọi hotline.";
    } finally { btn.disabled = false; }
  });
})();
