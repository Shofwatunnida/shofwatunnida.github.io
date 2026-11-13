// Tentang aplikasi, privasi, cara memasang, kode siswa, ekspor & kirim data penelitian, hapus data.
import { h, tombol, kepala } from "../ui.js";
import { muat, ubah, ekspor, hapusSemua, penyimpananTersedia } from "../storage.js";
import { bisaPasangOtomatis, pasang, sudahTerpasang } from "../pasang.js";
import { namaAktif, hapusNama } from "../nama.js";

async function statusPenelitian() {
  try {
    const res = await fetch("api/status", { cache: "no-store" });
    if (!res.ok) return false;
    const d = await res.json();
    return !!d.penelitianAktif;
  } catch (e) {
    return false;
  }
}

export async function halamanTentang() {
  const data = muat();
  const kode = h("input", { type: "text", class: "isian", maxlength: "12", value: data.profil.kodeSiswa || "", placeholder: "mis. S01", "aria-label": "Kode siswa", autocomplete: "off" });
  const infoKode = h("p", { class: "kecil", "aria-live": "polite" });
  const area = h("div", { "aria-live": "polite" });
  const aktif = await statusPenelitian();

  const simpanKode = () => {
    const v = kode.value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    kode.value = v;
    ubah((d) => { d.profil.kodeSiswa = v; });
    infoKode.textContent = v ? `Kode tersimpan: ${v}` : "Kode dihapus.";
  };

  const namaFile = (ekst) => `polaku-${muat().profil.kodeSiswa || "tanpa-kode"}-${new Date().toISOString().slice(0, 10)}.${ekst}`;

  const unduh = () => {
    const isi = JSON.stringify(ekspor(), null, 2);
    const blob = new Blob([isi], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: namaFile("json") });
    document.body.append(a);
    a.click();
    a.remove();
    area.replaceChildren(h("p", { class: "teks-sukses" }, "File data sudah diunduh. Serahkan file ini ke peneliti/guru."));
  };

  // Di HP, "Bagikan" membuka menu berbagi (WhatsApp, Telegram, Drive, email) sehingga siswa bisa
  // langsung mengirim file ke peneliti. File dibagikan sebagai .txt (isi tetap JSON) karena
  // banyak browser HP menolak membagikan file .json. tools/analisis_data.py membaca keduanya.
  const bagikan = async () => {
    const isi = JSON.stringify(ekspor(), null, 2);
    let file = null;
    try { file = new File([isi], namaFile("txt"), { type: "text/plain" }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Data PolaKu", text: `Data belajar PolaKu (${muat().profil.kodeSiswa || "tanpa kode"})` });
        area.replaceChildren(h("p", { class: "teks-sukses" }, "Data sudah dibagikan. Terima kasih!"));
      } catch (e) {
        if (e && e.name === "AbortError") return; // siswa membatalkan
        unduh();
      }
      return;
    }
    unduh();
  };

  const kirim = async () => {
    if (!data.profil.kodeSiswa) { area.replaceChildren(h("p", { class: "teks-peringatan" }, "Isi kode siswa dulu (dari peneliti/guru).")); return; }
    area.replaceChildren(h("p", {}, "Mengirim…"));
    try {
      const res = await fetch("api/penelitian", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ekspor()) });
      const d = await res.json().catch(() => ({}));
      area.replaceChildren(h("p", { class: res.ok ? "teks-sukses" : "teks-peringatan" }, res.ok ? "Data berhasil dikirim ke peneliti. Terima kasih!" : (d.pesan || "Gagal mengirim data.")));
    } catch (e) {
      area.replaceChildren(h("p", { class: "teks-peringatan" }, "Tidak bisa terhubung. Pastikan ada internet, atau gunakan tombol Unduh."));
    }
  };

  const konfirmasiHapus = h("div");
  const mintaHapus = () => {
    konfirmasiHapus.replaceChildren(h("div", { class: "kartu kartu-bahaya" },
      h("p", {}, "Yakin menghapus semua progres dan jawabanmu di perangkat ini? Ini tidak bisa dibatalkan."),
      h("div", { class: "aksi aksi-dua" },
        tombol("Batal", () => konfirmasiHapus.replaceChildren(), "tombol tombol-garis"),
        tombol("Ya, hapus", () => { hapusSemua(); hapusNama(); location.hash = "#/"; }, "tombol tombol-bahaya"))));
  };

  let bagianPasang;
  if (sudahTerpasang()) bagianPasang = h("p", {}, "✓ PolaKu sudah terpasang di perangkat ini.");
  else bagianPasang = [
    bisaPasangOtomatis() ? tombol("📲 Pasang Aplikasi", () => pasang(), "tombol") : null,
    h("ul", {},
      h("li", {}, h("strong", {}, "Android (Chrome): "), "menu ⋮ → ", h("em", {}, "Instal aplikasi"), " atau ", h("em", {}, "Tambahkan ke layar utama"), "."),
      h("li", {}, h("strong", {}, "iPhone/iPad (Safari): "), "tombol Bagikan → ", h("em", {}, "Tambahkan ke Layar Utama"), "."),
      h("li", {}, h("strong", {}, "Laptop (Chrome/Edge): "), "ikon pasang (⊕) di ujung kanan kolom alamat.")),
    h("p", { class: "kecil" }, "Tidak perlu Play Store atau App Store. Setelah dipasang, aplikasi bisa dibuka tanpa internet."),
  ];

  return h("div", { class: "halaman" },
    kepala("Tentang", "#/", "", "💡"),
    h("section", { class: "kartu" },
      h("h2", {}, "PolaKu"),
      h("p", {}, "Aplikasi belajar Pola Bilangan untuk siswa SMP. Dirancang berdasarkan Teori Beban Kognitif dan untuk menumbuhkan literasi matematika."),
      h("p", { class: "kecil" }, "Dikembangkan oleh mahasiswa S1 Pendidikan Matematika sebagai media pembelajaran.")),
    h("section", { class: "kartu" },
      h("h2", {}, "Nama panggilan"),
      h("p", {}, "Namamu: ", h("strong", {}, namaAktif() || "-")),
      h("a", { class: "tombol tombol-kecil tombol-garis", href: "#/sambutan" }, "✏️ Ganti nama")),
    h("section", { class: "kartu" }, h("h2", {}, "Pasang di perangkatmu"), bagianPasang),
    h("section", { class: "kartu" },
      h("h2", {}, "Privasi"),
      h("ul", {},
        h("li", {}, "Tidak perlu akun dan tidak meminta email atau nomor HP."),
        h("li", {}, "Nama panggilanmu hanya dipakai untuk menyapamu, disimpan di perangkat ini, dan tidak pernah ikut terkirim atau terunduh."),
        h("li", {}, "Progres dan jawabanmu hanya disimpan di perangkat ini."),
        h("li", {}, "Data belajar hanya dikirim jika kamu menekan tombol Kirim di bawah, dan hanya memuat kode siswa (tanpa nama).")),
      penyimpananTersedia() ? null : h("p", { class: "teks-peringatan" }, "Penyimpanan perangkat tidak tersedia (mungkin mode penyamaran). Progres akan hilang saat halaman ditutup.")),
    h("section", { class: "kartu" },
      h("h2", {}, "Untuk penelitian"),
      h("p", { class: "kecil" }, "Isi hanya jika diminta oleh peneliti/guru. Gunakan kode, bukan nama asli."),
      h("label", { class: "label-isian" }, "Kode siswa ", kode),
      tombol("Simpan kode", simpanKode, "tombol tombol-kecil tombol-garis"), infoKode,
      h("div", { class: "aksi aksi-dua" },
        tombol(navigator.canShare ? "📲 Bagikan data" : "⬇️ Unduh data", bagikan, "tombol tombol-garis"),
        aktif ? tombol("📤 Kirim ke peneliti", kirim, "tombol") : null),
      area),
    h("section", { class: "kartu" },
      h("h2", {}, "Hapus data"),
      h("p", { class: "kecil" }, "Menghapus progres, jawaban, dan nama panggilanmu dari perangkat ini."),
      tombol("Hapus semua data saya", mintaHapus, "tombol tombol-bahaya-garis"),
      konfirmasiHapus));
}
