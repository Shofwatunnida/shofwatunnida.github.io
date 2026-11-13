// Penyimpanan lokal di perangkat (localStorage). Tidak ada data yang dikirim ke server
// kecuali peneliti mengaktifkan fitur kirim data DAN siswa menekan tombol "Kirim".

const KUNCI = "polaku:v1";

function dataKosong() {
  return {
    versi: 1,
    profil: { kodeSiswa: "", dibuatPada: new Date().toISOString() },
    progres: {},      // { m2: { status: "sedang"|"selesai", tahap: "latihan", tahapSelesai: [...] } }
    percobaan: [],    // log tiap jawaban latihan/kuis
    literasi: [],     // log jawaban soal literasi
    skalaBeban: [],   // skala usaha mental Paas 1–9
    refleksi: [],     // penjelasan dengan kata-kata sendiri
    tes: [],          // pretest / posttest
    posisi: {},       // posisi terakhir di dalam tahap, mis. { "m2/latihan": { i: 2 } }
  };
}

let cache = null;
let memoriSaja = false; // jika localStorage tidak tersedia (mode privat, dll.)

export function muat() {
  if (cache) return cache;
  try {
    const teks = localStorage.getItem(KUNCI);
    cache = teks ? { ...dataKosong(), ...JSON.parse(teks) } : dataKosong();
  } catch (e) {
    memoriSaja = true;
    cache = dataKosong();
  }
  return cache;
}

function simpan() {
  if (memoriSaja) return;
  try {
    localStorage.setItem(KUNCI, JSON.stringify(cache));
  } catch (e) {
    memoriSaja = true;
  }
}

export function penyimpananTersedia() {
  muat();
  return !memoriSaja;
}

export function ubah(fn) {
  const d = muat();
  fn(d);
  simpan();
  return d;
}

export function catat(jenis, entri) {
  ubah((d) => {
    d[jenis].push({ ...entri, waktu: new Date().toISOString() });
  });
}

export function progresModul(id) {
  return muat().progres[id] || { status: "belum", tahap: null, tahapSelesai: [] };
}

export function setProgres(id, perubahan) {
  ubah((d) => {
    const lama = d.progres[id] || { status: "belum", tahap: null, tahapSelesai: [] };
    d.progres[id] = { ...lama, ...perubahan, diperbaruiPada: new Date().toISOString() };
  });
}

// Posisi di dalam tahap disimpan supaya siswa bisa melanjutkan setelah berpindah aplikasi,
// menerima telepon, atau halaman dimuat ulang oleh HP (Android sering menutup tab di latar belakang).
export function ambilPosisi(kunci) {
  return muat().posisi[kunci] || null;
}

export function simpanPosisi(kunci, nilai) {
  ubah((d) => { d.posisi[kunci] = nilai; });
}

export function hapusPosisi(kunci) {
  ubah((d) => { delete d.posisi[kunci]; });
}

export function tandaiTahapSelesai(id, tahap) {
  ubah((d) => {
    delete d.posisi[`${id}/${tahap}`];
    const p = d.progres[id] || { status: "sedang", tahap, tahapSelesai: [] };
    if (!p.tahapSelesai.includes(tahap)) p.tahapSelesai.push(tahap);
    if (p.status === "belum") p.status = "sedang";
    d.progres[id] = { ...p, diperbaruiPada: new Date().toISOString() };
  });
}

export function ekspor() {
  const d = muat();
  return {
    aplikasi: "PolaKu",
    diekspor: new Date().toISOString(),
    kodeSiswa: d.profil.kodeSiswa || "TANPA-KODE",
    data: d,
  };
}

export function hapusSemua() {
  cache = dataKosong();
  try { localStorage.removeItem(KUNCI); } catch (e) { /* abaikan */ }
}
