import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { getLocalDashboard } from '../services/SyncService';
import { LineChart, PieChart } from 'react-native-chart-kit';
import useDeviceLayout from '../hooks/useDeviceLayout';

const STAT_COLORS = [
  { bg: '#10B981', icon: 'shopping-bag' }, // emerald
  { bg: '#3B82F6', icon: 'activity' }, // blue
  { bg: '#14B8A6', icon: 'dollar-sign' }, // teal
  { bg: '#8B5CF6', icon: 'users' }, // purple
];

const PIE_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const PERIODS = [
  { id: 'today', label: 'Hari Ini' },
  { id: '7days', label: '7 Hari' },
  { id: 'this_month', label: 'Bulan Ini' },
  { id: 'last_month', label: 'Bulan Lalu' },
  { id: 'this_year', label: 'Tahun Ini' },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  // Layout reaktif ke rotasi (beda dari Dimensions.get module-scope yang statik).
  const { width: winW, isWide } = useDeviceLayout();
  // Lebar chart diukur dari lebar ScrollView (dikurangi padding konten 16px kiri+kanan),
  // supaya chart ikut menyesuaikan saat device dirotasi / di layar tablet yang lebar.
  const [scrollW, setScrollW] = useState(0);
  const chartWidth = Math.max(0, (scrollW || winW) - 32);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePeriod, setActivePeriod] = useState('this_month');

  const fetchDashboard = useCallback(async (period) => {
    try {
      const result = await getLocalDashboard(period);
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboard(activePeriod);
  }, [activePeriod, fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard(activePeriod);
  };

  if (loading && !data) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Gagal memuat data dashboard.</Text>
      </View>
    );
  }

  // Prepare Line Chart Data
  let lineChartData = {
    labels: ['N/A'],
    datasets: [{ data: [0] }],
  };
  
  if (data.salesGraph && data.salesGraph.length > 0) {
    const step = Math.ceil(data.salesGraph.length / 7);
    lineChartData = {
      labels: data.salesGraph.filter((_, i) => i % step === 0).map(d => String(d.label)),
      datasets: [
        {
          data: data.salesGraph.map(d => d.total),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }

  const pieChartData = (data.mostSoldPie || []).map((item, index) => ({
    name: item.name,
    population: Number(item.value) || 0,
    color: PIE_COLORS[index % PIE_COLORS.length],
    legendFontColor: '#64748B',
    legendFontSize: 12,
  }));

  const categoryPieData = (data.topCategories || []).map((item, index) => ({
    name: item.name,
    population: Number(item.value) || 0,
    color: PIE_COLORS[index % PIE_COLORS.length],
    legendFontColor: '#64748B',
    legendFontSize: 12,
  }));

  const stockPieData = [
    { name: 'Aman', population: Number(data.stockComposition?.above) || 0, color: '#10B981', legendFontColor: '#64748B', legendFontSize: 12 },
    { name: 'Tipis', population: Number(data.stockComposition?.below) || 0, color: '#EF4444', legendFontColor: '#64748B', legendFontSize: 12 }
  ].filter(d => d.population > 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={[styles.header, { paddingTop: insets.top + 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Ringkasan data & statistik bisnis</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        onLayout={(e) => setScrollW(e.nativeEvent.layout.width)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setActivePeriod(p.id)}
              style={[styles.periodBtn, activePeriod === p.id && styles.periodBtnActive]}
            >
              <Text style={[styles.periodBtnText, activePeriod === p.id && styles.periodBtnTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ═══ STAT CARDS ═══ */}
        <View style={styles.statsGrid}>
          {(data.stats || []).map((stat, idx) => {
            const s = STAT_COLORS[idx % STAT_COLORS.length];
            const isPositive = stat.change >= 0;
            const displayVal = stat.type === 'currency' 
              ? `Rp ${Number(stat.value || 0).toLocaleString('id-ID')}` 
              : Number(stat.value || 0).toLocaleString('id-ID');

            return (
              <View key={idx} style={[styles.statCard, { backgroundColor: s.bg, width: isWide ? '23%' : '48%' }]}>
                <View style={styles.statIconWrap}>
                  <Feather name={s.icon} size={20} color="#fff" />
                </View>
                <Text style={styles.statValue}>{displayVal}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <View style={styles.statChange}>
                  <Feather name={isPositive ? "arrow-up-right" : "arrow-down-right"} size={14} color={isPositive ? "#fff" : "rgba(255,255,255,0.8)"} />
                  <Text style={[styles.statChangeText, !isPositive && { color: 'rgba(255,255,255,0.8)' }]}>
                    {isPositive ? '+' : ''}{stat.change}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ═══ TREN PENJUALAN ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tren Penjualan</Text>
          </View>
          <View style={{ paddingVertical: 16 }}>
            <LineChart
              data={lineChartData}
              width={chartWidth}
              height={220}
              yAxisLabel="Rp "
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: '#3b82f6' }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </View>
        </View>

        {/* ═══ CHARTS ROW: KOMPOSISI STOK & KATEGORI ═══ */}
        {stockPieData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Komposisi Stok</Text>
            </View>
            <PieChart
              data={stockPieData}
              width={chartWidth}
              height={160}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          </View>
        )}

        {categoryPieData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Kategori Terlaris</Text>
            </View>
            <PieChart
              data={categoryPieData}
              width={chartWidth}
              height={160}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          </View>
        )}

        {/* ═══ TABLES: PIUTANG ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Piutang Terbesar</Text>
          </View>
          <View style={styles.listContainer}>
            {(data.topReceivables || []).length === 0 ? <Text style={styles.emptyText}>Tidak ada data piutang</Text> : 
              (data.topReceivables || []).map((item, i) => (
                <View key={i} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listTitle} numberOfLines={1}>{item.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.listValueDanger}>Rp {Number(item.total || 0).toLocaleString('id-ID')}</Text>
                </View>
              ))
            }
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Piutang Jatuh Tempo</Text>
          </View>
          <View style={styles.listContainer}>
            {(data.overdueSales?.data || []).length === 0 ? <Text style={styles.emptyText}>Tidak ada tagihan jatuh tempo</Text> : 
              (data.overdueSales?.data || []).map((sale, i) => (
                <View key={sale.id} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listTitle}>{sale.customer}</Text>
                      <Text style={styles.listSubtitle}>Tgl: {new Date(sale.date).toLocaleDateString('id-ID')}</Text>
                    </View>
                  </View>
                  <Text style={styles.listValueDanger}>Rp {Number(sale.remaining || 0).toLocaleString('id-ID')}</Text>
                </View>
              ))
            }
          </View>
        </View>

        {/* ═══ TABLES: PRODUK TERLARIS ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Penjualan Barang Terbesar</Text>
          </View>
          <View style={styles.listContainer}>
            {(data.topSellingProducts?.data || []).length === 0 ? <Text style={styles.emptyText}>Belum ada data</Text> : 
              (data.topSellingProducts?.data || []).map((item, i) => (
                <View key={i} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listTitle}>{item.product?.name || 'N/A'}</Text>
                      <Text style={styles.listSubtitle}>{item.total_qty} Terjual</Text>
                    </View>
                  </View>
                  <Text style={styles.listValue}>Rp {Number(item.total_sales || 0).toLocaleString('id-ID')}</Text>
                </View>
              ))
            }
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Penjualan per Kategori</Text>
          </View>
          <View style={styles.listContainer}>
            {(data.topCategorySales || []).length === 0 ? <Text style={styles.emptyText}>Belum ada data</Text> : 
              (data.topCategorySales || []).map((cat, i) => (
                <View key={i} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listTitle}>{cat.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.listValue}>Rp {Number(cat.value || 0).toLocaleString('id-ID')}</Text>
                </View>
              ))
            }
          </View>
        </View>

        {/* ═══ TABLES: PELANGGAN TERBESAR ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pelanggan Terbesar</Text>
          </View>
          <View style={styles.listContainer}>
            {(data.topCustomers || []).length === 0 ? <Text style={styles.emptyText}>Belum ada data pelanggan</Text> : 
              (data.topCustomers || []).map((cust, i) => (
                <View key={i} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listTitle}>{cust.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.listValue}>Rp {Number(cust.total || 0).toLocaleString('id-ID')}</Text>
                </View>
              ))
            }
          </View>
        </View>

        {/* ═══ TABLES: ITEM TERBARU & PENJUALAN TERBARU ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Item Terbaru</Text>
          </View>
          <View style={styles.listContainer}>
            {(data.latestProducts || []).length === 0 ? <Text style={styles.emptyText}>Belum ada produk</Text> : 
              (data.latestProducts || []).map((prod, i) => (
                <View key={prod.id} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.listTitle}>{prod.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.listValue}>Rp {Number(prod.selling_price || 0).toLocaleString('id-ID')}</Text>
                </View>
              ))
            }
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Penjualan Terbaru</Text>
          </View>
          <View style={styles.listContainer}>
            {(data.recentSales?.data || []).length === 0 ? <Text style={styles.emptyText}>Belum ada penjualan terbaru</Text> : 
              (data.recentSales?.data || []).map((sale, i) => (
                <View key={sale.id} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{sale.customer || 'Umum'}</Text>
                    <Text style={styles.listSubtitle}>{new Date(sale.date).toLocaleString('id-ID')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listValue}>Rp {Number(sale.total || 0).toLocaleString('id-ID')}</Text>
                    <Text style={[styles.badge, sale.status === 'paid' ? styles.badgeSuccess : styles.badgeWarning]}>
                      {sale.status === 'paid' ? 'Lunas' : 'Belum Lunas'}
                    </Text>
                  </View>
                </View>
              ))
            }
          </View>
        </View>

        {/* ═══ PERINGATAN STOK & KADALUARSA ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Peringatan Stok Menipis</Text>
            <View style={styles.badgeDanger}>
              <Text style={styles.badgeDangerText}>{(data.lowStockAlerts || []).length}</Text>
            </View>
          </View>
          <View style={styles.listContainer}>
            {(data.lowStockAlerts || []).length === 0 ? <Text style={styles.emptyText}>Semua stok produk aman.</Text> : 
              (data.lowStockAlerts || []).map((item, i) => (
                <View key={item.id} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{item.name}</Text>
                    <Text style={styles.listSubtitle}>{item.category || 'Tanpa Kategori'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Stok: {item.actual_stock}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Min: {item.stock_minimum}</Text>
                  </View>
                </View>
              ))
            }
          </View>
        </View>

        {data.expiryAlerts && data.expiryAlerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Barang Mendekati Kadaluarsa</Text>
              <View style={styles.badgeWarning}>
                <Text style={styles.badgeWarningText}>{data.expiryAlerts.length}</Text>
              </View>
            </View>
            <View style={styles.listContainer}>
              {data.expiryAlerts.map((item, i) => (
                <View key={item.id} style={[styles.listItem, i !== 0 && styles.borderTop]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{item.name}</Text>
                    <Text style={styles.listSubtitle}>Batch: {item.batch_number}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#D97706' }}>{new Date(item.expiry_date).toLocaleDateString('id-ID')}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Sisa {item.days_left} hari</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  
  periodScroll: { flexDirection: 'row', marginBottom: 16, flexGrow: 0 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  periodBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  periodBtnTextActive: { color: '#4F46E5' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '48%', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  statIconWrap: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 12, marginBottom: 4 },
  statTitle: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  statChange: { flexDirection: 'row', alignItems: 'center' },
  statChangeText: { fontSize: 11, fontWeight: '600', color: '#fff', marginLeft: 4 },

  section: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  
  listContainer: { padding: 16 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  listSubtitle: { fontSize: 12, color: '#64748B' },
  listValue: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  listValueDanger: { fontSize: 14, fontWeight: 'bold', color: '#EF4444', marginBottom: 4 },
  
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  badgeSuccess: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  badgeWarning: { backgroundColor: '#FEF3C7', color: '#D97706' },
  badgeWarningText: { fontSize: 11, fontWeight: 'bold', color: '#D97706' },
  
  badgeDanger: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeDangerText: { fontSize: 11, fontWeight: 'bold', color: '#EF4444' },
  
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },
});
