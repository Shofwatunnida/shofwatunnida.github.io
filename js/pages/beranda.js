import { h, tombol } from "../ui.js";
import { muat } from "../storage.js";
import { ambilKonten, TAHAP } from "../konten.js";
import { namaAktif } from "../nama.js";
import { bisaPasangOtomatis, pasang, perangkatIOS, sudahTerpasang, saatStatusBerubah } from "../pasang.js";

export async function halamanBeranda() {
  const data = muat();
  const daftar = await ambilKonten("modul");

  // Modul terakhir yang dibuka (status "sedang"), atau modul tersedia pertama.
  const sedang = Object.entries(data.progres)
    .filter(([, p]) => p.status === "sedang")
    .sort((a, b) => (b[1].diperbaruiPada || "").localeCompare(a[1].diperbaruiPada || ""))[0];
  const tesAwal = data.tes.find((t) => t.jenis === "awal");
  const tesAkhir = data.tes.find((t) => t.jenis === "akhir");

  let lanjut;
  if (sedang) {
    const m = daftar.modul.find((x) => x.id === sedang[0]);
    const tahap = TAHAP.find((t) => t.id === sedang[1].tahap);
    lanjut = h("a", { class: "kartu kartu-aksi", href: `#/modul/${sedang[0]}${tahap ? "/" + tahap.id : ""}` },
      h("span", { class: "kartu-ikon", "aria-hidden": "true" }, "▶"),
      h("span", {}, h("strong", {}, "Lanjutkan belajar"), h("br"), h("span", { class: "kecil" }, `${m ? m.kode + " · " + m.judul : sedang[0]}${tahap ? " · " + tahap.label : ""}`)));
  } else if (!tesAwal) {
    lanjut = h("a", { class: "kartu kartu-aksi", href: "#/tes/awal" },
      h("span", { class: "kartu-ikon", "aria-hidden": "true" }, "▶"),
      h("span", {}, h("strong", {}, "Mulai dari Tes Awal"), h("br"), h("span", { class: "kecil" }, "6 soal singkat, tanpa batas waktu")));
  } else {
    lanjut = h("a", { class: "kartu kartu-aksi", href: tesAwal.rekomendasi ? `#/modul/${tesAwal.rekomendasi}` : "#/peta" },
      h("span", { class: "kartu-ikon", "aria-hidden": "true" }, "▶"),
      h("span", {}, h("strong", {}, "Mulai belajar"), h("br"), h("span", { class: "kecil" }, "Buka modul yang disarankan untukmu")));
  }

  const kotakPasang = h("div");
  const perbaruiPasang = () => {
    kotakPasang.querySelectorAll(".kotak-pasang").forEach((x) => x.remove());
    if (sudahTerpasang()) return;
    if (bisaPasangOtomatis()) {
      kotakPasang.append(h("div", { class: "kartu kartu-info kotak-pasang" },
        h("p", {}, "Pasang PolaKu di HP-mu supaya bisa dibuka seperti aplikasi, juga tanpa internet."),
        tombol("📲 Pasang Aplikasi", () => pasang(), "tombol")));
    } else if (perangkatIOS()) {
      kotakPasang.append(h("div", { class: "kartu kartu-info kotak-pasang" },
        h("p", {}, "Pasang di iPhone/iPad: buka di Safari, ketuk ", h("strong", {}, "Bagikan"), " (kotak dengan panah ke atas), lalu pilih ", h("strong", {}, "Tambahkan ke Layar Utama"), "."),
        h("p", { class: "kecil" }, "Setelah dipasang, progresmu lebih aman: Safari bisa menghapus data situs yang lama tidak dibuka.")));
    }
  };
  if (!window.isSecureContext) {
    // Mis. dibuka lewat http://192.168.x.x dari HP: aplikasi jalan, tetapi pasang & offline butuh HTTPS.
    kotakPasang.append(h("div", { class: "kartu kartu-info" },
      h("p", { class: "kecil" }, "Kamu membuka PolaKu lewat alamat ", h("strong", {}, "http"), ". Semua materi bisa dipakai, tetapi untuk ",
        h("strong", {}, "memasang aplikasi dan memakainya tanpa internet"), ", buka lewat alamat ", h("strong", {}, "https"), ".")));
  }
  perbaruiPasang();
  saatStatusBerubah(perbaruiPasang);

  return h("div", { class: "halaman" },
    h("header", { class: "beranda-hero" },
      h("div", { class: "beranda-hero-teks" },
        h("h1", {}, "PolaKu"),
        h("p", { class: "beranda-sapa" }, h("strong", {}, `Halo, ${namaAktif()}! 👋`)),
        h("p", { class: "beranda-ajak" }, "Siap belajar pola bilangan hari ini?"),
        h("a", { class: "tautan-kecil", href: "#/sambutan" }, "✏️ Ganti nama")),
      h("img", { class: "beranda-hero-gambar", src: "img/beranda.svg", alt: "", width: "212", height: "160" })),
    lanjut,
    h("nav", { class: "menu-grid", "aria-label": "Menu utama" },
      h("a", { class: "menu-item", href: "#/peta", "data-warna": "biru" }, h("span", { "aria-hidden": "true" }, "🗺️"), "Peta Materi"),
      h("a", { class: "menu-item", href: "#/progres", "data-warna": "pink" }, h("span", { "aria-hidden": "true" }, "📈"), "Progres Saya"),
      h("a", { class: "menu-item", href: "#/tes/awal", "data-warna": "ungu" }, h("span", { "aria-hidden": "true" }, "📝"), tesAwal ? "Ulangi Tes Awal" : "Tes Awal"),
      h("a", { class: "menu-item", href: "#/tes/akhir", "data-warna": "kuning" }, h("span", { "aria-hidden": "true" }, "🏆"), tesAkhir ? "Ulangi Tes Akhir" : "Tes Akhir")),
    kotakPasang);
}
