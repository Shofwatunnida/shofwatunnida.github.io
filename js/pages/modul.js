// Peta materi, ringkasan modul, dan tahap-tahap belajar (konsep → kuis).
import { h, tombol, paragraf, kepala, visual, umpanBalik, skalaPaas, langkahLangkah, papanRumus, teksKaya, layarSentuh, WARNA_PASTEL } from "../ui.js";
import { soalInteraktif } from "../soal.js";
import { periksaJawaban } from "../answer.js";
import { ambilKonten, TAHAP, tahapBerikutnya } from "../konten.js";
import { muat, progresModul, setProgres, tandaiTahapSelesai, catat, ambilPosisi, simpanPosisi } from "../storage.js";

// Posisi di dalam tahap (untuk melanjutkan setelah pindah aplikasi / halaman dimuat ulang).
const posisi = (modul, tahap) => ambilPosisi(`${modul.id}/${tahap}`) || {};
const ingat = (modul, tahap, nilai) => simpanPosisi(`${modul.id}/${tahap}`, nilai);
const batas = (i, n) => Math.min(Math.max(Number(i) || 0, 0), Math.max(n - 1, 0));
import { tahapLiterasi } from "./literasi.js";

// ---------- Peta Materi ----------
export async function halamanPeta() {
  const daftar = await ambilKonten("modul");
  const rekom = (muat().tes.find((t) => t.jenis === "awal") || {}).rekomendasi;
  return h("div", { class: "halaman" },
    kepala("Peta Materi", "#/", "", "🗺️"),
    h("p", { class: "pengantar" }, "Pelajari dari atas ke bawah: dari pola sederhana ke pola yang lebih rumit."),
    h("ol", { class: "peta" }, daftar.modul.map((m, i) => {
      const p = progresModul(m.id);
      const status = !m.tersedia ? "segera" : p.status;
      // Status dibedakan dengan ikon + teks + warna (tidak hanya warna).
      const labelStatus = { belum: "○ Belum dimulai", sedang: "▶ Sedang dipelajari", selesai: "✓ Selesai", segera: "🔒 Segera hadir" }[status];
      const isi = [
        h("span", { class: "peta-gambar" }, h("img", { class: "peta-ikon", src: `img/modul-${m.id}.svg`, alt: "", width: "64", height: "64" })),
        h("span", { class: "peta-isi" },
          h("span", { class: "peta-kode" }, m.kode),
          h("strong", { class: "peta-judul" }, m.judul),
          h("span", { class: "peta-ringkas" }, m.ringkas),
          h("span", { class: `lencana lencana-${status}` }, labelStatus)),
      ];
      const warna = WARNA_PASTEL[i % WARNA_PASTEL.length];
      return h("li", {}, m.tersedia
        ? h("a", { class: "peta-item" + (rekom === m.id ? " peta-rekom" : ""), href: `#/modul/${m.id}`, "data-warna": warna },
          rekom === m.id ? h("span", { class: "peta-tanda" }, "⭐ Disarankan untukmu") : null, isi)
        : h("div", { class: "peta-item peta-terkunci", "aria-disabled": "true", "data-warna": warna }, isi));
    })));
}

// ---------- Ringkasan Modul ----------
export async function halamanModul(id) {
  const modul = await ambilKonten(id);
  const p = progresModul(id);
  return h("div", { class: "halaman" },
    kepala(`${modul.kode} · ${modul.judul}`, "#/peta"),
    h("div", { class: "kartu modul-hero" },
      h("img", { class: "modul-hero-ikon", src: `img/modul-${id}.svg`, alt: "", width: "64", height: "64" }),
      h("div", {},
        h("h2", {}, "Setelah modul ini, kamu bisa:"),
        h("ul", {}, modul.tujuan.map((t) => h("li", {}, t))))),
    h("ol", { class: "tahap-daftar" }, TAHAP.map((t) => {
      const selesai = p.tahapSelesai.includes(t.id);
      return h("li", {}, h("a", { class: "tahap-item" + (selesai ? " selesai" : ""), href: `#/modul/${id}/${t.id}`, "data-tahap": t.id },
        h("span", { class: "tahap-ikon", "aria-hidden": "true" }, t.ikon), h("span", {}, t.label), h("span", { class: "tahap-cek" }, selesai ? "✓" : "")));
    })),
    h("a", { class: "tombol tombol-blok", href: `#/modul/${id}/${p.tahap || "konsep"}` }, p.status === "belum" ? "Mulai" : "Lanjutkan"));
}

// ---------- Tahap ----------
export async function halamanTahap(id, tahapId) {
  const modul = await ambilKonten(id);
  const tahap = TAHAP.find((t) => t.id === tahapId);
  if (!tahap) throw new Error("Tahap tidak dikenal.");
  setProgres(id, { status: progresModul(id).status === "selesai" ? "selesai" : "sedang", tahap: tahapId });

  const idx = TAHAP.indexOf(tahap);
  const isi = h("div", { class: "tahap-isi" });
  // Identitas visual per tahap (warna & ikon) + jejak 7 langkah agar siswa tahu posisinya.
  const sudah = progresModul(id).tahapSelesai;
  const halaman = h("div", { class: "halaman", "data-tahap": tahapId },
    kepala(tahap.label, `#/modul/${id}`, `${idx + 1}/${TAHAP.length}`, tahap.ikon),
    h("p", { class: "kecil jejak" }, `${modul.kode} · ${modul.judul}`),
    h("ol", { class: "jejak-tahap", "aria-hidden": "true" }, TAHAP.map((t, i) =>
      h("li", { class: i === idx ? "kini" : sudah.includes(t.id) ? "lewat" : "" }))),
    isi);

  const selesai = () => {
    tandaiTahapSelesai(id, tahapId);
    const lanjut = tahapBerikutnya(tahapId);
    location.hash = lanjut ? `#/modul/${id}/${lanjut}` : `#/modul/${id}`;
  };

  const renderer = { konsep: tahapKonsep, contoh: tahapContoh, setengah: tahapSetengah, latihan: tahapLatihan, literasi: tahapLiterasi, refleksi: tahapRefleksi, kuis: tahapKuis }[tahapId];
  renderer(isi, modul, selesai);
  return halaman;
}

// Konsep: satu segmen per layar (segmenting), siswa yang mengatur kapan lanjut.
function tahapKonsep(isi, modul, selesai) {
  let i = batas(posisi(modul, "konsep").i, modul.segmen.length);
  const gambar = () => {
    ingat(modul, "konsep", { i });
    const s = modul.segmen[i];
    const blok = [];
    if (s.video && s.video.src) {
      blok.push(h("video", { class: "video", controls: true, preload: "none", playsinline: true, src: s.video.src },
        s.video.subtitle ? h("track", { kind: "subtitles", srclang: "id", label: "Indonesia", src: s.video.subtitle, default: true }) : null));
    } else if (s.video) {
      blok.push(h("div", { class: "video-kosong" }, "🎬 Video \"" + (s.video.judul || "") + "\" sedang disiapkan."));
    }
    if (s.judul) blok.push(h("h2", {}, s.judul));
    if (s.visual) blok.push(visual(s.visual));
    s.teks.forEach((t) => blok.push(paragraf(t)));
    const tKembali = tombol("← Kembali", () => { i--; gambar(); }, "tombol tombol-garis");
    tKembali.disabled = i === 0;
    isi.replaceChildren(
      h("p", { class: "posisi", "aria-live": "polite" }, `Bagian ${i + 1} dari ${modul.segmen.length}`),
      h("div", { class: "kartu segmen" }, blok),
      h("div", { class: "aksi aksi-dua" }, tKembali,
        tombol(i < modul.segmen.length - 1 ? "Lanjut →" : "Selesai, lihat contoh →", () => {
          if (i < modul.segmen.length - 1) { i++; gambar(); } else selesai();
        }, "tombol")));
    window.scrollTo(0, 0);
  };
  gambar();
}

const LANGKAH_STRATEGI = ["Amati", "Cari lompatan", "Periksa", "Rumuskan", "Cek ulang"];

function petaLangkah() {
  return h("div", { class: "peta-langkah", "aria-label": "Peta langkah menemukan pola" },
    LANGKAH_STRATEGI.map((l, i) => h("span", {}, `${i + 1}. ${l}`)));
}

// Contoh lengkap: langkah muncul satu per satu.
function tahapContoh(isi, modul, selesai) {
  let ci = batas(posisi(modul, "contoh").ci, modul.contohLengkap.length);
  const gambar = () => {
    ingat(modul, "contoh", { ci });
    const c = modul.contohLengkap[ci];
    let terbuka = 1;
    const daftar = h("ol", { class: "langkah-contoh" });
    const tLangkah = tombol("Langkah berikutnya ↓", () => { terbuka++; render(); }, "tombol");
    const render = () => {
      daftar.replaceChildren(...c.langkah.slice(0, terbuka).map((l) =>
        h("li", {}, h("span", { class: "label-langkah" }, l.label), h("div", { html: teksKaya(l.teks) }), l.visual ? visual(l.visual) : null)));
      if (terbuka >= c.langkah.length) {
        tLangkah.replaceWith(tombol(ci < modul.contohLengkap.length - 1 ? "Contoh berikutnya →" : "Lanjut ke contoh setengah jadi →", () => {
          if (ci < modul.contohLengkap.length - 1) { ci++; gambar(); } else selesai();
        }, "tombol"));
      }
    };
    isi.replaceChildren(
      h("p", { class: "posisi" }, `Contoh ${ci + 1} dari ${modul.contohLengkap.length}`),
      petaLangkah(),
      h("div", { class: "kartu" }, h("p", { class: "soal-tanya", html: teksKaya(c.soal) }), c.visual ? visual(c.visual, { tampilkanSelisih: false }) : null, daftar),
      h("div", { class: "aksi" }, tLangkah));
    render();
    window.scrollTo(0, 0);
  };
  gambar();
}

// Contoh setengah jadi: sebagian langkah dikosongkan (fading).
function tahapSetengah(isi, modul, selesai) {
  let ci = batas(posisi(modul, "setengah").ci, modul.contohSetengahJadi.length);
  const gambar = () => {
    ingat(modul, "setengah", { ci });
    const c = modul.contohSetengahJadi[ci];
    let terbuka = 0;
    const daftar = h("ol", { class: "langkah-contoh" });
    const aksi = h("div", { class: "aksi" });
    const majukan = () => {
      const l = c.langkah[terbuka];
      if (!l) {
        aksi.replaceChildren(tombol(ci < modul.contohSetengahJadi.length - 1 ? "Contoh berikutnya →" : "Lanjut ke latihan →", () => {
          if (ci < modul.contohSetengahJadi.length - 1) { ci++; gambar(); } else selesai();
        }, "tombol"));
        return;
      }
      terbuka++;
      if (!l.kosong) {
        daftar.append(h("li", {}, h("span", { class: "label-langkah" }, l.label), h("div", { html: teksKaya(l.teks) })));
        aksi.replaceChildren(tombol("Langkah berikutnya ↓", majukan, "tombol"));
        return;
      }
      // Langkah kosong: siswa mengisi.
      const k = l.kosong;
      const input = h("input", { type: "text", class: "isian" + (k.tipe === "isian-angka" ? " isian-angka" : ""), inputmode: k.tipe === "isian-angka" ? "decimal" : "text", "aria-label": k.label || "Isian", autocomplete: "off" });
      const umpan = h("div", { "aria-live": "polite" });
      let salah = 0;
      const li = h("li", { class: "langkah-kosong" },
        h("span", { class: "label-langkah" }, l.label),
        h("div", { html: teksKaya(l.teks) }),
        h("label", { class: "label-isian" }, (k.label || "Jawabanmu") + " ", input),
        k.tipe === "isian-rumus" ? papanRumus(input) : null,
        umpan);
      daftar.append(li);
      const cek = () => {
        const hasil = periksaJawaban({ tipe: k.tipe, jawaban: k.jawaban, umpanBalikUmum: k.petunjuk }, input.value);
        if (hasil.kosong) { umpan.replaceChildren(h("p", { class: "teks-peringatan" }, hasil.pesan)); return; }
        catat("percobaan", { modulId: modul.id, soalId: `${c.id}-langkah${terbuka}`, mode: "setengah", jawaban: input.value, benar: hasil.benar });
        if (hasil.benar) {
          input.disabled = true;
          umpan.replaceChildren(umpanBalik(true, k.penjelasan || ""));
          aksi.replaceChildren(tombol("Langkah berikutnya ↓", majukan, "tombol"));
          input.blur(); // tutup keyboard HP
          aksi.scrollIntoView({ block: "nearest" });
        } else {
          salah++;
          umpan.replaceChildren(umpanBalik(false, hasil.pesan));
          if (salah >= 2) {
            umpan.append(tombol("Tunjukkan jawabannya", () => {
              input.value = String(k.jawaban);
              input.disabled = true;
              umpan.replaceChildren(umpanBalik(true, `Jawabannya ${k.jawaban}. ${k.penjelasan || ""}`));
              aksi.replaceChildren(tombol("Langkah berikutnya ↓", majukan, "tombol"));
            }, "tombol tombol-kecil tombol-garis"));
          }
        }
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") cek(); });
      aksi.replaceChildren(tombol("Periksa", cek, "tombol"));
      // Di HP jangan langsung memunculkan keyboard; cukup gulir ke kotak isian.
      if (layarSentuh()) li.scrollIntoView({ block: "center" }); else input.focus();
    };
    isi.replaceChildren(
      h("p", { class: "posisi" }, `Contoh ${ci + 1} dari ${modul.contohSetengahJadi.length} · ${c.langkah.filter((l) => l.kosong).length} langkah kosong`),
      petaLangkah(),
      h("div", { class: "kartu" }, h("p", { class: "soal-tanya", html: teksKaya(c.soal) }), c.visual ? visual(c.visual, { tampilkanSelisih: false }) : null, daftar),
      aksi);
    majukan();
    window.scrollTo(0, 0);
  };
  gambar();
}

// Latihan mandiri: petunjuk bertingkat, Cek Aturanmu, umpan balik.
function tahapLatihan(isi, modul, selesai) {
  const lama = posisi(modul, "latihan");
  let i = Math.min(Math.max(Number(lama.i) || 0, 0), modul.latihan.length);
  const ringkas = { benar: 0, petunjuk: 0, dilewati: 0, ...(lama.ringkas || {}) };
  const gambar = () => {
    ingat(modul, "latihan", { i, ringkas });
    if (i >= modul.latihan.length) {
      isi.replaceChildren(h("div", { class: "kartu" },
        h("h2", {}, "Latihan selesai 🎉"),
        h("p", {}, `Benar: ${ringkas.benar} dari ${modul.latihan.length} soal.`),
        ringkas.petunjuk ? h("p", {}, `Kamu memakai ${ringkas.petunjuk} petunjuk. Memakai petunjuk itu bagus, artinya kamu terus mencoba.`) : null,
        ringkas.dilewati ? h("p", {}, `Ada ${ringkas.dilewati} soal yang kamu lewati. Kamu bisa mengulang latihan kapan saja.`) : null),
        h("div", { class: "aksi aksi-dua" },
          tombol("Ulangi latihan", () => { i = 0; Object.assign(ringkas, { benar: 0, petunjuk: 0, dilewati: 0 }); gambar(); }, "tombol tombol-garis"),
          tombol("Lanjut ke soal cerita →", selesai, "tombol")));
      return;
    }
    const soal = modul.latihan[i];
    isi.replaceChildren(
      h("p", { class: "posisi" }, `Soal ${i + 1} dari ${modul.latihan.length}`),
      petaLangkah(),
      h("div", { class: "kartu" }, soalInteraktif(soal, {
        mode: "latihan",
        catat: (e) => catat("percobaan", { modulId: modul.id, ...e }),
        onLanjut: (hasil) => {
          if (hasil.benar) ringkas.benar++;
          if (hasil.dilewati) ringkas.dilewati++;
          ringkas.petunjuk += hasil.jumlahPetunjuk || 0;
          i++;
          gambar();
        },
      })));
    window.scrollTo(0, 0);
  };
  gambar();
}

// Refleksi: jelaskan dengan kata-kata sendiri + skala usaha mental.
function tahapRefleksi(isi, modul, selesai) {
  const r = modul.refleksi;
  const ta = h("textarea", { class: "isian isian-panjang", rows: "4", maxlength: "500", "aria-label": "Penjelasanmu" });
  ta.value = r.kalimatAwal || "";
  const umpan = h("div", { "aria-live": "polite" });
  const aksi = h("div", { class: "aksi" });
  const lanjutPaas = () => {
    isi.replaceChildren(
      h("p", {}, "Pikirkan latihan dan soal cerita yang baru kamu kerjakan."),
      skalaPaas((skor) => {
        catat("skalaBeban", { modulId: modul.id, aktivitas: "latihan", skor });
        selesai();
      }));
  };
  aksi.append(tombol("Simpan", () => {
    const teks = ta.value.trim();
    if (!teks || teks === (r.kalimatAwal || "").trim()) {
      umpan.replaceChildren(h("p", { class: "teks-peringatan" }, "Lengkapi kalimatnya dulu, walau singkat."));
      return;
    }
    catat("refleksi", { modulId: modul.id, teks });
    ta.disabled = true;
    umpan.replaceChildren(h("div", { class: "kartu kartu-info" },
      h("strong", {}, "Bandingkan dengan contoh penjelasan ini:"),
      paragraf(r.contohPenjelasan),
      h("p", { class: "kecil" }, "Tidak harus sama persis. Yang penting idenya.")));
    aksi.replaceChildren(tombol("Lanjut →", lanjutPaas, "tombol"));
  }, "tombol"));
  isi.replaceChildren(h("div", { class: "kartu" },
    h("h2", {}, "Jelaskan dengan kata-katamu"),
    paragraf(r.pertanyaan),
    ta, umpan), aksi);
}

// Kuis: tanpa petunjuk, tanpa batas waktu.
function tahapKuis(isi, modul, selesai) {
  const lama = posisi(modul, "kuis");
  let i = Math.min(Math.max(Number(lama.i) || 0, 0), modul.kuis.length);
  let benar = Number(lama.benar) || 0;
  const gambar = () => {
    ingat(modul, "kuis", { i, benar });
    if (i >= modul.kuis.length) {
      isi.replaceChildren(h("div", { class: "kartu" },
        h("h2", {}, "Kuis selesai"),
        h("p", { class: "skor-besar" }, `${benar} / ${modul.kuis.length}`),
        h("p", {}, benar === modul.kuis.length ? "Luar biasa! Kamu sudah menguasai modul ini." : benar >= modul.kuis.length / 2 ? "Bagus! Ulangi bagian yang masih salah supaya makin mantap." : "Tidak apa-apa. Coba ulangi contoh dan latihan, lalu kerjakan kuis lagi.")),
        skalaPaas((skor) => {
          catat("skalaBeban", { modulId: modul.id, aktivitas: "kuis", skor });
          catat("percobaan", { modulId: modul.id, soalId: "kuis-ringkasan", mode: "kuis-ringkasan", skor: benar, maks: modul.kuis.length });
          setProgres(modul.id, { status: "selesai" });
          tandaiTahapSelesai(modul.id, "kuis");
          location.hash = "#/peta";
        }));
      return;
    }
    isi.replaceChildren(
      h("p", { class: "posisi" }, `Soal ${i + 1} dari ${modul.kuis.length} · tanpa petunjuk · tanpa batas waktu`),
      h("div", { class: "kartu" }, soalInteraktif(modul.kuis[i], {
        mode: "kuis",
        catat: (e) => catat("percobaan", { modulId: modul.id, ...e }),
        onLanjut: (hasil) => { if (hasil.benar) benar++; i++; gambar(); },
      })));
    window.scrollTo(0, 0);
  };
  if (i > 0) { gambar(); return; } // melanjutkan kuis yang terputus
  isi.replaceChildren(h("div", { class: "kartu" },
    h("h2", {}, "Siap kuis?"),
    h("p", {}, `${modul.kuis.length} soal. Tidak ada petunjuk dan tidak ada batas waktu. Kerjakan dengan tenang.`),
    langkahLangkah(LANGKAH_STRATEGI, -1)),
    h("div", { class: "aksi" }, tombol("Mulai kuis", gambar, "tombol")));
}
