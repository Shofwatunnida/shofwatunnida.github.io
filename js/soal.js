// Komponen soal interaktif untuk semua tipe soal.
// mode "latihan": ada petunjuk, Cek Aturanmu, boleh mencoba lagi dan melewati soal.
// mode "kuis"/"tes": satu kali kirim, tanpa petunjuk.
import { h, tombol, paragraf, visual, barisanDenganTombol, kotakPetunjuk, umpanBalik, papanRumus, cekAturanmu, teksKaya, tabelResponsif } from "./ui.js";
import { periksaJawaban } from "./answer.js";

export function soalInteraktif(soal, opsi = {}) {
  const { mode = "latihan", onLanjut = () => {}, catat = () => {}, labelLanjut = "Lanjut →", tampilkanVisual = true } = opsi;
  const latihan = mode === "latihan";
  let percobaan = 0;
  let cekDipakai = false;
  let sudahDiingatkan = false;
  let selesai = false;
  const mulai = Date.now();

  const wadah = h("div", { class: "soal" });
  wadah.append(h("p", { class: "soal-tanya", html: teksKaya(soal.pertanyaan) }));

  if (tampilkanVisual) {
    if (soal.visual) wadah.append(visual(soal.visual, { tampilkanSelisih: false }));
    else if (soal.pola && latihan) wadah.append(barisanDenganTombol(soal.pola, { tanya: soal.tanya ?? 1, tingkatDua: soal.tingkatDua }));
    else if (soal.pola) wadah.append(visual({ jenis: "barisan", pola: soal.pola, tampilkanSelisih: false, tanya: soal.tanya ?? 1 }));
  }

  const isian = buatIsian(soal);
  wadah.append(isian.el);

  let petunjuk = null;
  if (latihan && soal.petunjuk && soal.petunjuk.length) {
    petunjuk = kotakPetunjuk(soal.petunjuk);
  }
  // "cekAturan": false di konten mematikan alat ini, mis. untuk Fibonacci (tidak punya rumus suku ke-n sederhana).
  if (latihan && soal.pola && soal.cekAturan !== false && (soal.tipe === "isian-angka" || soal.tipe === "isian-rumus")) {
    wadah.append(cekAturanmu(soal.pola, () => { cekDipakai = true; }));
  }

  const area = h("div", { class: "umpan-area", "aria-live": "polite" });
  const aksi = h("div", { class: "aksi" });
  const tKirim = tombol(soal.tipe === "uraian-singkat" ? "Simpan" : "Kirim", kirim, "tombol");
  const tLewati = latihan ? tombol("Lewati dulu", () => {
    catat({ soalId: soal.id, mode, jawaban: null, benar: false, dilewati: true, jumlahPetunjuk: petunjuk ? petunjuk.jumlahDibuka() : 0, cekAturanDipakai: cekDipakai, waktuMs: Date.now() - mulai });
    onLanjut({ benar: false, dilewati: true });
  }, "tombol tombol-teks") : null;
  aksi.append(tKirim);
  if (tLewati) aksi.append(tLewati);

  if (petunjuk) wadah.append(petunjuk);
  wadah.append(area, aksi);

  // Tombol Enter/"Selesai" di keyboard HP: pindah ke kotak berikutnya, atau kirim jawaban.
  const kotak = [...isian.el.querySelectorAll("input.isian")].concat(isian.el.matches && isian.el.matches("input.isian") ? [isian.el] : []);
  kotak.forEach((inp, k) => {
    inp.setAttribute("enterkeyhint", k < kotak.length - 1 ? "next" : "done");
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing) return;
      e.preventDefault();
      if (k < kotak.length - 1) kotak[k + 1].focus();
      else if (!selesai) kirim();
    });
  });

  function kirim() {
    if (selesai) return;
    const jawaban = isian.ambil();

    // Ajak siswa memakai Cek Aturanmu sebelum mengirim rumus (temuan GL02).
    if (latihan && soal.tipe === "isian-rumus" && soal.pola && !cekDipakai && !sudahDiingatkan) {
      sudahDiingatkan = true;
      area.replaceChildren(h("div", { class: "umpan umpan-netral" },
        h("strong", {}, "Sudah cek aturanmu? "),
        "Coba uji rumusmu ke suku-suku yang diketahui lewat 🔍 Cek Aturanmu. ",
        tombol("Kirim saja", kirim, "tombol tombol-kecil tombol-garis")));
      return;
    }

    const hasil = periksaJawaban(soal, jawaban);
    if (hasil.kosong) {
      area.replaceChildren(h("p", { class: "teks-peringatan" }, hasil.pesan));
      tampakkan(area);
      return;
    }
    percobaan++;
    catat({
      soalId: soal.id, mode, jawaban, benar: hasil.benar, percobaanKe: percobaan,
      jumlahPetunjuk: petunjuk ? petunjuk.jumlahDibuka() : 0, cekAturanDipakai: cekDipakai, waktuMs: Date.now() - mulai,
    });

    let pesan = hasil.pesan;
    if (hasil.benar && soal.pembahasan) pesan = soal.pembahasan;
    if (hasil.benar === false && !latihan && soal.pembahasan) pesan = (hasil.pesan ? hasil.pesan + " " : "") + "Pembahasan: " + soal.pembahasan;
    // Pada tes (pretest/posttest) benar/salah tidak ditampilkan agar data penelitian tidak bias.
    area.replaceChildren(mode === "tes" ? umpanBalik(null, "Lanjut ke soal berikutnya.") : umpanBalik(hasil.benar, pesan));

    tampakkan(area);
    const akhir = hasil.benar !== false || !latihan;
    if (akhir) {
      selesai = true;
      isian.kunci();
      aksi.replaceChildren(tombol(labelLanjut, () => onLanjut({ benar: hasil.benar, percobaan, jumlahPetunjuk: petunjuk ? petunjuk.jumlahDibuka() : 0 }), "tombol"));
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // tutup keyboard HP
      tampakkan(aksi);
    } else {
      tKirim.textContent = "Coba lagi";
      if (petunjuk && petunjuk.jumlahDibuka() === 0) {
        area.append(h("p", { class: "kecil" }, "Tidak apa-apa salah. Buka petunjuk kalau kamu bingung."));
      }
    }
  }

  return wadah;
}

function tampakkan(el) {
  const kurangiGerak = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() => el.scrollIntoView({ block: "nearest", behavior: kurangiGerak ? "auto" : "smooth" }));
}

function buatIsian(soal) {
  switch (soal.tipe) {
    case "isian-angka": {
      const input = h("input", { type: "text", inputmode: "decimal", class: "isian isian-angka", "aria-label": "Jawaban", autocomplete: "off", placeholder: "Jawabanmu" });
      const el = h("div", { class: "isian-baris" }, input, soal.satuan ? h("span", { class: "satuan" }, soal.satuan) : null);
      return { el, ambil: () => input.value, kunci: () => { input.disabled = true; } };
    }
    case "isian-rumus": {
      const input = h("input", { type: "text", class: "isian", "aria-label": "Rumus suku ke-n", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "mis. 3n + 1" });
      const papan = papanRumus(input);
      const el = h("div", {}, h("label", { class: "label-isian" }, "Uₙ = ", input), papan);
      return { el, ambil: () => input.value, kunci: () => { input.disabled = true; papan.hidden = true; } };
    }
    case "pilihan-ganda": {
      const nama = "pg-" + soal.id;
      const opsi = soal.pilihan.map((p, i) => h("label", { class: "pilihan" },
        h("input", { type: "radio", name: nama, value: String(i) }), h("span", { html: teksKaya(p) })));
      const el = h("div", { class: "pilihan-daftar", role: "radiogroup" }, opsi);
      return {
        el,
        ambil: () => { const c = el.querySelector("input:checked"); return c ? Number(c.value) : null; },
        kunci: () => el.querySelectorAll("input").forEach((i) => { i.disabled = true; }),
      };
    }
    case "pg-kompleks": {
      const nilai = soal.pernyataan.map(() => null);
      const el = h("div", { class: "bs-daftar" }, soal.pernyataan.map((p, i) => {
        const b = h("button", { type: "button", class: "bs-tombol", "aria-pressed": "false" }, "Benar");
        const s = h("button", { type: "button", class: "bs-tombol", "aria-pressed": "false" }, "Salah");
        const pilih = (v) => {
          nilai[i] = v;
          b.setAttribute("aria-pressed", String(v === true));
          s.setAttribute("aria-pressed", String(v === false));
        };
        b.addEventListener("click", () => pilih(true));
        s.addEventListener("click", () => pilih(false));
        return h("div", { class: "bs-baris" }, h("p", { html: teksKaya(p.teks) }), h("div", { class: "bs-pilih" }, b, s));
      }));
      return { el, ambil: () => nilai.slice(), kunci: () => el.querySelectorAll("button").forEach((x) => { x.disabled = true; }) };
    }
    case "menjodohkan": {
      const selects = soal.pasangan.map((p) => h("select", { class: "isian", "aria-label": "Pasangan untuk " + p.kiri },
        h("option", { value: "" }, "— pilih —"),
        soal.kanan.map((k, i) => h("option", { value: String(i) }, k))));
      const el = h("div", { class: "jodoh-daftar" }, soal.pasangan.map((p, i) =>
        h("div", { class: "jodoh-baris" }, h("p", { html: teksKaya(p.kiri) }), selects[i])));
      return { el, ambil: () => selects.map((s) => (s.value === "" ? null : Number(s.value))), kunci: () => selects.forEach((s) => { s.disabled = true; }) };
    }
    case "lengkapi-tabel": {
      // Isian dibuat berurutan baris demi baris (urutan kunciTabel), lalu tabel ditata.
      // Tabel lebar diputar menjadi vertikal agar muat di layar HP.
      const inputs = [];
      const kolom = soal.tabel.kolom;
      const sel = soal.tabel.baris.map((r) => r.map((c, ci) => {
        if (c !== null) return String(c);
        const label = `${r[0]} untuk ${kolom[0]} ${kolom[ci]}`;
        const inp = h("input", { type: "text", inputmode: "decimal", class: "isian isian-sel", "aria-label": label, autocomplete: "off" });
        inputs.push(inp);
        return inp;
      }));
      return { el: tabelResponsif(kolom, sel), ambil: () => inputs.map((i) => i.value), kunci: () => inputs.forEach((i) => { i.disabled = true; }) };
    }
    case "klaim": {
      const nama = "klaim-" + soal.id;
      const setuju = h("div", { class: "pilihan-daftar", role: "radiogroup", "aria-label": "Setuju atau tidak" },
        h("label", { class: "pilihan" }, h("input", { type: "radio", name: nama + "-s", value: "1" }), "Setuju"),
        h("label", { class: "pilihan" }, h("input", { type: "radio", name: nama + "-s", value: "0" }), "Tidak setuju"));
      const alasan = h("div", { class: "pilihan-daftar", role: "radiogroup", "aria-label": "Alasan" },
        soal.alasan.pilihan.map((p, i) => h("label", { class: "pilihan" }, h("input", { type: "radio", name: nama + "-a", value: String(i) }), h("span", { html: teksKaya(p) }))));
      const el = h("div", { class: "klaim" },
        h("blockquote", { class: "klaim-tokoh" }, h("strong", {}, soal.tokoh + ": "), "“" + soal.klaim + "”"),
        h("p", { class: "label-isian" }, "Pendapatmu:"), setuju,
        h("p", { class: "label-isian" }, "Alasannya:"), alasan);
      return {
        el,
        ambil: () => {
          const s = setuju.querySelector("input:checked");
          const a = alasan.querySelector("input:checked");
          return { setuju: s ? s.value === "1" : null, alasan: a ? Number(a.value) : null };
        },
        kunci: () => el.querySelectorAll("input").forEach((i) => { i.disabled = true; }),
      };
    }
    case "uraian-singkat": {
      const ta = h("textarea", { class: "isian isian-panjang", rows: "3", maxlength: "500", "aria-label": "Jawaban uraian", placeholder: soal.placeholder || "Tulis dengan kata-katamu sendiri" });
      return { el: ta, ambil: () => ta.value.trim(), kunci: () => { ta.disabled = true; } };
    }
    default:
      return { el: paragraf("Tipe soal belum didukung: " + soal.tipe), ambil: () => null, kunci: () => {} };
  }
}
