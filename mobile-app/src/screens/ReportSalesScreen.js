import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { ArrowLeft, TrendingUp, ShoppingCart, DollarSign, Calendar, FileText, ChevronRight } from 'lucide-react-native';
import { getLocalSales } from '../services/SyncService';
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
  // 'today' → start stays as today
  return { date_from: fmtLocalDate(start), date_to: fmtLocalDate(end) };
};

export default function ReportSalesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState({ sales: [], totals: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    fetchReport('today');
  }, []);

  const fetchReport = async (rangeKey = dateRange) => {
    try {
      const { date_from, date_to } = getRangeDates(rangeKey);
      const result = await getLocalSales({ date_from, date_to });
      setData(result);
    } catch (err) {
      console.error('Failed to fetch sales report:', err);
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderHeader = () => {
    const totals = data.totals || {};
    return (
      <View style={styles.summaryContainer}>
        {/* Total Transaksi */}
        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <ShoppingCart size={24} color="#3B82F6" />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Total Transaksi</Text>
            <Text style={styles.summaryValue}>{totals.total_transactions || 0}</Text>
          </View>
        </View>

        {/* Total Penjualan */}
        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#F0FDFA' }]}>
            <DollarSign size={24} color="#14B8A6" />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Total Penjualan</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.total_sales)}</Text>
          </View>
        </View>

        {/* Total Profit */}
        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={24} color="#10B981" />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Total Profit</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.total_profit)}</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Transaksi Terakhir</Text>
          <Text style={styles.listSubtitle}>Menampilkan 50 transaksi terakhir</Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileText size={16} color="#64748B" />
          <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
        </View>
        <Text style={styles.invoiceDate}>{formatDate(item.sale_date)}</Text>
      </View>

      <View style={styles.invoiceBody}>
        <View style={styles.invoiceInfoRow}>
          <Text style={styles.infoLabel}>Kasir:</Text>
          <Text style={styles.infoValue}>{item.user?.name || '-'}</Text>
        </View>
        <View style={styles.invoiceInfoRow}>
          <Text style={styles.infoLabel}>Pelanggan:</Text>
          <Text style={styles.infoValue}>{item.customer?.name || '-'}</Text>
        </View>
        <View style={styles.invoiceInfoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={[styles.statusBadge, item.status === 'completed' ? styles.statusSuccess : styles.statusWarning]}>
            <Text style={[styles.statusText, item.status === 'completed' ? styles.statusTextSuccess : styles.statusTextWarning]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.invoiceFooter}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerValue}>{formatCurrency(item.total)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.footerLabel}>Profit</Text>
          <Text style={[styles.footerValue, { color: '#10B981' }]}>{formatCurrency(item.profit)}</Text>
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
          <Text style={styles.headerTitle}>Laporan Penjualan</Text>
          <Text style={styles.headerSubtitle}>Berdasarkan Data Tersimpan (Lokal)</Text>
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
            data={data.sales}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={renderHeader}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
            ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada data transaksi.</Text>}
          />
        )}
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  filterChip: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', alignItems: 'center' },
  filterChipActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#2563EB' },
  
  summaryContainer: { marginBottom: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryTextContainer: { flex: 1 },
  summaryLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginTop: 4 },
  
  listHeader: { marginTop: 24, marginBottom: 16 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  listSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  
  invoiceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12 },
  invoiceNumber: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  invoiceDate: { fontSize: 13, color: '#64748B' },
  
  invoiceBody: { gap: 8, marginBottom: 12 },
  invoiceInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusSuccess: { backgroundColor: '#F0FDF4' },
  statusWarning: { backgroundColor: '#FFFBEB' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  statusTextSuccess: { color: '#16A34A' },
  statusTextWarning: { color: '#D97706' },
  
  invoiceFooter: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  footerLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  footerValue: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontSize: 14 }
});
