import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  StyleSheet, SafeAreaView, Switch, Image, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernSelect from '../components/ModernSelect';
import ResponsiveContainer from '../components/ResponsiveContainer';
import api from '../utils/api';
import { createLocalProduct, updateLocalProduct, getLocalCategories, resolveProductImage } from '../services/SyncService';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Upload, X, Camera, Image as ImageIcon, Box, ScanLine, Info,
  Settings, DollarSign, Calendar, AlignLeft, Plus, Trash2, ShieldCheck, Check, Layers
} from 'lucide-react-native';

export default function ProductFormScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const isEditing = route.params?.product ? true : false;
  const initialProduct = route.params?.product || {};

  // Find the first warehouse stock if exists
  const initialStock = initialProduct.stocks && initialProduct.stocks.length > 0 
    ? initialProduct.stocks[0].quantity 
    : 0;

  const normStocks = (arr) =>
    Array.isArray(arr) && arr.length > 0
      ? arr.map((s) => ({ ...s, quantity: s?.quantity != null ? String(s.quantity) : '0' }))
      : [{ warehouse_id: 1, quantity: '0' }];

  const [form, setForm] = useState({
    name: initialProduct.name || '',
    barcode: initialProduct.barcode || '',
    code: initialProduct.code || '',
    // ModernSelect option value = c.id.toString() → category_id HARUS string biar kepilih pas Edit.
    category_id: initialProduct.category_id != null && initialProduct.category_id !== '' ? String(initialProduct.category_id) : '',
    // Jangan anggap 0 sebagai kosong: produk hasil import bisa punya harga 0 (mis. modal
    // tak diisi di Excel). `0 ? ... : ''` dulu mem-blank field wajib → "Data Tidak Lengkap".
    selling_price: initialProduct.selling_price != null && initialProduct.selling_price !== '' ? String(initialProduct.selling_price) : '',
    cost_price: initialProduct.cost_price != null && initialProduct.cost_price !== '' ? String(initialProduct.cost_price) : '',
    unit: initialProduct.unit || 'pcs',
    stock_minimum: initialProduct.stock_minimum != null ? String(initialProduct.stock_minimum) : '5',
    // Switch.value WAJIB boolean; DB simpan 0/1 → coerce biar Fabric ga komplain.
    is_active: initialProduct.is_active !== undefined ? !!initialProduct.is_active : true,
    description: initialProduct.description || '',
    expiry_date: initialProduct.expiry_date || '',
    has_variants: !!initialProduct.has_variants,
    is_unlimited: !!initialProduct.is_unlimited,
    // price/qty varian dari JSON bisa number → paksa string buat TextInput.
    variants: Array.isArray(initialProduct.variants)
      ? initialProduct.variants.map((v) => ({
          ...v,
          price: v?.price != null ? String(v.price) : '',
          stocks: normStocks(v?.stocks),
        }))
      : [],
    // BUG FIX blank abu-abu pas Edit: getLocalProductsManage kasih stocks[].quantity NUMBER.
    // TextInput.value angka mentah → render New Arch (Fabric) throw. Paksa string.
    stocks: normStocks(initialProduct.stocks),
  });
  
  const [imageUri, setImageUri] = useState(initialProduct.image ? resolveProductImage(initialProduct.image) : null);
  const [localImage, setLocalImage] = useState(null); // the actual file to upload

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);

  // Camera Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const cats = await getLocalCategories();
      setCategories(cats || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat kategori');
    } finally {
      setFetchingCats(false);
    }
  };

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) {
          Alert.alert('Izin Ditolak', 'Akses kamera dibutuhkan untuk mengambil foto.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libPerm.granted) {
          Alert.alert('Izin Ditolak', 'Akses galeri dibutuhkan untuk memilih foto.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setLocalImage(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Gagal membuka kamera atau galeri.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Pilih Gambar',
      'Pilih sumber gambar produk:',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Galeri', onPress: () => pickImage(false) },
        { text: 'Ambil Foto (Kamera)', onPress: () => pickImage(true) },
      ]
    );
  };

  const startScanner = async () => {
    if (!camPermission?.granted) {
      const p = await requestCamPermission();
      if (!p.granted) {
        Alert.alert('Izin Ditolak', 'Akses kamera dibutuhkan untuk scan barcode.');
        return;
      }
    }
    setIsProcessingScan(false);
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    setForm({ ...form, barcode: data });
    setShowScanner(false);
  };

  const handleAddVariant = () => {
    setForm({
      ...form,
      variants: [...form.variants, { name: '', sku: '', price: '', stocks: [{ warehouse_id: 1, quantity: '0' }] }]
    });
  };

  const updateVariant = (index, field, value) => {
    const updated = [...form.variants];
    updated[index][field] = value;
    setForm({ ...form, variants: updated });
  };

  const removeVariant = (index) => {
    const updated = form.variants.filter((_, i) => i !== index);
    setForm({ ...form, variants: updated });
  };

  const handleSave = async () => {
    // Harga Beli (modal) OPSIONAL: kosong → 0 di _productColsFromForm (aman, bukan NaN).
    // Wajib cukup Nama, Satuan, Harga Jual biar produk tetap bisa dijual & dihitung.
    if (!form.name || !form.selling_price || !form.unit) {
      Alert.alert('Data Tidak Lengkap', 'Nama Produk, Satuan, dan Harga Jual wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      // Tulis LOKAL dulu (offline-first). Gambar: simpan URI file lokal apa adanya,
      // resolveProductImage() yang urus prefix waktu render. Server nyusul via outbox.
      const newImageUri = localImage ? localImage.uri : null;

      if (isEditing) {
        await updateLocalProduct(initialProduct.id, form, newImageUri);
        Alert.alert('Sukses', 'Produk berhasil diperbarui.');
      } else {
        await createLocalProduct(form, newImageUri);
        Alert.alert('Sukses', 'Produk berhasil ditambahkan.');
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal menyimpan produk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <X size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Produk' : 'Tambah Produk'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.saveBtnTop} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Check size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer maxWidth={760}>

        {/* GAMBAR PRODUK */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto Produk</Text>
          <TouchableOpacity style={styles.imageUploadBox} onPress={showImagePickerOptions}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImg} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Upload size={32} color="#94A3B8" />
                <Text style={styles.uploadText}>Tap untuk upload gambar</Text>
                <Text style={styles.uploadSubtext}>Maks. 2MB (JPG, PNG)</Text>
              </View>
            )}
            {imageUri && (
              <View style={styles.changeImgOverlay}>
                <Camera size={20} color="#fff" />
                <Text style={styles.changeImgText}>Ganti Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* INFO DASAR */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Info size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Informasi Dasar</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Produk <Text style={styles.asterisk}>*</Text></Text>
            <TextInput placeholderTextColor="#94A3B8"
              style={styles.input}
              placeholder="Masukkan nama produk"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barcode</Text>
            <View style={styles.rowInputWrap}>
              <TextInput placeholderTextColor="#94A3B8"
                style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                placeholder="Scan atau ketik"
                value={form.barcode}
                onChangeText={(t) => setForm({ ...form, barcode: t })}
              />
              <TouchableOpacity style={styles.scanBtn} onPress={startScanner}>
                <ScanLine size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Kode (SKU)</Text>
              <TextInput placeholderTextColor="#94A3B8"
                style={styles.input}
                placeholder="SKU-001"
                value={form.code}
                onChangeText={(t) => setForm({ ...form, code: t })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Satuan <Text style={styles.asterisk}>*</Text></Text>
              <TextInput placeholderTextColor="#94A3B8"
                style={styles.input}
                placeholder="pcs, kg"
                value={form.unit}
                onChangeText={(t) => setForm({ ...form, unit: t })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori</Text>
            {fetchingCats ? (
              <View style={styles.pickerWrap}>
                <ActivityIndicator size="small" color="#2563EB" style={{ padding: 12 }} />
              </View>
            ) : (
              <ModernSelect
                title="Pilih Kategori"
                placeholder="Tanpa Kategori"
                leftIcon="grid"
                searchable
                value={form.category_id}
                onChange={(val) => setForm({ ...form, category_id: val })}
                options={[
                  { label: 'Tanpa Kategori', value: '' },
                  ...categories.map(c => ({ label: c.name, value: c.id.toString(), icon: 'tag' })),
                ]}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deskripsi (Opsional)</Text>
            <TextInput placeholderTextColor="#94A3B8"
              style={[styles.input, styles.textArea]}
              placeholder="Jelaskan detail produk ini..."
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* HARGA & STOK (JIKA TIDAK ADA VARIAN) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <DollarSign size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Harga & Stok</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Harga Beli</Text>
              <TextInput placeholderTextColor="#94A3B8"
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={form.cost_price}
                onChangeText={(t) => setForm({ ...form, cost_price: t })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Harga Jual <Text style={styles.asterisk}>*</Text></Text>
              <TextInput placeholderTextColor="#94A3B8"
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={form.selling_price}
                onChangeText={(t) => setForm({ ...form, selling_price: t })}
              />
            </View>
          </View>

          <View style={styles.row}>
            {!form.has_variants && !form.is_unlimited && (
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Stok Saat Ini</Text>
                <TextInput placeholderTextColor="#94A3B8"
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={String(form.stocks[0]?.quantity ?? '')}
                  onChangeText={(t) => {
                    const st = [...form.stocks];
                    st[0].quantity = t;
                    setForm({ ...form, stocks: st });
                  }}
                />
              </View>
            )}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Stok Minimum</Text>
              <TextInput placeholderTextColor="#94A3B8"
                style={styles.input}
                placeholder="10"
                keyboardType="numeric"
                value={form.stock_minimum}
                onChangeText={(t) => setForm({ ...form, stock_minimum: t })}
              />
            </View>
          </View>

          {!form.has_variants && (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
                <Switch
                  value={form.is_unlimited}
                  onValueChange={(val) => setForm({ ...form, is_unlimited: val })}
                  trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
                  thumbColor="#fff"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 2 }}>Stok Unlimited</Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>Produk selalu bisa dijual, stok tidak dilacak/dikurangi (cocok untuk menu racikan/jasa)</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#EFF6FF', padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>Margin Keuntungan</Text>
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '700' }}>
                  {form.cost_price === '0' || !form.cost_price ? 'Infinity%' : `${Math.round(((parseFloat(form.selling_price || 0) - parseFloat(form.cost_price || 0)) / parseFloat(form.cost_price || 0)) * 100)}%`} — Rp {(parseFloat(form.selling_price || 0) - parseFloat(form.cost_price || 0)).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tanggal Kadaluarsa (Opsional)</Text>
            <View style={styles.rowInputWrap}>
              <View style={styles.iconPrefix}>
                <Calendar size={18} color="#94A3B8" />
              </View>
              <TextInput placeholderTextColor="#94A3B8"
                style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                placeholder="YYYY-MM-DD"
                value={form.expiry_date}
                onChangeText={(t) => setForm({ ...form, expiry_date: t })}
              />
            </View>
          </View>
        </View>

        {/* VARIAN PRODUK */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#F59E0B" />
              <View>
                <Text style={styles.sectionTitleMargin0}>Produk Punya Varian</Text>
                <Text style={styles.helpText}>Misal: Ukuran, Warna, Rasa</Text>
              </View>
            </View>
            <Switch
              value={form.has_variants}
              onValueChange={(val) => setForm({ ...form, has_variants: val })}
              trackColor={{ false: "#E2E8F0", true: "#BFDBFE" }}
              thumbColor={form.has_variants ? "#2563EB" : "#F8FAFC"}
            />
          </View>

          {form.has_variants && (
            <View style={styles.variantsBox}>
              {form.variants.map((variant, idx) => (
                <View key={idx} style={styles.variantCard}>
                  <View style={styles.variantHeader}>
                    <Text style={styles.variantTitle}>Varian {idx + 1}</Text>
                    <TouchableOpacity onPress={() => removeVariant(idx)} style={styles.removeVariantBtn}>
                      <Trash2 size={16} color="#E11D48" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nama Varian <Text style={styles.asterisk}>*</Text></Text>
                    <TextInput placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="Misal: Merah, XL"
                      value={variant.name}
                      onChangeText={(t) => updateVariant(idx, 'name', t)}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>SKU</Text>
                      <TextInput placeholderTextColor="#94A3B8"
                        style={styles.input}
                        placeholder="Opsional"
                        value={variant.sku}
                        onChangeText={(t) => updateVariant(idx, 'sku', t)}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Stok</Text>
                      <TextInput placeholderTextColor="#94A3B8"
                        style={styles.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={String(variant.stocks?.[0]?.quantity ?? '')}
                        onChangeText={(t) => {
                          const v = [...form.variants];
                          if (!v[idx].stocks) v[idx].stocks = [{ warehouse_id: 1, quantity: '0' }];
                          v[idx].stocks[0].quantity = t;
                          setForm({ ...form, variants: v });
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Harga Khusus (Opsional)</Text>
                    <TextInput placeholderTextColor="#94A3B8"
                      style={styles.input}
                      placeholder="Kosongkan jika sama dengan harga utama"
                      keyboardType="numeric"
                      value={String(variant.price ?? '')}
                      onChangeText={(t) => updateVariant(idx, 'price', t)}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addVariantBtn} onPress={handleAddVariant}>
                <Plus size={18} color="#2563EB" />
                <Text style={styles.addVariantText}>Tambah Varian</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SETTINGS */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#2563EB" />
              <View>
                <Text style={styles.sectionTitleMargin0}>Status Produk</Text>
                <Text style={styles.helpText}>Produk aktif bisa dijual di POS</Text>
              </View>
            </View>
            <Switch
              value={form.is_active}
              onValueChange={(val) => setForm({ ...form, is_active: val })}
              trackColor={{ false: "#E2E8F0", true: "#BFDBFE" }}
              thumbColor={form.is_active ? "#2563EB" : "#F8FAFC"}
            />
          </View>
        </View>

        {/* SAVE BUTTON BOTTOM */}
        <TouchableOpacity style={styles.saveBtnBottom} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Check size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Simpan Produk</Text>
            </>
          )}
        </TouchableOpacity>
        </ResponsiveContainer>

      </ScrollView>

      {/* ── CAMERA SCANNER MODAL ── */}
      <Modal visible={showScanner} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#000' }}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={{ padding: 8 }}>
              <X size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={{ flex: 1, color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginRight: 44 }}>Scan Barcode Produk</Text>
          </View>
          <View style={{ flex: 1, overflow: 'hidden', borderRadius: 24, margin: 16 }}>
            {showScanner && camPermission?.granted && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={isProcessingScan ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "qr", "upc_a", "upc_e", "code128", "code39"],
                }}
              />
            )}
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerTarget} />
            </View>
          </View>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
              Arahkan kamera ke barcode produk. Scanner akan membaca secara otomatis.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  saveBtnTop: { width: 36, height: 36, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 100 },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  sectionTitleMargin0: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  helpText: { fontSize: 12, color: '#64748B' },

  imageUploadBox: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 16, height: 160, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadPlaceholder: { alignItems: 'center', gap: 8 },
  uploadText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  uploadSubtext: { fontSize: 12, color: '#94A3B8' },
  changeImgOverlay: { position: 'absolute', bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  changeImgText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  asterisk: { color: '#E11D48' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  textArea: { minHeight: 100, paddingTop: 12 },
  
  row: { flexDirection: 'row', gap: 12 },
  rowInputWrap: { flexDirection: 'row', alignItems: 'stretch' },
  scanBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderLeftWidth: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  iconPrefix: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderRightWidth: 0, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },

  pickerWrap: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 50, width: '100%' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  variantsBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  variantCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 12 },
  variantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  variantTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  removeVariantBtn: { padding: 4 },
  
  addVariantBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EFF6FF', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed' },
  addVariantText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },

  saveBtnBottom: { backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Scanner
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff', borderRadius: 24, backgroundColor: 'transparent' },
});
