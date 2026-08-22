import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, 
  StyleSheet, SafeAreaView, StatusBar, Image 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernSelect from '../components/ModernSelect';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { useFocusEffect } from '@react-navigation/native';
import api from '../utils/api';
import { getLocalProductsManage, getLocalCategories, deleteLocalProduct, resolveProductImage } from '../services/SyncService';
import { ArrowLeft, Search, Package, Edit2, Trash2, Plus, UploadCloud, FileSpreadsheet } from 'lucide-react-native';
import * as ExcelService from '../services/ExcelService';
import * as SecureStore from '../utils/storage';
import { useAuth } from '../utils/auth';
export default function ProductListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const canManage = can('products.manage'); // kasir cuma boleh lihat (products.view)
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockLevel, setStockLevel] = useState('');

  // Status sibuk buat tombol Excel (biar ga dobel-tap & kasih feedback).
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Run on focus
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchCategories();
    }, [])
  );

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, categoryId, stockLevel]);

  const fetchCategories = async () => {
    try {
      const cats = await getLocalCategories();
      setCategories(cats || []);
    } catch (err) {
      console.error('Error categories:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getLocalProductsManage({ search, category: categoryId, stock: stockLevel });
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = (id) => {
    Alert.alert('Hapus Produk', 'Yakin ingin menghapus produk ini dari database?', [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Hapus', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLocalProduct(id);
            Alert.alert('Sukses', 'Produk berhasil dihapus');
            fetchProducts();
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Gagal menghapus produk.');
          }
        }
      }
    ]);
  };

  // Export/Import Excel 100% OFFLINE (SheetJS di HP, ga butuh server). Lihat ExcelService.
  const handleExportExcel = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const r = await ExcelService.exportProductsToExcel();
      if (!r.shared) {
        Alert.alert('Export Selesai', `${r.count} produk disimpan sebagai ${r.filename}.`);
      }
    } catch (e) {
      console.error('Export Excel:', e);
      Alert.alert('Export Gagal', e?.message || 'Tidak bisa membuat file Excel.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportExcel = async () => {
    if (importing) return;
    try {
      setImporting(true);
      const r = await ExcelService.importProductsFromExcel();
      if (r.canceled) return; // user batal milih file
      await fetchProducts();
      await fetchCategories();
      const lines = [
        `Baru: ${r.created}`,
        `Diperbarui: ${r.updated}`,
        `Dilewati: ${r.skipped}`,
      ];
      // Tampilin sebagian catatan error/lewat (maks 8) biar Alert ga kepanjangan.
      if (r.errors && r.errors.length) {
        lines.push('', ...r.errors.slice(0, 8));
        if (r.errors.length > 8) lines.push(`…dan ${r.errors.length - 8} lainnya.`);
      }
      Alert.alert('Import Selesai', lines.join('\n'));
    } catch (e) {
      console.error('Import Excel:', e);
      Alert.alert('Import Gagal', e?.message || 'Tidak bisa membaca file Excel.');
    } finally {
      setImporting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>
      <Text style={styles.pageTitle}>Manajemen Produk</Text>
      <Text style={styles.pageSubtitle}>Kelola inventori dan data produk</Text>

      {canManage && (
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btnImport, importing && styles.btnBusy]} onPress={handleImportExcel} disabled={importing || exporting}>
          {importing ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <UploadCloud size={16} color="#475569" />
          )}
          <Text style={styles.btnImportText}>{importing ? 'Mengimpor…' : 'Import Excel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnExport, exporting && styles.btnBusy]} onPress={handleExportExcel} disabled={exporting || importing}>
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FileSpreadsheet size={16} color="#059669" />
          )}
          <Text style={styles.btnExportText}>{exporting ? 'Mengekspor…' : 'Export Excel'}</Text>
        </TouchableOpacity>
      </View>
      )}

      {canManage && (
      <TouchableOpacity style={styles.btnAdd} onPress={() => navigation.navigate('ProductForm')}>
        <Plus size={18} color="#fff" strokeWidth={2.5} />
        <Text style={styles.btnAddText}>Tambah Produk</Text>
      </TouchableOpacity>
      )}

      <View style={styles.filterCard}>
        <View style={styles.searchInputWrap}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama, barcode, kode..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94A3B8"
          />
        </View>
        
        <ModernSelect
          title="Filter Kategori"
          placeholder="Semua Kategori"
          leftIcon="grid"
          searchable
          value={categoryId}
          onChange={(val) => setCategoryId(val)}
          options={[
            { label: 'Semua Kategori', value: '' },
            ...categories.map(cat => ({ label: cat.name, value: cat.id.toString(), icon: 'tag' })),
          ]}
        />

        <ModernSelect
          title="Filter Stok"
          placeholder="Semua Stok"
          leftIcon="bar-chart-2"
          value={stockLevel}
          onChange={(val) => setStockLevel(val)}
          options={[
            { label: 'Semua Stok', value: '' },
            { label: 'Stok Rendah', value: 'low', icon: 'alert-triangle' },
            { label: 'Stok Kosong', value: 'empty', icon: 'x-circle' },
            { label: 'Stok Aman', value: 'good', icon: 'check-circle' },
          ]}
        />
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const totalStock = item.stocks?.reduce((s, st) => s + st.quantity, 0) || 0;
    const stockMin = item.stock_minimum || 5;
    
    // Default blue for variants/unlimited style, or fallback to exact web color mapping if not variants
    let stockColor = '#2563EB'; // blue (for variants or unlimited style)
    let stockText = item.has_variants ? `${item.variants?.length || 0} Varian` : `${totalStock} ${item.unit || 'pcs'}`;

    if (item.is_unlimited && !item.has_variants) {
      stockText = '∞ Unlimited';
      stockColor = '#2563EB';
    } else if (!item.has_variants) {
      if (totalStock <= 0) stockColor = '#E11D48'; // rose-600
      else if (totalStock <= stockMin) stockColor = '#D97706'; // amber-600
      else stockColor = '#059669'; // emerald-600
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.imgBox}>
            {item.image ? (
              <Image
                source={{ uri: resolveProductImage(item.image) }}
                style={styles.imageThumb}
              />
            ) : (
              <Package size={28} color="#CBD5E1" strokeWidth={1.5} />
            )}
          </View>
          <View style={styles.infoBox}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.badge, item.is_active ? styles.badgeSuccess : styles.badgeDanger]}>
                <Text style={[styles.badgeText, item.is_active ? styles.badgeSuccessText : styles.badgeDangerText]}>
                  {item.is_active ? 'Aktif' : 'Nonaktif'}
                </Text>
              </View>
            </View>
            <Text style={styles.barcode}>{item.barcode || item.code || '-'}</Text>
            <Text style={styles.category}>{item.category?.name || 'Tanpa Kategori'}</Text>
          </View>
        </View>

        <View style={styles.statsBox}>
          <View>
            <Text style={styles.statLabel}>HARGA JUAL</Text>
            <Text style={styles.statValueBlue}>Rp {item.selling_price?.toLocaleString('id-ID')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>STOK</Text>
            <Text style={[styles.statValueStock, { color: stockColor }]}>
              {stockText}
            </Text>
          </View>
        </View>

        {canManage && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate('ProductForm', { product: item })}
          >
            <Edit2 size={14} color="#475569" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => deleteProduct(item.id)}
          >
            <Trash2 size={14} color="#E11D48" />
            <Text style={styles.deleteBtnText}>Hapus</Text>
          </TouchableOpacity>
        </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.safe, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar barStyle="dark-content" />

      {/* Cap lebar & tengahin list di layar lebar (tablet landscape) biar ga melar */}
      <ResponsiveContainer fill maxWidth={900}>
      <FlatList
        style={{ flex: 1 }}
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[styles.listContainer, { paddingTop: insets.top + 16 }]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <View style={styles.center}>
              <Package size={48} color="#CBD5E1" strokeWidth={1} />
              <Text style={styles.emptyText}>Tidak ada produk ditemukan.</Text>
            </View>
          )
        }
      />
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  listContainer: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94A3B8', marginTop: 16, fontSize: 14, fontWeight: '500' },
  
  // Header Section
  headerContainer: { marginBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  btnImport: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: 10 },
  btnImportText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  btnExport: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 10 },
  btnExportText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnBusy: { opacity: 0.6 },
  
  btnAdd: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 12, marginBottom: 20 },
  btnAddText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  filterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, gap: 12 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 10 },
  pickerWrap: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden', justifyContent: 'center', height: 54 },
  picker: { height: 54, width: '100%', color: '#475569' },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', gap: 12 },
  imgBox: { width: 64, height: 64, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  imageThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  infoBox: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgeDanger: { backgroundColor: '#FFE4E6' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeSuccessText: { color: '#16A34A' },
  badgeDangerText: { color: '#E11D48' },
  
  barcode: { fontSize: 12, color: '#64748B', marginTop: 2 },
  category: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 4, textTransform: 'uppercase' },

  // Stats Box
  statsBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  statLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', letterSpacing: 0.5 },
  statValueBlue: { fontSize: 14, fontWeight: '800', color: '#2563EB', marginTop: 2 },
  statValueStock: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  // Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  editBtn: { backgroundColor: '#fff', borderColor: '#E2E8F0' },
  editBtnText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#fff', borderColor: '#FECDD3' },
  deleteBtnText: { color: '#E11D48', fontSize: 13, fontWeight: '700' },
});
