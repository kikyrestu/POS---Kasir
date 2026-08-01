import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import {
    Search, ShoppingCart, Plus, Minus, Trash2, X, User, CreditCard,
    Banknote, Receipt as ReceiptIcon, Package, Grid3X3, ChevronDown, AlertCircle, CheckCircle2, ArrowLeft, Printer, Lock, Tags
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/Utils/format';
import ReceiptComponent from '@/Components/Receipt';
import DynamicIcon from '@/Components/DynamicIcon';
import { useBluetoothPrinter } from '@/Hooks/useBluetoothPrinter';
import { ESCPOSEncoder } from '@/Utils/escpos';

export default function PosIndex({ customers, categories, warehouses, tables, defaultWarehouseId, invoiceNumber, initialActiveShift, globalTaxValue, paymentMethods }) {
    const { auth, global_settings } = usePage().props;
    const initialTax = globalTaxValue !== undefined ? parseFloat(globalTaxValue) : (parseFloat(global_settings?.global_tax_value) || 0);
    const bluetoothPrinter = useBluetoothPrinter();

    // Shift Logic States
    const [activeShift, setActiveShift] = useState(initialActiveShift);
    const [shiftStartingCash, setShiftStartingCash] = useState('');
    const [shiftProcessing, setShiftProcessing] = useState(false);
    const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
    const [shiftClosingExpected, setShiftClosingExpected] = useState(0);
    const [shiftClosingCash, setShiftClosingCash] = useState('');
    const [shiftClosingNotes, setShiftClosingNotes] = useState('');
    
    // State
    const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cart, setCart] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(defaultWarehouseId);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentType, setPaymentType] = useState('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(initialTax);
    const [notes, setNotes] = useState('');
    const [orderType, setOrderType] = useState('dine_in');
    const [selectedTable, setSelectedTable] = useState(null);
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // F&B States
    const [selectedProductForModifier, setSelectedProductForModifier] = useState(null);
    const [modifierSelections, setModifierSelections] = useState({});
    const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
    const [productNotes, setProductNotes] = useState('');
    const [receipt, setReceipt] = useState(null);
    const [receiptMeta, setReceiptMeta] = useState({ store: {}, cashier: '' });
    const receiptRef = useRef(null);

    const searchRef = useRef(null);
    const searchTimeout = useRef(null);

    // Calculations
    const discountFormat = global_settings?.discount_format || 'amount';
    const taxFormat = global_settings?.tax_format || 'amount';

    const subtotal = cart.reduce((sum, i) => sum + (i.unit_price * i.quantity) - i.discount, 0);
    const manualDiscountAmount = discountFormat === 'percent' ? subtotal * (discount / 100) : discount;
    const voucherDiscountAmount = appliedVoucher 
        ? (appliedVoucher.type === 'percent' ? subtotal * (appliedVoucher.amount / 100) : parseFloat(appliedVoucher.amount)) 
        : 0;
    
    const totalDiscountAmount = manualDiscountAmount + voucherDiscountAmount;
    
    const taxableAmount = Math.max(0, subtotal - totalDiscountAmount);
    const totalTax = taxFormat === 'percent' ? taxableAmount * (tax / 100) : tax;
    
    const grandTotal = taxableAmount + totalTax;
    const paid = parseFloat(paidAmount) || 0;
    const change = Math.max(0, paid - grandTotal);

    // Focus search on mount & keyboard shortcuts
    useEffect(() => { 
        searchRef.current?.focus(); 
        
        const handleKeyDown = (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'F8' || e.key === 'F2') {
                e.preventDefault();
                if (cart.length > 0 && !showPayment) {
                    setPaidAmount(grandTotal.toString());
                    setShowPayment(true);
                }
            }
            if (e.key === 'F4') {
                e.preventDefault();
                handleHold();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart.length, grandTotal, showPayment]);

    const handleHold = () => {
        if (cart.length > 0) {
            const ref = prompt("Masukkan referensi Hold (cth: Nama/Antrian/Meja):") || 'Hold-' + Date.now();
            const body = JSON.stringify({
                reference_number: ref,
                customer_name: customers.find(c => c.id === selectedCustomer)?.name || 'Umum',
                cart_data: cart.map(i => ({...i})),
                subtotal: grandTotal
            });
            
            fetch(route('pos.held.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body
            }).then(r => r.json()).then(data => {
                if (data.success) {
                    showNotification('Transaksi disimpan sementara (Open Bill)!');
                    setCart([]);
                    setDiscount(0);
                    setTax(0);
                    setSelectedCustomer(null);
                }
            }).catch(() => showNotification('Gagal hold transaksi!', 'error'));
        }
    };

    // Search products
    const searchProducts = useCallback((query, categoryId) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (categoryId) params.append('category_id', categoryId);

        fetch(`/api/products/search?${params.toString()}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then(r => r.json())
            .then(data => { setProducts(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Initial load
    useEffect(() => { searchProducts('', null); }, [searchProducts]);

    // Handle search input with debounce
    const handleSearch = (val) => {
        setSearch(val);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            searchProducts(val, selectedCategory);
        }, 300);
    };

    // Handle category filter
    const handleCategory = (catId) => {
        const newCat = catId === selectedCategory ? null : catId;
        setSelectedCategory(newCat);
        searchProducts(search, newCat);
    };

    // Cart helpers
    // Auto-print receipt
    const executeBluetoothPrint = async (receiptData) => {
        try {
            if (!bluetoothPrinter.isConnected) {
                await bluetoothPrinter.connect();
            }
            
            const encoder = new ESCPOSEncoder();
            encoder.initialize();
            
            const storeName = global_settings?.store_name || 'BuildyPOS';
            encoder.align(1).bold(1).line(storeName).bold(0);
            if (global_settings?.store_address) encoder.line(global_settings.store_address);
            if (global_settings?.store_phone) encoder.line('Telp: ' + global_settings.store_phone);
            encoder.newline().align(0);
            
            encoder.separator();
            encoder.row('No', receiptData.invoice_number);
            encoder.row('Tgl', new Date().toLocaleDateString('id-ID'));
            encoder.row('Kasir', auth.user?.name || '-');
            encoder.separator();
            
            if (receiptData.details) {
                receiptData.details.forEach(item => {
                    encoder.line(item.product?.name || 'Item');
                    const qtyPrice = `${item.quantity}x ${formatCurrency(item.unit_price)}`;
                    const subtotal = formatCurrency(item.subtotal);
                    encoder.row(qtyPrice, subtotal);
                });
            }
            
            encoder.separator();
            encoder.row('Total', formatCurrency(receiptData.grand_total));
            encoder.row('Dibayar', formatCurrency(receiptData.paid));
            if (receiptData.paid > receiptData.grand_total && receiptData.payment_type !== 'tempo') {
                encoder.row('Kembalian', formatCurrency(receiptData.paid - receiptData.grand_total));
            }
            
            encoder.newline(2);
            encoder.align(1).line(global_settings?.receipt_footer || 'Terima kasih atas kunjungan Anda!');
            encoder.newline(3).cut();
            
            await bluetoothPrinter.print(encoder.build());
            showNotification('Berhasil mencetak ke printer bluetooth');
        } catch (error) {
            console.error(error);
            showNotification('Gagal connect ke printer bluetooth', 'error');
        }
    };

    useEffect(() => {
        if (receipt && global_settings?.printer_auto_print === '1') {
            setTimeout(() => {
                if (global_settings?.enable_bluetooth_printer === '1') {
                    executeBluetoothPrint(receipt);
                } else {
                    const content = receiptRef.current;
                    if (!content) return;
                    const printWindow = window.open('', '_blank', 'width=400,height=600');
                    if (printWindow) {
                        printWindow.document.write(`<html><head><title>Struk ${receipt.invoice_number}</title><style>@page{margin:0;size:80mm auto}body{margin:0;padding:0}@media print{body{width:80mm}}</style></head><body>${content.outerHTML}</body></html>`);
                        printWindow.document.close();
                        printWindow.focus();
                        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
                    }
                }
            }, 500); // Wait for rendering
        }
    }, [receipt, global_settings?.printer_auto_print, global_settings?.enable_bluetooth_printer]);

    const addToCart = (product, variant = null, modifiers = [], notes = '') => {
        if (product.has_variants && product.variants?.length > 0 && !variant) {
            setSelectedProductForVariant(product);
            return;
        }

        const stock = variant ? getProductVariantStock(variant) : getProductStock(product);
        
        if (product.modifiers && product.modifiers.length > 0 && modifiers.length === 0) {
            setSelectedProductForModifier({ product, variant });
            setModifierSelections({});
            setProductNotes('');
            return;
        }

        // For products with modifiers/variants, we don't merge them unless they are exactly the same
        const existingIndex = cart.findIndex(item => 
            item.product_id === product.id && 
            item.product_variant_id === (variant ? variant.id : null) &&
            JSON.stringify(item.modifiers) === JSON.stringify(modifiers) &&
            item.notes === notes
        );
        
        const currentQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;

        if (currentQty >= stock) {
            showNotification('Stok tidak mencukupi!', 'error');
            return;
        }

        if (existingIndex >= 0) {
            const newCart = [...cart];
            newCart[existingIndex].quantity += 1;
            setCart(newCart);
        } else {
            // calculate additional price from modifiers
            const modifierPrice = modifiers.reduce((sum, mod) => sum + (parseFloat(mod.price) || 0), 0);
            
            setCart([...cart, {
                cart_id: Math.random().toString(36).substr(2, 9),
                product_id: product.id,
                product_variant_id: variant ? variant.id : null,
                name: product.name + (variant ? ` - ${variant.name}` : ''),
                barcode: variant?.sku || product.barcode,
                unit_price: (variant && variant.price ? parseFloat(variant.price) : parseFloat(product.selling_price)) + modifierPrice,
                base_price: variant && variant.price ? variant.price : product.selling_price,
                cost_price: product.cost_price,
                quantity: 1,
                discount: 0,
                unit: product.unit,
                image: product.image,
                max_stock: stock,
                modifiers: modifiers,
                notes: notes
            }]);
        }
        
        setSelectedProductForModifier(null);
        setSelectedProductForVariant(null);
    };

    const updateQuantity = (cartId, qty) => {
        if (qty <= 0) {
            removeFromCart(cartId);
            return;
        }
        const item = cart.find(i => i.cart_id === cartId);
        if (qty > item.max_stock) {
            showNotification('Stok tidak mencukupi!', 'error');
            return;
        }
        setCart(cart.map(i => i.cart_id === cartId ? { ...i, quantity: qty } : i));
    };

    const removeFromCart = (cartId) => {
        setCart(cart.filter(i => i.cart_id !== cartId));
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(0);
        setTax(initialTax);
        setNotes('');
        setSelectedCustomer(null);
        setAppliedVoucher(null);
        setVoucherCode('');
        setVoucherError('');
    };

    const getProductStock = (product) => {
        if (!product.stocks) return 0;
        const whStock = product.stocks.find(s => s.warehouse_id === selectedWarehouse && !s.product_variant_id);
        return whStock ? whStock.quantity : 0;
    };

    const getProductVariantStock = (variant) => {
        if (!variant || !variant.stocks) return 0;
        const whStock = variant.stocks.find(s => s.warehouse_id === selectedWarehouse);
        return whStock ? whStock.quantity : 0;
    };

    const showNotification = (message, type = 'success') => {
        if (type === 'error') {
            toast.error(message);
        } else {
            toast.success(message);
        }
    };

    // Payment
    const processPayment = () => {
        if (cart.length === 0) return;
        if (paymentType !== 'tempo' && paid < grandTotal) {
            showNotification('Pembayaran kurang!', 'error');
            return;
        }

        setProcessing(true);
        fetch(route('pos.store'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                customer_id: selectedCustomer,
                warehouse_id: selectedWarehouse,
                voucher_id: appliedVoucher ? appliedVoucher.id : null,
                payment_type: paymentType,
                paid: paid,
                // the backend expects numeric values, so we compute the total discount as amount, 
                // and pass discount_percent as 0 to force backend to use discount_amount
                discount_amount: totalDiscountAmount,
                discount_percent: 0, 
                tax: totalTax,
                notes: notes,
                order_type: orderType,
                table_id: selectedTable,
                items: cart.map(i => ({
                    product_id: i.product_id,
                    product_variant_id: i.product_variant_id || null,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    discount: i.discount,
                    modifiers: i.modifiers || [],
                    notes: i.notes || '',
                })),
            }),
        })
            .then(r => r.json())
            .then(data => {
                setProcessing(false);
                if (data.success) {
                    setReceipt(data.sale);
                    setReceiptMeta({ store: data.store || {}, cashier: data.cashier || '' });
                    setShowPayment(false);
                    showNotification('Transaksi berhasil!');
                }
            })
            .catch(() => {
                setProcessing(false);
                showNotification('Gagal memproses transaksi!', 'error');
            });
    };

    const newTransaction = () => {
        setReceipt(null);
        clearCart();
        setPaidAmount('');
        searchProducts('', null);
        setIsCartOpenMobile(false);
        router.reload({ only: ['invoiceNumber'] });
    };

    const handleApplyVoucher = () => {
        if (!voucherCode) return;
        setVoucherError('');
        
        axios.post(route('vouchers.validate'), { code: voucherCode, subtotal })
            .then(res => {
                if (res.data.success) {
                    setAppliedVoucher(res.data.voucher);
                    toast.success('Voucher berhasil digunakan!');
                }
            })
            .catch(err => {
                setVoucherError(err.response?.data?.message || 'Gagal validasi voucher');
                setAppliedVoucher(null);
            });
    };

    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        setVoucherCode('');
        setVoucherError('');
    };

    // Quick cash amounts
    const quickCash = [grandTotal, ...([50000, 100000, 200000, 500000].filter(v => v >= grandTotal))].slice(0, 4);

    return (
        <>
            <Head title="POS Kasir" />

            {/* Notification */}
            <Toaster richColors position="top-right" />

            <div className="h-screen flex bg-slate-50/80 relative overflow-hidden">
                {/* LEFT - Product Panel */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Header Layout Baru */}
                    <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200/60 p-3 lg:px-5 lg:py-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2 lg:gap-4">
                            {/* Judul & Tombol Kembali */}
                            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                                <Link href={route('dashboard')} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center shrink-0 transition-colors" title="Kembali ke Dashboard">
                                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                                </Link>
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg hidden sm:flex items-center justify-center shrink-0">
                                    <ReceiptIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="text-base lg:text-lg font-bold text-slate-900 leading-none">{global_settings?.store_name || 'POS Kasir'}</h1>
                                        {activeShift && (
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const res = await axios.get(route('shifts.closing-data'));
                                                        setShiftClosingExpected(res.data.expected_cash);
                                                        setShiftClosingCash(res.data.expected_cash); // pre-fill
                                                        setShowCloseShiftModal(true);
                                                    } catch (err) {
                                                        alert('Gagal mengambil data shift.');
                                                    }
                                                }}
                                                className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] uppercase font-bold rounded hover:bg-rose-100 transition-colors shrink-0"
                                            >Tutup Shift</button>
                                        )}
                                    </div>
                                    <p className="text-[10px] lg:text-xs text-slate-400 font-mono mt-0.5 leading-none">{invoiceNumber}</p>
                                </div>
                            </div>

                            {/* Desktop Search (Sembunyi di Mobile) */}
                            <div className="hidden lg:block flex-1 max-w-lg relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Cari produk atau scan barcode..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Bluetooth Printer Connection */}
                            {global_settings?.enable_bluetooth_printer === '1' && (
                                <button
                                    onClick={async () => {
                                        if (bluetoothPrinter.isConnected) {
                                            bluetoothPrinter.disconnect();
                                        } else {
                                            try {
                                                await bluetoothPrinter.connect();
                                                toast.success('Printer berhasil terhubung!');
                                            } catch(err) {
                                                toast.error('Gagal menghubungkan printer: ' + err.message);
                                            }
                                        }
                                    }}
                                    className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                        bluetoothPrinter.isConnected 
                                        ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }`}
                                >
                                    <Printer className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        {bluetoothPrinter.isConnected ? 'Printer Terhubung' : 'Koneksikan Printer'}
                                    </span>
                                </button>
                            )}

                            {/* Warehouse selector */}
                            <div className="relative shrink-0">
                                <select
                                    value={selectedWarehouse || ''}
                                    onChange={e => setSelectedWarehouse(parseInt(e.target.value))}
                                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs lg:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                >
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Mobile Search (Tampil khusus di Mobile) */}
                        <div className="block lg:hidden relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => handleSearch(e.target.value)}
                                placeholder="Cari produk atau scan barcode..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-slate-400"
                            />
                        </div>

                        {/* Category tabs */}
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                            <button
                                onClick={() => handleCategory(null)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    !selectedCategory
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Semua
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategory(cat.id)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                        selectedCategory === cat.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {cat.icon && <DynamicIcon name={cat.icon} className="w-4 h-4 mr-1 inline-block" />}
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-4 lg:p-5 pb-24 lg:pb-5 custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Package className="w-16 h-16 mb-4 opacity-30" />
                                <p className="text-lg font-semibold">Produk tidak ditemukan</p>
                                <p className="text-sm">Coba kata kunci lain</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {products.map(product => {
                                    let stock = getProductStock(product);
                                    if (product.has_variants && product.variants?.length > 0) {
                                        stock = product.variants.reduce((acc, v) => acc + getProductVariantStock(v), 0);
                                    }
                                    const inCart = cart.find(i => i.product_id === product.id);
                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            disabled={stock <= 0}
                                            className={`relative bg-white border rounded-xl p-3 text-left transition-all group hover:shadow-md hover:border-blue-300 ${
                                                stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                            } ${inCart ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}
                                        >
                                            {inCart && (
                                                <span className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                                                    {inCart.quantity}
                                                </span>
                                            )}
                                            <div className="aspect-square bg-slate-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                                {product.image ? (
                                                    <img src={`/storage/${product.image}`} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Package className="w-8 h-8 text-slate-300" />
                                                )}
                                            </div>
                                            <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{product.barcode || product.code || '-'}</p>
                                            <div className="flex justify-between items-end mt-2">
                                                <p className="text-sm font-bold text-blue-600">{formatCurrency(product.selling_price)}</p>
                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                                    stock <= 0 ? 'bg-rose-50 text-rose-500' : stock <= (product.stock_minimum || 5) ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                    {stock} {product.unit || 'pcs'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Mobile Floating Cart Trigger */}
                    <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30 flex items-center justify-between pb-safe">
                        <div>
                            <p className="text-xs text-slate-500 font-semibold mb-0.5">{cart.length} Item di Keranjang</p>
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(grandTotal)}</p>
                        </div>
                        <button 
                            onClick={() => setIsCartOpenMobile(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-colors"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Lihat Keranjang
                        </button>
                    </div>
                </div>

                {/* RIGHT - Cart Panel */}
                {/* Overlay for Mobile */}
                <div className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${isCartOpenMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsCartOpenMobile(false)} />
                
                <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-[420px] bg-white lg:static lg:h-full border-l border-slate-200/60 flex flex-col shrink-0 transition-transform duration-300 ease-out ${isCartOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                    {/* Cart Header */}
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsCartOpenMobile(false)} className="lg:hidden p-1 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <h2 className="font-bold text-slate-900">Keranjang</h2>
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
                        </div>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1">
                                <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
                            </button>
                        )}
                    </div>

                    {/* Customer Select */}
                    <div className="px-5 py-3 border-b border-slate-100 space-y-2">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedCustomer || ''}
                                onChange={e => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                <option value="">Pelanggan Umum</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        {(global_settings?.enable_order_type === '1' || global_settings?.enable_table_management === '1') && (
                            <div className="flex gap-2">
                                {global_settings?.enable_order_type === '1' && (
                                    <div className="relative flex-1">
                                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={orderType}
                                            onChange={e => setOrderType(e.target.value)}
                                            className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        >
                                            <option value="dine_in">Dine In</option>
                                            <option value="takeaway">Takeaway</option>
                                            <option value="delivery">Delivery</option>
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                )}
                                {global_settings?.enable_table_management === '1' && orderType === 'dine_in' && tables && (
                                    <div className="relative flex-1">
                                        <Grid3X3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={selectedTable || ''}
                                            onChange={e => setSelectedTable(e.target.value ? parseInt(e.target.value) : null)}
                                            className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        >
                                            <option value="">Pilih Meja</option>
                                            {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-5 py-3">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">Keranjang kosong</p>
                                <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map(item => (
                                    <div key={item.cart_id} className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 group hover:border-slate-200 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                                <p className="text-xs text-slate-400">{formatCurrency(item.unit_price)} / {item.unit || 'pcs'}</p>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {item.modifiers.map((mod, idx) => (
                                                            <span key={idx} className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                                                {mod.name} (+{formatCurrency(mod.price)})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <p className="text-[10px] text-amber-600 mt-1 italic">Catatan: {item.notes}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.cart_id)}
                                                className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => updateQuantity(item.cart_id, item.quantity - 1)}
                                                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateQuantity(item.cart_id, parseInt(e.target.value) || 0)}
                                                    className="w-12 text-center text-sm font-bold text-slate-800 border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                                                    min="1"
                                                    max={item.max_stock}
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item.cart_id, item.quantity + 1)}
                                                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800">{formatCurrency(item.unit_price * item.quantity - item.discount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Summary & Actions */}
                    <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4 space-y-3">
                        {/* Discount & Tax */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                                    Diskon {discountFormat === 'percent' ? '(%)' : '(Rp)'}
                                </label>
                                <input
                                    type="number"
                                    value={discount || ''}
                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                                    Pajak {taxFormat === 'percent' ? '(%)' : '(Rp)'}
                                </label>
                                <input
                                    type="number"
                                    value={tax || ''}
                                    onChange={e => setTax(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatCurrency(subtotal)}</span>
                            </div>
                            {totalDiscountAmount > 0 && (
                                <div className="flex justify-between text-rose-500">
                                    <span>Diskon</span>
                                    <span className="font-mono">-{formatCurrency(totalDiscountAmount)}</span>
                                </div>
                            )}
                            {totalTax > 0 && (
                                <div className="flex justify-between text-slate-500">
                                    <span>Pajak</span>
                                    <span className="font-mono">+{formatCurrency(totalTax)}</span>
                                </div>
                            )}
                            
                            {/* Voucher Application */}
                            <div className="pt-2">
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Kode Voucher / Promo</label>
                                {appliedVoucher ? (
                                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Tags className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <p className="text-xs font-bold text-blue-800">{appliedVoucher.code}</p>
                                                <p className="text-[10px] text-blue-600">-{formatCurrency(voucherDiscountAmount)}</p>
                                            </div>
                                        </div>
                                        <button onClick={handleRemoveVoucher} className="text-blue-400 hover:text-rose-500 transition-colors p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={voucherCode}
                                                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                                                placeholder="Masukkan kode..."
                                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 uppercase"
                                            />
                                            <button 
                                                onClick={handleApplyVoucher}
                                                disabled={!voucherCode}
                                                className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors"
                                            >
                                                Pakai
                                            </button>
                                        </div>
                                        {voucherError && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {voucherError}</p>}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                                <span>Total</span>
                                <span className="font-mono text-blue-600">{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>

                        {/* Pay Button */}
                        <div className="flex gap-2">
                            {global_settings?.enable_open_bill === '1' && (
                                <button
                                    onClick={handleHold}
                                    disabled={cart.length === 0}
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Clock className="w-4 h-4" />
                                    Simpan Bill
                                </button>
                            )}
                            <button
                                onClick={() => { if (cart.length > 0) { setPaidAmount(grandTotal.toString()); setShowPayment(true); } }}
                                disabled={cart.length === 0}
                                className="flex-[2] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-4 h-4" />
                                Bayar — {formatCurrency(grandTotal)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Variant Modal */}
            {selectedProductForVariant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h3 className="font-bold text-slate-900 text-lg">Pilih Varian {selectedProductForVariant.name}</h3>
                            <button onClick={() => setSelectedProductForVariant(null)} className="p-2 text-slate-400 hover:text-rose-500 bg-white rounded-full shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedProductForVariant.variants?.map(variant => {
                                    const variantStock = getProductVariantStock(variant);
                                    return (
                                        <button
                                            key={variant.id}
                                            disabled={variantStock <= 0}
                                            onClick={() => addToCart(selectedProductForVariant, variant)}
                                            className={`p-4 border rounded-xl text-left transition-all ${
                                                variantStock <= 0 
                                                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' 
                                                : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                                            }`}
                                        >
                                            <p className="font-bold text-slate-800">{variant.name}</p>
                                            <p className="text-sm font-semibold text-blue-600 mt-1">{formatCurrency(variant.price || selectedProductForVariant.selling_price)}</p>
                                            <p className={`text-xs mt-2 ${variantStock <= 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                Stok: {variantStock}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modifier Modal */}
            {selectedProductForModifier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">Custom: {selectedProductForModifier.product?.name}</h3>
                            <button onClick={() => setSelectedProductForModifier(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            {selectedProductForModifier.product?.modifiers?.map(modifier => (
                                <div key={modifier.id} className="space-y-3">
                                    <h4 className="font-semibold text-slate-800 flex justify-between">
                                        <span>{modifier.name}</span>
                                        {modifier.is_required && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Wajib</span>}
                                    </h4>
                                    <div className="space-y-2">
                                        {modifier.options?.map(option => {
                                            const isSelected = modifierSelections[modifier.id]?.includes(option.id);
                                            return (
                                                <label key={option.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">{option.name}</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900">+{formatCurrency(option.price)}</span>
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden"
                                                        checked={isSelected || false}
                                                        onChange={(e) => {
                                                            setModifierSelections(prev => {
                                                                const current = prev[modifier.id] || [];
                                                                let updated;
                                                                if (e.target.checked) {
                                                                    updated = modifier.is_multiple_choice ? [...current, option.id] : [option.id];
                                                                } else {
                                                                    updated = current.filter(id => id !== option.id);
                                                                }
                                                                return { ...prev, [modifier.id]: updated };
                                                            });
                                                        }}
                                                    />
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-2">
                                <label className="font-semibold text-slate-800 block">Catatan (Opsional)</label>
                                <textarea
                                    value={productNotes}
                                    onChange={e => setProductNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    placeholder="Contoh: Jangan pakai sayur, pedas dikit..."
                                    rows="2"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={() => {
                                    // Validate required
                                    for (const mod of selectedProductForModifier.product.modifiers) {
                                        if (mod.is_required && (!modifierSelections[mod.id] || modifierSelections[mod.id].length === 0)) {
                                            toast.error(`Pilihan ${mod.name} wajib diisi!`);
                                            return;
                                        }
                                    }
                                    // Build modifiers array
                                    const selectedMods = [];
                                    selectedProductForModifier.product.modifiers.forEach(mod => {
                                        const selectedIds = modifierSelections[mod.id] || [];
                                        mod.options.filter(opt => selectedIds.includes(opt.id)).forEach(opt => {
                                            selectedMods.push({
                                                id: opt.id,
                                                modifier_id: mod.id,
                                                name: `${mod.name} - ${opt.name}`,
                                                price: opt.price
                                            });
                                        });
                                    });
                                    addToCart(selectedProductForModifier.product, selectedProductForModifier.variant, selectedMods, productNotes);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors"
                            >
                                Tambahkan ke Keranjang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <h3 className="text-lg font-bold text-slate-900">Pembayaran</h3>
                            <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                            {/* Total Display */}
                            <div className="text-center bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-100/50">
                                <p className="text-sm text-slate-500 font-medium">Total Pembayaran</p>
                                <p className="text-3xl font-bold text-blue-600 font-mono mt-1">{formatCurrency(grandTotal)}</p>
                            </div>

                            {/* Payment Type */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wider">Metode Pembayaran</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(paymentMethods || []).map(method => (
                                        <button
                                            key={method.code}
                                            onClick={() => {
                                                setPaymentType(method.code);
                                                if (method.code === 'tempo') setPaidAmount('0');
                                                else setPaidAmount(grandTotal.toString());
                                            }}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                                                paymentType === method.code
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            {method.code === 'cash' ? <Banknote className="w-5 h-5" /> : (method.code === 'tempo' ? <ReceiptIcon className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />)}
                                            <span className="text-center text-xs px-1 leading-tight">{method.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Paid Amount */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wider">Jumlah Bayar</label>
                                <input
                                    type="number"
                                    value={paidAmount}
                                    onChange={e => setPaidAmount(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-mono"
                                    placeholder="0"
                                    min="0"
                                />
                                {paymentType === 'cash' && (
                                    <div className="flex gap-2 mt-2">
                                        {quickCash.map((val, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setPaidAmount(val.toString())}
                                                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                                            >
                                                {formatCurrency(val)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Change */}
                            {paid >= grandTotal && paymentType !== 'tempo' && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-emerald-700">Kembalian</span>
                                    <span className="text-xl font-bold text-emerald-600 font-mono">{formatCurrency(change)}</span>
                                </div>
                            )}

                            {/* Notes */}
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Catatan transaksi (opsional)..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-16"
                            />
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                            <button
                                onClick={() => setShowPayment(false)}
                                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={processPayment}
                                disabled={processing || (paymentType !== 'tempo' && paid < grandTotal)}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4" /> Proses Pembayaran</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="text-center px-6 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Transaksi Berhasil!</h3>
                        </div>

                        <div className="overflow-y-auto flex-1 px-2 py-3">
                            <ReceiptComponent ref={receiptRef} sale={receipt} store={receiptMeta.store} cashier={receiptMeta.cashier} />
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 flex gap-3">
                            <button
                                onClick={() => {
                                    if (global_settings?.enable_bluetooth_printer === '1') {
                                        executeBluetoothPrint(receipt);
                                    } else {
                                        const content = receiptRef.current;
                                        if (!content) return;
                                        const printWindow = window.open('', '_blank', 'width=400,height=600');
                                        printWindow.document.write(`<html><head><title>Struk ${receipt.invoice_number}</title><style>@page{margin:0;size:80mm auto}body{margin:0;padding:0}@media print{body{width:80mm}}</style></head><body>${content.outerHTML}</body></html>`);
                                        printWindow.document.close();
                                        printWindow.focus();
                                        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
                                    }
                                }}
                                className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Cetak Struk
                            </button>
                            <button
                                onClick={newTransaction}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Transaksi Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Overlay for Missing Shift */}
            {!activeShift && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="bg-gradient-to-b from-blue-50 to-white px-6 pt-8 pb-6 border-b border-slate-100">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <Lock className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 text-center">Akses POS Terkunci</h2>
                            <p className="text-slate-500 text-sm text-center mt-2 leading-relaxed">
                                Halo {auth.user?.name}, Anda belum membuka shift kasir.<br/>Silakan masukkan modal awal laci uang (starting cash) untuk mulai menerima transaksi.
                            </p>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Uang Fisik Modal Laci (Rp)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Contoh: 500000"
                                        value={shiftStartingCash}
                                        onChange={e => setShiftStartingCash(e.target.value)}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter' && shiftStartingCash !== '' && shiftStartingCash >= 0) {
                                                const btn = document.getElementById('btn-buka-shift');
                                                if(btn) btn.click();
                                            }
                                        }}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-lg font-bold text-slate-800"
                                    />
                                </div>
                            </div>
                            <button
                                id="btn-buka-shift"
                                onClick={async () => {
                                    if(shiftStartingCash === '' || shiftStartingCash < 0) return;
                                    setShiftProcessing(true);
                                    try {
                                        await axios.post(route('shifts.open'), { starting_cash: shiftStartingCash });
                                        // Reload page totally to pull fresh active shift layout
                                        window.location.reload();
                                    } catch(e) {
                                        alert('Gagal membuka shift!');
                                    } finally {
                                        setShiftProcessing(false);
                                    }
                                }}
                                disabled={shiftProcessing || shiftStartingCash === '' || shiftStartingCash < 0}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                {shiftProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Buka Shift Kasir Sekarang'}
                            </button>
                            <div className="text-center">
                                <Link href={route('dashboard')} className="text-sm font-medium text-slate-500 hover:text-slate-800 underline underline-offset-4">Kembali ke Dashboard</Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-slide-in { animation: slide-in 0.3s ease-out; }
                .animate-scale-in { animation: scale-in 0.2s ease-out; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {/* Close Shift Modal */}
            {showCloseShiftModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg">Tutup Shift Kasir</h3>
                            <button onClick={() => setShowCloseShiftModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-xl text-sm font-medium flex justify-between items-center">
                                <span>Estimasi Uang di Laci (Sistem):</span>
                                <span className="font-mono text-lg font-bold">Rp{new Intl.NumberFormat('id-ID').format(shiftClosingExpected)}</span>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Total Uang Fisik Aktual (Hitungan Laci)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={shiftClosingCash}
                                        onChange={(e) => setShiftClosingCash(e.target.value)}
                                        className="w-full pl-12 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 font-bold text-slate-800 text-lg"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Catatan Rekap (Opsional)</label>
                                <textarea
                                    value={shiftClosingNotes}
                                    onChange={(e) => setShiftClosingNotes(e.target.value)}
                                    placeholder="Tulis alasan jika ada selisih uang..."
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 min-h-[80px]"
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button onClick={() => setShowCloseShiftModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors">Batal</button>
                            <button 
                                onClick={async () => {
                                    setShiftProcessing(true);
                                    try {
                                        await axios.post(route('shifts.close'), { actual_cash_ending: shiftClosingCash, notes: shiftClosingNotes });
                                        window.location.reload();
                                    } catch (err) {
                                        alert('Gagal menutup shift!');
                                    } finally {
                                        setShiftProcessing(false);
                                    }
                                }}
                                disabled={shiftProcessing || shiftClosingCash === '' || shiftClosingCash < 0}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {shiftProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Selesaikan Shift'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}