import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Clock, PackageSearch } from 'lucide-react-native';
import { getLocalStockMovements } from '../services/SyncService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ResponsiveContainer from '../components/ResponsiveContainer';

export default function StockMovementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      // Riwayat mutasi stok dibaca dari tabel stock_movements lokal (offline-first).
      const data = await getLocalStockMovements();
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMovements();
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }) => {
    const isIn = item.type === 'in';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            <Text style={styles.refText}>Ref: {item.reference_type}</Text>
          </View>
          <View style={[styles.badge, isIn ? styles.badgeIn : styles.badgeOut]}>
            {isIn ? <ArrowDownLeft size={12} color="#059669" /> : <ArrowUpRight size={12} color="#E11D48" />}
            <Text style={[styles.badgeText, isIn ? styles.badgeTextIn : styles.badgeTextOut]}>
              {isIn ? 'Masuk' : 'Keluar'}
            </Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product?.name || 'Produk Dihapus'}</Text>
          <Text style={styles.warehouseName}>{item.warehouse?.name || 'Gudang Utama'}</Text>
          {!!item.description && (
            <Text style={styles.descriptionText}>{item.description}</Text>
          )}
        </View>

        <View style={styles.stockGrid}>
          <View style={styles.stockBox}>
            <Text style={styles.stockBoxLabel}>Awal</Text>
            <Text style={styles.stockBoxValue}>{item.balance_before}</Text>
          </View>
          <View style={[styles.stockBox, styles.stockBoxCenter]}>
            <Text style={[styles.stockBoxChange, isIn ? styles.textIn : styles.textOut]}>
              {isIn ? '+' : '-'}{item.quantity}
            </Text>
          </View>
          <View style={styles.stockBoxFinal}>
            <Text style={styles.stockBoxLabelFinal}>Akhir</Text>
            <Text style={styles.stockBoxValueFinal}>{item.balance_after}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.headerTitleContainer, { paddingTop: insets.top + 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Riwayat Mutasi Stok</Text>
          <Text style={styles.headerSubtitle}>Buku besar riwayat pergerakan barang</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : (
        /* Cap lebar & tengahin list di layar lebar (tablet landscape) biar ga melar */
        <ResponsiveContainer fill maxWidth={900}>
          <FlatList
            data={movements}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <PackageSearch size={40} color="#CBD5E1" />
                  <Text style={styles.emptyText}>Belum ada histori pergerakan stok.</Text>
              </View>
            }
          />
        </ResponsiveContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  dateText: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  refText: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1, gap: 4 },
  badgeIn: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  badgeOut: { backgroundColor: '#FFF1F2', borderColor: '#FFE4E6' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextIn: { color: '#059669' },
  badgeTextOut: { color: '#E11D48' },
  
  productInfo: { marginBottom: 16 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  warehouseName: { fontSize: 12, color: '#475569', marginTop: 2 },
  descriptionText: { fontSize: 11, color: '#64748B', fontStyle: 'italic', marginTop: 4 },
  
  stockGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, gap: 8 },
  stockBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, alignItems: 'center' },
  stockBoxCenter: { justifyContent: 'center' },
  stockBoxFinal: { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#DBEAFE' },
  
  stockBoxLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  stockBoxValue: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginTop: 2 },
  
  stockBoxLabelFinal: { fontSize: 10, color: '#60A5FA', fontWeight: '500' },
  stockBoxValueFinal: { fontSize: 14, fontWeight: 'bold', color: '#1D4ED8', marginTop: 2 },
  
  stockBoxChange: { fontSize: 14, fontWeight: 'bold' },
  textIn: { color: '#059669' },
  textOut: { color: '#E11D48' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 12, fontSize: 14 },
});
