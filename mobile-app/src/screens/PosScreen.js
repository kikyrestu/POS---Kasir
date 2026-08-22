import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Infinity } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getLocalProducts, syncProducts, saveOfflineTransaction, syncCustomers, getLocalCustomers, getHoldTransactions, getTransactionItems, deleteHoldTransaction, syncCategories, getLocalCategories, syncTables, syncVouchers, getLocalTables, getLocalVouchers, pushOfflineTransactions, drainOutbox, getActiveShift, openShift, getShiftCashSales, closeShift, getLocalSettings } from '../services/SyncService';
import { useServerStatus } from '../utils/serverStatus';
import ServerStatusBadge from '../components/ServerStatusBadge';
import * as PrinterService from '../services/PrinterService';
import useDeviceLayout from '../hooks/useDeviceLayout';
import CartPanel from '../components/pos/CartPanel';

const CATEGORY_COLORS = [
  '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6',
];

// ─────────────────────────────────────────
// PRODUCT CARD
// ─────────────────────────────────────────
const ProductCard = React.memo(function ProductCard({ item, onPress, inCart, columns = 2 }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();
    onPress(item);
  };

  // Lebar kartu ikut jumlah kolom (2/3/4). `-2%` menyisakan celah antar-kartu
  // yang diambil oleh justifyContent:'space-between' di columnWrapperStyle.
  const cardWidth = `${(100 / columns) - 2}%`;

  return (
    <Animated.View style={{ transform: [{ scale }], width: cardWidth, marginBottom: 12 }}>
      <TouchableOpacity
        onPress={handlePress}
        className={`bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all ${inCart ? 'border-blue-500' : 'border-slate-200'}`}
        activeOpacity={0.9}
      >
        <View className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${inCart ? 'bg-blue-600' : 'bg-slate-100'}`}>
          <Feather name="box" size={24} color={inCart ? '#fff' : '#4F46E5'} />
        </View>
        {inCart > 0 && (
          <View className="absolute top-3 right-3 bg-rose-500 min-w-[24px] h-6 rounded-full flex items-center justify-center px-1 shadow-sm border border-white">
            <Text className="text-white text-xs font-bold">{inCart}</Text>
          </View>
        )}
        <Text className="text-sm font-bold text-slate-800 leading-snug mb-1" numberOfLines={2}>{item.name}</Text>
        <Text className="text-blue-600 font-bold mb-2">Rp {item.price ? Number(item.price).toLocaleString('id-ID') : '0'}</Text>
        
        {item.is_unlimited === 1 ? (
          <View className="flex-row items-center gap-1 mt-auto">
            <Ionicons name="infinite" size={14} color="#10B981" />
            <Text className="text-xs font-bold text-emerald-500">Tak Terbatas</Text>
          </View>
        ) : (item.stock !== undefined && (
          <Text className={`text-xs font-medium mt-auto ${item.stock <= 0 ? 'text-rose-500' : 'text-slate-500'}`}>
            Stok: {item.stock}
          </Text>
        ))}
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id && prevProps.inCart === nextProps.inCart && prevProps.columns === nextProps.columns;
});

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
export default function PosScreen({ navigation }) {
  const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState(['Semua']);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  // Cart/Checkout Extra States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');
  const [orderType, setOrderType] = useState('dine_in'); // dine_in, takeaway
  const [selectedTable, setSelectedTable] = useState('');

  // Payment Modal States
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, qris, transfer, tempo
  const [paidAmount, setPaidAmount] = useState('');

  // Master Data States
  const [tables, setTables] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  // Variant, Modifier & Voucher States
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForModifier, setSelectedProductForModifier] = useState(null);
  const [modifierSelections, setModifierSelections] = useState({});
  const [modifierNotes, setModifierNotes] = useState('');
  
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // Shift & Store Settings States
  const [globalSettings, setGlobalSettings] = useState({ store_name: 'POS Kasir', enable_order_type: '0', enable_table_management: '0' });
  const [printing, setPrinting] = useState(false);   // cetak struk lagi jalan?
  const [invoiceNumber, setInvoiceNumber] = useState('INV-' + new Date().getTime().toString().slice(-6));
  const [activeShift, setActiveShift] = useState(null);
  // Server reachability for the header dot: true=online, false=offline, null=checking.
  const serverOnline = useServerStatus();
  const insets = useSafeAreaInsets();
  // Layout responsif: tablet landscape → 2-panel (grid produk + keranjang dock),
  // HP portrait → 1-panel (floating bar + modal keranjang). Reaktif ke rotasi.
  const { width, showTwoPane, productColumns } = useDeviceLayout();
  // Lebar panel keranjang dock: nyaman & di-clamp biar grid tetap dapat ruang.
  const cartPanelWidth = Math.round(Math.min(440, Math.max(360, width * 0.34)));
  // Shared sync lock + connectivity edge-tracking (declared here so both the manual
  // handleSync and the auto syncInBackground serialize through the same guard).
  const bgSyncingRef = useRef(false);
  const prevOnlineRef = useRef(null);
  const [startingCash, setStartingCash] = useState('');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [shiftClosingExpected, setShiftClosingExpected] = useState(0);
  const [shiftClosingCash, setShiftClosingCash] = useState('');
  const [shiftClosingNotes, setShiftClosingNotes] = useState('');

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Hold Bill States
  const [showHoldBillsModal, setShowHoldBillsModal] = useState(false);
  const [holdBills, setHoldBills] = useState([]);
  const [resumedHoldUuid, setResumedHoldUuid] = useState(null);

  // Camera Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  const cartBarAnim = useRef(new Animated.Value(150)).current;
  const cartBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLocalData();
  }, []);

  // Settings printer bisa berubah di layar Pengaturan (mis. baru milih printer).
  // POS itu tab yg TETAP ter-mount, jadi loadLocalData (mount-only) ga keburu
  // nangkep perubahan → globalSettings basi & cetak struk kelempar "Printer belum
  // dipilih" (padahal Tes Cetak jalan krn baca state Pengaturan yg live). Refresh
  // settings tiap POS balik fokus biar device printer selalu terkini pas cetak.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { loadSettings(); });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    // Show/hide floating cart bar
    Animated.spring(cartBarAnim, {
      toValue: cart.length > 0 ? 0 : 150,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [cart.length > 0]);

  // Baca settings toko/struk/printer dari SQLite → globalSettings. Dipisah biar
  // bisa dipanggil ulang saat POS balik fokus (bukan cuma pas mount) supaya
  // printer yg baru dikonfigurasi di Pengaturan langsung kepakai pas cetak.
  const loadSettings = async () => {
    try {
      const s = await getLocalSettings();
      const flat = {};
      Object.values(s.settings || {}).forEach(g => Object.assign(flat, g));
      setGlobalSettings(prev => ({ ...prev, ...flat }));
    } catch (e) {
      console.error('Gagal memuat settings ke POS:', e);
    }
  };

  const loadLocalData = async (query = '') => {
    setLoading(true);
    try {
      const data = await getLocalProducts(query);
      const custData = await getLocalCustomers();
      const catData = await getLocalCategories();
      const tablesData = await getLocalTables();
      const vouchersData = await getLocalVouchers();
      
      const categoryMap = {};
      (catData || []).forEach(c => categoryMap[c.id] = c.name);

      const list = (data || []).map(p => {
        const parsedVariants = p.variants ? JSON.parse(p.variants) : null;
        // Normalize variants: flatten warehouse stocks, fall back to product price, inherit unlimited flag.
        const normVariants = Array.isArray(parsedVariants) ? parsedVariants.map(v => {
          const vStock = Array.isArray(v.stocks)
            ? v.stocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
            : (Number(v.stock) || 0);
          const vPrice = (v.price !== null && v.price !== undefined && v.price !== '')
            ? Number(v.price)
            : Number(p.price);
          return { ...v, stock: vStock, price: vPrice, is_unlimited: p.is_unlimited };
        }) : null;
        return {
          ...p,
          category_name: p.category_id ? (categoryMap[p.category_id] || p.category_id) : null,
          variants: normVariants,
          modifiers: p.modifiers ? JSON.parse(p.modifiers) : null
        };
      });

      setProducts(list);
      setCustomers(custData || []);
      setTables(tablesData || []);
      setVouchers(vouchersData || []);

      // Muat settings toko/struk/printer ke globalSettings (sumber tunggal: SQLite).
      // Dipakai buat header struk & konfigurasi cetak Bluetooth.
      await loadSettings();

      // Load persisted open shift so the POS lock reflects real state after restart.
      const shift = await getActiveShift();
      setActiveShift(shift);

      // Preload held bills so the header badge and table-occupancy hints are accurate.
      const holds = await getHoldTransactions();
      setHoldBills(holds || []);

      // Build categories from data
      const cats = ['Semua', ...new Set(
        list.map(p => p.category_name || p.category_id || null).filter(Boolean)
      )];
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (bgSyncingRef.current) return;      // don't overlap with an auto-sync in flight
    bgSyncingRef.current = true;
    setSyncing(true);
    try {
      await pushOfflineTransactions();
      await drainOutbox();                   // setor perubahan master-data offline (produk/pelanggan/dll) sebelum tarik ulang
      const okProd = await syncProducts();
      const okCust = await syncCustomers();
      const okCat = await syncCategories();
      const okTab = await syncTables();
      const okVou = await syncVouchers();
      if (okProd && okCust && okCat && okTab && okVou) {
        Alert.alert('Berhasil', 'Data produk, kategori, pelanggan, meja & voucher berhasil disinkronisasi!');
        loadLocalData();
      } else {
        Alert.alert('Gagal', 'Pastikan terhubung ke internet.');
      }
    } finally {
      setSyncing(false);
      bgSyncingRef.current = false;
    }
  };

  // ---- Hybrid auto-sync ----
  // The moment the server becomes reachable again (offline -> online), silently
  // flush pending sales and refresh the catalog. No mode switch, no button: the
  // same local-first data path, just synced automatically when the network allows.
  const syncInBackground = useCallback(async () => {
    if (bgSyncingRef.current) return;      // don't stack with an in-flight sync
    bgSyncingRef.current = true;
    setSyncing(true);
    try {
      await pushOfflineTransactions();     // 1) never lose local sales
      await drainOutbox();                 // 1b) setor perubahan master-data offline (produk/user/dll)
      await loadLocalData();               // 2) refresh holds / shift / badges
      if (cart.length === 0) {             // 3) pull catalog only when idle,
        // so a catalog refresh never disrupts an order in progress. Sequential
        // (NOT Promise.all): expo-sqlite shares one connection, so concurrent
        // withTransactionAsync calls collide ("transaction within a transaction").
        await syncProducts();
        await syncCategories();
        await syncTables();
        await syncVouchers();
        await syncCustomers();
        await loadLocalData();
      }
    } catch (e) {
      // stay silent — it retries on the next reconnect or a manual sync
    } finally {
      setSyncing(false);
      bgSyncingRef.current = false;
    }
  }, [cart.length]);

  useEffect(() => {
    // Fire once when connectivity flips to online (covers reconnect AND opening
    // the app already online with leftover pending sales).
    if (serverOnline === true && prevOnlineRef.current !== true) {
      syncInBackground();
    }
    prevOnlineRef.current = serverOnline;
  }, [serverOnline, syncInBackground]);

  const bounceBadge = () => {
    Animated.sequence([
      Animated.spring(cartBounce, { toValue: 1.4, useNativeDriver: true, speed: 60 }),
      Animated.spring(cartBounce, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const addToCart = useCallback((product, variant = null, modifiers = [], notes = '', modifiersResolved = false) => {
    // 1. Variant prompt FIRST — stock is enforced per-variant inside the modal,
    //    so we must not block on the (often empty) parent stock before choosing one.
    if (product.has_variants && product.variants && !variant) {
      setSelectedProductForVariant(product);
      setShowVariantModal(true);
      return;
    }

    // 2. Stock check (variant is now known if the product has variants)
    const isUnlimited = variant ? (variant.is_unlimited === 1 || product.is_unlimited === 1) : (product.is_unlimited === 1);
    const availableStock = variant ? variant.stock : product.stock;

    // Count existing qty in cart for this product/variant
    let currentQty = 0;
    cart.forEach(item => {
      if (item.product_id === product.id && (!variant || item.variant_id === variant.id)) {
        currentQty += item.qty;
      }
    });

    if (!isUnlimited && (currentQty + 1) > availableStock) {
      Alert.alert('Habis', 'Stok produk ini sudah tidak mencukupi.');
      return;
    }

    // 3. Modifier prompt (skipped once the modifier modal has resolved the selection)
    if (product.modifiers?.length > 0 && !modifiersResolved) {
      setShowVariantModal(false);
      setSelectedProductForVariant(null);
      setSelectedProductForModifier({ product, variant });
      const initial = {};
      product.modifiers.forEach(m => {
        if (m.is_required && m.options?.length > 0) initial[m.id] = [m.options[0].id];
      });
      setModifierSelections(initial);
      return;
    }

    bounceBadge();

    let modPrice = 0;
    let modNames = [];
    modifiers.forEach(opt => {
      modPrice += parseFloat(opt.price || 0);
      modNames.push(opt.name);
    });
    const modSegment = modifiers.length > 0 ? `-${modifiers.map(m=>m.id).join('-')}` : '';

    const cartId = variant ? `${product.id}-${variant.id}${modSegment}` : `${product.id}${modSegment}`;

    setCart(prev => {
      const existing = prev.find(i => i.cart_id === cartId);
      if (existing) return prev.map(i => i.cart_id === cartId ? { ...i, qty: i.qty + 1 } : i);

      const bPrice = variant ? (variant.price || product.selling_price || product.price) : (product.selling_price || product.price);

      return [...prev, {
        ...product,
        cart_id: cartId,
        product_id: product.id,
        variant_id: variant ? variant.id : null,
        variant_name: variant ? variant.name : null,
        name: product.name + (variant ? ` - ${variant.name}` : ''),
        price: parseFloat(bPrice) + modPrice,
        qty: 1,
        modifiers: modifiers,
        modifier_names: modNames.join(', '),
        item_notes: notes
      }];
    });

    setShowVariantModal(false);
    setSelectedProductForVariant(null);
    setSelectedProductForModifier(null);
    setModifierSelections({});
  }, [cart]);

  const increaseQty = (item) => {
    // Verify stock before increasing
    const isUnlimited = item.is_unlimited === 1 || item.variant?.is_unlimited === 1; // Though variant is flattened in item, we check if item.is_unlimited
    // To be perfectly accurate, we need to find the original product/variant from products list
    const originalProduct = products.find(p => p.id === item.product_id);
    let originalVariant = null;
    let availableStock = item.stock || 0;
    let unlim = item.is_unlimited;

    if (originalProduct) {
      unlim = originalProduct.is_unlimited === 1;
      availableStock = originalProduct.stock;
      if (item.variant_id && originalProduct.variants) {
        originalVariant = originalProduct.variants.find(v => v.id === item.variant_id);
        if (originalVariant) {
          unlim = originalVariant.is_unlimited === 1 || unlim;
          availableStock = originalVariant.stock;
        }
      }
    }

    // Sum all items in cart that share this product/variant
    let currentQty = 0;
    cart.forEach(c => {
      if (c.product_id === item.product_id && c.variant_id === item.variant_id) {
        currentQty += c.qty;
      }
    });

    if (!unlim && (currentQty + 1) > availableStock) {
      Alert.alert('Batas Stok', 'Maksimal stok tercapai.');
      return;
    }

    setCart(prev => prev.map(i => i.cart_id === item.cart_id ? { ...i, qty: i.qty + 1 } : i));
  };

  const decreaseQty = (item) =>
    setCart(prev => prev.map(i => i.cart_id === item.cart_id ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0));

  const removeItem = (item) =>
    setCart(prev => prev.filter(i => i.cart_id !== item.cart_id));
    
  const updateItemNotes = (item, notes) =>
    setCart(prev => prev.map(i => i.cart_id === item.cart_id ? { ...i, item_notes: notes } : i));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  
  const discountVal = parseFloat(discount) || 0;
  const taxVal = parseFloat(tax) || 0;
  
  let voucherDiscountVal = appliedVoucher ? (
    appliedVoucher.type === 'percent' ? (cartSubtotal * (appliedVoucher.amount / 100)) : appliedVoucher.amount
  ) : 0;
  
  if (appliedVoucher && appliedVoucher.max_discount > 0 && voucherDiscountVal > appliedVoucher.max_discount) {
    voucherDiscountVal = appliedVoucher.max_discount;
  }

  const cartTotal = Math.max(0, cartSubtotal - discountVal - voucherDiscountVal + taxVal);

  // Buka modal pembayaran. Dipakai tombol "Bayar" di keranjang (modal HP maupun
  // panel dock tablet). setIsCartOpenMobile(false) aman di dua konteks (no-op di dock).
  const handleOpenPayment = () => {
    if (cart.length > 0) {
      setPaidAmount(cartTotal.toString());
      setShowPayment(true);
      setIsCartOpenMobile(false);
    }
  };

  const handleHoldBill = () => {
    Alert.alert('Simpan Transaksi', 'Transaksi akan disimpan sementara (Hold Bill). Lanjutkan?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Simpan', onPress: async () => {
        try {
          await saveOfflineTransaction(
            cart, 
            cartTotal, 
            'hold', 
            0, 
            selectedCustomer, 
            discountVal + voucherDiscountVal, 
            0, // discountPercent
            taxVal, 
            notes || 'HOLD BILL',
            'hold',
            {
              order_type: orderType,
              table_id: selectedTable,
              voucher_id: appliedVoucher?.id || null
            }
          );
          setCart([]);
          setDiscount('');
          setTax('');
          setNotes('');
          setVoucherCode('');
          setAppliedVoucher(null);
          setSelectedCustomer(null);
          setOrderType('dine_in');
          setSelectedTable('');
          setIsCartOpenMobile(false);
          // Replace the old tab if this was a resumed hold, then refresh the badge.
          if (resumedHoldUuid) {
            await deleteHoldTransaction(resumedHoldUuid);
            setResumedHoldUuid(null);
          }
          const holds = await getHoldTransactions();
          setHoldBills(holds);
          Alert.alert('Disimpan', 'Transaksi berhasil di-Hold (Open Bill).');
        } catch (e) {
          Alert.alert('Gagal', 'Tidak bisa menyimpan hold bill: ' + e.message);
        }
      }}
    ]);
  };

  const openHoldBills = async () => {
    try {
      const txs = await getHoldTransactions();
      setHoldBills(txs);
      setShowHoldBillsModal(true);
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat mengambil daftar Hold Bill');
    }
  };

  const resumeHoldBill = async (tx) => {
    try {
      const items = await getTransactionItems(tx.uuid);
      const resumedCart = items.map(item => {
        const mods = item.modifiers ? JSON.parse(item.modifiers) : [];
        const modSegment = mods.length > 0 ? `-${mods.map(m => m.id).join('-')}` : '';
        return {
          ...item,
          cart_id: item.variant_id ? `${item.id}-${item.variant_id}${modSegment}` : `${item.id}${modSegment}`,
          product_id: item.id,
          name: (item.name || 'Produk') + (item.variant_name ? ` - ${item.variant_name}` : ''),
          variant_name: item.variant_name || null,
          price: Number(item.price) || 0,
          modifiers: mods,
          modifier_names: mods.map(m => m.name).join(', '),
          item_notes: item.notes || ''
        };
      });
      setCart(resumedCart);
      setSelectedCustomer(tx.customer_id);
      setDiscount(tx.discount_amount ? String(tx.discount_amount) : '');
      setTax(tx.tax ? String(tx.tax) : '');
      setNotes(tx.notes === 'HOLD BILL' ? '' : (tx.notes || ''));
      setOrderType(tx.order_type || 'dine_in');
      setSelectedTable(tx.table_id || '');

      // Keep the hold row until the bill is actually paid — delete it only on a
      // successful checkout so an abandoned resume doesn't lose the tab.
      setResumedHoldUuid(tx.uuid);

      setShowHoldBillsModal(false);
      setIsCartOpenMobile(true);
      Alert.alert('Sukses', 'Transaksi Hold berhasil dilanjutkan.');
    } catch (e) {
      Alert.alert('Gagal', 'Tidak dapat memuat transaksi Hold.');
    }
  };

  const handleFinalCheckout = async () => {
    if (paymentMethod === 'tempo' && !selectedCustomer) {
      Alert.alert('Pelanggan Wajib Dipilih', 'Pembayaran Tempo (Bon) tidak bisa menggunakan Pelanggan Umum. Silakan pilih pelanggan.');
      return;
    }

    const finalPaid = parseFloat(paidAmount) || 0;
    if (paymentMethod !== 'tempo' && finalPaid < cartTotal) {
      Alert.alert('Uang Kurang', 'Uang dibayar tidak boleh kurang dari total belanja.');
      return;
    }

    try {
      const uuid = await saveOfflineTransaction(
        cart,
        cartTotal,
        paymentMethod,
        finalPaid,
        selectedCustomer,
        discountVal + voucherDiscountVal,
        0, // discountPercent
        taxVal,
        notes,
        'pending_sync',
        {
          order_type: orderType,
          table_id: selectedTable,
          voucher_id: appliedVoucher?.id || null
        }
      );
      
      try {
        await pushOfflineTransactions();
        await drainOutbox();   // ikut setor antrian master-data; skip cepet kalau kosong/offline
      } catch (e) {
        console.log('Background push failed, will sync later.', e);
      }
      
      const customerObj = customers.find(c => c.id === selectedCustomer);
      const customerName = customerObj ? customerObj.name : 'Pelanggan Umum';
      
      const tableObj = tables.find(t => t.id === selectedTable);
      const tableName = tableObj ? tableObj.name : null;
      
      let typeName = 'Dine In';
      if (orderType === 'takeaway') typeName = 'Takeaway';
      if (orderType === 'delivery') typeName = 'Delivery';

        const receipt = {
          cart: [...cart],
          total: cartTotal,
          subtotal: cartSubtotal,
          discount: discountVal,
          voucher: voucherDiscountVal,
          tax: taxVal,
          paid: finalPaid,
          change: Math.max(0, finalPaid - cartTotal),
          paymentMethod,
          invoice: invoiceNumber,
          date: new Date().toLocaleString('id-ID'),
          table: tableName,
          type: typeName,
          customer: customerName,
          cashier: activeShift ? activeShift.cashier_name : 'Kasir',
          store: globalSettings?.store_name || 'POS Kasir'
        };
        setReceiptData(receipt);
        setCart([]);
        setDiscount('');
        setTax('');
        setNotes('');
        setPaidAmount('');
        setVoucherCode('');
        setAppliedVoucher(null);
        setSelectedCustomer(null);
        setSelectedTable('');
        setOrderType('dine_in');
        setShowPayment(false);
        setIsCartOpenMobile(false);
        // A resumed tab is now paid — remove its hold row and refresh the badge.
        if (resumedHoldUuid) {
          await deleteHoldTransaction(resumedHoldUuid);
          setResumedHoldUuid(null);
          const holds = await getHoldTransactions();
          setHoldBills(holds);
        }
        
        // Regenerate invoice for next tx
        setInvoiceNumber('INV-' + new Date().getTime().toString().slice(-6));
        
        // Show receipt instead of basic alert
        setShowReceiptModal(true);

        // Auto-print (opsional): cetak dari `receipt` lokal + snapshot globalSettings,
        // BUKAN dari state async. Non-blocking → alur "Transaksi Berhasil" tetap jalan
        // walau printer error / mati. Cuma jalan kalau kedua toggle nyala.
        const autoOn = (v) => v === '1' || v === 'true' || v === true;
        if (autoOn(globalSettings?.enable_bluetooth_printer) && autoOn(globalSettings?.printer_auto_print)) {
          PrinterService.printReceipt(receipt, globalSettings).catch((e) => {
            Alert.alert('Cetak Otomatis Gagal', e?.message || 'Tidak bisa mencetak struk.');
          });
        }
    } catch (error) {
      Alert.alert('Gagal', 'Gagal menyimpan transaksi: ' + error.message);
    }
  };

  // Cetak struk manual dari tombol "Cetak" di modal struk. Pakai receiptData
  // (state struk yg lagi tampil) + globalSettings. Ada guard `printing` biar
  // ga dobel-cetak, plus pesan error ramah kalau printer bermasalah.
  const handlePrintReceipt = async () => {
    if (!receiptData || printing) return;
    setPrinting(true);
    try {
      await PrinterService.printReceipt(receiptData, globalSettings);
    } catch (e) {
      Alert.alert('Gagal Cetak', e?.message || 'Tidak bisa mencetak struk.');
    } finally {
      setPrinting(false);
    }
  };

  const handleOpenShift = async () => {
    const modal = parseFloat(startingCash) || 0;
    try {
      const shift = await openShift(modal, 'Kasir');
      setActiveShift(shift);
      setStartingCash('');
    } catch (e) {
      Alert.alert('Gagal', 'Tidak bisa membuka shift: ' + e.message);
    }
  };

  const handleStartCloseShift = async () => {
    if (!activeShift) return;
    try {
      const cashSales = await getShiftCashSales(activeShift.opened_at);
      const expected = (Number(activeShift.starting_cash) || 0) + (Number(cashSales) || 0);
      setShiftClosingExpected(expected);
      setShiftClosingCash('');
      setShiftClosingNotes('');
      setShowCloseShiftModal(true);
    } catch (e) {
      Alert.alert('Gagal', 'Tidak bisa menghitung kas shift: ' + e.message);
    }
  };

  const handleConfirmCloseShift = async () => {
    if (!activeShift) return;
    const actual = parseFloat(shiftClosingCash) || 0;
    const selisih = actual - (Number(shiftClosingExpected) || 0);
    try {
      await closeShift(activeShift.uuid, {
        expected: shiftClosingExpected,
        actual,
        selisih,
        notes: shiftClosingNotes,
      });
      setShowCloseShiftModal(false);
      setActiveShift(null);
      Alert.alert('Shift Ditutup', `Selisih kas: Rp ${selisih.toLocaleString('id-ID')}`);
    } catch (e) {
      Alert.alert('Gagal', 'Tidak bisa menutup shift: ' + e.message);
    }
  };

  // Toggle a modifier option: single-choice groups replace, multiple-choice groups add/remove.
  const toggleModifierOption = (mod, opt) => {
    setModifierSelections(prev => {
      const current = prev[mod.id] || [];
      if (mod.type === 'multiple') {
        return current.includes(opt.id)
          ? { ...prev, [mod.id]: current.filter(id => id !== opt.id) }
          : { ...prev, [mod.id]: [...current, opt.id] };
      }
      return { ...prev, [mod.id]: [opt.id] };
    });
  };

  const confirmModifiers = () => {
    if (!selectedProductForModifier) return;
    const { product, variant } = selectedProductForModifier;
    // Enforce required groups.
    for (const mod of (product.modifiers || [])) {
      if (mod.is_required && !(modifierSelections[mod.id] || []).length) {
        Alert.alert('Wajib Dipilih', `Silakan pilih ${mod.name}.`);
        return;
      }
    }
    // Flatten selections into the cart modifier contract: { id, modifier_id, name, price }.
    const built = [];
    (product.modifiers || []).forEach(mod => {
      (modifierSelections[mod.id] || []).forEach(oid => {
        const opt = (mod.options || []).find(o => o.id === oid);
        if (opt) built.push({ id: opt.id, modifier_id: mod.id, name: `${mod.name} - ${opt.name}`, price: opt.price });
      });
    });
    addToCart(product, variant, built, modifierNotes, true);
    setModifierNotes('');
  };

  const handleDeleteHold = (tx) => {
    Alert.alert('Hapus Open Bill', 'Yakin hapus transaksi tertahan ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        await deleteHoldTransaction(tx.uuid);
        const holds = await getHoldTransactions();
        setHoldBills(holds);
      }},
    ]);
  };

  const openScanner = async () => {
    if (!permission) {
      // Permission hook is still loading
      return;
    }
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Izin Ditolak', 'Akses kamera dibutuhkan untuk scan barcode.');
        return;
      }
    }
    setIsProcessingScan(false);
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ type, data }) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);

    const foundProduct = products.find(p => p.barcode === data || p.sku === data);
    
    if (foundProduct) {
      Alert.alert('Ditemukan', `${foundProduct.name} ditambahkan!`, [
        { text: 'OK', onPress: () => {
          addToCart(foundProduct);
          setShowScanner(false);
        }}
      ]);
    } else {
      Alert.alert('Tidak Ditemukan', `Barcode ${data} tidak terdaftar di sistem.`, [
        { text: 'OK', onPress: () => {
          setIsProcessingScan(false);
        }}
      ]);
    }
  };

  const handleApplyVoucher = () => {
    if (!voucherCode) return;
    const v = vouchers.find(x => x.code.toUpperCase() === voucherCode.toUpperCase());
    
    if (v) {
      if (v.min_purchase > 0 && cartSubtotal < v.min_purchase) {
        Alert.alert('Gagal', `Minimal pembelian Rp ${v.min_purchase.toLocaleString('id-ID')} untuk menggunakan voucher ini.`);
        return;
      }
      setAppliedVoucher({
        id: v.id,
        type: v.type,
        amount: v.amount,
        max_discount: v.max_discount
      });
      Alert.alert('Sukses', 'Voucher berhasil digunakan!');
    } else {
      Alert.alert('Gagal', 'Kode voucher tidak valid!');
      setAppliedVoucher(null);
    }
  };

  const occupiedTableIds = holdBills.map(h => h.table_id).filter(Boolean);

  // Filter in-memory (search + kategori) biar ngetik ga pernah nyentuh SQLite.
  // `products` selalu isi katalog penuh (loadLocalData load semua), jadi instan.
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      const matchSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        String(p.sku || '').toLowerCase().includes(q) ||
        String(p.barcode || '').toLowerCase().includes(q);
      const matchCat = activeCategory === 'Semua' ||
        p.category_name === activeCategory || String(p.category_id) === String(activeCategory);
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  // Jumlahin qty keranjang per-produk sekali aja (bukan per-kartu tiap render)
  // buat badge angka di grid.
  const cartQtyByProduct = useMemo(() => {
    const m = new Map();
    cart.forEach(c => m.set(c.product_id, (m.get(c.product_id) || 0) + c.qty));
    return m;
  }, [cart]);

  // Calculate Change
  const finalPaidNum = parseFloat(paidAmount) || 0;
  const change = Math.max(0, finalPaidNum - cartTotal);

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />

      {/* Main Layout */}
      <View className="flex-1 flex-row overflow-hidden bg-slate-50">
        
        {/* Left Panel */}
        <View className="flex-1 flex-col h-full relative z-10">
          
          {/* Header */}
          <View style={{ paddingTop: insets.top + 16, paddingBottom: 16 }} className="bg-white px-4 md:px-6 border-b border-slate-200 flex-row items-center justify-between z-20 shadow-sm">
            <View className="flex-row items-center gap-2 flex-1 mr-3">
              <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} className="w-10 h-10 -ml-1.5 rounded-xl items-center justify-center active:bg-slate-100">
                <Feather name="arrow-left" size={24} color="#0F172A" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold text-slate-900 tracking-tight">Kasir</Text>
                {activeShift && (
                  <TouchableOpacity onPress={handleStartCloseShift} className="flex-row items-center gap-1.5 mt-0.5">
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                    <Text numberOfLines={1} className="text-xs font-medium text-slate-500 flex-shrink">
                      Shift • {activeShift.cashier_name}
                    </Text>
                    <Feather name="log-out" size={11} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <ServerStatusBadge />
              <TouchableOpacity onPress={handleSync} disabled={syncing} className="w-11 h-11 bg-slate-50 rounded-2xl border border-slate-200 items-center justify-center active:bg-slate-200">
                {syncing ? <ActivityIndicator size="small" color="#0F172A" /> : <Feather name="refresh-cw" size={19} color="#334155" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={openHoldBills} className="w-11 h-11 bg-amber-50 rounded-2xl border border-amber-200 items-center justify-center active:bg-amber-100 relative">
                <Feather name="clock" size={19} color="#D97706" />
                {holdBills.length > 0 && (
                  <View className="absolute -top-1.5 -right-1.5 bg-rose-500 min-w-5 h-5 px-1 rounded-full flex items-center justify-center border-2 border-white">
                    <Text className="text-[10px] font-bold text-white">{holdBills.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowScanner(true)} className="w-11 h-11 bg-indigo-50 rounded-2xl border border-indigo-200 items-center justify-center active:bg-indigo-100">
                <Feather name="camera" size={19} color="#4338CA" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View className="bg-white px-4 py-3 border-b border-slate-100 flex-row gap-2 shadow-sm z-10">
            <View className="flex-1 relative justify-center">
              <Feather name="search" size={18} color="#94A3B8" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Cari menu, SKU, atau barcode... (F1)"
                placeholderTextColor="#94A3B8"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-800 shadow-inner"
              />
            </View>
          </View>

          {/* Categories */}
          <View className="bg-white border-b border-slate-100 px-4 py-3 shadow-sm z-10">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {categories.map((cat, idx) => {
                const isActive = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-xl border-2 transition-all flex-row items-center gap-2 ${isActive ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
                  >
                    <Text className={`text-sm font-bold tracking-wide ${isActive ? 'text-white' : 'text-slate-600'}`}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Product Grid — FlatList = virtualized (cuma kartu yang keliatan yang
              di-render), jadi scroll & klik tetep mulus walau katalognya gede. */}
          <FlatList
            key={productColumns}
            data={filteredProducts}
            keyExtractor={(item) => String(item.id)}
            numColumns={productColumns}
            columnWrapperStyle={productColumns > 1 ? { justifyContent: 'space-between' } : undefined}
            contentContainerStyle={{ padding: 16, paddingBottom: 128, flexGrow: 1 }}
            className="flex-1 bg-slate-50/50"
            extraData={cartQtyByProduct}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ProductCard
                item={item}
                onPress={addToCart}
                inCart={cartQtyByProduct.get(item.id) || 0}
                columns={productColumns}
              />
            )}
            ListEmptyComponent={
              loading ? (
                <View className="flex-1 items-center justify-center py-20">
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text className="text-slate-500 mt-4 font-medium">Memuat produk...</Text>
                </View>
              ) : (
                <View className="flex-1 items-center justify-center py-20 opacity-60">
                  <View className="w-24 h-24 bg-slate-200 rounded-full items-center justify-center mb-6">
                    <Feather name="package" size={40} color="#94A3B8" />
                  </View>
                  <Text className="text-xl font-bold text-slate-700">Produk Tidak Ditemukan</Text>
                  <Text className="text-slate-500 text-center mt-2">Coba kata kunci lain atau pilih kategori yang berbeda.</Text>
                </View>
              )
            }
          />

        </View>

        {/* Floating Cart Button — hanya di layout 1-panel (HP). Di tablet 2-panel
            keranjang selalu tampil di dock kanan, jadi bar ini disembunyikan. */}
        {cart.length > 0 && !isCartOpenMobile && !showTwoPane && (
          <Animated.View style={{ transform: [{ translateY: cartBarAnim }] }} className="absolute bottom-6 left-4 right-4 z-40">
            <TouchableOpacity onPress={() => setIsCartOpenMobile(true)} className="bg-slate-900 rounded-2xl shadow-2xl p-4 flex-row justify-between items-center border border-slate-700">
              <View className="flex-row items-center gap-4">
                <View className="relative">
                  <View className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-inner">
                    <Feather name="shopping-cart" size={24} color="#fff" />
                  </View>
                  <View className="absolute -top-2 -right-2 bg-rose-500 min-w-[24px] h-6 rounded-full flex items-center justify-center border-2 border-slate-900 px-1">
                    <Text className="text-xs font-bold text-white">{cartCount}</Text>
                  </View>
                </View>
                <View>
                  <Text className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-0.5">Total Belanja</Text>
                  <Text className="text-white font-bold text-lg font-mono">Rp {cartTotal.toLocaleString('id-ID')}</Text>
                </View>
              </View>
              <View className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/10">
                <Text className="text-white text-sm font-bold tracking-wide">Lihat</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Cart Panel Overlay (HP / 1-panel) — di tablet 2-panel modal ini
            di-nonaktifkan (visible false) karena keranjang tampil di dock kanan. */}
        <Modal visible={isCartOpenMobile && !showTwoPane} animationType="slide" transparent={true} onRequestClose={() => setIsCartOpenMobile(false)}>
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white h-[90%] rounded-t-3xl shadow-2xl flex-col overflow-hidden">
              <CartPanel
                invoiceNumber={invoiceNumber}
                cartCount={cartCount}
                cart={cart}
                customers={customers}
                selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
                orderType={orderType} setOrderType={setOrderType}
                selectedTable={selectedTable} setSelectedTable={setSelectedTable}
                tables={tables} occupiedTableIds={occupiedTableIds}
                discount={discount} setDiscount={setDiscount}
                tax={tax} setTax={setTax}
                cartSubtotal={cartSubtotal} cartTotal={cartTotal}
                onIncrease={increaseQty} onDecrease={decreaseQty}
                onRemove={removeItem} onUpdateNotes={updateItemNotes}
                onClearCart={() => setCart([])}
                onHold={handleHoldBill} onPay={handleOpenPayment}
                onClose={() => setIsCartOpenMobile(false)}
              />
            </View>
          </View>
        </Modal>

        {/* Sidebar Cart (2-panel) — keranjang nempel kanan yang selalu tampil di
            tablet landscape. Panel kiri grid = flex-1 (mengisi sisa ruang). */}
        {showTwoPane && (
          <View
            style={{ width: cartPanelWidth, paddingTop: insets.top, paddingRight: insets.right }}
            className="bg-white border-l border-slate-200 flex-col z-20 shadow-sm"
          >
            <CartPanel
              invoiceNumber={invoiceNumber}
              cartCount={cartCount}
              cart={cart}
              customers={customers}
              selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
              orderType={orderType} setOrderType={setOrderType}
              selectedTable={selectedTable} setSelectedTable={setSelectedTable}
              tables={tables} occupiedTableIds={occupiedTableIds}
              discount={discount} setDiscount={setDiscount}
              tax={tax} setTax={setTax}
              cartSubtotal={cartSubtotal} cartTotal={cartTotal}
              onIncrease={increaseQty} onDecrease={decreaseQty}
              onRemove={removeItem} onUpdateNotes={updateItemNotes}
              onClearCart={() => setCart([])}
              onHold={handleHoldBill} onPay={handleOpenPayment}
              bottomInset={insets.bottom}
            />
          </View>
        )}
      </View>

      {/* ALL MODALS (Variant, Modifier, Payment, Receipt, Shift, HoldBills) GO HERE */}
      {/* Shift Modal */}
      {!activeShift && !loading && (
        <View className="absolute inset-0 bg-slate-900/80 z-50 items-center justify-center px-4">
           <View className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
              <View className="bg-blue-50 px-6 pt-8 pb-6 border-b border-slate-100 items-center">
                 <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                    <Feather name="lock" size={32} color="#2563EB" />
                 </View>
                 <Text className="text-2xl font-bold text-slate-800 text-center">Akses POS Terkunci</Text>
                 <Text className="text-slate-500 text-sm text-center mt-2 leading-relaxed">Anda belum membuka shift kasir. Silakan masukkan modal awal laci uang.</Text>
              </View>
              <View className="p-6">
                 <Text className="text-sm font-semibold text-slate-700 mb-2">Uang Fisik Modal Laci (Rp)</Text>
                 <TextInput placeholderTextColor="#94A3B8" value={startingCash} onChangeText={setStartingCash} keyboardType="numeric" placeholder="Contoh: 500000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:border-blue-500 mb-4" />
                 <TouchableOpacity onPress={handleOpenShift} className="w-full py-3.5 bg-blue-600 rounded-xl flex-row justify-center items-center gap-2">
                    <Text className="text-white font-bold">Buka Shift Kasir</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      )}

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-center px-4">
          <View className="bg-white rounded-2xl w-full max-w-md mx-auto overflow-hidden shadow-2xl">
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50/50">
              <Text className="text-lg font-bold text-slate-900">Pembayaran</Text>
              <TouchableOpacity onPress={() => setShowPayment(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <View className="p-6">
              <View className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4 items-center">
                <Text className="text-sm text-slate-500 font-medium">Total Pembayaran</Text>
                <Text className="text-3xl font-bold text-blue-600 font-mono mt-1">Rp {cartTotal.toLocaleString('id-ID')}</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Metode Pembayaran</Text>
              <View className="flex-row gap-2 mb-4">
                {['cash', 'qris', 'transfer'].map(m => (
                  <TouchableOpacity key={m} onPress={()=>setPaymentMethod(m)} className={`flex-1 p-3 rounded-xl border-2 items-center ${paymentMethod === m ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                    <Text className={`text-sm font-semibold capitalize ${paymentMethod === m ? 'text-blue-600' : 'text-slate-600'}`}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Jumlah Bayar</Text>
              <TextInput value={paidAmount} onChangeText={setPaidAmount} keyboardType="numeric" className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-bold text-center font-mono focus:border-blue-400 mb-4" />
              {Number(paidAmount) >= cartTotal && paymentMethod === 'cash' && (
                <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex-row justify-between items-center mb-4">
                  <Text className="text-sm font-semibold text-emerald-700">Kembalian</Text>
                  <Text className="text-xl font-bold text-emerald-600 font-mono">Rp {(Number(paidAmount) - cartTotal).toLocaleString('id-ID')}</Text>
                </View>
              )}
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setShowPayment(false)} className="flex-1 py-3 border border-slate-200 rounded-xl items-center"><Text className="font-semibold text-slate-600">Batal</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleFinalCheckout} className="flex-1 py-3 bg-blue-600 rounded-xl items-center flex-row justify-center gap-2"><Feather name="check-circle" size={16} color="#fff" /><Text className="font-bold text-white">Proses</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={!!receiptData} transparent animationType="fade" onRequestClose={() => setReceiptData(null)}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex-col max-h-[90%]">
            <View className="p-5 border-b border-slate-100 items-center">
              <View className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              </View>
              <Text className="text-lg font-bold text-slate-900">Transaksi Berhasil!</Text>
            </View>

            <ScrollView className="px-4 py-4" contentContainerStyle={{ paddingBottom: 20 }}>
               {receiptData && (
                 <View className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                   <Text className="text-center font-bold text-lg mb-1 text-slate-800">{receiptData.store}</Text>
                   <Text className="text-center text-xs text-slate-500 mb-4">{receiptData.date}</Text>
                   
                   <View className="border-b border-dashed border-slate-300 pb-3 mb-3">
                     {receiptData.cart.map((item, idx) => (
                       <View key={idx} className="flex-row justify-between mb-2">
                         <View className="flex-1 pr-2">
                           <Text className="text-sm font-semibold text-slate-700">{item.name}</Text>
                           <Text className="text-xs text-slate-500">{item.qty} x Rp {(Number(item.price)||0).toLocaleString('id-ID')}</Text>
                         </View>
                         <Text className="text-sm font-bold text-slate-800 font-mono">Rp {(item.qty * (Number(item.price)||0)).toLocaleString('id-ID')}</Text>
                       </View>
                     ))}
                   </View>

                   <View className="space-y-2">
                     <View className="flex-row justify-between">
                       <Text className="text-xs text-slate-500">Subtotal</Text>
                       <Text className="text-xs font-semibold text-slate-700 font-mono">Rp {(Number(receiptData.subtotal)||0).toLocaleString('id-ID')}</Text>
                     </View>
                     {receiptData.discount > 0 && (
                       <View className="flex-row justify-between">
                         <Text className="text-xs text-rose-500">Diskon</Text>
                         <Text className="text-xs font-semibold text-rose-500 font-mono">-Rp {(Number(receiptData.discount)||0).toLocaleString('id-ID')}</Text>
                       </View>
                     )}
                     {receiptData.tax > 0 && (
                       <View className="flex-row justify-between">
                         <Text className="text-xs text-slate-500">Pajak</Text>
                         <Text className="text-xs font-semibold text-slate-700 font-mono">Rp {(Number(receiptData.tax)||0).toLocaleString('id-ID')}</Text>
                       </View>
                     )}
                     <View className="flex-row justify-between pt-2 border-t border-slate-200 mt-2">
                       <Text className="text-sm font-bold text-slate-800">Total</Text>
                       <Text className="text-sm font-bold text-blue-600 font-mono">Rp {(Number(receiptData.total)||0).toLocaleString('id-ID')}</Text>
                     </View>
                     
                     <View className="flex-row justify-between pt-2">
                       <Text className="text-xs text-slate-500">Bayar ({receiptData.paymentMethod})</Text>
                       <Text className="text-xs font-semibold text-slate-700 font-mono">Rp {(Number(receiptData.paid)||0).toLocaleString('id-ID')}</Text>
                     </View>
                     <View className="flex-row justify-between">
                       <Text className="text-xs text-slate-500">Kembalian</Text>
                       <Text className="text-xs font-semibold text-slate-700 font-mono">Rp {(Number(receiptData.change)||0).toLocaleString('id-ID')}</Text>
                     </View>
                   </View>

                   <View className="mt-4 pt-4 border-t border-dashed border-slate-300">
                     <Text className="text-center text-[10px] text-slate-400">Kasir: {receiptData.cashier}</Text>
                     <Text className="text-center text-[10px] text-slate-400">Pelanggan: {receiptData.customer}</Text>
                     <Text className="text-center text-[10px] text-slate-400">Tipe: {receiptData.type} {receiptData.table ? '('+receiptData.table+')' : ''}</Text>
                   </View>
                 </View>
               )}
            </ScrollView>

            <View className="p-4 border-t border-slate-100 flex-row gap-3 bg-white">
               <TouchableOpacity 
                 onPress={() => {
                   setReceiptData(null);
                   setShowPayment(false);
                 }}
                 className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center bg-slate-50"
               >
                 <Text className="font-bold text-slate-600">Tutup</Text>
               </TouchableOpacity>
               <TouchableOpacity
                 onPress={handlePrintReceipt}
                 disabled={printing}
                 className="flex-1 py-3.5 rounded-xl bg-blue-600 items-center flex-row justify-center gap-2"
                 style={printing ? { opacity: 0.6 } : null}
               >
                 {printing ? (
                   <ActivityIndicator size="small" color="white" />
                 ) : (
                   <Ionicons name="print" size={18} color="white" />
                 )}
                 <Text className="font-bold text-white">{printing ? 'Mencetak...' : 'Cetak'}</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Variant Modal */}
      <Modal visible={showVariantModal} transparent animationType="slide" onRequestClose={() => { setShowVariantModal(false); setSelectedProductForVariant(null); }}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="px-6 py-5 border-b border-slate-100 flex-row justify-between items-center">
              <View className="flex-1 pr-2">
                <Text className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pilih Varian</Text>
                <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>{selectedProductForVariant?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowVariantModal(false); setSelectedProductForVariant(null); }} className="p-2 bg-slate-100 rounded-xl">
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-4 py-4" contentContainerStyle={{ paddingBottom: 24 }}>
              <View className="flex-row flex-wrap justify-between">
                {(selectedProductForVariant?.variants || []).map(v => {
                  const out = v.is_unlimited !== 1 && (Number(v.stock) || 0) <= 0;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      disabled={out}
                      onPress={() => addToCart(selectedProductForVariant, v)}
                      className={`w-[48%] mb-3 p-4 rounded-2xl border-2 ${out ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200 bg-white'}`}
                    >
                      <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{v.name}</Text>
                      <Text className="text-blue-600 font-bold mt-1">Rp {(Number(v.price) || 0).toLocaleString('id-ID')}</Text>
                      {v.is_unlimited === 1 ? (
                        <Text className="text-xs font-bold text-emerald-500 mt-1">Tak Terbatas</Text>
                      ) : (
                        <Text className={`text-xs font-medium mt-1 ${out ? 'text-rose-500' : 'text-slate-500'}`}>Stok: {Number(v.stock) || 0}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modifier Modal */}
      <Modal visible={!!selectedProductForModifier} transparent animationType="slide" onRequestClose={() => { setSelectedProductForModifier(null); setModifierSelections({}); setModifierNotes(''); }}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] flex-col">
            <View className="px-6 py-5 border-b border-slate-100 flex-row justify-between items-center">
              <View className="flex-1 pr-2">
                <Text className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tambahan / Opsi</Text>
                <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
                  {selectedProductForModifier?.product?.name}{selectedProductForModifier?.variant ? ` - ${selectedProductForModifier.variant.name}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedProductForModifier(null); setModifierSelections({}); setModifierNotes(''); }} className="p-2 bg-slate-100 rounded-xl">
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-5 py-4">
              {(selectedProductForModifier?.product?.modifiers || []).map(mod => (
                <View key={mod.id} className="mb-5">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-sm font-bold text-slate-800">{mod.name}</Text>
                    {mod.is_required ? (
                      <View className="bg-rose-100 px-2 py-0.5 rounded-full"><Text className="text-[10px] font-bold text-rose-600">Wajib</Text></View>
                    ) : (
                      <Text className="text-[10px] text-slate-400">{mod.type === 'multiple' ? 'Pilih beberapa' : 'Pilih satu'}</Text>
                    )}
                  </View>
                  {(mod.options || []).map(opt => {
                    const selected = (modifierSelections[mod.id] || []).includes(opt.id);
                    return (
                      <TouchableOpacity key={opt.id} onPress={() => toggleModifierOption(mod, opt)} className={`flex-row items-center justify-between p-3 rounded-xl border mb-2 ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                        <View className="flex-row items-center gap-2">
                          <View className={`w-5 h-5 ${mod.type === 'multiple' ? 'rounded-md' : 'rounded-full'} border-2 items-center justify-center ${selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                            {selected && <Feather name="check" size={12} color="#fff" />}
                          </View>
                          <Text className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{opt.name}</Text>
                        </View>
                        {Number(opt.price) > 0 && <Text className="text-xs font-semibold text-slate-500 font-mono">+Rp {(Number(opt.price) || 0).toLocaleString('id-ID')}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Catatan Item</Text>
                <TextInput placeholderTextColor="#94A3B8" value={modifierNotes} onChangeText={setModifierNotes} placeholder="cth: tanpa gula, extra pedas..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
              </View>
            </ScrollView>
            <View className="p-4 border-t border-slate-100">
              <TouchableOpacity onPress={confirmModifiers} className="w-full py-3.5 bg-blue-600 rounded-xl items-center flex-row justify-center gap-2">
                <Feather name="plus" size={16} color="#fff" />
                <Text className="text-white font-bold">Tambah ke Keranjang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hold Bills Modal */}
      <Modal visible={showHoldBillsModal} transparent animationType="slide" onRequestClose={() => setShowHoldBillsModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%] flex-col">
            <View className="px-6 py-5 border-b border-slate-100 flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <Feather name="clock" size={18} color="#D97706" />
                <Text className="text-lg font-bold text-slate-900">Open Bill / Tertahan</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHoldBillsModal(false)} className="p-2 bg-slate-100 rounded-xl">
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView className="px-4 py-3" contentContainerStyle={{ paddingBottom: 24 }}>
              {holdBills.length === 0 ? (
                <View className="items-center justify-center py-16 opacity-60">
                  <Feather name="inbox" size={48} color="#CBD5E1" />
                  <Text className="text-slate-400 mt-3 font-semibold">Tidak ada bill tertahan</Text>
                </View>
              ) : holdBills.map(tx => {
                const tbl = tables.find(t => t.id === tx.table_id);
                return (
                  <View key={tx.uuid} className="flex-row items-center gap-2 mb-2">
                    <TouchableOpacity onPress={() => resumeHoldBill(tx)} className="flex-1 p-4 rounded-2xl border border-slate-200 bg-white">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-bold text-slate-900">
                            {tx.order_type === 'takeaway' ? 'Takeaway' : (tbl ? `Meja ${tbl.name}` : 'Dine In')}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-0.5">{tx.notes && tx.notes !== 'HOLD BILL' ? tx.notes : new Date(tx.created_at).toLocaleString('id-ID')}</Text>
                        </View>
                        <Text className="text-sm font-bold text-blue-600 font-mono">Rp {(Number(tx.total_amount) || 0).toLocaleString('id-ID')}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteHold(tx)} className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                      <Feather name="trash-2" size={16} color="#E11D48" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Close Shift Modal */}
      <Modal visible={showCloseShiftModal} transparent animationType="fade" onRequestClose={() => setShowCloseShiftModal(false)}>
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-2xl w-full max-w-md mx-auto overflow-hidden">
            <View className="px-6 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50/50">
              <Text className="text-lg font-bold text-slate-900">Tutup Shift Kasir</Text>
              <TouchableOpacity onPress={() => setShowCloseShiftModal(false)}><Feather name="x" size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <ScrollView className="p-6" contentContainerStyle={{ paddingBottom: 8 }}>
              <View className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-slate-500">Modal Awal</Text>
                  <Text className="text-sm font-semibold text-slate-700 font-mono">Rp {(Number(activeShift?.starting_cash) || 0).toLocaleString('id-ID')}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-500">Kas Diharapkan (Sistem)</Text>
                  <Text className="text-sm font-bold text-slate-900 font-mono">Rp {(Number(shiftClosingExpected) || 0).toLocaleString('id-ID')}</Text>
                </View>
              </View>
              <Text className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Kas Fisik Akhir (Rp)</Text>
              <TextInput placeholderTextColor="#94A3B8" value={shiftClosingCash} onChangeText={setShiftClosingCash} keyboardType="numeric" placeholder="Hitung uang di laci..." className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-bold text-center font-mono mb-3" />
              {shiftClosingCash !== '' && (
                <View className={`rounded-xl p-3 flex-row justify-between items-center mb-3 ${((parseFloat(shiftClosingCash) || 0) - (Number(shiftClosingExpected) || 0)) === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                  <Text className="text-sm font-semibold text-slate-600">Selisih</Text>
                  <Text className={`text-lg font-bold font-mono ${((parseFloat(shiftClosingCash) || 0) - (Number(shiftClosingExpected) || 0)) === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Rp {((parseFloat(shiftClosingCash) || 0) - (Number(shiftClosingExpected) || 0)).toLocaleString('id-ID')}
                  </Text>
                </View>
              )}
              <Text className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Catatan (opsional)</Text>
              <TextInput placeholderTextColor="#94A3B8" value={shiftClosingNotes} onChangeText={setShiftClosingNotes} placeholder="cth: selisih karena..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-4" />
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setShowCloseShiftModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl items-center"><Text className="font-semibold text-slate-600">Batal</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmCloseShift} className="flex-1 py-3 bg-rose-600 rounded-xl items-center flex-row justify-center gap-2"><Feather name="log-out" size={16} color="#fff" /><Text className="font-bold text-white">Tutup Shift</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );

}






