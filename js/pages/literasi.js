// Tahap Literasi: soal cerita dengan siklus BACA → UBAH → HITUNG → CEK CERITA.
// Bantuan dikurangi bertahap sesuai stimulus.tahapSiklus (A = dipandu penuh, B = sebagian, C = mandiri).
import { h, tombol, visual, langkahLangkah } from "../ui.js";
import { soalInteraktif } from "../soal.js";
import { catat, ambilPosisi, simpanPosisi } from "../storage.js";

const SIKLUS = ["1. BACA", "2. UBAH", "3. HITUNG", "4. CEK CERITA"];

function normal(kata) {
  return kata.toLowerCase().replace(/[^0-9a-zà-ÿ]/gi, "");
}

// Kartu stimulus. Jika bisaSorot = true, setiap kata bisa diketuk untuk ditandai.
function kartuStimulus(stim, keadaan, bisaSorot, onUbah) {
  const teksPolos = stim.teks.replace(/\*\*/g, "");
  const paragrafEl = teksPolos.split(/\n+/).map((par, pi) => {
    const p = h("p", { class: "stimulus-teks" });
    par.split(/(\s+)/).forEach((kata, ki) => {
      if (/^\s+$/.test(kata) || kata === "") { p.append(kata); return; }
      const kunci = `${pi}-${ki}`;
      const kelas = () => "kata" + (keadaan.sorot.has(kunci) ? " kata-sorot" : "") + (keadaan.kunciTerlihat.has(normal(kata)) && !keadaan.sorot.has(kunci) ? " kata-kunci" : "");
      if (!bisaSorot) { p.append(h("span", { class: kelas() }, kata)); return; }
      const b = h("button", { type: "button", class: kelas(), "aria-pressed": String(keadaan.sorot.has(kunci)) }, kata);
      b.addEventListener("click", () => {
        if (keadaan.sorot.has(kunci)) keadaan.sorot.delete(kunci); else keadaan.sorot.set(kunci, kata);
        b.className = kelas();
        b.setAttribute("aria-pressed", String(keadaan.sorot.has(kunci)));
        onUbah && onUbah();
      });
      p.append(b);
    });
    return p;
  });
  return h("details", { class: "stimulus", open: true },
    h("summary", {}, "📖 " + stim.judul),
    paragrafEl,
    stim.visual ? visual(stim.visual) : null,
    stim.glosarium && stim.glosarium.length ? h("div", { class: "glosarium" },
      h("strong", {}, "Kata sulit: "),
      stim.glosarium.map((g) => h("span", { class: "glosarium-item" }, h("em", {}, g.istilah), " = ", g.arti))) : null);
}

// Gabungkan kata yang disorot berurutan menjadi frasa "Diketahui".
function frasaTersorot(keadaan) {
  const urut = [...keadaan.sorot.entries()].sort((a, b) => {
    const [pa, ka] = a[0].split("-").map(Number);
    const [pb, kb] = b[0].split("-").map(Number);
    return pa - pb || ka - kb;
  });
  const frasa = [];
  let sebelum = null;
  for (const [kunci, kata] of urut) {
    const [p, k] = kunci.split("-").map(Number);
    if (sebelum && sebelum[0] === p && k - sebelum[1] === 2) frasa[frasa.length - 1] += " " + kata;
    else frasa.push(kata);
    sebelum = [p, k];
  }
  return frasa.map((f) => f.replace(/[.,;:]+$/, ""));
}

export function tahapLiterasi(isi, modul, selesai) {
  const daftarStimulus = modul.literasi || [];
  const kunciPosisi = `${modul.id}/literasi`;
  const lama = ambilPosisi(kunciPosisi) || {};
  let si = Math.min(Math.max(Number(lama.si) || 0, 0), daftarStimulus.length);

  const mulaiStimulus = (lanjutan = null) => {
    if (si >= daftarStimulus.length) { selesai(); return; }
    const stim = daftarStimulus[si];
    const tahap = stim.tahapSiklus || "A";
    const keadaan = { sorot: new Map(), kunciTerlihat: new Set() };

    // Susun urutan langkah sesuai tahap bantuan.
    const langkah = [];
    if (tahap !== "C") langkah.push({ jenis: "baca" });
    if (tahap === "A" && stim.ubah) langkah.push({ jenis: "ubah" });
    stim.soal.forEach((s) => {
      langkah.push({ jenis: "hitung", soal: s });
      if (tahap !== "C" && s.pertanyaanCekCerita) s.pertanyaanCekCerita.forEach((q, qi) => langkah.push({ jenis: "cek", soal: s, q, qi }));
    });
    let li = lanjutan ? Math.min(Math.max(Number(lanjutan.li) || 0, 0), langkah.length) : 0;
    const ringkas = { benar: lanjutan ? Number(lanjutan.benar) || 0 : 0, total: stim.soal.length };

    const gambar = () => {
      simpanPosisi(kunciPosisi, { si, li, benar: ringkas.benar });
      if (li >= langkah.length) {
        isi.replaceChildren(
          h("div", { class: "kartu" },
            h("h2", {}, "Soal cerita selesai 🎉"),
            h("p", {}, `Kamu menjawab benar ${ringkas.benar} dari ${ringkas.total} soal tentang "${stim.judul}".`),
            h("p", {}, "Ingat siklusnya untuk setiap soal cerita:"),
            langkahLangkah(SIKLUS, -1)),
          h("div", { class: "aksi" }, tombol(si < daftarStimulus.length - 1 ? "Cerita berikutnya →" : "Lanjut ke refleksi →", () => { si++; mulaiStimulus(); }, "tombol")));
        window.scrollTo(0, 0);
        return;
      }
      const l = langkah[li];
      const aktif = { baca: 0, ubah: 1, hitung: 2, cek: 3 }[l.jenis];
      const lanjut = () => { li++; gambar(); };
      const bagian = [
        h("p", { class: "posisi" }, `Tahap bantuan ${tahap} · ${stim.konteks}`),
        langkahLangkah(SIKLUS, aktif),
      ];

      if (l.jenis === "baca") {
        const diketahui = h("ul", { class: "diketahui" });
        const perbarui = () => {
          const f = frasaTersorot(keadaan);
          diketahui.replaceChildren(...(f.length ? f.map((x) => h("li", {}, x)) : [h("li", { class: "kecil" }, "Belum ada. Ketuk angka atau kata penting di cerita.")]));
        };
        const ditanya = h("textarea", { class: "isian isian-panjang", rows: "2", maxlength: "200", "aria-label": "Apa yang ditanyakan?", placeholder: "Tulis dengan kata-katamu" });
        const umpan = h("div", { "aria-live": "polite" });
        let sudahDicek = false;
        const tLanjut = tombol("Periksa", () => {
          if (!sudahDicek) {
            const tersorot = new Set([...keadaan.sorot.values()].map(normal));
            const info = stim.infoPenting || [];
            const ditemukan = info.filter((i) => i.split(/\s+/).map(normal).filter(Boolean).every((w) => tersorot.has(w)));
            const terlewat = info.filter((i) => !ditemukan.includes(i));
            catat("literasi", { modulId: modul.id, stimulusId: stim.id, langkah: "baca", proses: ["LM1"], level: "L1", sorotan: frasaTersorot(keadaan), ditanya: ditanya.value.trim(), infoDitemukan: ditemukan.length, infoTotal: info.length, benar: info.length ? ditemukan.length === info.length : null });
            terlewat.forEach((i) => i.split(/\s+/).forEach((w) => keadaan.kunciTerlihat.add(normal(w))));
            umpan.replaceChildren(h("div", { class: "kartu kartu-info" },
              h("p", {}, info.length ? `Kamu menemukan ${ditemukan.length} dari ${info.length} informasi penting.` : "Bagus!"),
              terlewat.length ? h("p", {}, "Yang terlewat: ", h("strong", {}, terlewat.join("; "))) : null,
              stim.ditanya ? h("p", {}, "Yang ditanyakan: ", h("strong", {}, stim.ditanya)) : null));
            sudahDicek = true;
            tLanjut.textContent = "Lanjut →";
            return;
          }
          lanjut();
        }, "tombol");
        perbarui();
        bagian.push(
          kartuStimulus(stim, keadaan, true, perbarui),
          h("div", { class: "kartu" },
            h("h2", {}, "BACA: Pahami ceritanya"),
            h("p", {}, "Ketuk angka dan kata yang penting di cerita."),
            h("p", { class: "label-isian" }, "Diketahui:"), diketahui,
            h("label", { class: "label-isian" }, "Ditanya:", ditanya),
            umpan),
          h("div", { class: "aksi" }, tLanjut));
      } else if (l.jenis === "ubah") {
        const s = { id: stim.id + "-ubah", tipe: "lengkapi-tabel", ...stim.ubah };
        bagian.push(kartuStimulus(stim, keadaan, false),
          h("div", { class: "kartu" },
            h("h2", {}, "UBAH: Jadikan barisan atau tabel"),
            soalInteraktif(s, {
              mode: "latihan",
              tampilkanVisual: false,
              catat: (e) => catat("percobaan", { modulId: modul.id, ...e }),
              onLanjut: (hasil) => {
                catat("literasi", { modulId: modul.id, stimulusId: stim.id, soalId: s.id, langkah: "ubah", proses: ["LM2"], level: "L1", benar: !!hasil.benar, percobaan: hasil.percobaan || 0, jumlahPetunjuk: hasil.jumlahPetunjuk || 0, dilewati: !!hasil.dilewati });
                lanjut();
              },
            })));
      } else if (l.jenis === "hitung") {
        const s = l.soal;
        bagian.push(kartuStimulus(stim, keadaan, false),
          h("div", { class: "kartu" },
            h("p", { class: "label-level" }, `Soal ${stim.soal.indexOf(s) + 1} dari ${stim.soal.length} · ${labelLevel(s.level)}`),
            soalInteraktif(s, {
              mode: "latihan",
              catat: (e) => catat("percobaan", { modulId: modul.id, stimulusId: stim.id, ...e }),
              onLanjut: (hasil) => {
                if (hasil.benar) ringkas.benar++;
                catat("literasi", { modulId: modul.id, stimulusId: stim.id, soalId: s.id, langkah: "hitung", level: s.level, proses: s.proses, benar: !!hasil.benar, benarPertama: !!hasil.benar && hasil.percobaan === 1, percobaan: hasil.percobaan || 0, jumlahPetunjuk: hasil.jumlahPetunjuk || 0, dilewati: !!hasil.dilewati });
                lanjut();
              },
            })));
      } else if (l.jenis === "cek") {
        const q = l.q;
        const s = { id: `${l.soal.id}-cek${l.qi}`, tipe: "pilihan-ganda", pertanyaan: q.tanya, pilihan: q.pilihan, jawaban: q.jawaban, umpanBalikUmum: q.penjelasanSalah || "Coba pikirkan lagi artinya untuk cerita ini.", pembahasan: q.penjelasan };
        bagian.push(kartuStimulus(stim, keadaan, false),
          h("div", { class: "kartu" },
            h("h2", {}, "CEK CERITA: Apakah jawabanmu masuk akal?"),
            soalInteraktif(s, {
              mode: "latihan",
              catat: (e) => catat("percobaan", { modulId: modul.id, stimulusId: stim.id, ...e }),
              onLanjut: (hasil) => {
                catat("literasi", { modulId: modul.id, stimulusId: stim.id, soalId: s.id, langkah: "cek", level: l.soal.level, proses: ["LM4", "LM5"], benar: !!hasil.benar, benarPertama: !!hasil.benar && hasil.percobaan === 1, percobaan: hasil.percobaan || 0, dilewati: !!hasil.dilewati });
                lanjut();
              },
            })));
      }
      isi.replaceChildren(...bagian);
      window.scrollTo(0, 0);
    };

    if (lanjutan) { gambar(); return; }
    isi.replaceChildren(
      h("div", { class: "kartu" },
        h("h2", {}, "Soal Cerita: " + stim.judul),
        h("p", {}, "Matematika dipakai untuk memecahkan masalah sehari-hari. Kerjakan dengan 4 langkah ini:"),
        langkahLangkah(SIKLUS, -1),
        tahap === "C" ? h("p", { class: "kecil" }, "Kali ini kamu mengerjakan langkah-langkahnya sendiri. Ikon di atas soal hanya pengingat.") : null),
      h("div", { class: "aksi" }, tombol("Mulai", gambar, "tombol")));
  };

  if (!daftarStimulus.length) {
    isi.replaceChildren(h("div", { class: "kartu" }, h("p", {}, "Soal cerita untuk modul ini sedang disiapkan.")),
      h("div", { class: "aksi" }, tombol("Lanjut →", selesai, "tombol")));
    return;
  }
  // Lanjutkan dari langkah terakhir jika siswa sempat keluar di tengah soal cerita.
  if (lama.li > 0 && si < daftarStimulus.length) mulaiStimulus(lama);
  else mulaiStimulus();
}

function labelLevel(level) {
  return { L1: "Pemahaman", L2: "Penerapan", L3: "Penalaran" }[level] || "";
}
