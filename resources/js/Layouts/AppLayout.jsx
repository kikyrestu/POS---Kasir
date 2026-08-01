import { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Toaster, toast } from 'sonner';
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    Wallet,
    Settings,
    Bell,
    Search,
    CreditCard,
    Box,
    Tags,
    Warehouse,
    TruckIcon,
    FileText,
    BarChart3,
    ChevronDown,
    LogOut,
    User,
    Menu,
    X,
    RotateCcw,
    ArrowRightLeft,
    Barcode,
    Clock,
    Shield,
    ChefHat,
    Maximize,
    Minimize,
    Check,
    Store,
} from 'lucide-react';
import axios from 'axios';

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', route: 'dashboard', permission: 'dashboard' },
    { icon: ShoppingBag, label: 'POS Kasir', route: 'pos.index', permission: 'pos', feature: 'pos' },
    { icon: ChefHat, label: 'Dapur (KDS)', route: 'kds.index', permission: 'pos' },
    {
        icon: Package, label: 'Produk', children: [
            { label: 'Daftar Produk', route: 'products.index', permission: 'products.view', feature: 'inventory' },
            { label: 'Kategori', route: 'categories.index', permission: 'categories.manage', feature: 'inventory' },
            { label: 'Cetak Barcode', route: 'barcodes.index', permission: 'barcodes.print', feature: 'barcodes' },
            { label: 'Penyesuaian Stok', route: 'stock-opnames.index', permission: 'warehouses.manage', feature: 'stock-opnames' },
            { label: 'Riwayat Mutasi', route: 'stock-movements.index', permission: 'warehouses.manage', feature: 'stock-opnames' },
        ]
    },
    {
        icon: Warehouse, label: 'Gudang', feature: 'warehouses', children: [
            { label: 'Daftar Gudang', route: 'warehouses.index', permission: 'warehouses.manage', feature: 'warehouses' },
            { label: 'Transfer Barang', route: 'stock-transfers.index', permission: 'stock-transfers.manage', feature: 'warehouses' },
        ]
    },
    { icon: TruckIcon, label: 'Supplier', route: 'suppliers.index', permission: 'suppliers.manage', feature: 'suppliers' },
    {
        icon: CreditCard, label: 'Penjualan', children: [
            { label: 'Daftar Penjualan', route: 'sales.index', permission: 'sales.view' },
            { label: 'Penjualan Tempo', route: 'sales-tempo.index', permission: 'sales-tempo.view', feature: 'sales-tempo' },
            { label: 'Retur Penjualan', route: 'sale-returns.index', permission: 'sale-returns.manage', feature: 'sale-returns' },
        ]
    },
    {
        icon: ShoppingBag, label: 'Pembelian', children: [
            { label: 'Daftar Pembelian', route: 'purchases.index', permission: 'purchases.view', feature: 'purchases' },
            { label: 'Retur Pembelian', route: 'purchase-returns.index', permission: 'purchase-returns.manage', feature: 'purchase-returns' },
        ]
    },
    { icon: Wallet, label: 'Biaya & Kasbon', route: 'expenses.index', permission: 'sales.view', feature: 'expenses' },
    { icon: Users, label: 'Pelanggan', route: 'customers.index', permission: 'customers.manage', feature: 'customers' },
    { icon: Tags, label: 'Voucher & Promo', route: 'vouchers.index', permission: 'settings.manage', feature: 'vouchers' },
    {
        icon: BarChart3, label: 'Laporan', children: [
            { label: 'Penjualan Per Invoice', route: 'reports.sales-by-invoice', permission: 'reports.view', feature: 'reports' },
            { label: 'Penjualan Per Item', route: 'reports.sales-by-item', permission: 'reports.view', feature: 'reports' },
            { label: 'Pembelian Per Invoice', route: 'reports.purchases-by-invoice', permission: 'reports.view', feature: 'reports' },
            { label: 'Laba / Rugi (P&L)', route: 'reports.profit-loss', permission: 'reports.view', feature: 'reports' },
            { label: 'Aging Piutang', route: 'reports.receivables', permission: 'reports.view', feature: 'reports' },
        ]
    },
    {
        icon: Settings, label: 'Setting', children: [
            { label: 'Pengaturan', route: 'settings.index', permission: 'settings.manage', feature: 'settings' },
            { label: 'User', route: 'users.index', permission: 'users.manage', feature: 'user-management' },
            { label: 'Role & Permission', route: 'roles.index', permission: 'roles.manage', feature: 'user-management' },
            { label: 'Billing & Paket', route: 'billing.index', permission: 'settings.manage', feature: 'settings' },
            { label: 'Log Aktivitas Sistem', route: 'activity-logs.index', permission: 'settings.manage', feature: 'settings' },
        ]
    },
];

export default function AppLayout({ children, title }) {
    const { auth, flash, saas_features, global_settings } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(null);

    const hasPermission = (permission) => {
        if (!permission) return true;
        if (auth.user?.role?.name === 'admin') return true;
        return auth.user?.permissions?.includes(permission);
    };

    const isFeatureEnabled = (featureKey) => {
        if (!featureKey) return true;
        // if feature is missing from props, assume it's disabled or enabled? usually enabled by default if not strictly managed, but let's say disabled if not found.
        // Actually, 'active' means enabled.
        return saas_features?.[featureKey] === 'active';
    };

    const filteredNavItems = NAV_ITEMS.filter(item => {
        if (item.route === 'kds.index') {
            return global_settings?.enable_kds === '1' && hasPermission(item.permission);
        }
        if (item.children) {
            const visibleChildren = item.children.filter(child => hasPermission(child.permission) && isFeatureEnabled(child.feature));
            return visibleChildren.length > 0;
        }
        return hasPermission(item.permission) && isFeatureEnabled(item.feature);
    }).map(item => {
        if (item.children) {
            return {
                ...item,
                children: item.children.filter(child => hasPermission(child.permission) && isFeatureEnabled(child.feature))
            };
        }
        return item;
    });

    useEffect(() => {
        const isChildActive = (children) => children?.some(child => route().current(child.route));
        const activeParent = filteredNavItems.find(item => item.children && isChildActive(item.children));
        if (activeParent) {
            setExpandedMenu(activeParent.label);
        }
    }, [usePage().url]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // --- Fullscreen Logic ---
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                toast.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // --- Notification Logic ---
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(route('notifications.index'));
            setNotifications(res.data);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Optional: Polling every 60s
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.post(route('notifications.markAsRead', id));
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.post(route('notifications.markAllAsRead'));
            setNotifications([]);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    return (
        <div
            className="min-h-screen text-slate-800 font-sans overflow-hidden flex relative selection:bg-blue-500/20"
            style={{
                background: `
                    radial-gradient(ellipse 600px 600px at -5% -5%, rgba(94,234,212,0.15) 0%, transparent 60%),
                    radial-gradient(ellipse 700px 700px at 105% 105%, rgba(96,165,250,0.15) 0%, transparent 60%),
                    #f8fafc
                `,
            }}
        >

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex print:hidden static inset-y-0 left-0 z-40 w-64 border-r border-slate-200/60 bg-white/80 backdrop-blur-xl flex-col justify-between py-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div>
                    {/* Logo */}
                    <div className="px-6 mb-10 flex items-center">
                        {global_settings?.store_logo ? (
                            <img src={`/storage/${global_settings.store_logo}`} alt={global_settings?.store_name || "Logo"} className="h-8 w-auto object-contain" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                    <Store className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold text-slate-800 text-lg tracking-tight truncate">{global_settings?.store_name || 'BuildyPOS'}</span>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-1 px-3">
                        {filteredNavItems.map((item) => (
                            <div key={item.label}>
                                {item.children ? (
                                    <div>
                                        <button
                                            onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                                            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium ${item.children.some(child => route().current(child.route)) ? 'text-blue-700 bg-blue-50/70 font-semibold' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className="w-5 h-5 text-slate-400" />
                                                <span className="text-sm tracking-wide">{item.label}</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === item.label ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expandedMenu === item.label && (
                                            <div className="ml-8 mt-1 space-y-1">
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.route}
                                                        href={route(child.route)}
                                                        className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${route().current(child.route) ? 'text-blue-700 bg-blue-50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <NavItem
                                        icon={item.icon}
                                        label={item.label}
                                        href={route(item.route)}
                                        isActive={route().current(item.route)}
                                    />
                                )}
                            </div>
                        ))}
                    </nav>
                </div>


            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto z-10 custom-scrollbar pb-20 lg:pb-0 print:h-auto print:overflow-visible">
                {/* Header */}
                <header className="min-h-[72px] lg:min-h-[88px] py-3 lg:py-4 bg-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] print:hidden">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100/80 transition-colors">
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">{title || 'Dashboard'}</h1>
                            <p className="text-xs text-slate-400 font-medium mt-0.5 hidden lg:block">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:gap-4">
                        {/* Search Bar */}
                        <div className="relative group hidden lg:block">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari transaksi, item, kasir..."
                                className="bg-slate-50/80 border border-slate-200/80 rounded-xl py-2.5 pl-10 pr-4 w-64 text-sm text-slate-700 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                            />
                        </div>

                        {/* Fullscreen Toggle */}
                        <button 
                            onClick={toggleFullscreen} 
                            className="hidden lg:flex relative w-10 h-10 items-center justify-center text-slate-500 hover:text-slate-800 transition-all rounded-xl hover:bg-slate-100/80 group"
                            title="Toggle Fullscreen"
                        >
                            {isFullscreen ? (
                                <Minimize className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            ) : (
                                <Maximize className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            )}
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all rounded-xl hover:bg-slate-100/80 group"
                            >
                                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                            <h3 className="font-semibold text-slate-800">Notifikasi</h3>
                                            {notifications.length > 0 && (
                                                <button onClick={markAllAsRead} className="text-xs font-medium text-blue-600 hover:text-blue-700">Tandai Semua Dibaca</button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-slate-400">
                                                    <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm">Belum ada notifikasi baru</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-100">
                                                    {notifications.map((notif) => (
                                                        <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3 relative group">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm shrink-0">
                                                                {notif.data.icon || '🔔'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-slate-800 truncate">{notif.data.title}</p>
                                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.data.message}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => markAsRead(notif.id)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-full shadow-sm border border-slate-100"
                                                                title="Tandai dibaca"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-10 bg-slate-200/80 mx-1"></div>

                        {/* Profile */}
                        <div className="flex items-center gap-3 cursor-pointer group relative px-2 py-1.5 rounded-xl hover:bg-slate-50/80 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                                {auth.user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden lg:block">
                                <p className="text-sm font-semibold text-slate-800">{auth.user?.name}</p>
                                <p className="text-xs text-slate-400 font-medium">{auth.user?.role?.display_name || 'Administrator'}</p>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />

                            {/* Dropdown */}
                            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200/80 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] py-1.5 z-50 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-slate-100">
                                    <p className="text-sm font-semibold text-slate-800">{auth.user?.name}</p>
                                    <p className="text-xs text-slate-400">{auth.user?.email}</p>
                                </div>
                                <Link href={route('profile.edit')} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                    <User className="w-4 h-4" /> Profil Saya
                                </Link>
                                <div className="border-t border-slate-100 mt-1 pt-1">
                                    <Link href={route('logout')} method="post" as="button" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 w-full text-left transition-colors">
                                        <LogOut className="w-4 h-4" /> Keluar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Sonner Toaster rendered globally */}
                <Toaster richColors position="top-right" />

                {/* Page Content */}
                <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 flex-1 print:p-0 print:space-y-0 print:block">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation (Mobile Only) */}
            <div className="lg:hidden print:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] h-16 px-2">
                {hasPermission('dashboard') && (
                    <BottomNavItem icon={LayoutDashboard} label="Dashboard" href={route('dashboard')} isActive={route().current('dashboard')} />
                )}
                {hasPermission('pos') && isFeatureEnabled('pos') && (
                    <BottomNavItem icon={ShoppingBag} label="POS" href={route('pos.index')} isActive={route().current('pos.index')} />
                )}
                {hasPermission('sales.view') && (
                    <BottomNavItem icon={CreditCard} label="Penjualan" href={route('sales.index')} isActive={route().current('sales.*')} />
                )}
                <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${sidebarOpen ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
                >
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    <span className="text-[10px] font-semibold">{sidebarOpen ? 'Tutup' : 'Menu'}</span>
                </button>
            </div>

            {/* Mobile Bottom Sheet Menu (App Grid) */}
            <div className={`lg:hidden fixed inset-0 z-30 transition-all duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                {/* Backdrop */}
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                
                {/* Sheet */}
                <div className={`absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out flex flex-col max-h-[85vh] ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="flex justify-center pt-3 pb-2 shrink-0">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                    </div>
                    
                    <div className="overflow-y-auto custom-scrollbar p-5 pt-2 pb-8">
                        <div className="mb-6 flex items-center justify-center">
                            {global_settings?.store_logo ? (
                                <img src={`/storage/${global_settings.store_logo}`} alt={global_settings?.store_name || "Logo"} className="h-8 w-auto object-contain" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                        <Store className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-bold text-slate-800 text-lg tracking-tight truncate">{global_settings?.store_name || 'BuildyPOS'}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Items without children */}
                            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                                {filteredNavItems.filter(item => !item.children).map(item => (
                                    <Link key={item.route} href={route(item.route)} onClick={() => setSidebarOpen(false)} className="flex flex-col items-center gap-2 group">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${route().current(item.route) ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-slate-50 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-200'}`}>
                                            <item.icon className={`w-6 h-6 ${route().current(item.route) ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                                        </div>
                                        <span className={`text-[10px] text-center font-medium leading-tight px-1 ${route().current(item.route) ? 'text-blue-700 font-bold' : 'text-slate-600'}`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                ))}
                            </div>

                            {/* Items with children */}
                            {filteredNavItems.filter(item => item.children).map(item => (
                                <div key={item.label} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <item.icon className="w-4 h-4 text-slate-400" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-y-5 gap-x-2">
                                        {item.children.map(child => (
                                            <Link key={child.route} href={route(child.route)} onClick={() => setSidebarOpen(false)} className="flex flex-col items-center gap-2 group">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${route().current(child.route) ? 'bg-blue-500 shadow-md shadow-blue-500/30' : 'bg-white border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-200 shadow-sm'}`}>
                                                    <item.icon className={`w-5 h-5 ${route().current(child.route) ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                                                </div>
                                                <span className={`text-[10px] text-center font-medium leading-tight px-1 ${route().current(child.route) ? 'text-blue-700 font-bold' : 'text-slate-600'}`}>
                                                    {child.label}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Scrollbar */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.02); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.25); }
            `}} />
        </div>
    );
}

function NavItem({ icon: Icon, label, href, isActive }) {
    return (
        <Link
            href={href}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative group font-medium
                ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}
            `}
        >
            {isActive && (
                <span className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
            )}
            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}`} />
            <span className="text-sm tracking-wide">{label}</span>
        </Link>
    );
}

function BottomNavItem({ icon: Icon, label, href, isActive }) {
    return (
        <Link
            href={href}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`}
        >
            <Icon className={`w-5 h-5 ${isActive ? 'fill-blue-100/50' : ''}`} />
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
        </Link>
    );
}
