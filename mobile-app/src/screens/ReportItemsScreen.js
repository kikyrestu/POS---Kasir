import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowLeft, Package, TrendingUp, DollarSign } from 'lucide-react-native';
import { getLocalSalesByItem } from '../services/SyncService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ResponsiveContainer from '../components/ResponsiveContainer';

const RANGES = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
];

// Format a Date using LOCAL components (not toISOString, which is UTC and would
// shift the day for WIB/UTC+7 users in the early morning).
const fmtLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getRangeDates = (key) => {
  const end = new Date();
  const start = new Date();
  if (key === '7d') start.setDate(end.getDate() - 6);
  else if (key === '30d') start.setDate(end.getDate() - 29);
  return { date_from: fmtLocalDate(start), date_to: fmtLocalDate(end) };
};

export default function ReportItemsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    fetchReport('today');
  }, []);

  const fetchReport = async (rangeKey = dateRange) => {
    try {
      const { date_from, date_to } = getRangeDates(rangeKey);
      const { items } = await getLocalSalesByItem(date_from, date_to);
      setItems(items);
    } catch (err) {
      console.error('Failed to fetch items report:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectRange = (key) => {
    if (key === dateRange) return;
    setDateRange(key);
    setLoading(true);
    fetchReport(key);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
  };

  const formatCurrency = (val) => {
    if (!val) return 'Rp 0';
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.productName}>{item.product?.name || 'Produk Dihapus'}</Text>
          <Text style={styles.productCode}>{item.product?.code || item.product?.barcode || '-'}</Text>
        </View>
        <View style={styles.qtyBox}>
          <Text style={styles.qtyValue}>{item.total_qty}</Text>
          <Text style={styles.qtyLabel}>Terjual</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <View style={styles.footerIconBox}>
            <DollarSign size={14} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.footerLabel}>Total Omset</Text>
            <Text style={styles.footerValue}>{formatCurrency(item.total_sales)}</Text>
          </View>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <View style={[styles.footerIconBox, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={14} color="#10B981" />
          </View>
          <View>
            <Text style={styles.footerLabel}>Total Profit</Text>
            <Text style={[styles.footerValue, { color: '#10B981' }]}>{formatCurrency(item.total_profit)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    // Padding sisi kiri/kanan mengikuti safe-area agar konten tidak ketutup notch saat landscape.
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.headerTitleContainer, { paddingTop: insets.top + 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Laporan Laba / Rugi</Text>
          <Text style={styles.headerSubtitle}>Berdasarkan Produk (Lokal)</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {RANGES.map(r => {
          const active = dateRange === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => selectRange(r.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bungkus konten daftar dengan ResponsiveContainer: di layar lebar (tablet
          landscape) lebarnya di-cap 900 & di-tengah-kan supaya tidak melar. Di HP
          komponen ini transparan (tetap full-width). `fill` menambah flex:1. */}
      <ResponsiveContainer fill maxWidth={900}>
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, index) => item.product_id ? item.product_id.toString() : index.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
            ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada data penjualan produk.</Text>}
          />
        )}
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 12 },
  filterChip: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', alignItems: 'center' },
  filterChipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#2563EB' },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  
  rankBadge: { backgroundColor: '#EFF6FF', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 13 },
  
  productName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  productCode: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  qtyBox: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  qtyValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  qtyLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  
  cardFooter: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  footerItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },
  footerIconBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  footerLabel: { fontSize: 11, color: '#64748B' },
  footerValue: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontSize: 14 }
});
