// Pemasangan aplikasi tanpa Play Store / App Store (PWA).
// Android/Chrome/Edge: memakai event beforeinstallprompt.
// iPhone/iPad (Safari): tidak ada prompt otomatis, jadi tampilkan petunjuk "Bagikan → Tambahkan ke Layar Utama".

let promptTertunda = null;
const pendengar = new Set();

export function siapkanPemasangan() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptTertunda = e;
    pendengar.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    promptTertunda = null;
    pendengar.forEach((fn) => fn());
  });
}

export function sudahTerpasang() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function bisaPasangOtomatis() {
  return promptTertunda !== null;
}

export function perangkatIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function pasang() {
  if (!promptTertunda) return false;
  promptTertunda.prompt();
  const { outcome } = await promptTertunda.userChoice;
  promptTertunda = null;
  pendengar.forEach((fn) => fn());
  return outcome === "accepted";
}

export function saatStatusBerubah(fn) {
  pendengar.add(fn);
  return () => pendengar.delete(fn);
}
