import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Infinity } from 'lucide-react-native';
import { getLocalProductsManage, adjustLocalStock } from '../services/SyncService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernSelect from '../components/ModernSelect';
import ResponsiveContainer from '../components/ResponsiveContainer';

export default function StockOpnameScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Baca produk dari SQLite lokal (offline-first). Bentuk sudah server-shaped.
      const data = await getLocalProductsManage();

      const mapped = data.map(p => {
        let totalStock = p.stock || 0;
        if (p.stocks) {
           totalStock = p.stocks.reduce((acc, curr) => acc + parseInt(curr.quantity || 0), 0);
        }
        return {
          ...p,
          system_stock: totalStock,
          opname_type: 'addition', // addition or subtraction
          opname_qty: '',
          opname_reason: '',
          isAdjusting: false
        };
      });
      setProducts(mapped);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat daftar produk.');
    } finally {
      setLoading(false);
    }
  };

  const updateProductState = (id, field, value) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAdjust = async (product) => {
    const qty = parseInt(product.opname_qty || '0');
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validasi', 'Masukkan jumlah qty yang valid.');
      return;
    }

    // Calculate actual stock
    let actual = product.system_stock;
    if (product.opname_type === 'addition') {
        actual += qty;
    } else {
        actual -= qty;
        if (actual < 0) actual = 0;
    }

    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAdjusting: true } : p));

    try {
      // Sesuaikan stok LOKAL + catat stock_movement + enqueue outbox. Server nyusul.
      await adjustLocalStock(
        product.id,
        actual,
        product.opname_reason || `Opname via Mobile App (${product.opname_type === 'addition' ? '+' : '-'}${qty})`
      );

      Alert.alert('Sukses', `Stok ${product.name} berhasil disesuaikan menjadi ${actual}.`);
      
      setProducts(prev => prev.map(p => p.id === product.id ? { 
        ...p, 
        system_stock: actual,
        opname_qty: '',
        opname_reason: '',
        isAdjusting: false 
      } : p));

    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal melakukan penyesuaian stok.');
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAdjusting: false } : p));
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())));

  const renderItem = ({ item }) => {
    const hasInput = parseInt(item.opname_qty || '0') > 0;
    
    return (
      <View style={[styles.card, hasInput && styles.cardActive]}>
        <View style={styles.cardHeader}>
            <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDesc}>Stok Sistem: <Text style={{fontWeight: '700', color: '#334155'}}>{item.system_stock} {item.unit || ''}</Text></Text>
            </View>
            {item.is_unlimited && (
                <View style={styles.badgeUnlimited}>
                    <Infinity size={14} color="#D97706" />
                    <Text style={styles.badgeTextUnlimited}>Tak Terbatas</Text>
                </View>
            )}
        </View>
        
        {!item.is_unlimited && (
          <View style={styles.actionArea}>
            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <ModernSelect
                        title="Jenis Penyesuaian"
                        value={item.opname_type}
                        onChange={(val) => updateProductState(item.id, 'opname_type', val)}
                        triggerStyle={{ height: 50, paddingVertical: 0, borderRadius: 8, backgroundColor: '#F8FAFC' }}
                        options={[
                            { label: 'Tambah (+)', value: 'addition', icon: 'plus-circle' },
                            { label: 'Kurang (-)', value: 'subtraction', icon: 'minus-circle' },
                        ]}
                    />
                </View>
                
                <TextInput placeholderTextColor="#94A3B8" 
                    style={[styles.inputQty, hasInput && styles.inputQtyActive]}
                    keyboardType="numeric"
                    placeholder="Qty"
                    value={item.opname_qty}
                    onChangeText={(val) => updateProductState(item.id, 'opname_qty', val)}
                    selectTextOnFocus
                />
            </View>
            
            <View style={styles.row}>
                <TextInput placeholderTextColor="#94A3B8" 
                    style={styles.inputReason}
                    placeholder="Alasan (Opsional)"
                    value={item.opname_reason}
                    onChangeText={(val) => updateProductState(item.id, 'opname_reason', val)}
                />
            </View>

            <TouchableOpacity 
                style={[styles.btnSync, !hasInput && styles.btnSyncDisabled]} 
                onPress={() => handleAdjust(item)}
                disabled={item.isAdjusting || !hasInput}
            >
                {item.isAdjusting ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <Feather name="save" size={16} color="#fff" />
                        <Text style={styles.btnSyncText}>Simpan Penyesuaian</Text>
                    </>
                )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.headerTitleContainer, { paddingTop: insets.top + 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Buat Penyesuaian Stok</Text>
          <Text style={styles.headerSubtitle}>Sesuaikan stok fisik dengan sistem</Text>
        </View>
      </View>

      <ResponsiveContainer fill maxWidth={760}>
      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="#94A3B8" />
        <TextInput placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          placeholder="Cari spesifik (opsional)..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered}
          style={{ flex: 1 }}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Feather name="package" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>Tidak ada produk ditemukan.</Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, fontSize: 14, color: '#334155', marginLeft: 10 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  cardActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  cardDesc: { fontSize: 12, color: '#64748B', marginTop: 4 },
  
  badgeUnlimited: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  badgeTextUnlimited: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  
  actionArea: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  
  pickerContainer: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC', height: 50, justifyContent: 'center' },
  picker: { width: '100%', height: '100%' },
  
  inputQty: { width: 80, height: 50, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F8FAFC', textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  inputQtyActive: { backgroundColor: '#fff', borderColor: '#93C5FD', color: '#1D4ED8' },
  
  inputReason: { flex: 1, height: 50, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12, fontSize: 14, color: '#334155' },
  
  btnSync: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 8, width: '100%', gap: 8, marginTop: 6 },
  btnSyncDisabled: { backgroundColor: '#94A3B8' },
  btnSyncText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 12, fontSize: 14 },
});
