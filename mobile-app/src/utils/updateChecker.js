import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

// ── GANTI INI ────────────────────────────────────────────────────────────────
// URL file latest.json yang lu taro di GitHub (lihat contoh latest.json di root).
// Ganti GH_USER/GH_REPO sama username & nama repo lu. Nanti kalo VPS idup lagi,
// tinggal arahin URL ini ke endpoint Laravel lu, sisanya ga usah diubah.
const VERSION_MANIFEST_URL =
  'https://raw.githubusercontent.com/kikyrestu/POS---Kasir/main/latest.json';
// ──────────────────────────────────────────────────────────────────────────────

// Bandingin dua versi bergaya "1.2.3". Return true kalau `remote` LEBIH BARU
// daripada `local`. Aman kalau format beda panjang ("1.2" vs "1.2.0").
function isRemoteNewer(remote, local) {
  if (!remote || !local) return false;
  const r = String(remote).split('.').map((n) => parseInt(n, 10) || 0);
  const l = String(local).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const a = r[i] || 0;
    const b = l[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

// TIER B — cek update BINARY (APK). Ini buat perubahan NATIVE yang ga bisa OTA
// (nambah library, upgrade SDK, ganti permission/icon) → user WAJIB install ulang.
// Nembak ke latest.json, bandingin sama versi APK yang keinstall di HP.
// Return { version, url, mandatory, notes } kalau ada yang lebih baru, atau null.
// SEMUA error ditelan: offline / manifest ga ada / json rusak = null = app jalan
// normal tanpa ganggu. Ga akan pernah nge-block pemakaian offline.
export async function checkForBinaryUpdate() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(VERSION_MANIFEST_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const manifest = await res.json();

    // Versi APK yang keinstall (dari app.json "version", cth "1.0.0").
    const current = Application.nativeApplicationVersion;
    if (!manifest || !manifest.version || !isRemoteNewer(manifest.version, current)) {
      return null;
    }

    return {
      version: manifest.version,
      url: manifest.apkUrl || manifest.url || '',
      mandatory: !!manifest.mandatory,
      notes: manifest.notes || '',
    };
  } catch (e) {
    return null; // offline / timeout / json rusak → skip diem-diem
  } finally {
    clearTimeout(timer);
  }
}

// TIER A — cek + download update OTA (perubahan JS/tampilan/logic). Ga perlu
// install ulang; cukup reload. Return true kalau update udah kedownload & siap
// dipasang. No-op pas dev (expo start / Expo Go) dan pas offline.
export async function checkAndFetchOta() {
  if (__DEV__) return false; // OTA cuma jalan di build asli, bukan dev
  if (!Updates.isEnabled) return false; // build tanpa updates / belum di-configure
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    return true; // udah kedownload, tinggal applyOta()
  } catch (e) {
    return false; // update server ga kejangkau → app tetep jalan pakai bundle lama
  }
}

// Pasang update OTA yang udah kedownload: restart app dengan bundle baru.
export async function applyOta() {
  try {
    await Updates.reloadAsync();
  } catch (e) {
    // Kalau gagal reload, biarin — update tetep kepasang di launch berikutnya.
  }
}
