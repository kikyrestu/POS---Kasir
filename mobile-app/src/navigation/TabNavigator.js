import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions, ScrollView, Alert, TouchableWithoutFeedback } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  LayoutDashboard, ShoppingBag, CreditCard, Menu, X,
  ShoppingCart, Users, Truck, Settings, Package, Layers, RefreshCw, Repeat, TrendingUp, PieChart
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../utils/auth';

import DashboardScreen from '../screens/DashboardScreen';
import PosScreen from '../screens/PosScreen';
import SalesScreen from '../screens/SalesScreen';

const Tab = createBottomTabNavigator();

// Komponen Dummy untuk Menu agar tidak ada layar yang di-render saat Menu diklik
const DummyScreen = () => <View />;

export default function TabNavigator() {
  // useWindowDimensions() reaktif & ambil ukuran SETELAH orientasi terkunci; beda
  // dari Dimensions.get('window') module-scope yang kebaca sebelum lock (bisa salah
  // di tablet yang di-lock landscape).
  const { width, height } = useWindowDimensions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();

  // Visibilitas grup: kalau semua anaknya ke-hide, header grupnya ikut ilang.
  const showProdGroup = can('products.view') || can('categories.manage') || can('warehouses.manage');
  const showReportGroup = can('sales.view') || can('reports.view');
  
  // Calculate exact tab bar height to avoid overlap/shadow on the tab bar
  const TAB_BAR_HEIGHT = 64 + insets.bottom;
  // Di layar lebar (tablet landscape) bottom-sheet menu di-cap ~560px & di-tengah
  // biar item menu ga melar absurd; di HP tetap full-width (inset 0).
  const isWide = width >= 768;
  const sheetSideInset = isWide ? Math.max(0, (width - 560) / 2) : 0;

  useEffect(() => {
    if (isMenuOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isMenuOpen]);

  const handleNav = (route) => {
    setIsMenuOpen(false);
    if (route === 'ProductList') {
      navigation.navigate(route);
    } else if (route === 'Categories') {
      navigation.navigate('CategoryList');
    } else if (route === 'Stock') {
      navigation.navigate('StockOpname');
    } else if (route === 'Mutasi') {
      navigation.navigate('StockMovement');
    } else if (route === 'Customers') {
      navigation.navigate('CustomerList');
    } else if (route === 'Suppliers') {
      navigation.navigate('SupplierList');
    } else if (route === 'ReportSales') {
      navigation.navigate('ReportSales');
    } else if (route === 'ReportItems') {
      navigation.navigate('ReportItems');
    } else if (route === 'Settings') {
      navigation.navigate('Settings');
    } else if (route === 'UserManagement') {
      navigation.navigate('UserManagement');
    } else {
      Alert.alert('Info', 'Fitur ini belum tersedia di Mobile MVP (Segera Hadir).');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false, // tiap screen tab udah punya header sendiri, matiin native biar ga double header
          headerStyle: { backgroundColor: '#ffffff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
          headerTitleStyle: { fontWeight: 'bold', color: '#1e293b' },
          tabBarStyle: { 
            backgroundColor: '#ffffff', 
            borderTopWidth: 1, 
            borderTopColor: '#e2e8f0', 
            elevation: 0, 
            shadowOpacity: 0, // hapus shadow nativenya biar bersih kayak web
            height: TAB_BAR_HEIGHT,
            paddingBottom: insets.bottom, 
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 8,
          },
          tabBarActiveTintColor: '#2563eb', // text-blue-600
          tabBarInactiveTintColor: '#64748b', // text-slate-500
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.25,
            marginTop: 4,
          }
        }}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ 
            title: 'Dashboard', 
            tabBarIcon: ({ color, focused }) => <LayoutDashboard size={20} color={color} fill={focused ? 'rgba(37, 99, 235, 0.15)' : 'none'} /> 
          }}
        />
        <Tab.Screen 
          name="POS" 
          component={PosScreen} 
          options={{ 
            title: 'POS', 
            tabBarIcon: ({ color, focused }) => <ShoppingBag size={20} color={color} fill={focused ? 'rgba(37, 99, 235, 0.15)' : 'none'} /> 
          }}
        />
        <Tab.Screen 
          name="Sales" 
          component={SalesScreen} 
          options={{ 
            title: 'Penjualan', 
            tabBarIcon: ({ color, focused }) => <CreditCard size={20} color={color} fill={focused ? 'rgba(37, 99, 235, 0.15)' : 'none'} /> 
          }}
        />
        <Tab.Screen 
          name="Menu" 
          component={DummyScreen} 
          options={{
            title: isMenuOpen ? 'Tutup' : 'Menu',
            tabBarIcon: ({ color }) => isMenuOpen ? 
              <X size={20} color="#2563eb" /> : 
              <Menu size={20} color={color} />,
            tabBarLabel: ({ color }) => (
               <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.25, marginTop: 4, color: isMenuOpen ? '#2563eb' : color }}>
                 {isMenuOpen ? 'Tutup' : 'Menu'}
               </Text>
            ),
            tabBarButton: (props) => (
              <TouchableOpacity 
                {...props} 
                onPress={() => setIsMenuOpen(!isMenuOpen)} 
                activeOpacity={1}
              />
            )
          }}
        />
      </Tab.Navigator>

      {/* --- CUSTOM BOTTOM SHEET MENU --- */}
      <View style={StyleSheet.absoluteFill} pointerEvents={isMenuOpen ? 'auto' : 'none'}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim, bottom: TAB_BAR_HEIGHT }]}>
          <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
        </Animated.View>
        
        <Animated.View style={[styles.sheetContainer, { bottom: TAB_BAR_HEIGHT, left: sheetSideInset, right: sheetSideInset, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handleBarWrap}>
            <View style={styles.handleBar} />
          </View>
          
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
            
            <View style={styles.storeLogoBox}>
              <View style={styles.storeLogoIcon}>
                <ShoppingCart size={20} color="#fff" />
              </View>
              <Text style={styles.storeLogoText}>BuildyPOS</Text>
            </View>

            <View style={styles.gridSection}>
              {/* Item without children (like web) */}
              {can('customers.manage') && (
              <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('Customers')}>
                <View style={[styles.iconBox, { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }]}>
                  <Users size={24} color="#64748B" />
                </View>
                <Text style={styles.itemLabel}>Pelanggan</Text>
              </TouchableOpacity>
              )}

              {can('suppliers.manage') && (
              <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('Suppliers')}>
                <View style={[styles.iconBox, { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }]}>
                  <Truck size={24} color="#64748B" />
                </View>
                <Text style={styles.itemLabel}>Supplier</Text>
              </TouchableOpacity>
              )}

              {can('users.manage') && (
              <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('UserManagement')}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                  <Users size={24} color="#EF4444" />
                </View>
                <Text style={styles.itemLabel}>Karyawan</Text>
              </TouchableOpacity>
              )}

              {/* Selalu tampil: buat kasir jadi "Akun" (sync transaksi offline +
                  logout), buat admin jadi "Pengaturan" penuh. Isinya di-gate di
                  dalam SettingsScreen sesuai role. */}
              <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('Settings')}>
                <View style={[styles.iconBox, { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }]}>
                  <Settings size={24} color="#64748B" />
                </View>
                <Text style={styles.itemLabel}>{can('settings.manage') ? 'Pengaturan' : 'Akun'}</Text>
              </TouchableOpacity>
            </View>

            {/* Items with children (Groups) */}
            {showProdGroup && (
            <View style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Package size={16} color="#94A3B8" />
                <Text style={styles.groupTitle}>PRODUK & INVENTORY</Text>
              </View>
              <View style={styles.groupGrid}>
                {can('products.view') && (
                <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('ProductList')}>
                  <View style={[styles.iconBox, { backgroundColor: '#fff', borderColor: '#E2E8F0', shadowColor:'#000', shadowOpacity:0.05, shadowRadius:3, elevation:1 }]}>
                    <Package size={24} color="#64748B" />
                  </View>
                  <Text style={styles.itemLabel}>Daftar Produk</Text>
                </TouchableOpacity>
                )}
                {can('categories.manage') && (
                <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('Categories')}>
                  <View style={[styles.iconBox, { backgroundColor: '#fff', borderColor: '#E2E8F0' }]}>
                    <Layers size={24} color="#64748B" />
                  </View>
                  <Text style={styles.itemLabel}>Kategori</Text>
                </TouchableOpacity>
                )}
                {can('warehouses.manage') && (
                <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('Stock')}>
                  <View style={[styles.iconBox, { backgroundColor: '#fff', borderColor: '#E2E8F0' }]}>
                    <RefreshCw size={24} color="#64748B" />
                  </View>
                  <Text style={styles.itemLabel}>Penyesuaian Stok</Text>
                </TouchableOpacity>
                )}
                {can('warehouses.manage') && (
                <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('Mutasi')}>
                  <View style={[styles.iconBox, { backgroundColor: '#fff', borderColor: '#E2E8F0' }]}>
                    <Repeat size={24} color="#64748B" />
                  </View>
                  <Text style={styles.itemLabel}>Riwayat Mutasi</Text>
                </TouchableOpacity>
                )}
              </View>
            </View>
            )}

            {showReportGroup && (
            <View style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <TrendingUp size={16} color="#94A3B8" />
                <Text style={styles.groupTitle}>LAPORAN</Text>
              </View>
              <View style={styles.groupGrid}>
                {can('sales.view') && (
                <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('ReportSales')}>
                  <View style={[styles.iconBox, { backgroundColor: '#fff', borderColor: '#E2E8F0' }]}>
                    <TrendingUp size={24} color="#64748B" />
                  </View>
                  <Text style={styles.itemLabel}>Penjualan</Text>
                </TouchableOpacity>
                )}
                {can('reports.view') && (
                <TouchableOpacity style={styles.gridItem} onPress={() => handleNav('ReportItems')}>
                  <View style={[styles.iconBox, { backgroundColor: '#fff', borderColor: '#E2E8F0' }]}>
                    <PieChart size={24} color="#64748B" />
                  </View>
                  <Text style={styles.itemLabel}>Laba / Rugi</Text>
                </TouchableOpacity>
                )}
              </View>
            </View>
            )}

          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // bg-slate-900/40
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, // rounded-t-3xl
    borderTopRightRadius: 24,
    maxHeight: '85%',
    // Hapus shadow bawaan yang bikin bocor ke bawah (nutupin tab bar)
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: -8 },
    // shadowOpacity: 0.1,
    // shadowRadius: 30,
    // elevation: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  handleBarWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 48, // w-12
    height: 6, // h-1.5
    backgroundColor: '#E2E8F0', // bg-slate-200
    borderRadius: 999, // rounded-full
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sheetContent: {
    paddingBottom: 20,
  },
  storeLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  storeLogoIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#2563EB', // bg-blue-600
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeLogoText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  gridSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  groupCard: {
    backgroundColor: 'rgba(248, 250, 252, 0.5)', // bg-slate-50/50
    borderRadius: 16, // rounded-2xl
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9', // border-slate-100
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12, // slightly larger gap
  },
  gridItem: {
    width: '21%', // fit 4 in a row nicely
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 52, // w-14 ~56, w-12 ~48
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 12,
  },
});
