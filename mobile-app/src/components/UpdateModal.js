import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform, ActivityIndicator } from 'react-native';
import { Download, X, ArrowUpCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';

// expo-intent-launcher dipakai buat micu installer APK Android. Require defensif:
// kalau modul belum ada di binary (mis. build lama sebelum rebuild), JANGAN bikin
// bundle crash — nanti otomatis fallback ke "Buka di Browser".
let IntentLauncher = null;
try { IntentLauncher = require('expo-intent-launcher'); } catch (_) {}

// APK di-download ke cache (transient — boleh kehapus OS kapan aja).
const APK_PATH = (FileSystem.cacheDirectory || '') + 'buildypos-update.apk';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

function formatMB(bytes) {
  if (!bytes || bytes < 0) return '';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Coba beberapa cara micu installer sistem Android. Return true kalau salah satu jalan.
// Printer BLE apa aja pakai UUID beda; installer APK juga: beda HP beda action yang
// nyangkut, jadi kita coba INSTALL_PACKAGE dulu, lalu VIEW + mime type.
async function launchInstaller(contentUri) {
  if (!IntentLauncher || Platform.OS !== 'android') return false;
  const attempts = [
    { action: 'android.intent.action.INSTALL_PACKAGE', params: { data: contentUri, flags: FLAG_GRANT_READ_URI_PERMISSION } },
    { action: 'android.intent.action.VIEW', params: { data: contentUri, flags: FLAG_GRANT_READ_URI_PERMISSION, type: 'application/vnd.android.package-archive' } },
  ];
  for (const a of attempts) {
    try {
      await IntentLauncher.startActivityAsync(a.action, a.params);
      return true;
    } catch (_) { /* coba cara berikutnya */ }
  }
  return false;
}

// Popup "versi baru tersedia" buat update BINARY (APK) yang ga bisa OTA.
// - update: object { version, url, mandatory, notes } dari checkForBinaryUpdate(), atau null.
// - onClose: dipanggil pas user pilih "Nanti Aja" / nutup (cuma kalau NON-wajib).
// Kalau mandatory === true → popup blocking: ga ada tombol tutup / "Nanti".
//
// Alur klik "Download & Pasang": download APK di dalam app (ada PROGRESS BAR) →
// getContentUriAsync → micu installer sistem. User cuma tinggal tap "Install" di
// dialog Android terakhir (itu dialog sistem, ga bisa/ga boleh di-bypass).
export default function UpdateModal({ update, onClose }) {
  const visible = !!update;
  const mandatory = !!(update && update.mandatory);

  const [phase, setPhase] = useState('idle'); // idle | downloading | installing | error
  const [progress, setProgress] = useState(0); // 0..1, atau -1 = indeterminate (server ga kasih ukuran)
  const [downloaded, setDownloaded] = useState(0); // bytes ke-download
  const [errorMsg, setErrorMsg] = useState('');

  const resumableRef = useRef(null);
  const cancelledRef = useRef(false);

  // Reset tiap kali update object berubah (popup baru muncul / ditutup).
  useEffect(() => {
    setPhase('idle');
    setProgress(0);
    setDownloaded(0);
    setErrorMsg('');
    cancelledRef.current = false;
    resumableRef.current = null;
  }, [update]);

  const openInBrowser = () => {
    if (update && update.url) Linking.openURL(update.url).catch(() => {});
  };

  const startDownload = async () => {
    if (!update || !update.url) {
      setErrorMsg('Link update tidak tersedia.');
      setPhase('error');
      return;
    }
    // Fallback total: kalau bukan Android / API file-system ga ada → buka browser aja.
    if (Platform.OS !== 'android' || typeof FileSystem.createDownloadResumable !== 'function') {
      openInBrowser();
      return;
    }

    cancelledRef.current = false;
    setErrorMsg('');
    setProgress(0);
    setDownloaded(0);
    setPhase('downloading');

    try {
      // Bersihin sisa file lama biar ga konflik / ga makan storage dobel.
      await FileSystem.deleteAsync(APK_PATH, { idempotent: true }).catch(() => {});

      const resumable = FileSystem.createDownloadResumable(
        update.url,
        APK_PATH,
        {},
        (p) => {
          if (cancelledRef.current) return;
          const written = p.totalBytesWritten || 0;
          const expected = p.totalBytesExpectedToWrite || 0;
          setDownloaded(written);
          setProgress(expected > 0 ? written / expected : -1);
        }
      );
      resumableRef.current = resumable;

      const result = await resumable.downloadAsync();
      if (cancelledRef.current) return;
      if (!result || !result.uri) throw new Error('DOWNLOAD_FAILED');

      // File ke-download → micu installer sistem.
      setPhase('installing');
      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      const launched = await launchInstaller(contentUri);
      if (!launched) throw new Error('INSTALLER_UNAVAILABLE');
      // Sukses: dialog install Android muncul. Popup nunggu di state "installing".
      // Kalau user lanjut install, app ke-replace; kalau batal, dia balik ke popup ini.
    } catch (e) {
      if (cancelledRef.current) return;
      if (e && e.message === 'INSTALLER_UNAVAILABLE') {
        setErrorMsg('Tidak bisa membuka installer otomatis. Coba "Buka di Browser" lalu pasang manual.');
      } else {
        setErrorMsg('Gagal mengunduh. Cek koneksi internet, lalu coba lagi.');
      }
      setPhase('error');
    }
  };

  const cancelDownload = async () => {
    cancelledRef.current = true;
    try { await resumableRef.current?.pauseAsync(); } catch (_) {}
    resumableRef.current = null;
    await FileSystem.deleteAsync(APK_PATH, { idempotent: true }).catch(() => {});
    setPhase('idle');
    setProgress(0);
    setDownloaded(0);
  };

  const canDismiss = !mandatory && (phase === 'idle' || phase === 'error');
  const isError = phase === 'error';
  const pct = progress >= 0 ? Math.min(100, Math.round(progress * 100)) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (canDismiss && onClose) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {canDismiss && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}

          <View style={[styles.iconWrap, isError && styles.iconWrapError]}>
            {isError
              ? <AlertTriangle size={34} color="#DC2626" />
              : <ArrowUpCircle size={34} color="#2563EB" />}
          </View>

          <Text style={styles.title}>{isError ? 'Gagal Update' : 'Versi Baru Tersedia'}</Text>
          {!isError && !!(update && update.version) && (
            <Text style={styles.version}>Versi {update.version}</Text>
          )}

          {!isError && !!(update && update.notes) && (
            <View style={styles.notesBox}>
              <Text style={styles.notes}>{update.notes}</Text>
            </View>
          )}

          {/* ─── AREA AKSI: ganti-ganti sesuai phase ─── */}

          {phase === 'idle' && (
            <>
              <Text style={styles.hint}>
                {mandatory
                  ? 'Update ini wajib dipasang untuk melanjutkan pemakaian aplikasi.'
                  : 'Download & pasang versi terbaru biar dapat fitur dan perbaikan terkini.'}
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={startDownload} activeOpacity={0.85}>
                <Download size={18} color="#fff" />
                <Text style={styles.primaryText}>Download &amp; Pasang</Text>
              </TouchableOpacity>
              {!mandatory && (
                <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.laterText}>Nanti Aja</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {phase === 'downloading' && (
            <>
              <View style={styles.progressTrack}>
                {pct != null
                  ? <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  : <View style={[styles.progressFill, styles.progressFillIndet]} />}
              </View>
              <Text style={styles.progressLabel}>
                {pct != null
                  ? `Mengunduh… ${pct}%${downloaded ? `  (${formatMB(downloaded)})` : ''}`
                  : `Mengunduh… ${formatMB(downloaded) || 'menyiapkan'}`}
              </Text>
              {!mandatory && (
                <TouchableOpacity style={styles.laterBtn} onPress={cancelDownload} activeOpacity={0.7}>
                  <Text style={styles.laterText}>Batal</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {phase === 'installing' && (
            <View style={styles.installingWrap}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.progressLabel}>Membuka installer… lanjutkan pemasangan di dialog Android.</Text>
            </View>
          )}

          {phase === 'error' && (
            <>
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={startDownload} activeOpacity={0.85}>
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.primaryText}>Coba Lagi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={openInBrowser} activeOpacity={0.8}>
                <ExternalLink size={16} color="#2563EB" />
                <Text style={styles.secondaryText}>Buka di Browser</Text>
              </TouchableOpacity>
              {!mandatory && (
                <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.laterText}>Nanti Aja</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
    zIndex: 10,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  iconWrapError: {
    backgroundColor: '#FEF2F2',
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  notes: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 19,
  },
  // Progress bar
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    marginTop: 22,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  progressFillIndet: {
    width: '40%',
  },
  progressLabel: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 19,
  },
  installingWrap: {
    alignItems: 'center',
    marginTop: 22,
    gap: 10,
  },
  // Error
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 19,
    textAlign: 'center',
  },
  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    marginTop: 10,
  },
  secondaryText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  laterBtn: {
    paddingVertical: 12,
    marginTop: 4,
  },
  laterText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
