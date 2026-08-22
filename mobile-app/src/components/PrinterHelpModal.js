import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * PrinterHelpModal — tutorial in-app: cara nyambungin & pakai printer thermal
 * Bluetooth. Dibuka dari tab Pengaturan › Printer. Bahasanya sengaja santai &
 * step-by-step biar kasir awam gampang ngikutin.
 *
 * Props: { visible, onClose }
 */

// Badge langkah bernomor
function Step({ n, title, children }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.stepTitle}>{title}</Text> : null}
        {children ? <Text style={styles.stepBody}>{children}</Text> : null}
      </View>
    </View>
  );
}

function Bullet({ children }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

// Kotak catatan: tip (hijau), info (biru), atau warn (kuning)
function Note({ type = 'info', children }) {
  const cfg = {
    tip: { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', icon: 'check-circle' },
    info: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', icon: 'info' },
    warn: { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309', icon: 'alert-triangle' },
  }[type];
  return (
    <View style={[styles.note, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Feather name={cfg.icon} size={15} color={cfg.color} style={{ marginTop: 1 }} />
      <Text style={[styles.noteText, { color: cfg.color }]}>{children}</Text>
    </View>
  );
}

function SectionTitle({ icon, accent = '#4F46E5', children }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: accent + '18' }]}>
        <Feather name={icon} size={15} color={accent} />
      </View>
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

export default function PrinterHelpModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabberWrap}><View style={styles.grabber} /></View>

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Cara Sambungkan Printer</Text>
              <Text style={styles.subtitle}>Panduan cetak struk ke printer thermal Bluetooth</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

            {/* Persiapan */}
            <SectionTitle icon="check-square" accent="#0EA5E9">Siapkan Dulu</SectionTitle>
            <Bullet>Printer thermal Bluetooth <Text style={styles.b}>sudah nyala</Text> (lampu indikator hidup).</Bullet>
            <Bullet>Kertas struk <Text style={styles.b}>terpasang benar</Text> (perhatikan arah gulungan kertas).</Bullet>
            <Bullet>Baterai printer cukup / sambil dicas.</Bullet>
            <Bullet><Text style={styles.b}>Bluetooth HP nyala.</Text></Bullet>

            <View style={styles.divider} />

            {/* Pilih jenis koneksi */}
            <SectionTitle icon="bluetooth">Langkah 1 — Pilih Jenis Koneksi</SectionTitle>
            <Step n="A" title="Bluetooth Classic (coba ini dulu)">
              Paling umum untuk printer thermal 58mm murah (mis. RPP02, MTP-II, Panda, BlueBamboo, Zjiang, dll).
            </Step>
            <Step n="B" title="Bluetooth LE (BLE)">
              Coba kalau Classic tidak ketemu atau tidak mau connect. Biasanya printer model lebih baru.
            </Step>
            <Note type="info">Ganti jenis koneksi di dropdown <Text style={styles.b}>“Jenis Koneksi”</Text> di halaman Printer.</Note>

            <View style={styles.divider} />

            {/* Pairing (Classic) */}
            <SectionTitle icon="link" accent="#8B5CF6">Langkah 2 — Pairing di HP (khusus Classic)</SectionTitle>
            <Step n="1">Buka <Text style={styles.b}>Setelan HP → Bluetooth</Text>.</Step>
            <Step n="2">Nyalakan Bluetooth, tunggu nama printer muncul di daftar.</Step>
            <Step n="3">Ketuk nama printer. Kalau minta PIN, biasanya <Text style={styles.b}>0000</Text> atau <Text style={styles.b}>1234</Text>.</Step>
            <Step n="4">Pastikan statusnya jadi <Text style={styles.b}>“Tersambung / Paired”</Text>.</Step>
            <Note type="info">Mode <Text style={styles.b}>BLE</Text> tidak perlu pairing manual — langsung Scan di aplikasi (Langkah 3).</Note>

            <View style={styles.divider} />

            {/* Pilih di aplikasi */}
            <SectionTitle icon="search" accent="#4F46E5">Langkah 3 — Pilih Printer di Aplikasi</SectionTitle>
            <Step n="1">Di halaman Printer ini, ketuk <Text style={styles.b}>“Scan &amp; Pilih Printer”</Text>.</Step>
            <Step n="2">Kalau muncul permintaan izin, ketuk <Text style={styles.b}>Izinkan</Text> (Bluetooth, dan Lokasi untuk BLE).</Step>
            <Step n="3">Pilih nama printer dari daftar yang muncul.</Step>
            <Step n="4">Ketuk <Text style={styles.b}>“Simpan Pengaturan”</Text> di bawah.</Step>

            <View style={styles.divider} />

            {/* Tes cetak */}
            <SectionTitle icon="file-text" accent="#0EA5E9">Langkah 4 — Tes Cetak</SectionTitle>
            <Step n="1">Ketuk tombol <Text style={styles.b}>“Tes Cetak”</Text>.</Step>
            <Step n="2">Kalau keluar struk contoh → printer siap dipakai! 🎉</Step>
            <Note type="tip">Cek hasilnya: angka Rupiah rapi, nama panjang turun baris otomatis, tidak ada huruf aneh.</Note>

            <View style={styles.divider} />

            {/* Auto print */}
            <SectionTitle icon="zap" accent="#10B981">Langkah 5 — Cetak Otomatis (opsional)</SectionTitle>
            <Bullet>Nyalakan <Text style={styles.b}>“Aktifkan Print Bluetooth Otomatis”</Text> + <Text style={styles.b}>“Otomatis Buka Print Dialog”</Text>.</Bullet>
            <Bullet>Struk langsung tercetak tiap selesai bayar, tanpa ketuk Cetak lagi.</Bullet>
            <Note type="info">Ukuran kertas diatur di tab <Text style={styles.b}>Struk → Ukuran Kertas</Text> (58mm umum, atau 80mm).</Note>

            <View style={styles.divider} />

            {/* Troubleshooting */}
            <SectionTitle icon="alert-triangle" accent="#B45309">Kalau Bermasalah</SectionTitle>
            <View style={styles.trouble}><Text style={styles.troubleQ}>“Bluetooth mati”</Text><Text style={styles.troubleA}>Nyalakan Bluetooth di HP, lalu coba lagi.</Text></View>
            <View style={styles.trouble}><Text style={styles.troubleQ}>“Izin ditolak”</Text><Text style={styles.troubleA}>Setelan HP → Aplikasi → BuildyPOS → Izin → aktifkan Bluetooth (& Lokasi).</Text></View>
            <View style={styles.trouble}><Text style={styles.troubleQ}>Printer tidak muncul saat Scan (Classic)</Text><Text style={styles.troubleA}>Pastikan sudah di-pair di Setelan Bluetooth HP dulu, printer nyala &amp; dekat.</Text></View>
            <View style={styles.trouble}><Text style={styles.troubleQ}>Printer tidak muncul (BLE)</Text><Text style={styles.troubleA}>Nyalakan Lokasi/GPS HP, dekatkan printer, lalu Scan ulang.</Text></View>
            <View style={styles.trouble}><Text style={styles.troubleQ}>Cuma keluar kertas kosong</Text><Text style={styles.troubleA}>Coba ganti jenis koneksi (Classic ↔ BLE), pilih ulang, tes lagi.</Text></View>
            <View style={styles.trouble}><Text style={styles.troubleQ}>Huruf berantakan / aneh</Text><Text style={styles.troubleA}>Sesuaikan Ukuran Kertas (58mm vs 80mm) di tab Struk.</Text></View>
            <View style={styles.trouble}><Text style={styles.troubleQ}>Nyambung tapi gagal cetak</Text><Text style={styles.troubleA}>Matikan printer ±5 detik, nyalakan lagi. Pastikan tidak dipakai HP lain.</Text></View>

            <Note type="warn">Satu printer sebaiknya dipakai satu HP saja dalam satu waktu. Kalau ganti printer, ulangi “Scan &amp; Pilih Printer”.</Note>

          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Mengerti</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '88%', paddingBottom: Platform.OS === 'ios' ? 24 : 14 },
  grabberWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0' },

  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 12.5, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  body: { paddingHorizontal: 20, paddingTop: 14 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', flex: 1 },

  step: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepBadgeText: { fontSize: 11.5, fontWeight: '800', color: '#4F46E5' },
  stepTitle: { fontSize: 13.5, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  stepBody: { fontSize: 13, color: '#475569', lineHeight: 19 },

  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 7, paddingRight: 4 },
  bulletDot: { fontSize: 14, color: '#94A3B8', lineHeight: 19 },
  bulletText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 19 },

  b: { fontWeight: '700', color: '#334155' },

  note: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4, marginBottom: 4 },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '600' },

  trouble: { marginBottom: 10 },
  troubleQ: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 2 },
  troubleA: { fontSize: 12.5, color: '#64748B', lineHeight: 18 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },

  doneBtn: { backgroundColor: '#4F46E5', marginHorizontal: 20, marginTop: 8, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
