// Progres belajar dan Profil Literasi (kalimat positif, tanpa peringkat).
import { h, kepala } from "../ui.js";
import { muat } from "../storage.js";
import { ambilKonten, TAHAP } from "../konten.js";

// Pemetaan indikator literasi ke langkah siklus.
const KELOMPOK = [
  { nama: "BACA & UBAH", proses: ["LM1", "LM2"], saran: "Latih menandai informasi penting dan mengubah cerita menjadi tabel." },
  { nama: "HITUNG", proses: ["LM3"], saran: "Ulangi contoh setengah jadi untuk memantapkan cara menemukan rumus." },
  { nama: "CEK CERITA", proses: ["LM4", "LM5"], saran: "Setelah menghitung, tanyakan: apa arti angka ini dalam cerita? Masuk akal?" },
  { nama: "PENALARAN", proses: ["LM6", "LM7"], saran: "Latih soal \"Setuju atau Tidak?\" dan jelaskan alasanmu." },
];

export function profilLiterasi(catatan) {
  return KELOMPOK.map((k) => {
    const relevan = catatan.filter((c) => c.benar !== null && c.benar !== undefined && (c.proses || []).some((p) => k.proses.includes(p)));
    // Pakai "benar pada percobaan pertama" jika tercatat; jawaban benar setelah beberapa kali mencoba
    // tetap dihargai di layar latihan, tetapi profil harus menggambarkan kemampuan awal.
    const benar = relevan.filter((c) => (c.benarPertama ?? c.benar)).length;
    return { ...k, jumlah: relevan.length, benar, rasio: relevan.length ? benar / relevan.length : null };
  });
}

export async function halamanProgres() {
  const data = muat();
  const daftar = await ambilKonten("modul");
  const profil = profilLiterasi(data.literasi);
  const terisi = profil.filter((p) => p.rasio !== null);
  const kuat = terisi.filter((p) => p.rasio >= 0.7);
  const latih = terisi.filter((p) => p.rasio < 0.7).sort((a, b) => a.rasio - b.rasio)[0];

  const tesAwal = data.tes.filter((t) => t.jenis === "awal").at(-1);
  const tesAkhir = data.tes.filter((t) => t.jenis === "akhir").at(-1);

  return h("div", { class: "halaman" },
    kepala("Progres Saya", "#/", "", "📈"),
    h("section", { class: "kartu" },
      h("h2", {}, "Modul"),
      h("ul", { class: "progres-daftar" }, daftar.modul.filter((m) => m.tersedia).map((m) => {
        const p = data.progres[m.id];
        const jml = p ? p.tahapSelesai.length : 0;
        return h("li", {},
          h("a", { href: `#/modul/${m.id}` }, `${m.kode} · ${m.judul}`),
          h("div", { class: "bilah", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(TAHAP.length), "aria-valuenow": String(jml), "aria-label": `${jml} dari ${TAHAP.length} tahap` },
            h("span", { style: `width:${(jml / TAHAP.length) * 100}%` })),
          h("span", { class: "kecil" }, `${jml}/${TAHAP.length} tahap`));
      }))),
    h("section", { class: "kartu" },
      h("h2", {}, "Profil Literasi"),
      terisi.length === 0
        ? h("p", {}, "Kerjakan soal cerita di salah satu modul untuk melihat profil literasimu.")
        : [
          kuat.length ? h("p", {}, "💪 Kamu sudah kuat di ", h("strong", {}, kuat.map((k) => k.nama).join(", ")), ".") : h("p", {}, "Kamu sudah mulai berlatih. Terus semangat!"),
          latih ? h("p", {}, "🎯 Ayo latih ", h("strong", {}, latih.nama), ". ", latih.saran) : null,
          h("ul", { class: "profil-daftar" }, profil.map((p) => h("li", {},
            h("span", {}, p.nama),
            p.rasio === null ? h("span", { class: "kecil" }, "belum dicoba")
              : h("span", { class: "bintang", "aria-label": `${p.benar} dari ${p.jumlah} benar` }, "●".repeat(Math.round(p.rasio * 5)) + "○".repeat(5 - Math.round(p.rasio * 5)))))),
        ]),
    h("section", { class: "kartu" },
      h("h2", {}, "Tes"),
      h("p", {}, "Tes Awal: ", tesAwal ? `${tesAwal.skor} / ${tesAwal.maks}` : "belum dikerjakan"),
      h("p", {}, "Tes Akhir: ", tesAkhir ? `${tesAkhir.skor} / ${tesAkhir.maks}` : "belum dikerjakan")));
}
