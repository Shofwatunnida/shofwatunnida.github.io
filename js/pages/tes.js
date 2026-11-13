// Tes Awal (diagnostik/pretest) dan Tes Akhir (posttest).
import { h, tombol, kepala } from "../ui.js";
import { soalInteraktif } from "../soal.js";
import { ambilKonten } from "../konten.js";
import { catat, muat, ambilPosisi, simpanPosisi, hapusPosisi } from "../storage.js";

export async function halamanTes(jenis) {
  const tes = await ambilKonten(jenis === "awal" ? "tes-awal" : "tes-akhir");
  const isi = h("div", { class: "tahap-isi" });
  const halaman = h("div", { class: "halaman" }, kepala(tes.judul, "#/", "", jenis === "awal" ? "📝" : "🏆"), isi);

  const kunciPosisi = `tes/${jenis}`;
  const lama = ambilPosisi(kunciPosisi);
  let jawaban = [];
  let i = 0;
  let skor = 0;
  const pulihkan = () => {
    jawaban = Array.isArray(lama.jawaban) ? lama.jawaban : [];
    i = Math.min(Number(lama.i) || 0, tes.soal.length);
    skor = Number(lama.skor) || 0;
  };

  const akhir = () => {
    let rekom = null;
    if (tes.rekomendasi) rekom = tes.rekomendasi.find((r) => skor >= r.min && skor <= r.max) || null;
    catat("tes", { jenis, skor, maks: tes.soal.length, jawaban, rekomendasi: rekom ? rekom.modul : null });
    hapusPosisi(kunciPosisi);

    const awal = muat().tes.find((t) => t.jenis === "awal");
    isi.replaceChildren(h("div", { class: "kartu" },
      h("h2", {}, "Tes selesai"),
      h("p", { class: "skor-besar" }, `${skor} / ${tes.soal.length}`),
      rekom ? h("p", {}, rekom.alasan) : null,
      jenis === "akhir" && awal ? h("p", {}, `Skor Tes Awalmu: ${awal.skor} / ${awal.maks}. ${skor > awal.skor ? "Kamu berkembang! 🎉" : "Terus berlatih, kamu pasti bisa."}`) : null),
      h("div", { class: "aksi" },
        rekom ? h("a", { class: "tombol", href: `#/modul/${rekom.modul}` }, "Mulai belajar →") : h("a", { class: "tombol", href: "#/peta" }, "Ke Peta Materi →")));
  };

  const gambar = () => {
    if (i >= tes.soal.length) { akhir(); return; }
    simpanPosisi(kunciPosisi, { i, skor, jawaban });
    const s = tes.soal[i];
    isi.replaceChildren(
      h("p", { class: "posisi" }, `Soal ${i + 1} dari ${tes.soal.length}`),
      h("div", { class: "kartu" }, soalInteraktif(s, {
        mode: "tes",
        catat: (e) => jawaban.push({ soalId: e.soalId, jawaban: e.jawaban, benar: e.benar, waktuMs: e.waktuMs, indikator: s.indikator || null }),
        onLanjut: (hasil) => { if (hasil.benar) skor++; i++; gambar(); },
      })));
    window.scrollTo(0, 0);
  };

  isi.replaceChildren(h("div", { class: "kartu" },
    h("h2", {}, tes.judul),
    h("p", {}, tes.pengantar),
    h("p", { class: "kecil" }, `${tes.soal.length} soal · tanpa batas waktu · tidak ada nilai rapor`)),
    lama && lama.i > 0 ? h("div", { class: "kartu kartu-info" },
      h("p", {}, `Kamu sudah menjawab ${lama.i} dari ${tes.soal.length} soal sebelumnya.`),
      tombol(`Lanjutkan dari soal ${Math.min(lama.i + 1, tes.soal.length)}`, () => { pulihkan(); gambar(); }, "tombol")) : null,
    h("div", { class: "aksi aksi-dua" },
      jenis === "awal" ? h("a", { class: "tombol tombol-garis", href: "#/peta" }, "Lewati tes") : h("span"),
      tombol(lama && lama.i > 0 ? "Mulai ulang" : "Mulai", gambar, lama && lama.i > 0 ? "tombol tombol-garis" : "tombol")));
  return halaman;
}
