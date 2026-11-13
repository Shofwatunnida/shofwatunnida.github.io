// Service worker: menyimpan semua aset agar aplikasi bisa dipakai offline.
// Daftar ASET dan VERSI di bawah DIBUAT OTOMATIS oleh `python tools/build_aset.py`
// (dijalankan juga otomatis saat server Flask dinyalakan). Jangan diedit manual.

// <<ASET-MULAI>>
const VERSI = "049c5988f8a3";
const ASET = [
  "./",
  "css/style.css",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
  "img/beranda.svg",
  "img/hias-angka.svg",
  "img/hias-bentuk.svg",
  "img/hias-persegi.svg",
  "img/hias-segitiga.svg",
  "img/modul-m0.svg",
  "img/modul-m1.svg",
  "img/modul-m2.svg",
  "img/modul-m3.svg",
  "img/modul-m4.svg",
  "img/modul-m5.svg",
  "img/modul-m6.svg",
  "img/modul-m7.svg",
  "img/modul-m8.svg",
  "index.html",
  "js/answer.js",
  "js/app.js",
  "js/konten.js",
  "js/nama.js",
  "js/pages/beranda.js",
  "js/pages/literasi.js",
  "js/pages/modul.js",
  "js/pages/progres.js",
  "js/pages/sambutan.js",
  "js/pages/tentang.js",
  "js/pages/tes.js",
  "js/pasang.js",
  "js/pattern.js",
  "js/soal.js",
  "js/storage.js",
  "js/ui.js",
  "konten/m0.json",
  "konten/m1.json",
  "konten/m2.json",
  "konten/m3.json",
  "konten/m4.json",
  "konten/m5.json",
  "konten/m6.json",
  "konten/modul.json",
  "konten/tes-akhir.json",
  "konten/tes-awal.json",
  "manifest.webmanifest"
];
// <<ASET-SELESAI>>

const NAMA_CACHE = "polaku-" + VERSI;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(NAMA_CACHE).then((cache) => cache.addAll(ASET)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((kunci) => Promise.all(kunci.filter((k) => k.startsWith("polaku-") && k !== NAMA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Konten belajar (konten/*.json): JARINGAN DULU, cadangan cache.
// Alasan: dengan "cache dulu", pembaruan modul/soal baru terlihat pada pemuatan KEDUA setelah diperbarui,
// dan tidak pernah terlihat bila daftar ASET lupa dibangun ulang. Saat offline atau jaringan lambat
// (> BATAS_WAKTU_KONTEN ms), versi terakhir di cache dipakai sehingga aplikasi tetap bisa dipakai.
const BATAS_WAKTU_KONTEN = 3000;

function jaringanDulu(req) {
  return new Promise((resolve) => {
    let selesai = false;
    const kirim = (res) => { if (!selesai && res) { selesai = true; resolve(res); } };
    const dariCache = () => caches.match(req, { ignoreSearch: true });

    // Jaringan lambat: pakai cache setelah batas waktu (jika ada); jaringan tetap ditunggu untuk memperbarui cache.
    const pengatur = setTimeout(() => { dariCache().then(kirim); }, BATAS_WAKTU_KONTEN);

    fetch(req)
      .then((res) => {
        if (res.ok) {
          const salinan = res.clone();
          caches.open(NAMA_CACHE).then((c) => c.put(req, salinan));
          clearTimeout(pengatur);
          kirim(res);
        } else {
          // galat server: pakai cache bila ada, selain itu teruskan respons aslinya
          dariCache().then((c) => { clearTimeout(pengatur); kirim(c || res); });
        }
      })
      .catch(() => {
        // offline: pakai cache; jika belum pernah tersimpan, kembalikan galat jaringan
        dariCache().then((c) => { clearTimeout(pengatur); kirim(c || Response.error()); });
      });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/api/")) return; // API selalu lewat jaringan

  // Navigasi halaman: pakai index.html dari cache (aplikasi satu halaman).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("index.html", { ignoreSearch: true }))
    );
    return;
  }

  // Konten belajar: jaringan dulu (lihat jaringanDulu di atas).
  if (url.pathname.includes("/konten/")) {
    event.respondWith(jaringanDulu(req));
    return;
  }

  // Aset lain (JS, CSS, ikon, gambar): cache dulu, lalu jaringan (dan simpan ke cache). TIDAK diubah.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((tersimpan) => {
      if (tersimpan) return tersimpan;
      return fetch(req).then((res) => {
        if (res.ok && res.type === "basic") {
          const salinan = res.clone();
          caches.open(NAMA_CACHE).then((c) => c.put(req, salinan));
        }
        return res;
      });
    })
  );
});
