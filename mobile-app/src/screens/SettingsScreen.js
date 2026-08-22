import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, StatusBar, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import * as SecureStore from '../utils/storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getUnsyncedTransactions, pushOfflineTransactions, syncProducts, syncCategories, syncCustomers, syncSuppliers, getLocalSettings, saveLocalSettings, createLocalPaymentMethod, toggleLocalPaymentMethod, deleteLocalPaymentMethod, drainOutbox } from '../services/SyncService';
import { getDB } from '../utils/database';
import { useAuth } from '../utils/auth';
import ModernSelect from '../components/ModernSelect';
import * as PrinterService from '../services/PrinterService';
import PrinterHelpModal from '../components/PrinterHelpModal';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Semua tab settings. Kasir cuma dikasih tab 'sistem' (sync transaksi offline +
// logout); tab konfigurasi lainnya khusus admin (permission:settings.manage).
const ALL_TABS = [
  { key: 'toko', label: 'Toko', icon: 'home' },
  { key: 'pembayaran', label: 'Pembayaran', icon: 'credit-card' },
  { key: 'transaksi', label: 'Transaksi', icon: 'shopping-bag' },
  { key: 'struk', label: 'Struk', icon: 'file-text' },
  { key: 'printer', label: 'Printer', icon: 'printer' },
  { key: 'notifikasi', label: 'Notifikasi', icon: 'bell' },
  { key: 'sistem', label: 'Sistem & Akun', icon: 'settings' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { can, signOut } = useAuth();
  const canManage = can('settings.manage');
  const TABS = canManage ? ALL_TABS : ALL_TABS.filter(t => t.key === 'sistem');
  const [activeTab, setActiveTab] = useState(canManage ? 'toko' : 'sistem');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Sync System State
  const [syncing, setSyncing] = useState(false);
  const [syncingMaster, setSyncingMaster] = useState(false);
  const [syncingCustomers, setSyncingCustomers] = useState(false);
  const [syncingSuppliers, setSyncingSuppliers] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // New PM State
  const [newPmName, setNewPmName] = useState('');

  // Printer State
  const [devices, setDevices] = useState([]);   // [{id, name}] hasil scan/bonded
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPrinterHelp, setShowPrinterHelp] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Kasir: skip GET /settings (backend bakal 403), cukup muat statistik sync.
      if (canManage) {
        fetchSettings();
      } else {
        setLoading(false);
      }
      loadSyncStats();
    }, [canManage])
  );

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Baca settings + metode bayar dari SQLite lokal (offline-first).
      const res = await getLocalSettings();

      // Flatten settings for easy state management
      const flatSettings = {};
      Object.keys(res.settings || {}).forEach(group => {
        Object.keys(res.settings[group]).forEach(key => {
          flatSettings[key] = { value: res.settings[group][key], group };
        });
      });

      // Seed default key printer bila belum ada di DB. handleUpdateSetting bikin
      // key baru TANPA group, sedangkan handleSaveSettings cuma nyimpen key yang
      // ada di state → tanpa seed ini, pilihan printer nggak akan ke-persist.
      [
        ['printer_transport', 'classic'],
        ['printer_device_id', ''],
        ['printer_device_name', ''],
        ['printer_ble_service', ''],
        ['printer_ble_char', ''],
      ].forEach(([k, v]) => {
        if (!flatSettings[k]) flatSettings[k] = { value: v, group: 'printer' };
      });

      setSettings(flatSettings);
      setPaymentMethods(res.payment_methods || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStats = async () => {
    try {
      const unsynced = await getUnsyncedTransactions();
      setUnsyncedCount(unsynced.length);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = Object.keys(settings).map(key => ({
        key,
        value: settings[key].value,
        group: settings[key].group
      }));
      
      // Simpan lokal + antre outbox (server nyusul pas idup).
      await saveLocalSettings(payload);
      Alert.alert('Sukses', 'Pengaturan berhasil disimpan.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  // Ratakan state settings jadi map polos {key: value} buat dikirim ke PrinterService.
  const flattenSettings = () => {
    const flat = {};
    Object.keys(settings).forEach(k => { flat[k] = settings[k]?.value; });
    return flat;
  };

  // Printer Handlers
  const handleScanDevices = async () => {
    const transport = settings.printer_transport?.value === 'ble' ? 'ble' : 'classic';
    setScanning(true);
    setDevices([]);
    try {
      let found = [];
      if (transport === 'ble') {
        // BLE: scan aktif ~8 dtk, tampilkan device begitu ketemu (live).
        found = await PrinterService.scanBleDevices({
          timeoutMs: 8000,
          onDevice: (d) => setDevices(prev => (prev.some(x => x.id === d.id) ? prev : [...prev, d])),
        });
      } else {
        // Classic: ambil daftar printer yang SUDAH di-pair di Setelan Bluetooth HP.
        found = await PrinterService.listBondedClassicDevices();
      }
      setDevices(found || []);
      if (!found || found.length === 0) {
        Alert.alert(
          'Tidak Ada Printer',
          transport === 'ble'
            ? 'Tidak ada printer BLE terdeteksi. Pastikan printer nyala & dekat.'
            : 'Belum ada printer ter-pair. Pair printer dulu di Setelan Bluetooth HP, lalu Scan lagi.'
        );
      }
    } catch (e) {
      Alert.alert('Gagal Scan', e.message || 'Tidak bisa memindai printer.');
    } finally {
      setScanning(false);
    }
  };

  const handlePickDevice = (deviceId) => {
    const dev = devices.find(d => d.id === deviceId);
    handleUpdateSetting('printer_device_id', deviceId);
    handleUpdateSetting('printer_device_name', dev?.name || deviceId);
    // Kosongkan hint UUID BLE lama → auto-detect ulang saat cetak (printer beda beda).
    handleUpdateSetting('printer_ble_service', '');
    handleUpdateSetting('printer_ble_char', '');
  };

  const handleTestPrint = async () => {
    if (!settings.printer_device_id?.value) {
      Alert.alert('Printer Belum Dipilih', 'Scan & pilih printer dulu sebelum tes cetak.');
      return;
    }
    setTesting(true);
    try {
      await PrinterService.testPrint(flattenSettings());
      Alert.alert('Berhasil', 'Struk tes terkirim ke printer.');
    } catch (e) {
      Alert.alert('Gagal Cetak', e.message || 'Tidak bisa mencetak struk tes.');
    } finally {
      setTesting(false);
    }
  };

  // Payment Methods Handlers
  const handleAddPM = async () => {
    if (!newPmName.trim()) return;
    try {
      const pm = await createLocalPaymentMethod(newPmName.trim());
      setPaymentMethods([...paymentMethods, pm]);
      setNewPmName('');
    } catch (error) {
      Alert.alert('Error', 'Gagal menambah metode pembayaran.');
    }
  };

  const handleTogglePM = async (id) => {
    try {
      const next = await toggleLocalPaymentMethod(id);
      setPaymentMethods(paymentMethods.map(pm => pm.id === id ? { ...pm, is_active: next } : pm));
    } catch (error) {
      Alert.alert('Error', 'Gagal mengubah status metode pembayaran.');
    }
  };

  const handleDeletePM = (id) => {
    Alert.alert('Hapus', 'Yakin hapus metode pembayaran ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try {
          await deleteLocalPaymentMethod(id);
          setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
        } catch (error) {
          Alert.alert('Error', 'Gagal menghapus metode pembayaran.');
        }
      }}
    ]);
  };

  // Sync Handlers
  const handleSyncTransactions = async () => {
    if (unsyncedCount === 0) return;
    setSyncing(true);
    const result = await pushOfflineTransactions();
    setSyncing(false);
    if (result === true || result?.success) {
      Alert.alert('Berhasil', 'Transaksi offline terkirim ke server.');
      loadSyncStats();
    } else {
      Alert.alert('Gagal', 'Terjadi kesalahan saat sinkronisasi transaksi.');
    }
  };

  const handleSyncMaster = async () => {
    setSyncingMaster(true);
    try {
      await drainOutbox();       // setor dulu perubahan lokal (produk/kategori/user/dll) ke server
      await syncCategories();
      await syncProducts();
      Alert.alert('Sukses', 'Data Produk & Kategori diperbarui dari server.');
    } catch (e) {
      Alert.alert('Gagal', 'Kesalahan sinkronisasi produk.');
    } finally {
      setSyncingMaster(false);
    }
  };

  const handleSyncCustomers = async () => {
    setSyncingCustomers(true);
    try {
      await syncCustomers();
      Alert.alert('Sukses', 'Data Pelanggan diperbarui.');
    } catch (e) {
      Alert.alert('Gagal', 'Kesalahan sinkronisasi pelanggan.');
    } finally {
      setSyncingCustomers(false);
    }
  };

  const handleSyncSuppliers = async () => {
    setSyncingSuppliers(true);
    try {
      await syncSuppliers();
      Alert.alert('Sukses', 'Data Supplier diperbarui.');
    } catch (e) {
      Alert.alert('Gagal', 'Kesalahan sinkronisasi supplier.');
    } finally {
      setSyncingSuppliers(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync('userToken');
        await signOut(); // hapus role user aktif (buku telepon email tetep disimpen)
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }}
    ]);
  };

  // UI Helpers
  const renderInput = (label, key, placeholder, keyboardType = 'default', isMultiline = false) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#94A3B8"
        style={[styles.input, isMultiline && { height: 80, textAlignVertical: 'top' }]}
        value={settings[key]?.value || ''}
        onChangeText={(val) => handleUpdateSetting(key, val)}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={isMultiline}
      />
    </View>
  );

  const renderToggle = (label, key) => {
    const isEnabled = settings[key]?.value === '1' || settings[key]?.value === 'true' || settings[key]?.value === true;
    return (
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
          value={isEnabled}
          onValueChange={(val) => handleUpdateSetting(key, val ? '1' : '0')}
          trackColor={{ false: '#CBD5E1', true: '#10B981' }}
        />
      </View>
    );
  };

  if (loading) {
    return <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Horizontal Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab.key} 
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather name={tab.icon} size={16} color={activeTab === tab.key ? '#4F46E5' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView style={styles.contentContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <ResponsiveContainer maxWidth={760}>

          {/* TOKO TAB */}
          {activeTab === 'toko' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profil Toko</Text>
              {renderInput('Nama Toko', 'store_name', 'Masukkan nama toko')}
              {renderInput('Alamat', 'store_address', 'Masukkan alamat toko', 'default', true)}
              {renderInput('Telepon', 'store_phone', 'No. Telepon', 'phone-pad')}
              {renderInput('Email', 'store_email', 'Email toko', 'email-address')}
              {renderInput('NPWP', 'store_tax_number', 'Nomor Pokok Wajib Pajak')}
              
              <View style={styles.divider} />
              <Text style={styles.cardTitle}>Fitur Tambahan</Text>
              {renderToggle('Aktifkan Kitchen Display System (KDS)', 'enable_kds')}
              {renderToggle('Aktifkan Cetak KOT (Dapur)', 'enable_kot')}
              {renderToggle('Aktifkan Manajemen Meja', 'enable_table_management')}
              {renderToggle('Aktifkan Pilihan Tipe Pesanan (Dine In / Takeaway)', 'enable_order_type')}
              {renderToggle('Aktifkan Open Bill (Simpan Pesanan)', 'enable_open_bill')}
              {renderToggle('Aktifkan Fitur Varian Produk', 'enable_variants')}
            </View>
          )}

          {/* PEMBAYARAN TAB */}
          {activeTab === 'pembayaran' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Metode Pembayaran</Text>
              
              {paymentMethods.map(pm => (
                <View key={pm.id} style={styles.pmRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pmName}>{pm.name}</Text>
                    <Text style={styles.pmCode}>Code: {pm.code}</Text>
                  </View>
                  <Switch 
                    value={pm.is_active === 1 || pm.is_active === true} 
                    onValueChange={() => handleTogglePM(pm.id)} 
                    trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  />
                  <TouchableOpacity onPress={() => handleDeletePM(pm.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addPmContainer}>
                <TextInput placeholderTextColor="#94A3B8"
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Metode Baru (ex: ShopeePay)"
                  value={newPmName}
                  onChangeText={setNewPmName}
                />
                <TouchableOpacity style={styles.addPmBtn} onPress={handleAddPM}>
                  <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TRANSAKSI TAB */}
          {activeTab === 'transaksi' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pengaturan Transaksi</Text>
              {renderToggle('Aktifkan Payment Gateway (Midtrans)', 'enable_payment_gateway')}
              {renderInput('Format Diskon (amount / percent)', 'discount_format', 'amount atau percent')}
              {renderInput('Format Pajak (amount / percent)', 'tax_format', 'amount atau percent')}
              {renderInput('Nilai Pajak Global', 'global_tax_value', 'Angka pajak', 'numeric')}
            </View>
          )}

          {/* STRUK TAB */}
          {activeTab === 'struk' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pengaturan Struk Cetak</Text>
              {renderInput('Header Struk', 'receipt_header', 'Teks di bagian atas struk', 'default', true)}
              {renderInput('Footer Struk', 'receipt_footer', 'Teks di bagian bawah struk', 'default', true)}
              {renderToggle('Tampilkan Logo', 'receipt_show_logo')}
              {renderInput('Ukuran Kertas (58mm / 80mm / A4)', 'receipt_paper_size', 'ex: 58mm')}
            </View>
          )}

          {/* PRINTER TAB */}
          {activeTab === 'printer' && (
            <View style={styles.card}>
              <View style={styles.printerHeaderRow}>
                <Text style={[styles.cardTitle, { marginBottom: 0, flex: 1 }]}>Pengaturan Perangkat Printer</Text>
                <TouchableOpacity style={styles.printerHelpBtn} onPress={() => setShowPrinterHelp(true)}>
                  <Feather name="help-circle" size={15} color="#4F46E5" />
                  <Text style={styles.printerHelpText}>Cara Pakai</Text>
                </TouchableOpacity>
              </View>

              {/* Jenis koneksi printer */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Jenis Koneksi</Text>
                <ModernSelect
                  value={settings.printer_transport?.value || 'classic'}
                  onChange={(val) => {
                    handleUpdateSetting('printer_transport', val);
                    // Ganti transport → daftar device lama ga relevan.
                    setDevices([]);
                    handleUpdateSetting('printer_device_id', '');
                    handleUpdateSetting('printer_device_name', '');
                  }}
                  title="Jenis Koneksi Printer"
                  leftIcon="bluetooth"
                  options={[
                    { label: 'Bluetooth Classic (umum)', value: 'classic', sublabel: 'Mayoritas printer thermal 58mm', icon: 'bluetooth' },
                    { label: 'Bluetooth LE (BLE)', value: 'ble', sublabel: 'Sebagian printer model baru', icon: 'bluetooth' },
                  ]}
                />
              </View>

              {/* Scan & pilih printer */}
              <TouchableOpacity style={styles.printerScanBtn} onPress={handleScanDevices} disabled={scanning}>
                {scanning
                  ? <ActivityIndicator size="small" color="#4F46E5" />
                  : <Feather name="search" size={18} color="#4F46E5" />}
                <Text style={styles.printerScanText}>
                  {scanning ? 'Mencari printer...' : 'Scan & Pilih Printer'}
                </Text>
              </TouchableOpacity>

              {devices.length > 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Pilih Printer ({devices.length} ditemukan)</Text>
                  <ModernSelect
                    value={settings.printer_device_id?.value || ''}
                    onChange={handlePickDevice}
                    title="Pilih Printer"
                    searchable
                    leftIcon="printer"
                    placeholder="Ketuk untuk memilih printer"
                    options={devices.map(d => ({ label: d.name || d.id, value: d.id, sublabel: d.id, icon: 'printer' }))}
                  />
                </View>
              )}

              {/* Printer terpilih */}
              {settings.printer_device_id?.value ? (
                <View style={styles.printerSelected}>
                  <Feather name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.printerSelectedText} numberOfLines={1}>
                    {settings.printer_device_name?.value || settings.printer_device_id?.value}
                  </Text>
                </View>
              ) : (
                <Text style={styles.printerHint}>Belum ada printer dipilih.</Text>
              )}

              {/* Tes cetak */}
              <TouchableOpacity
                style={[styles.printerTestBtn, (testing || !settings.printer_device_id?.value) && { opacity: 0.5 }]}
                onPress={handleTestPrint}
                disabled={testing || !settings.printer_device_id?.value}
              >
                {testing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="file-text" size={18} color="#fff" />}
                <Text style={styles.printerTestText}>{testing ? 'Mencetak...' : 'Tes Cetak'}</Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              {renderToggle('Otomatis Buka Print Dialog', 'printer_auto_print')}
              {renderToggle('Aktifkan Print Bluetooth Otomatis', 'enable_bluetooth_printer')}

              <TouchableOpacity style={styles.printerGuideLink} onPress={() => setShowPrinterHelp(true)}>
                <Feather name="book-open" size={14} color="#64748B" />
                <Text style={styles.printerGuideLinkText}>Belum tahu caranya? Baca panduan sambungkan printer</Text>
              </TouchableOpacity>

              <PrinterHelpModal visible={showPrinterHelp} onClose={() => setShowPrinterHelp(false)} />
            </View>
          )}

          {/* NOTIFIKASI TAB */}
          {activeTab === 'notifikasi' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pengaturan Peringatan</Text>
              {renderToggle('Notifikasi Stok Rendah', 'notif_low_stock')}
              {renderInput('Batas Stok Rendah', 'notif_low_stock_threshold', 'Angka minimum', 'numeric')}
              <View style={styles.divider} />
              {renderToggle('Notifikasi Jatuh Tempo', 'notif_due_payment')}
              {renderInput('Hari Sebelum Jatuh Tempo', 'notif_due_days_before', 'Angka hari', 'numeric')}
            </View>
          )}

          {/* SAVE BUTTON FOR SETTINGS TABS (EXCEPT SISTEM) */}
          {activeTab !== 'sistem' && activeTab !== 'pembayaran' && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>}
            </TouchableOpacity>
          )}

          {/* SISTEM & AKUN TAB */}
          {activeTab === 'sistem' && (
            <View>
              {/* Sync Transaksi Offline */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sinkronisasi Transaksi Kasir</Text>
                <View style={styles.syncRow}>
                  <Feather name={unsyncedCount > 0 ? 'cloud-off' : 'check-circle'} size={24} color={unsyncedCount > 0 ? '#D97706' : '#10B981'} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', color: '#1E293B' }}>{unsyncedCount > 0 ? 'Menunggu Dikirim' : 'Semua Tersinkronisasi'}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{unsyncedCount} transaksi offline pending</Text>
                  </View>
                  <TouchableOpacity style={[styles.syncBtn, unsyncedCount === 0 && { opacity: 0.5 }]} onPress={handleSyncTransactions} disabled={syncing || unsyncedCount === 0}>
                    {syncing ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload-cloud" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Manual Pull Master Data */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tarik Data Master (Manual)</Text>
                
                <TouchableOpacity style={styles.masterSyncBtn} onPress={handleSyncMaster} disabled={syncingMaster}>
                  <Feather name="package" size={20} color="#16A34A" />
                  <Text style={styles.masterSyncText}>Produk & Kategori</Text>
                  {syncingMaster ? <ActivityIndicator size="small" color="#16A34A" /> : <Feather name="download" size={16} color="#94A3B8" />}
                </TouchableOpacity>

                <TouchableOpacity style={styles.masterSyncBtn} onPress={handleSyncCustomers} disabled={syncingCustomers}>
                  <Feather name="users" size={20} color="#3B82F6" />
                  <Text style={styles.masterSyncText}>Data Pelanggan</Text>
                  {syncingCustomers ? <ActivityIndicator size="small" color="#3B82F6" /> : <Feather name="download" size={16} color="#94A3B8" />}
                </TouchableOpacity>

                <TouchableOpacity style={styles.masterSyncBtn} onPress={handleSyncSuppliers} disabled={syncingSuppliers}>
                  <Feather name="truck" size={20} color="#8B5CF6" />
                  <Text style={styles.masterSyncText}>Data Supplier</Text>
                  {syncingSuppliers ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Feather name="download" size={16} color="#94A3B8" />}
                </TouchableOpacity>
              </View>

              {/* Logout */}
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Feather name="log-out" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>Keluar (Logout)</Text>
              </TouchableOpacity>
            </View>
          )}

          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Tabs
  tabsWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 8 },
  tabsContainer: { paddingHorizontal: 16, gap: 8 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6 },
  tabBtnActive: { backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#4F46E5' },
  
  contentContainer: { padding: 16 },
  
  // Cards
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  
  // Forms
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1E293B' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleLabel: { fontSize: 14, color: '#334155', flex: 1, paddingRight: 16 },
  
  saveBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Printer
  printerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  printerHelpBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  printerHelpText: { color: '#4F46E5', fontWeight: '700', fontSize: 12.5 },
  printerScanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 12, paddingVertical: 13, marginBottom: 16 },
  printerScanText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  printerSelected: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  printerSelectedText: { flex: 1, color: '#047857', fontWeight: '600', fontSize: 13 },
  printerHint: { color: '#94A3B8', fontSize: 13, marginBottom: 16 },
  printerTestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0EA5E9', borderRadius: 12, paddingVertical: 14 },
  printerTestText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  printerGuideLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  printerGuideLinkText: { color: '#64748B', fontSize: 12.5, fontWeight: '600', textDecorationLine: 'underline' },
  
  // Payment Methods
  pmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pmName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  pmCode: { fontSize: 12, color: '#94A3B8' },
  deleteBtn: { padding: 8, marginLeft: 8 },
  addPmContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  addPmBtn: { backgroundColor: '#4F46E5', width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  // Sync Sistem
  syncRow: { flexDirection: 'row', alignItems: 'center' },
  syncBtn: { backgroundColor: '#4F46E5', width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  masterSyncBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  masterSyncText: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  
  // Logout
  logoutBtn: { backgroundColor: '#FEF2F2', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#FEE2E2', marginBottom: 20 },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
