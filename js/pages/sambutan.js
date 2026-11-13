// Halaman sambutan: siswa mengisi nama panggilan, lalu disapa sebelum mulai belajar.
// Dua langkah saja dan satu tugas per layar (prinsip segmenting / beban kognitif rendah).
import { h, tombol, layarSentuh } from "../ui.js";
import { namaAktif, rapikanNama, simpanNama, motivasiAcak, PANJANG_MAKS } from "../nama.js";

// Ilustrasi edukatif sederhana (statis, dekoratif): pola noktah 1 → 4 → 9 seperti anak tangga,
// dengan wajah tersenyum pada pola terakhir. Disembunyikan dari pembaca layar.
function ilustrasi() {
  // Jumlah noktah HARUS tepat (1, 4, 9) karena ini aplikasi matematika. Mata dibuat lengkung
  // (bukan titik) agar tidak terhitung sebagai noktah.
  const svg = `
<svg viewBox="0 0 220 140" width="220" height="140" aria-hidden="true" focusable="false">
  <ellipse cx="110" cy="132" rx="98" ry="6" fill="#dbeafe"/>
  <circle cx="30" cy="114" r="7" fill="#93c5fd"/>
  <g fill="#a5b4fc">
    <circle cx="66" cy="100" r="7"/><circle cx="84" cy="100" r="7"/>
    <circle cx="66" cy="118" r="7"/><circle cx="84" cy="118" r="7"/>
  </g>
  <rect x="114" y="24" width="92" height="104" rx="22" fill="#fbcfe8"/>
  <g fill="#f472b6">
    <circle cx="138" cy="44" r="6"/><circle cx="160" cy="44" r="6"/><circle cx="182" cy="44" r="6"/>
    <circle cx="138" cy="62" r="6"/><circle cx="160" cy="62" r="6"/><circle cx="182" cy="62" r="6"/>
    <circle cx="138" cy="80" r="6"/><circle cx="160" cy="80" r="6"/><circle cx="182" cy="80" r="6"/>
  </g>
  <g stroke="#1e3a8a" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M144 101 q5 -6 10 0"/><path d="M166 101 q5 -6 10 0"/>
    <path d="M151 110 q9 8 18 0"/>
  </g>
  <path d="M204 10 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#fde047"/>
  <g font-size="13" font-weight="700" text-anchor="middle">
    <text x="30" y="94" fill="#3b82f6">1</text>
    <text x="75" y="82" fill="#6366f1">4</text>
    <text x="160" y="17" fill="#db2777">9</text>
  </g>
</svg>`;
  return h("div", { class: "sambutan-ilustrasi", html: svg });
}

// opsi.onSelesai(): dipanggil saat siswa menekan "Mulai Belajar".
// opsi.ganti: true jika dibuka dari menu "Ganti nama".
export function halamanSambutan(opsi = {}) {
  const { onSelesai = () => { location.hash = "#/"; }, ganti = false } = opsi;
  const wadah = h("div", { class: "sambutan" });

  const langkahNama = () => {
    const lama = namaAktif();
    const input = h("input", {
      type: "text", id: "nama-siswa", class: "isian sambutan-isian", maxlength: String(PANJANG_MAKS + 5),
      autocomplete: "nickname", autocapitalize: "words", spellcheck: "false", enterkeyhint: "go",
      placeholder: "Tulis nama panggilanmu", "aria-describedby": "nama-info nama-galat",
    });
    input.value = ganti ? lama : "";
    const galat = h("p", { id: "nama-galat", class: "teks-peringatan sambutan-galat", role: "alert" });
    const form = h("form", { class: "sambutan-form", novalidate: true },
      h("label", { for: "nama-siswa", class: "sambutan-label" }, "Siapa nama panggilanmu?"),
      input,
      galat,
      h("p", { id: "nama-info", class: "kecil sambutan-info" }, "🔒 Namamu hanya disimpan di perangkat ini dan tidak dikirim ke mana pun."),
      h("button", { type: "submit", class: "tombol tombol-blok sambutan-tombol" }, ganti ? "Simpan nama" : "Mulai →"),
      ganti ? h("a", { href: "#/", class: "tombol tombol-teks tombol-blok" }, "Batal") : null);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nama = rapikanNama(input.value);
      if (!nama) {
        galat.textContent = "Tulis nama panggilanmu dulu, ya. Cukup huruf saja.";
        input.focus();
        return;
      }
      simpanNama(nama);
      langkahSapa(nama);
    });
    wadah.replaceChildren(h("div", { class: "sambutan-kartu" },
      ilustrasi(),
      h("p", { class: "sambutan-merek" }, "PolaKu"),
      h("h1", {}, ganti ? "Ganti nama panggilan" : "Selamat datang!"),
      ganti ? null : h("p", { class: "sambutan-sub" }, "Belajar pola bilangan, selangkah demi selangkah."),
      form));
    // Di laptop langsung fokus ke isian; di HP jangan memunculkan keyboard otomatis.
    if (!layarSentuh()) requestAnimationFrame(() => input.focus());
  };

  const langkahSapa = (nama) => {
    const tMulai = tombol("Mulai Belajar", () => onSelesai(), "tombol tombol-blok sambutan-tombol");
    wadah.replaceChildren(h("div", { class: "sambutan-kartu", "aria-live": "polite" },
      ilustrasi(),
      h("h1", { class: "sambutan-sapa" }, `Halo, ${nama}! 👋`),
      h("p", { class: "sambutan-sub" }, "Selamat datang di PolaKu. Siap belajar untuk hari ini?"),
      h("p", { class: "motivasi" }, h("span", { "aria-hidden": "true" }, "✨ "), motivasiAcak()),
      tMulai,
      h("button", { type: "button", class: "tombol tombol-teks tombol-blok", onclick: () => { opsiGanti(); } }, `Bukan ${nama}? Ganti nama`)));
    const judul = wadah.querySelector("h1");
    judul.setAttribute("tabindex", "-1");
    judul.focus({ preventScroll: true });
  };

  const opsiGanti = () => { opsi.ganti = true; halamanUlang(); };
  const halamanUlang = () => {
    const baru = halamanSambutan({ ...opsi, ganti: true });
    wadah.replaceWith(baru);
  };

  langkahNama();
  return wadah;
}
