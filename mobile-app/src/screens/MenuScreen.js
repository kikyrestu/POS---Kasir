import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function MenuScreen({ navigation }) {
  
  const handlePress = (route) => {
    if (route === 'ProductList') {
      navigation.navigate('ProductList');
    } else if (route === 'Categories') {
      navigation.navigate('CategoryList');
    } else if (route === 'Stock') {
      navigation.navigate('StockOpname');
    } else if (route === 'Mutasi') {
      navigation.navigate('StockMovement');
    } else if (route === 'Settings') {
      navigation.navigate('Settings');
    } else if (route === 'Users') {
      navigation.navigate('UserManagement');
    } else {
      Alert.alert('Info', 'Fitur ini belum tersedia di Mobile MVP (Segera Hadir).');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu Utama</Text>
      </View>
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* Grup: Produk */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Feather name="package" size={16} color="#94A3B8" />
            <Text style={styles.groupTitle}>PRODUK & INVENTORY</Text>
          </View>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('ProductList')}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                <Feather name="list" size={24} color="#2563EB" />
              </View>
              <Text style={styles.itemLabel}>Daftar Produk</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('Categories')}>
              <View style={styles.iconBox}>
                <Feather name="layers" size={24} color="#64748B" />
              </View>
              <Text style={styles.itemLabel}>Kategori</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('Stock')}>
              <View style={styles.iconBox}>
                <Feather name="refresh-cw" size={24} color="#64748B" />
              </View>
              <Text style={styles.itemLabel}>Penyesuaian Stok</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('Mutasi')}>
              <View style={styles.iconBox}>
                <Feather name="repeat" size={24} color="#64748B" />
              </View>
              <Text style={styles.itemLabel}>Riwayat Mutasi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grup: Laporan */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Feather name="bar-chart-2" size={16} color="#94A3B8" />
            <Text style={styles.groupTitle}>LAPORAN</Text>
          </View>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('ReportSales')}>
              <View style={styles.iconBox}>
                <Feather name="trending-up" size={24} color="#64748B" />
              </View>
              <Text style={styles.itemLabel}>Penjualan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('ReportItems')}>
              <View style={styles.iconBox}>
                <Feather name="pie-chart" size={24} color="#64748B" />
              </View>
              <Text style={styles.itemLabel}>Item Terjual</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grup: Lainnya */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Feather name="more-horizontal" size={16} color="#94A3B8" />
            <Text style={styles.groupTitle}>LAINNYA</Text>
          </View>
          <View style={styles.grid}>
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('Customers')}>
              <View style={styles.iconBox}>
                <Feather name="users" size={24} color="#64748B" />
              </View>
              <Text style={styles.itemLabel}>Pelanggan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('Suppliers')}>
              <View style={styles.iconBox}>
                <Feather name="truck" size={24} color="#64748B" />
              </View>
              <Text style={styles.itemLabel}>Supplier</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('Users')}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                <Feather name="user" size={24} color="#EF4444" />
              </View>
              <Text style={styles.itemLabel}>Manajemen Karyawan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.gridItem} onPress={() => handlePress('Settings')}>
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
                <Feather name="settings" size={24} color="#16A34A" />
              </View>
              <Text style={styles.itemLabel}>Pengaturan & Sync</Text>
            </TouchableOpacity>
          </View>
        </View>
        
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  gridItem: {
    width: '21%', // approx 4 items per row
    alignItems: 'center',
    marginBottom: 8
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  itemLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 14
  }
});
