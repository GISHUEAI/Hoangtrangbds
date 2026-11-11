// Lọc & tìm kiếm dự án trên trang tổng (chạy hoàn toàn phía trình duyệt)
(() => {
  const $ = id => document.getElementById(id);
  const cards = [...document.querySelectorAll(".card")];
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const ctrls = ["q", "fType", "fStatus", "fCity", "fPrice"].map($);

  function apply() {
    const q = norm($("q").value.trim());
    const [lo, hi] = ($("fPrice").value || "0-99999").split("-").map(Number);
    let n = 0;
    cards.forEach(c => {
      const d = c.dataset, price = +d.price;
      const ok = (!q || norm(d.name).includes(q)) &&
        (!$("fType").value || d.type === $("fType").value) &&
        (!$("fStatus").value || d.status === $("fStatus").value) &&
        (!$("fCity").value || d.city === $("fCity").value) &&
        (!$("fPrice").value || !price || (price >= lo && price < hi));
      c.hidden = !ok; if (ok) n++;
    });
    $("count").textContent = `Hiển thị ${n} / ${cards.length} dự án`;
    $("empty").hidden = n > 0;
    // lưu bộ lọc lên URL để chia sẻ được
    const p = new URLSearchParams();
    ctrls.forEach(el => el.value && p.set(el.id, el.value));
    history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
  }
  const init = new URLSearchParams(location.search);
  ctrls.forEach(el => { if (init.get(el.id)) el.value = init.get(el.id); el.addEventListener("input", apply); });
  apply();
})();
