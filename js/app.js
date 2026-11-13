// Titik masuk aplikasi: router berbasis hash, navigasi bawah, status offline, tombol pasang.
import { h, toast } from "./ui.js";
import { halamanBeranda } from "./pages/beranda.js";
import { halamanPeta, halamanModul, halamanTahap } from "./pages/modul.js";
import { halamanTes } from "./pages/tes.js";
import { halamanProgres } from "./pages/progres.js";
import { halamanTentang } from "./pages/tentang.js";
import { siapkanPemasangan, sudahTerpasang } from "./pasang.js";
import { halamanSambutan } from "./pages/sambutan.js";
import { namaAktif } from "./nama.js";

const utama = document.getElementById("utama");

const rute = [
  { pola: /^\/?$/, render: () => halamanBeranda(), nav: "beranda" },
  { pola: /^\/peta$/, render: () => halamanPeta(), nav: "materi" },
  { pola: /^\/modul\/([a-z0-9]+)$/, render: (m) => halamanModul(m[1]), nav: "materi" },
  { pola: /^\/modul\/([a-z0-9]+)\/([a-z]+)$/, render: (m) => halamanTahap(m[1], m[2]), nav: "materi" },
  { pola: /^\/tes\/(awal|akhir)$/, render: (m) => halamanTes(m[1]), nav: "beranda" },
  { pola: /^\/progres$/, render: () => halamanProgres(), nav: "progres" },
  { pola: /^\/tentang$/, render: () => halamanTentang(), nav: "tentang" },
  { pola: /^\/sambutan$/, render: () => halamanSambutan({ ganti: !!namaAktif(), onSelesai: () => { location.hash = "#/"; } }), nav: null, tanpaNav: true },
];

// Jika siswa belum mengisi nama, tampilkan halaman sambutan dulu, lalu lanjutkan ke halaman
// yang sebenarnya ingin dibuka (mis. tautan langsung ke modul).
function ruteSambutan(jalurTujuan) {
  return {
    nav: null,
    tanpaNav: true,
    render: () => halamanSambutan({
      onSelesai: () => {
        const sekarang = location.hash.replace(/^#/, "") || "/";
        if (sekarang === jalurTujuan) tampilkan(); else location.hash = "#" + jalurTujuan;
      },
    }),
  };
}

async function tampilkan() {
  const jalur = location.hash.replace(/^#/, "") || "/";
  const r = !namaAktif() && jalur !== "/sambutan" ? ruteSambutan(jalur) : rute.find((x) => x.pola && x.pola.test(jalur));
  document.body.classList.toggle("tanpa-nav", !!(r && r.tanpaNav));
  utama.replaceChildren(h("p", { class: "memuat" }, "Memuat…"));
  try {
    const el = r ? await r.render(r.pola ? jalur.match(r.pola) : null) : h("div", { class: "kartu" }, h("h1", {}, "Halaman tidak ditemukan"), h("a", { href: "#/" }, "Kembali ke beranda"));
    utama.replaceChildren(el);
  } catch (e) {
    console.error(e);
    utama.replaceChildren(h("div", { class: "kartu" },
      h("h1", {}, "Ups, ada masalah"),
      h("p", {}, e.message || String(e)),
      h("p", {}, h("a", { href: "#/" }, "Kembali ke beranda"))));
  }
  document.querySelectorAll(".nav-bawah a").forEach((a) => {
    a.setAttribute("aria-current", r && a.dataset.nav === r.nav ? "page" : "false");
  });
  window.scrollTo(0, 0);
  const judul = utama.querySelector("h1");
  if (judul) { judul.setAttribute("tabindex", "-1"); judul.focus({ preventScroll: true }); }
}

function statusOffline() {
  const el = document.getElementById("status-offline");
  el.hidden = navigator.onLine;
}

window.addEventListener("hashchange", tampilkan);
window.addEventListener("online", statusOffline);
window.addEventListener("offline", statusOffline);

// Saat keyboard HP muncul, sembunyikan navigasi bawah agar tidak menutupi kotak isian.
function bisaMemunculkanKeyboard(el) {
  if (!el) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName !== "INPUT") return false;
  return !["radio", "checkbox", "button", "submit"].includes(el.type) && el.getAttribute("inputmode") !== "none";
}
function perbaruiModeKetik() {
  document.body.classList.toggle("mengetik", bisaMemunculkanKeyboard(document.activeElement));
}
// Navigasi baru dimunculkan lagi SETELAH jari diangkat dan ketukan selesai. Jika dimunculkan saat
// jari masih menekan tombol (mis. "Periksa" di bagian bawah layar), ketukan bisa jatuh ke menu navigasi.
let jariMenekan = false;
let tundaMunculkan = null;
const jadwalkanPerbarui = (ms) => { clearTimeout(tundaMunculkan); tundaMunculkan = setTimeout(perbaruiModeKetik, ms); };
document.addEventListener("pointerdown", () => { jariMenekan = true; }, true);
const lepas = () => { jariMenekan = false; jadwalkanPerbarui(350); };
document.addEventListener("pointerup", lepas, true);
document.addEventListener("pointercancel", lepas, true);
// focusin hanya boleh MENYEMBUNYIKAN navigasi (saat kotak isian disentuh). Memunculkannya kembali selalu ditunda.
document.addEventListener("focusin", (e) => {
  if (bisaMemunculkanKeyboard(e.target)) { clearTimeout(tundaMunculkan); perbaruiModeKetik(); }
  else if (!jariMenekan) jadwalkanPerbarui(100);
});
document.addEventListener("focusout", () => { if (!jariMenekan) jadwalkanPerbarui(100); });

// Minta penyimpanan permanen bila aplikasi sudah dipasang, supaya progres tidak dihapus browser
// saat memori HP penuh (dan tidak memunculkan pertanyaan izin sebelum siswa memasang).
async function mintaPenyimpananPermanen() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (e) { /* abaikan */ }
}
if (sudahTerpasang()) mintaPenyimpananPermanen();
window.addEventListener("appinstalled", mintaPenyimpananPermanen);

statusOffline();
siapkanPemasangan();
tampilkan();

if ("serviceWorker" in navigator) {
  let sudahDikendalikan = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Versi baru sudah terpasang di latar belakang. Tawarkan muat ulang (tidak dipaksa,
    // supaya siswa yang sedang mengerjakan soal tidak terganggu).
    if (sudahDikendalikan) toast("Versi baru PolaKu sudah siap.", "Muat ulang", () => location.reload());
    sudahDikendalikan = true;
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // Aplikasi yang terpasang bisa terbuka berhari-hari: cek pembaruan setiap kembali dibuka.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine) reg.update().catch(() => {});
      });
    }).catch((e) => console.warn("Service worker gagal didaftarkan:", e));
  });
}
