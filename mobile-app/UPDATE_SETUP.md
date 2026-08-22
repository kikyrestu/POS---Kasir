# BuildyPOS — Sistem Update Aplikasi (Panduan Operasional)

Ada **2 jalur update** yang saling nutupin. Ngerti bedanya dulu biar ga salah pilih.

| Jalur | Buat perubahan apa | Cara push | User install ulang? |
|-------|--------------------|-----------|---------------------|
| **A — OTA** (expo-updates) | JS / tampilan / logic (fix header, ganti warna, benerin itungan) | `eas update` | ❌ Tidak — cukup restart app |
| **B — Binary/APK** | Native (nambah library, upgrade SDK, ganti permission/icon) | Build APK baru + upload + edit `latest.json` | ✅ Ya — **download & install di dalam app** |

`runtimeVersion` di `app.json` = policy **`fingerprint`**, jadi pemisahan otomatis: perubahan JS =
fingerprint sama = OTA jalan; perubahan native = fingerprint beda = OTA ga kepasang di app lama →
di situ jalur B (popup download) yang ambil alih.

> **Repo:** `kikyrestu/POS---Kasir` · **Package:** `com.kikyrestu.mobileapp` (JANGAN diubah — ganti package = app dianggap app beda).
>
> **📍 Lokasi `latest.json` = ROOT repo** (`D:\PROJECT\POS - Kasir\latest.json`), BUKAN di dalam `mobile-app/`.
> App baca dari `raw.githubusercontent.com/kikyrestu/POS---Kasir/main/latest.json` → itu nunjuk ke root repo.
> `mobile-app/` sendiri belum ke-track git (untracked) — jadi manifest sengaja ditaruh di root biar ke-serve. Panduan ini (`mobile-app/UPDATE_SETUP.md`) cuma dokumen, ga perlu ke-commit.

---

## 🔑 KEYSTORE RELEASE — WAJIB DI-BACKUP (baca ini dulu!)

Mulai versi **1.0.1**, APK ditandatangani pakai keystore RELEASE sendiri (bukan debug key lagi).

- **File:** `android/app/buildypos-release.keystore`
- **Kredensial:** `android/keystore.properties`
- **Alias:** `buildypos` · **Password (store & key):** `BuildyPOSrelease2026`
- **Berlaku sampai:** 2054 · **SHA-1:** `E6:8E:06:B5:EB:F8:99:60:1D:55:00:5D:FA:A5:3A:CD:CA:F9:41:DE`

⚠️ **Dua file di atas ada di folder `android/` yang di-`.gitignore` → TIDAK ke-upload ke GitHub.**
Artinya: **backup manual sendiri** (copy ke Google Drive / password manager). **Kalau keystore ini
hilang, kamu SELAMANYA ga bisa update app** — user harus uninstall + install ulang (data ilang).

⚠️ **Semua APK ke depan HARUS pakai keystore yang SAMA.** Kalau beda → Android nolak update
(signature mismatch) → user kepaksa uninstall dulu.

### Transisi sekali: APK debug lama → APK release baru
APK **1.0.0** yang keinstall sekarang di HP test ditandatangani **debug key**. APK **1.0.1** pakai
**release key** → beda signature → **ga bisa langsung di-update di atasnya**. Sekali ini aja:
1. **Uninstall** BuildyPOS 1.0.0 dari HP (data di HP itu ke-reset — masih data tes, aman).
2. Install **1.0.1** (release) manual: `adb install -r <path apk>` atau kirim file APK ke HP lalu tap.

Setelah 1.0.1 terpasang, **semua update berikutnya (1.0.2, dst) install mulus dari dalam app** —
ga perlu uninstall lagi, data kejaga.

---

## Alur update di sisi USER (jalur B, otomatis)

1. Buka app → app diam-diam cek `latest.json` di GitHub.
2. Kalau ada versi lebih baru → muncul **popup "Versi Baru Tersedia"**.
3. User tap **"Download & Pasang"** → **progress bar jalan di dalam popup** (download APK).
4. Selesai download → **installer Android kebuka otomatis** → user tap **"Install"** (dialog sistem, wajib, ga bisa di-skip).
5. Kalau gagal → ada tombol **"Coba Lagi"** + **"Buka di Browser"** (fallback).

`"mandatory": true` di `latest.json` → popup ngeblok (ga ada tombol "Nanti", ga bisa ditutup). Pakai
cuma buat update kritis.

---

## Setup sekali (OTA / EAS) — opsional tapi disaranin

OTA butuh akun Expo (gratis, https://expo.dev). Tanpa ini, jalur A (OTA) ga aktif; jalur B (APK) tetap jalan.

```bash
npm install -g eas-cli
eas login
eas init                 # ngisi extra.eas.projectId di app.json
eas update:configure     # ngisi updates.url di app.json
```

> **Penting:** OTA cuma aktif di APK yang di-build SETELAH `eas update:configure`. Kalau butuh OTA,
> jalanin ini dulu SEBELUM build APK yang dibagiin.

---

## Build APK (lokal, tanpa EAS — cara yang lagi dipakai)

```bash
cd android
./gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

- Output: `android/app/build/outputs/apk/release/app-release.apk` (~48MB, arm64, release-signed).
- Rename jadi `buildypos-<versi>.apk` sebelum upload (cth `buildypos-1.0.1.apk`).
- `-PreactNativeArchitectures=arm64-v8a` = cuma arm64 (HP modern) → build lebih cepat & APK lebih kecil.
  Hapus flag ini kalau mau support semua ABI (armeabi-v7a/x86 dll).

Alternatif (kalau pakai EAS): `eas build -p android --profile preview`.

---

## Upload ke GitHub Releases (host APK + latest.json)

`gh` CLI **sudah keinstall** (v2.97, di `C:\Program Files\GitHub CLI\gh.exe`). Sekali doang harus login dulu:

```bash
gh auth login        # interaktif: GitHub.com → HTTPS → login via browser
```

Setelah login, tiap rilis cukup 1 baris (jalanin dari ROOT repo `D:\PROJECT\POS - Kasir`):

```bash
gh release create v1.0.1 mobile-app/dist/buildypos-1.0.1.apk --title "BuildyPOS 1.0.1" --notes "Update otomatis di dalam app (ada progress bar)"
```

- `v1.0.1` = tag (samain sama versi). Nama file asset harus **sama persis** dengan yang ditulis di `apkUrl` `latest.json`.
- Kalau tag/rilis-nya udah ada, tinggal tambah/timpa asset: `gh release upload v1.0.1 mobile-app/dist/buildypos-1.0.1.apk --clobber`.

**Alternatif web (kalau ga mau CLI):**

1. Buka **https://github.com/kikyrestu/POS---Kasir/releases/new**
2. **Tag:** `v1.0.1` (samain sama versi) → "Create new tag on publish".
3. **Title:** `BuildyPOS 1.0.1` (bebas).
4. Drag file `buildypos-1.0.1.apk` ke area **"Attach binaries"**. Nama file harus **sama persis**
   dengan yang ditulis di `apkUrl` `latest.json`.
5. **Publish release.**

Setelah rilis publish, baru **commit & push `latest.json`** (lihat alur harian di bawah).

> URL asset jadinya: `https://github.com/kikyrestu/POS---Kasir/releases/download/v1.0.1/buildypos-1.0.1.apk`
> `latest.json` dibaca via `raw.githubusercontent.com` (cache ~5 menit) → popup mungkin telat muncul dikit. Normal.

---

## Alur harian: mau push update

### Kasus A — cuma ganti JS/tampilan (paling sering, TANPA install ulang)
```bash
eas update --branch preview --message "fix X"
```
User buka app → OTA kedownload → popup **"Update Siap, mulai ulang?"**. Ga perlu build/install APK.

### Kasus B — perubahan native (nambah library / upgrade SDK / ganti permission)
1. Naikin `version` di `app.json` **dan** `android/app/build.gradle` (`versionName`), **dan** `versionCode` (+1) di dua tempat itu.
2. Build APK: `cd android && ./gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a`.
3. Upload ke GitHub Release baru (tag `v<versi>`, file `buildypos-<versi>.apk`).
4. Edit `latest.json`:
   ```json
   {
     "version": "1.0.2",
     "apkUrl": "https://github.com/kikyrestu/POS---Kasir/releases/download/v1.0.2/buildypos-1.0.2.apk",
     "mandatory": false,
     "notes": "Apa yang berubah, ditampilin di popup."
   }
   ```
5. Commit & push **cuma `latest.json`** ke `main` (dari ROOT repo — jangan `git add .`, nanti kebawa WIP lain):
   ```bash
   git add latest.json
   git commit -m "update: latest.json v1.0.2" -- latest.json
   git push origin main
   ```
   User versi lama → popup download otomatis.

> **Urutan penting:** upload APK ke Release **DULU**, baru push `latest.json`. Kalau `latest.json`
> nunjuk ke APK yang belum ada → download di popup bakal gagal (404).

---

## `latest.json` — field

| Field | Isi |
|-------|-----|
| `version` | Versi APK terbaru. Popup muncul kalau ini > versi terpasang (`Application.nativeApplicationVersion`). |
| `apkUrl` | Link download APK langsung dari GitHub Release. |
| `mandatory` | `true` = wajib (ga bisa di-skip). `false` = boleh ditunda. |
| `notes` | Catatan rilis yang ditampilin di popup. |

---

## Catatan

- **Offline aman.** Semua cek update ditelan errornya kalau offline — app jalan normal, ga ada popup ngeblok.
- **OTA ga butuh VPS** (jalan di CDN Expo). Kalau VPS idup lagi, `latest.json` boleh dipindah ke endpoint
  Laravel; cukup ganti `VERSION_MANIFEST_URL` di `src/utils/updateChecker.js`, sisanya ga usah diubah.
- **File yang ngatur ini:** `src/utils/updateChecker.js` (cek versi), `src/components/UpdateModal.js`
  (popup + download + install), `latest.json` (manifest), `App.js` (manggil cek update pas app kebuka).
