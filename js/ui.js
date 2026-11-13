// Komponen UI umum. Semua dibuat dengan DOM API (tanpa framework, tanpa innerHTML untuk teks siswa).
import { selisih, tandaAngka, banyakNoktah } from "./pattern.js";
import { cekAturan } from "./answer.js";

// h("div", { class: "kartu", onclick: fn }, "teks", anak2...)
export function h(tag, attrs = {}, ...anak) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // hanya untuk konten dari file konten kita sendiri
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const a of anak.flat(Infinity)) {
    if (a === null || a === undefined || a === false) continue;
    el.append(a instanceof Node ? a : document.createTextNode(String(a)));
  }
  return el;
}

// Teks konten boleh memakai **tebal** (aman: di-escape dulu).
export function teksKaya(teks) {
  const aman = String(teks)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return aman.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\^2/g, "²");
}

export function paragraf(teks, cls = "") {
  return h("p", { class: cls, html: teksKaya(teks) });
}

export function tombol(label, onclick, cls = "tombol") {
  return h("button", { type: "button", class: cls, onclick }, label);
}

// ikon (opsional): emoji penanda halaman, ditaruh DI LUAR <h1> agar nama judul untuk pembaca layar tetap bersih.
export function kepala(judul, kembaliKe, info = "", ikon = "") {
  return h("header", { class: "kepala" },
    kembaliKe ? h("a", { href: kembaliKe, class: "kembali", "aria-label": "Kembali" }, "←") : h("span"),
    h("div", { class: "kepala-judul" },
      ikon ? h("span", { class: "kepala-ikon", "aria-hidden": "true" }, ikon) : null,
      h("h1", {}, judul)),
    info ? h("span", { class: "kepala-info" }, info) : h("span"),
  );
}

// Warna pastel bergiliran untuk kartu (biru, pink, ungu, kuning).
export const WARNA_PASTEL = ["biru", "pink", "ungu", "kuning"];

// ---------- Barisan pola + panah lompatan ----------
// opsi: { tampilkanSelisih: bool, tingkatDua: bool, tanya: jumlah kotak "?" di akhir, sorot: indeks }
export function barisanPola(pola, opsi = {}) {
  const { tampilkanSelisih = false, tingkatDua = false, tanya = 1, sorot = -1, ellipsis = true } = opsi;
  const wadah = h("div", { class: "barisan", role: "group", "aria-label": "Barisan: " + pola.join(", ") });
  const baris = h("div", { class: "barisan-suku" });
  pola.forEach((s, i) => baris.append(h("span", { class: "suku" + (i === sorot ? " suku-sorot" : "") }, String(s))));
  for (let i = 0; i < tanya; i++) baris.append(h("span", { class: "suku suku-tanya" }, "?"));
  if (ellipsis) baris.append(h("span", { class: "suku-elips" }, "…"));
  wadah.append(baris);

  const d1 = selisih(pola);
  const barisD1 = h("div", { class: "barisan-selisih", "aria-label": "Selisih: " + d1.map(tandaAngka).join(", ") });
  d1.forEach((d) => barisD1.append(h("span", { class: "lompatan" }, h("span", { class: "busur" }), tandaAngka(d))));
  const barisD2 = h("div", { class: "barisan-selisih tingkat-dua" });
  selisih(d1).forEach((d) => barisD2.append(h("span", { class: "lompatan" }, h("span", { class: "busur" }), tandaAngka(d))));

  barisD1.hidden = !tampilkanSelisih;
  barisD2.hidden = !(tampilkanSelisih && tingkatDua);
  wadah.append(barisD1, barisD2);

  wadah.tampilkanSelisih = (ya) => {
    barisD1.hidden = !ya;
    barisD2.hidden = !(ya && tingkatDua);
  };
  return wadah;
}

// Barisan dengan tombol "Tampilkan lompatan" (untuk latihan, tidak langsung ditampilkan).
export function barisanDenganTombol(pola, opsi = {}) {
  const b = barisanPola(pola, { ...opsi, tampilkanSelisih: false });
  let terbuka = false;
  const t = tombol("Tampilkan lompatan", () => {
    terbuka = !terbuka;
    b.tampilkanSelisih(terbuka);
    t.textContent = terbuka ? "Sembunyikan lompatan" : "Tampilkan lompatan";
  }, "tombol tombol-kecil tombol-garis");
  return h("div", {}, b, t);
}

// ---------- Gambar noktah (SVG) ----------
const SVGNS = "http://www.w3.org/2000/svg";

function posisiNoktah(bentuk, n) {
  const titik = [];
  if (bentuk === "persegi") {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) titik.push([c, r]);
  } else if (bentuk === "persegi-panjang") {
    for (let r = 0; r < n; r++) for (let c = 0; c < n + 1; c++) titik.push([c, r]);
  } else if (bentuk === "segitiga") {
    for (let r = 0; r < n; r++) for (let c = 0; c <= r; c++) titik.push([c + (n - 1 - r) / 2, r]);
  } else if (bentuk === "ganjil") {
    // bentuk L: kolom kiri n, baris bawah n-1 tambahan
    for (let r = 0; r < n; r++) titik.push([0, r]);
    for (let c = 1; c < n; c++) titik.push([c, n - 1]);
  } else if (bentuk === "genap") {
    for (let c = 0; c < n; c++) { titik.push([c, 0]); titik.push([c, 1]); }
  } else if (bentuk === "dua-segitiga") {
    // persegi panjang n × (n + 1) yang tersusun dari dua segitiga sama besar
    for (let r = 0; r < n; r++) for (let c = 0; c < n + 1; c++) titik.push([c, r]);
  } else {
    for (let c = 0; c < n; c++) titik.push([c, 0]);
  }
  return titik;
}

export function gambarNoktah(bentuk, banyakGambar = 4, opsi = {}) {
  const { tandaiBaru = true } = opsi;
  const wadah = h("div", { class: "noktah-wadah" });
  for (let n = 1; n <= banyakGambar; n++) {
    const titik = posisiNoktah(bentuk, n);
    const lama = n > 1 ? new Set(posisiNoktah(bentuk, n - 1).map((p) => p.join(","))) : new Set();
    const maxX = Math.max(...titik.map((p) => p[0])) + 1;
    const maxY = Math.max(...titik.map((p) => p[1])) + 1;
    const jarak = 14;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${maxX * jarak + 4} ${maxY * jarak + 4}`);
    svg.setAttribute("width", maxX * jarak + 4);
    svg.setAttribute("height", maxY * jarak + 4);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Gambar ke-${n}: ${banyakNoktah(bentuk, n)} noktah`);
    for (const [x, y] of titik) {
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", x * jarak + jarak / 2 + 2);
      c.setAttribute("cy", y * jarak + jarak / 2 + 2);
      c.setAttribute("r", 5);
      if (bentuk === "dua-segitiga") {
        // segitiga A: baris ke-r (0-indeks) berisi r + 1 noktah di kiri; sisanya segitiga B
        c.setAttribute("class", x <= y ? "noktah noktah-a" : "noktah noktah-b");
        svg.append(c);
        continue;
      }
      const baru = tandaiBaru && n > 1 && bentuk !== "segitiga" && !lama.has(`${x},${y}`);
      c.setAttribute("class", baru ? "noktah noktah-baru" : "noktah");
      svg.append(c);
    }
    wadah.append(h("figure", { class: "noktah-gambar" }, svg,
      h("figcaption", {}, `Gambar ${n}`, h("br"), h("strong", {}, bentuk === "dua-segitiga"
        ? `${banyakNoktah("segitiga", n)} + ${banyakNoktah("segitiga", n)} = ${banyakNoktah(bentuk, n)}`
        : String(banyakNoktah(bentuk, n))))));
  }
  return wadah;
}

// ---------- Tabel ----------
// Tabel lebar-pendek (mis. n = 1..5 dalam satu baris) diputar menjadi vertikal agar muat di layar HP
// tanpa digeser ke samping. sel: array 2D berisi string/angka/Node.
export function perluDiputar(kolom, baris) {
  return kolom.length > 4 && baris.length <= 2;
}

export function tabelResponsif(kolom, sel, opsi = {}) {
  const putar = opsi.putar ?? perluDiputar(kolom, sel);
  let kepalaT = kolom;
  let isi = sel;
  if (putar) {
    kepalaT = [kolom[0], ...sel.map((r) => r[0])];
    isi = kolom.slice(1).map((k, ci) => [k, ...sel.map((r) => r[ci + 1])]);
  }
  return h("div", { class: "tabel-gulir" },
    h("table", { class: "tabel" + (putar ? " tabel-vertikal" : "") },
      h("thead", {}, h("tr", {}, kepalaT.map((k) => h("th", { scope: "col" }, k)))),
      h("tbody", {}, isi.map((r) => h("tr", {}, r.map((c, i) => (i === 0 && putar ? h("th", { scope: "row" }, c) : h("td", {}, c))))))));
}

export function tabelSederhana(kepalaKolom, baris) {
  return tabelResponsif(kepalaKolom, baris.map((r) => r.map((c) => (c instanceof Node ? c : String(c)))));
}

// Visual dari konten: { jenis: "barisan" | "noktah" | "tabel", ... }
export function visual(v, opsi = {}) {
  if (!v) return null;
  if (v.jenis === "barisan") {
    return barisanPola(v.pola, { tampilkanSelisih: v.tampilkanSelisih ?? true, tingkatDua: v.tingkatDua, tanya: v.tanya ?? 1, ...opsi });
  }
  if (v.jenis === "noktah") return gambarNoktah(v.bentuk, v.banyak || 4);
  if (v.jenis === "tabel") return tabelSederhana(v.kolom, v.baris);
  if (v.jenis === "kursi") return gambarKursi(v.baris || [12, 15, 18]);
  if (v.jenis === "bentuk") return deretBentuk(v.deret, v.tanya || 0);
  return null;
}

// ---------- Deret bentuk (pola berulang non-bilangan, M1) ----------
// Setiap butir ditulis "bentuk-warna", mis. "segitiga-biru". Nomor urut kecil di bawah setiap bentuk
// membantu siswa menghitung posisi tanpa beban tambahan.
const WARNA_BENTUK = { pink: "#ec4899", biru: "#3b82f6", ungu: "#8b5cf6", kuning: "#eab308", merah: "#dc2626", hijau: "#16a34a" };
const GAMBAR_BENTUK = {
  lingkaran: (w) => `<circle cx="18" cy="18" r="13" fill="${w}"/>`,
  segitiga: (w) => `<polygon points="18,4 32,31 4,31" fill="${w}" stroke-linejoin="round"/>`,
  persegi: (w) => `<rect x="6" y="6" width="24" height="24" rx="3" fill="${w}"/>`,
  bintang: (w) => `<polygon points="18,3 22.2,13.2 33,13.6 24.6,20.4 27.4,31 18,25 8.6,31 11.4,20.4 3,13.6 13.8,13.2" fill="${w}"/>`,
  garis: (w) => `<rect x="11" y="2" width="14" height="32" rx="4" fill="${w}"/>`,
};
export function deretBentuk(deret, tanya = 0) {
  const nama = deret.map((b) => b.replace("-", " ")).join(", ");
  const wadah = h("div", { class: "deret-bentuk", role: "img", "aria-label": `Pola: ${nama}${tanya ? ", lalu tanda tanya" : ""}` });
  deret.forEach((b, i) => {
    const [bentuk, warna] = b.split("-");
    let gambar = (GAMBAR_BENTUK[bentuk] || GAMBAR_BENTUK.lingkaran)(WARNA_BENTUK[warna] || WARNA_BENTUK.biru);
    // Garis warna hanya dibedakan oleh warna, jadi diberi huruf awal warna (M = merah, H = hijau, …)
    // agar tetap terbaca oleh siswa yang buta warna merah-hijau.
    if (bentuk === "garis") {
      const huruf = (warna || "").charAt(0).toUpperCase();
      const isi = warna === "kuning" ? "#1e293b" : "#ffffff";
      gambar += `<text x="18" y="23" text-anchor="middle" font-size="13" font-weight="800" font-family="Segoe UI, Arial, sans-serif" fill="${isi}">${huruf}</text>`;
    }
    wadah.append(h("span", { class: "deret-butir" },
      h("span", { html: `<svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">${gambar}</svg>` }),
      h("small", { "aria-hidden": "true" }, String(i + 1))));
  });
  for (let k = 0; k < tanya; k++) {
    wadah.append(h("span", { class: "deret-butir" }, h("span", { class: "deret-tanya" }, "?"), h("small", { "aria-hidden": "true" }, String(deret.length + k + 1))));
  }
  return wadah;
}

export function gambarKursi(barisKursi) {
  const wadah = h("div", { class: "kursi-wadah", role: "img", "aria-label": "Susunan kursi: " + barisKursi.join(", ") + " kursi per baris" });
  barisKursi.forEach((jml, i) => {
    const r = h("div", { class: "kursi-baris" }, h("span", { class: "kursi-label" }, `Baris ${i + 1}`));
    const deret = h("span", { class: "kursi-deret" });
    for (let k = 0; k < jml; k++) deret.append(h("span", { class: "kursi" }));
    r.append(deret, h("span", { class: "kursi-jml" }, String(jml)));
    wadah.append(r);
  });
  return wadah;
}

// ---------- Petunjuk bertingkat ----------
export function kotakPetunjuk(petunjuk, onBuka) {
  let dibuka = 0;
  const daftar = h("ol", { class: "petunjuk-daftar" });
  const t = tombol("💡 Butuh petunjuk?", () => {
    if (dibuka >= petunjuk.length) return;
    daftar.append(h("li", { class: "petunjuk", html: teksKaya(petunjuk[dibuka]) }));
    dibuka++;
    onBuka && onBuka(dibuka);
    t.textContent = dibuka < petunjuk.length ? `💡 Petunjuk berikutnya (${dibuka}/${petunjuk.length})` : "Semua petunjuk sudah dibuka";
    t.disabled = dibuka >= petunjuk.length;
  }, "tombol tombol-garis");
  const el = h("div", { class: "petunjuk-wadah" }, daftar, t);
  el.jumlahDibuka = () => dibuka;
  return el;
}

// ---------- Umpan balik ----------
export function umpanBalik(benar, pesan) {
  if (benar === null) return h("div", { class: "umpan umpan-netral", role: "status" }, h("strong", {}, "Tersimpan. "), pesan || "Terima kasih sudah menjelaskan.");
  return h("div", { class: "umpan " + (benar ? "umpan-benar" : "umpan-salah"), role: "status" },
    h("strong", {}, benar ? "✓ Tepat! " : "✗ Belum tepat. "),
    h("span", { html: teksKaya(pesan || "") }));
}

// ---------- Papan ketik rumus ----------
// Di HP, simbol seperti ² dan × sulit diketik dengan keyboard bawaan. Karena itu pada layar sentuh
// keyboard HP tidak dimunculkan (inputmode="none") dan siswa memakai papan ini, yang berisi angka juga.
// Tombol ⌨️ mengembalikan keyboard HP bila siswa lebih suka mengetik sendiri.
export function layarSentuh() {
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}

export function papanRumus(input) {
  if (layarSentuh()) input.setAttribute("inputmode", "none");
  const sisip = (teks) => {
    const a = input.selectionStart ?? input.value.length;
    const b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + teks + input.value.slice(b);
    const pos = a + teks.length;
    try { input.setSelectionRange(pos, pos); } catch (e) { /* abaikan */ }
    input.dispatchEvent(new Event("input"));
  };
  const hapus = () => {
    let a = input.selectionStart ?? input.value.length;
    const b = input.selectionEnd ?? a;
    if (a === b && a > 0) a -= 1;
    input.value = input.value.slice(0, a) + input.value.slice(b);
    try { input.setSelectionRange(a, a); } catch (e) { /* abaikan */ }
    input.dispatchEvent(new Event("input"));
  };
  const tKeyboard = h("button", { type: "button", class: "kunci kunci-fungsi", "aria-label": "Pakai keyboard HP", "aria-pressed": "false" }, "⌨️");
  tKeyboard.addEventListener("click", () => {
    const pakaiKeyboard = input.getAttribute("inputmode") === "none";
    input.setAttribute("inputmode", pakaiKeyboard ? "text" : "none");
    tKeyboard.setAttribute("aria-pressed", String(pakaiKeyboard));
    input.blur();
    input.focus();
  });
  const kunci = [
    ["7", "7"], ["8", "8"], ["9", "9"], ["(", "("], [")", ")"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×"], ["÷", "÷"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"], ["−", "−"],
    ["0", "0"], ["n", "n"], ["□²", "²"], ["⌫", null],
  ];
  const papan = h("div", { class: "papan-rumus", role: "group", "aria-label": "Papan ketik rumus" },
    kunci.map(([label, nilai]) => h("button", {
      type: "button",
      class: "kunci" + (nilai === null ? " kunci-fungsi" : "") + (label === "n" ? " kunci-n" : ""),
      "aria-label": nilai === null ? "Hapus" : label === "□²" ? "kuadrat" : null,
      // pointerdown dicegah agar fokus & posisi kursor tetap di kotak isian
      onpointerdown: (e) => e.preventDefault(),
      onclick: () => { if (nilai === null) hapus(); else sisip(nilai); input.focus({ preventScroll: true }); },
    }, label)),
    tKeyboard);
  return papan;
}

// ---------- Cek Aturanmu ----------
export function cekAturanmu(pola, onCek) {
  const input = h("input", { type: "text", class: "isian", placeholder: "mis. 3n + 1", "aria-label": "Rumus suku ke-n", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
  const hasil = h("div", { class: "cek-hasil", "aria-live": "polite" });
  const jalankan = () => {
    const r = cekAturan(input.value, pola);
    hasil.replaceChildren();
    if (!r.valid) { hasil.append(h("p", { class: "teks-peringatan" }, r.pesan)); return; }
    hasil.append(tabelSederhana(["n", "Rumusmu", "Pola", ""], r.baris.map((b) => [b.n, b.rumus, b.pola, b.cocok ? "✓" : "✗"])));
    hasil.append(h("p", { class: r.semuaCocok ? "teks-sukses" : "teks-peringatan" },
      r.semuaCocok ? "Aturanmu cocok dengan semua suku yang diketahui." : "Ada yang belum cocok. Periksa lagi aturanmu."));
    onCek && onCek(r);
  };
  return h("details", { class: "cek-aturan" },
    h("summary", {}, "🔍 Cek Aturanmu"),
    h("p", { class: "kecil" }, "Tulis aturanmu sebagai rumus, lalu bandingkan dengan suku yang sudah diketahui."),
    input, papanRumus(input), tombol("Cek", jalankan, "tombol tombol-kecil"), hasil);
}

// ---------- Skala usaha mental (Paas, 1–9) ----------
// Daftar vertikal dengan label kata: lebih mudah diketuk di HP dan maknanya jelas tanpa menebak angka.
export function skalaPaas(onPilih) {
  const label = ["Sangat-sangat ringan", "Sangat ringan", "Ringan", "Agak ringan", "Sedang", "Agak berat", "Berat", "Sangat berat", "Sangat-sangat berat"];
  let dipilih = null;
  const tombolSimpan = tombol("Simpan", () => dipilih && onPilih(dipilih), "tombol tombol-blok");
  tombolSimpan.disabled = true;
  const daftar = h("div", { class: "paas-daftar", role: "radiogroup", "aria-label": "Skala usaha mental 1 sampai 9" });
  for (let i = 1; i <= 9; i++) {
    const b = h("button", { type: "button", class: "paas-pilihan", role: "radio", "aria-checked": "false", "aria-label": `${i}: ${label[i - 1]}` },
      h("span", { class: "paas-angka" }, String(i)), h("span", {}, label[i - 1]));
    b.addEventListener("click", () => {
      dipilih = i;
      daftar.querySelectorAll(".paas-pilihan").forEach((x) => x.setAttribute("aria-checked", "false"));
      b.setAttribute("aria-checked", "true");
      tombolSimpan.disabled = false;
    });
    daftar.append(b);
  }
  return h("div", { class: "kartu paas" },
    h("h2", {}, "Seberapa berat kamu berpikir tadi?"),
    h("p", { class: "kecil" }, "Pilih satu yang paling sesuai. Tidak ada jawaban benar atau salah."),
    daftar, tombolSimpan);
}

// Indikator langkah (dipakai untuk siklus literasi & tahap modul)
export function langkahLangkah(daftar, aktif) {
  return h("ol", { class: "langkah" }, daftar.map((l, i) =>
    h("li", { class: i === aktif ? "aktif" : i < aktif ? "lewat" : "", "aria-current": i === aktif ? "step" : null }, l)));
}

// ---------- Notifikasi singkat (mis. versi baru tersedia) ----------
export function toast(pesan, labelAksi, aksi) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const el = h("div", { class: "toast", role: "status" },
    h("span", {}, pesan),
    labelAksi ? tombol(labelAksi, () => { el.remove(); aksi && aksi(); }, "tombol tombol-kecil") : null,
    h("button", { type: "button", class: "toast-tutup", "aria-label": "Tutup", onclick: () => el.remove() }, "✕"));
  document.body.append(el);
  return el;
}

export function acak(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
