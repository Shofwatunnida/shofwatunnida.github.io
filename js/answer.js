// Pemeriksa jawaban: angka dan rumus suku ke-n.
// Tidak memakai eval(). Rumus di-parse dengan parser recursive-descent kecil.
// File ini murni (tanpa DOM) supaya bisa diuji dari Python (tests/test_js_logic.py).

// ---------- Angka ----------

// Ubah teks jawaban siswa menjadi angka.
// Menerima: "31", " 31 kursi", "Rp35.000", "10,5", "-4". Mengembalikan null jika tidak ada angka.
export function parseAngka(teks) {
  if (teks === null || teks === undefined) return null;
  if (typeof teks === "number") return Number.isFinite(teks) ? teks : null;
  let s = String(teks).trim().toLowerCase().replace(/^rp\.?\s*/, "");
  const m = s.match(/-?\d+(?:[.,]\d+)*/);
  if (!m) return null;
  let t = m[0];
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
    t = t.replace(/\./g, "").replace(",", "."); // 35.000 -> 35000 (pemisah ribuan gaya Indonesia)
  } else if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", "."); // 10,33 -> 10.33
  }
  // selain itu titik dianggap desimal: 10.5 -> 10.5
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export function angkaSama(a, b) {
  return a !== null && b !== null && Math.abs(a - b) < 1e-9;
}

// ---------- Rumus ----------

function normalisasi(teks) {
  let s = String(teks).toLowerCase().trim();
  // Buang awalan seperti "Un =", "U_n =", "suku ke-n ="
  s = s.replace(/^(u\s*_?\s*n|un|suku\s*ke\s*-?\s*n)\s*=\s*/, "");
  s = s.replace(/\s+/g, "");
  s = s.replace(/[×·∙]/g, "*").replace(/[÷:]/g, "/").replace(/[−–]/g, "-");
  s = s.replace(/²/g, "^2").replace(/³/g, "^3");
  s = s.replace(/,/g, ".");
  // "x" dipakai siswa sebagai tanda kali (variabel di aplikasi ini selalu n)
  s = s.replace(/x/g, "*");
  return s;
}

function tokenisasi(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) throw new Error("angka tidak valid");
      tokens.push({ t: "num", v: num });
      i = j;
    } else if (c === "n") {
      tokens.push({ t: "n" });
      i++;
    } else if ("+-*/^()".includes(c)) {
      tokens.push({ t: c });
      i++;
    } else {
      throw new Error("karakter tidak dikenal: " + c);
    }
  }
  // Sisipkan perkalian implisit: 3n, 2(, n(, )(, )n, )3, n n
  const hasil = [];
  for (let k = 0; k < tokens.length; k++) {
    const a = tokens[k - 1];
    const b = tokens[k];
    if (a && (a.t === "num" || a.t === "n" || a.t === ")") && (b.t === "num" || b.t === "n" || b.t === "(")) {
      if (!(a.t === "num" && b.t === "num")) hasil.push({ t: "*" });
    }
    hasil.push(b);
  }
  return hasil;
}

// Tata bahasa:
// expr   := term (('+'|'-') term)*
// term   := unary (('*'|'/') unary)*
// unary  := '-' unary | power
// power  := atom ('^' unary)?
// atom   := num | 'n' | '(' expr ')'
function buatParser(tokens) {
  let pos = 0;
  const lihat = () => tokens[pos];
  const ambil = (t) => {
    const tok = tokens[pos];
    if (!tok || (t && tok.t !== t)) throw new Error("rumus tidak lengkap");
    pos++;
    return tok;
  };
  function expr() {
    let node = term();
    while (lihat() && (lihat().t === "+" || lihat().t === "-")) {
      const op = ambil().t;
      node = { op, a: node, b: term() };
    }
    return node;
  }
  function term() {
    let node = unary();
    while (lihat() && (lihat().t === "*" || lihat().t === "/")) {
      const op = ambil().t;
      node = { op, a: node, b: unary() };
    }
    return node;
  }
  function unary() {
    if (lihat() && lihat().t === "-") {
      ambil();
      return { op: "neg", a: unary() };
    }
    if (lihat() && lihat().t === "+") {
      ambil();
      return unary();
    }
    return power();
  }
  function power() {
    const base = atom();
    if (lihat() && lihat().t === "^") {
      ambil();
      return { op: "^", a: base, b: unary() };
    }
    return base;
  }
  function atom() {
    const tok = lihat();
    if (!tok) throw new Error("rumus tidak lengkap");
    if (tok.t === "num") { ambil(); return { op: "num", v: tok.v }; }
    if (tok.t === "n") { ambil(); return { op: "n" }; }
    if (tok.t === "(") {
      ambil();
      const e = expr();
      ambil(")");
      return e;
    }
    throw new Error("rumus tidak valid");
  }
  return {
    parse() {
      if (tokens.length === 0) throw new Error("rumus kosong");
      const tree = expr();
      if (pos !== tokens.length) throw new Error("rumus tidak valid");
      return tree;
    },
  };
}

function hitung(node, n) {
  switch (node.op) {
    case "num": return node.v;
    case "n": return n;
    case "neg": return -hitung(node.a, n);
    case "+": return hitung(node.a, n) + hitung(node.b, n);
    case "-": return hitung(node.a, n) - hitung(node.b, n);
    case "*": return hitung(node.a, n) * hitung(node.b, n);
    case "/": return hitung(node.a, n) / hitung(node.b, n);
    case "^": return Math.pow(hitung(node.a, n), hitung(node.b, n));
    default: throw new Error("operasi tidak dikenal");
  }
}

// Mengembalikan fungsi f(n) atau melempar Error dengan pesan ramah.
export function parseRumus(teks) {
  const tree = buatParser(tokenisasi(normalisasi(teks))).parse();
  return (n) => hitung(tree, n);
}

// { valid: true, f } atau { valid: false, pesan }
export function cobaParseRumus(teks) {
  if (!teks || !String(teks).trim()) return { valid: false, pesan: "Rumus masih kosong." };
  try {
    const f = parseRumus(teks);
    const uji = f(1);
    if (!Number.isFinite(uji)) return { valid: false, pesan: "Rumus belum bisa dihitung untuk n = 1." };
    return { valid: true, f };
  } catch (e) {
    return { valid: false, pesan: "Rumus belum bisa dibaca. Contoh penulisan: 3n + 1 atau n^2." };
  }
}

// Dua rumus dianggap sama jika hasilnya sama untuk n = 1..10.
export function rumusSetara(a, b) {
  const ra = cobaParseRumus(a);
  const rb = cobaParseRumus(b);
  if (!ra.valid || !rb.valid) return false;
  for (let n = 1; n <= 10; n++) {
    if (!angkaSama(ra.f(n), rb.f(n))) return false;
  }
  return true;
}

// Untuk fitur "Cek Aturanmu": bandingkan rumus siswa dengan suku-suku yang diketahui.
// Mengembalikan { valid, pesan?, baris: [{ n, rumus, pola, cocok }], semuaCocok }
export function cekAturan(teksRumus, pola) {
  const r = cobaParseRumus(teksRumus);
  if (!r.valid) return { valid: false, pesan: r.pesan, baris: [], semuaCocok: false };
  const baris = pola.map((suku, i) => {
    const n = i + 1;
    const hasil = r.f(n);
    const dibulatkan = Math.round(hasil * 1000) / 1000;
    return { n, rumus: dibulatkan, pola: suku, cocok: angkaSama(hasil, suku) };
  });
  return { valid: true, baris, semuaCocok: baris.every((b) => b.cocok) };
}

// ---------- Pemeriksa umum per tipe soal ----------

// soal.tipe: isian-angka | isian-rumus | pilihan-ganda | pg-kompleks | menjodohkan | lengkapi-tabel | klaim | uraian-singkat
// Mengembalikan { benar: boolean|null, pesan }  (null = tidak dinilai otomatis)
export function periksaJawaban(soal, jawaban) {
  switch (soal.tipe) {
    case "isian-angka": {
      const v = parseAngka(jawaban);
      if (v === null) return { benar: false, kosong: true, pesan: "Tulis jawabanmu dalam bentuk angka." };
      const benar = angkaSama(v, Number(soal.jawaban));
      // Umpan balik boleh punya "toleransi", mis. 10,33 juga menangkap 10,3 dan 10,333.
      return { benar, pesan: benar ? "" : cariUmpanBalik(soal, (k, u) => {
        const t = parseAngka(k);
        return u && u.toleransi ? t !== null && Math.abs(v - t) <= u.toleransi : angkaSama(v, t);
      }) };
    }
    case "isian-rumus": {
      const r = cobaParseRumus(jawaban);
      if (!r.valid) return { benar: false, kosong: true, pesan: r.pesan };
      const benar = rumusSetara(jawaban, soal.jawaban);
      return { benar, pesan: benar ? "" : cariUmpanBalik(soal, (k) => rumusSetara(jawaban, k)) };
    }
    case "pilihan-ganda": {
      if (jawaban === null || jawaban === undefined || jawaban === "") {
        return { benar: false, kosong: true, pesan: "Pilih salah satu jawaban." };
      }
      const benar = Number(jawaban) === Number(soal.jawaban);
      return { benar, pesan: benar ? "" : cariUmpanBalik(soal, (k) => Number(k) === Number(jawaban)) };
    }
    case "pg-kompleks": {
      // jawaban: array boolean, satu per pernyataan
      const kunci = soal.pernyataan.map((p) => p.benar);
      if (!Array.isArray(jawaban) || jawaban.some((j) => j === null || j === undefined)) {
        return { benar: false, kosong: true, pesan: "Tentukan Benar atau Salah untuk setiap pernyataan." };
      }
      const salah = kunci.map((k, i) => k !== jawaban[i]);
      const benar = salah.every((s) => !s);
      const idx = salah.findIndex((s) => s);
      return { benar, pesan: benar ? "" : (soal.pernyataan[idx].penjelasan || soal.umpanBalikUmum) };
    }
    case "menjodohkan": {
      // jawaban: array indeks pasangan kanan untuk tiap item kiri
      if (!Array.isArray(jawaban) || jawaban.some((j) => j === null || j === undefined || j === "")) {
        return { benar: false, kosong: true, pesan: "Jodohkan semua pasangan dulu." };
      }
      const benar = soal.pasangan.every((p, i) => Number(jawaban[i]) === p.jawaban);
      return { benar, pesan: benar ? "" : soal.umpanBalikUmum };
    }
    case "lengkapi-tabel": {
      // jawaban: array nilai untuk sel yang kosong (urut sesuai soal.tabel yang bernilai null)
      const kunci = soal.kunciTabel;
      if (!Array.isArray(jawaban) || jawaban.some((j) => parseAngka(j) === null)) {
        return { benar: false, kosong: true, pesan: "Isi semua kotak yang kosong dengan angka." };
      }
      const benar = kunci.every((k, i) => angkaSama(parseAngka(jawaban[i]), k));
      return { benar, pesan: benar ? "" : soal.umpanBalikUmum };
    }
    case "klaim": {
      // jawaban: { setuju: boolean, alasan: indeks }
      if (!jawaban || jawaban.setuju === undefined || jawaban.setuju === null || jawaban.alasan === undefined || jawaban.alasan === null) {
        return { benar: false, kosong: true, pesan: "Pilih setuju atau tidak, lalu pilih alasannya." };
      }
      const benar = jawaban.setuju === soal.klaimBenar && Number(jawaban.alasan) === soal.alasan.benar;
      let pesan = "";
      if (!benar) {
        pesan = jawaban.setuju !== soal.klaimBenar
          ? (soal.umpanBalikUmum || "Coba hitung ulang untuk memeriksa klaimnya.")
          : "Pilihan setuju/tidakmu sudah tepat, tetapi alasannya belum. Baca lagi pilihan alasannya.";
      }
      return { benar, pesan };
    }
    case "uraian-singkat":
      if (!jawaban || !String(jawaban).trim()) return { benar: false, kosong: true, pesan: "Tulis jawabanmu dulu, walau singkat." };
      return { benar: null, pesan: "" };
    default:
      return { benar: false, pesan: "Tipe soal belum didukung." };
  }
}

function cariUmpanBalik(soal, cocok) {
  const daftar = soal.umpanBalik || [];
  for (const u of daftar) {
    if (cocok(u.jawaban, u)) return u.pesan;
  }
  return soal.umpanBalikUmum || "Belum tepat. Coba buka petunjuk.";
}
