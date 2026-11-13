// Memuat file konten JSON (di-cache service worker sehingga bisa offline).
const cache = new Map();

export async function ambilKonten(nama) {
  if (cache.has(nama)) return cache.get(nama);
  const res = await fetch(`konten/${nama}.json`);
  if (!res.ok) throw new Error(`Konten "${nama}" tidak ditemukan (${res.status}).`);
  const data = await res.json();
  cache.set(nama, data);
  return data;
}

export const TAHAP = [
  { id: "konsep", label: "Konsep", ikon: "📘" },
  { id: "contoh", label: "Contoh Lengkap", ikon: "🧩" },
  { id: "setengah", label: "Contoh Setengah Jadi", ikon: "✏️" },
  { id: "latihan", label: "Latihan", ikon: "🏋️" },
  { id: "literasi", label: "Literasi: Soal Cerita", ikon: "📖" },
  { id: "refleksi", label: "Refleksi", ikon: "💭" },
  { id: "kuis", label: "Kuis", ikon: "🏁" },
];

export function tahapBerikutnya(id) {
  const i = TAHAP.findIndex((t) => t.id === id);
  return i >= 0 && i < TAHAP.length - 1 ? TAHAP[i + 1].id : null;
}
