import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernSelect from '../components/ModernSelect';
import { Feather } from '@expo/vector-icons';
import { getLocalSales, getLocalSaleDetail, voidLocalSale } from '../services/SyncService';
import { useAuth } from '../utils/auth';
import ResponsiveContainer from '../components/ResponsiveContainer';

export default function SalesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const canDelete = can('sales.manage'); // kasir cuma boleh lihat (sales.view), hapus admin only
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  
  // Detail Modal
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSales = async () => {
    try {
      const { sales } = await getLocalSales({ search, payment_status: paymentStatus });
      setSales(sales);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [search, paymentStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSales();
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Hapus Penjualan',
      'Apakah Anda yakin? Stok produk akan dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await voidLocalSale(id);
              fetchSales();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus data.');
            }
          }
        }
      ]
    );
  };

  const handleShowDetail = async (id) => {
    setShowDetail(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const detail = await getLocalSaleDetail(id);
      if (detail) {
        setDetailData(detail);
      } else {
        Alert.alert('Error', 'Detail tidak ditemukan.');
        setShowDetail(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal mengambil detail.');
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const statusMap = {
    completed: { label: 'Selesai', bg: '#DCFCE7', text: '#166534' },
    pending: { label: 'Pending', bg: '#FEF9C3', text: '#854D0E' },
    cancelled: { label: 'Batal', bg: '#FEE2E2', text: '#991B1B' },
  };

  const paymentStatusMap = {
    paid: { label: 'Lunas', bg: '#DCFCE7', text: '#166534' },
    partial: { label: 'Sebagian', bg: '#FEF9C3', text: '#854D0E' },
    unpaid: { label: 'Belum Bayar', bg: '#FEE2E2', text: '#991B1B' },
  };

  const renderItem = ({ item }) => {
    const stat = statusMap[item.status] || { label: item.status, bg: '#F1F5F9', text: '#475569' };
    const payStat = paymentStatusMap[item.payment_status] || { label: item.payment_status, bg: '#F1F5F9', text: '#475569' };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.invoiceText}>{item.invoice_number}</Text>
            <Text style={styles.dateText}>{item.sale_date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.badge, { backgroundColor: stat.bg }]}>
              <Text style={[styles.badgeText, { color: stat.text }]}>{stat.label}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: payStat.bg }]}>
              <Text style={[styles.badgeText, { color: payStat.text }]}>{payStat.label}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.customerRow}>
            <Text style={styles.customerLabel}>Pelanggan</Text>
            <Text style={styles.customerName}>{item.customer ? item.customer.name : 'Umum'}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rp {parseFloat(item.total).toLocaleString('id-ID')}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => handleShowDetail(item.id)}>
            <Feather name="eye" size={16} color="#4F46E5" />
            <Text style={[styles.actionBtnText, { color: '#4F46E5' }]}>Detail</Text>
          </TouchableOpacity>
          {canDelete && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item.id)}>
            <Feather name="trash-2" size={16} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Hapus</Text>
          </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safe, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Riwayat Penjualan</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              placeholder="Cari invoice..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <ModernSelect
            title="Filter Status Bayar"
            placeholder="Semua Status"
            value={paymentStatus}
            onChange={(itemValue) => setPaymentStatus(itemValue)}
            triggerStyle={{ width: 150, height: 44, paddingVertical: 0, borderRadius: 12 }}
            options={[
              { label: 'Semua Status', value: '' },
              { label: 'Lunas', value: 'paid', icon: 'check-circle' },
              { label: 'Sebagian', value: 'partial', icon: 'clock' },
              { label: 'Belum Bayar', value: 'unpaid', icon: 'alert-circle' },
            ]}
          />
        </View>
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        /* Cap lebar & tengahin list di layar lebar (tablet landscape) biar ga melar */
        <ResponsiveContainer fill maxWidth={900}>
          <FlatList
            data={sales}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <View style={styles.iconBox}>
                  <Feather name="inbox" size={48} color="#94A3B8" />
                </View>
                <Text style={styles.title}>Belum Ada Transaksi</Text>
                <Text style={styles.subtitle}>
                  Data penjualan tidak ditemukan.
                </Text>
              </View>
            }
          />
        </ResponsiveContainer>
      )}

      {/* DETAIL MODAL (Thermal Receipt Style) */}
      <Modal visible={showDetail} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.7)' }]}>
          <View style={[styles.modalContent, { padding: 0, width: '100%', maxWidth: 380, borderRadius: 8, backgroundColor: '#fdfdfd' }]}>
            {detailLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={{ marginTop: 16, color: '#64748B' }}>Memuat Detail...</Text>
              </View>
            ) : detailData && (
              <View>
                <ScrollView style={{ maxHeight: 500, padding: 20 }}>
                  <View style={{ alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 4 }}>DETAIL TRANSAKSI</Text>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#000', borderStyle: 'dashed', paddingTop: 8, marginBottom: 8 }}>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>No: {detailData.invoice_number}</Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>Tgl: {detailData.sale_date}</Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>Kasir: {detailData.user?.name || '-'}</Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>Plg: {detailData.customer?.name || 'Umum'}</Text>
                    <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>Status: {statusMap[detailData.status]?.label || detailData.status}</Text>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#000', borderStyle: 'dashed', paddingTop: 8, paddingBottom: 4 }}>
                    {detailData.details?.map((item, idx) => (
                      <View key={idx} style={{ marginBottom: 8 }}>
                        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000', fontWeight: 'bold' }}>{item.product?.name || 'Item'}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>{item.quantity} x {parseFloat(item.unit_price).toLocaleString('id-ID')}</Text>
                          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>{parseFloat(item.subtotal).toLocaleString('id-ID')}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#000', borderStyle: 'dashed', paddingTop: 8, paddingBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: '#000' }}>Total</Text>
                      <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: '#000' }}>{parseFloat(detailData.total).toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>Dibayar</Text>
                      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>{parseFloat(detailData.paid).toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>Kembali</Text>
                      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#000' }}>{parseFloat(detailData.change_amount).toLocaleString('id-ID')}</Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={{ padding: 16, backgroundColor: '#f1f5f9', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: '#EEF2FF', paddingVertical: 12, borderRadius: 8 }]} onPress={() => setShowDetail(false)}>
                    <Text style={{ color: '#4F46E5', fontSize: 14, textAlign: 'center', fontWeight: 'bold' }}>Tutup</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    padding: 16, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  filterContainer: {
    flexDirection: 'row',
    gap: 8
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#334155'
  },
  pickerBox: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    justifyContent: 'center',
    height: 44,
    overflow: 'hidden'
  },
  picker: {
    height: 44,
    width: '100%',
  },
  listContent: { padding: 16, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: 300 },
  iconBox: { 
    width: 100, 
    height: 100, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 24
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace'
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  cardBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  customerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
    fontFamily: 'monospace'
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  actionBtnOutline: {
    backgroundColor: '#fff',
    borderColor: '#E0E7FF'
  },
  actionBtnDanger: {
    backgroundColor: '#fff',
    borderColor: '#FEE2E2'
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    overflow: 'hidden'
  },
});
