// Mesin pola: selisih antarsuku dan deteksi jenis pola sederhana.
// Murni (tanpa DOM) supaya bisa diuji dari Python.

export function selisih(pola) {
  const hasil = [];
  for (let i = 1; i < pola.length; i++) hasil.push(pola[i] - pola[i - 1]);
  return hasil;
}

export function semuaSama(arr) {
  return arr.length > 0 && arr.every((x) => x === arr[0]);
}

// Mengembalikan { jenis, keterangan }
export function deteksiPola(pola) {
  if (pola.length < 3) return { jenis: "kurang-data", keterangan: "Butuh minimal 3 suku." };
  const d1 = selisih(pola);
  if (semuaSama(d1)) {
    return { jenis: "selisih-tetap", beda: d1[0], keterangan: `Selisih tetap ${tandaAngka(d1[0])}.` };
  }
  const fib = pola.slice(2).every((x, i) => x === pola[i] + pola[i + 1]);
  if (fib) return { jenis: "fibonacci", keterangan: "Setiap suku = jumlah dua suku sebelumnya." };
  const d2 = selisih(d1);
  if (semuaSama(d2)) {
    return { jenis: "selisih-tingkat-dua", beda2: d2[0], keterangan: `Selisihnya bertambah ${tandaAngka(d2[0])} (selisih tingkat dua tetap).` };
  }
  return { jenis: "lainnya", keterangan: "Coba cari hubungan lain, misalnya dikali." };
}

export function tandaAngka(x) {
  return x >= 0 ? `+${x}` : `${x}`;
}

// Banyak noktah pada gambar ke-n untuk tiap bentuk pola (dipakai komponen DotPattern).
export function banyakNoktah(bentuk, n) {
  switch (bentuk) {
    case "persegi": return n * n;
    case "persegi-panjang": return n * (n + 1);
    case "segitiga": return (n * (n + 1)) / 2;
    case "ganjil": return 2 * n - 1;
    case "genap": return 2 * n;
    case "dua-segitiga": return n * (n + 1);
    default: return n;
  }
}
