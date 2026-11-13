// Nama panggilan siswa untuk sapaan.
//
// PRIVASI: nama disimpan di kunci localStorage TERPISAH ("polaku:nama"), bukan di dalam data
// belajar ("polaku:v1"). Data belajar adalah satu-satunya yang diekspor (Unduh/Bagikan) dan
// dikirim ke server penelitian (storage.js -> ekspor()). Dengan begitu nama tidak pernah ikut
// terkirim. Jangan memindahkan nama ke storage.js.

const KUNCI_NAMA = "polaku:nama";
export const PANJANG_MAKS = 20;

export function ambilNama() {
  try {
    return (localStorage.getItem(KUNCI_NAMA) || "").trim();
  } catch (e) {
    return "";
  }
}

// Merapikan masukan: buang spasi berlebih, batasi panjang, hanya huruf, spasi, titik, petik, dan tanda hubung.
export function rapikanNama(teks) {
  return String(teks || "")
    .replace(/[^\p{L}\p{M} .'\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PANJANG_MAKS)
    .trim()
    // huruf pertama setiap kata dibuat kapital: "kiara" -> "Kiara" (sisanya dibiarkan, mis. "McLaren")
    .replace(/(^|[\s'\-])(\p{L})/gu, (_, pemisah, huruf) => pemisah + huruf.toLocaleUpperCase("id-ID"));
}

// Mengembalikan true jika tersimpan. Jika localStorage tidak tersedia (mode privat), nama tetap
// dipakai selama halaman terbuka.
let namaSementara = "";
export function simpanNama(nama) {
  namaSementara = nama;
  try {
    localStorage.setItem(KUNCI_NAMA, nama);
    return true;
  } catch (e) {
    return false;
  }
}

export function namaAktif() {
  return ambilNama() || namaSementara;
}

export function hapusNama() {
  namaSementara = "";
  try { localStorage.removeItem(KUNCI_NAMA); } catch (e) { /* abaikan */ }
}

// Kalimat motivasi singkat: menumbuhkan semangat tanpa tekanan (selaras dengan temuan GL03:
// siswa cenderung berhenti saat buntu).
export const MOTIVASI = [
  "Salah itu bagian dari belajar. Yang penting terus mencoba.",
  "Sedikit demi sedikit, lama-lama jadi bukit.",
  "Setiap pola punya rahasia. Ayo kita temukan bersama!",
  "Pelan-pelan saja. Kamu pasti bisa.",
  "Otakmu makin kuat setiap kali kamu berlatih.",
  "Kalau bingung, buka petunjuk. Itu tandanya kamu terus berusaha.",
];

export function motivasiAcak() {
  return MOTIVASI[Math.floor(Math.random() * MOTIVASI.length)];
}
