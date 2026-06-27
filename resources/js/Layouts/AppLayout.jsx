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
} from 'lucide-react';

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', route: 'dashboard', permission: 'dashboard' },
    { icon: ShoppingBag, label: 'POS Kasir', route: 'pos.index', permission: 'pos' },
    {
        icon: Package, label: 'Produk', children: [
            { label: 'Daftar Produk', route: 'products.index', permission: 'products.view' },
            { label: 'Kategori', route: 'categories.index', permission: 'categories.manage' },
            { label: 'Cetak Barcode', route: 'barcodes.index', permission: 'barcodes.print' },
        ]
    },
    {
        icon: Warehouse, label: 'Gudang', children: [
            { label: 'Daftar Gudang', route: 'warehouses.index', permission: 'warehouses.manage' },
            { label: 'Transfer Barang', route: 'stock-transfers.index', permission: 'stock-transfers.manage' },
            { label: 'Penyesuaian Stok', route: 'stock-opnames.index', permission: 'warehouses.manage' },
            { label: 'Riwayat Mutasi', route: 'stock-movements.index', permission: 'warehouses.manage' },
        ]
    },
    { icon: TruckIcon, label: 'Supplier', route: 'suppliers.index', permission: 'suppliers.manage' },
    {
        icon: CreditCard, label: 'Penjualan', children: [
            { label: 'Daftar Penjualan', route: 'sales.index', permission: 'sales.view' },
            { label: 'Penjualan Tempo', route: 'sales-tempo.index', permission: 'sales-tempo.view' },
            { label: 'Retur Penjualan', route: 'sale-returns.index', permission: 'sale-returns.manage' },
        ]
    },
    {
        icon: ShoppingBag, label: 'Pembelian', children: [
            { label: 'Daftar Pembelian', route: 'purchases.index', permission: 'purchases.view' },
            { label: 'Retur Pembelian', route: 'purchase-returns.index', permission: 'purchase-returns.manage' },
        ]
    },
    { icon: Wallet, label: 'Biaya & Kasbon', route: 'expenses.index', permission: 'sales.view' },
    { icon: Users, label: 'Pelanggan', route: 'customers.index', permission: 'customers.manage' },
    {
        icon: BarChart3, label: 'Laporan', children: [
            { label: 'Penjualan Per Invoice', route: 'reports.sales-by-invoice', permission: 'reports.view' },
            { label: 'Penjualan Per Item', route: 'reports.sales-by-item', permission: 'reports.view' },
            { label: 'Pembelian Per Invoice', route: 'reports.purchases-by-invoice', permission: 'reports.view' },
            { label: 'Laba / Rugi (P&L)', route: 'reports.profit-loss', permission: 'reports.view' },
            { label: 'Aging Piutang', route: 'reports.receivables', permission: 'reports.view' },
        ]
    },
    {
        icon: Settings, label: 'Setting', children: [
            { label: 'Pengaturan', route: 'settings.index', permission: 'settings.manage' },
            { label: 'User', route: 'users.index', permission: 'users.manage' },
            { label: 'Role & Permission', route: 'roles.index', permission: 'roles.manage' },
            { label: 'Log Aktivitas Sistem', route: 'activity-logs.index', permission: 'settings.manage' },
        ]
    },
];

export default function AppLayout({ children, title }) {
    const { auth, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(null);

    const hasPermission = (permission) => {
        if (!permission) return true;
        if (auth.user?.role?.name === 'admin') return true;
        return auth.user?.permissions?.includes(permission);
    };

    const filteredNavItems = NAV_ITEMS.filter(item => {
        if (item.children) {
            const visibleChildren = item.children.filter(child => hasPermission(child.permission));
            return visibleChildren.length > 0;
        }
        return hasPermission(item.permission);
    }).map(item => {
        if (item.children) {
            return {
                ...item,
                children: item.children.filter(child => hasPermission(child.permission))
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
            <aside className="hidden lg:flex static inset-y-0 left-0 z-40 w-64 border-r border-slate-200/60 bg-white/80 backdrop-blur-xl flex-col justify-between py-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div>
                    {/* Logo */}
                    <div className="px-6 mb-10 flex items-center">
                        <img src="/images/logo.png" alt="BuildyPOS Logo" className="h-8 w-auto object-contain" />
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
            <main className="flex-1 flex flex-col h-screen overflow-y-auto z-10 custom-scrollbar pb-20 lg:pb-0">
                {/* Header */}
                <header className="min-h-[72px] lg:min-h-[88px] py-3 lg:py-4 bg-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]">
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

                        {/* Notifications */}
                        <button className="relative w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all rounded-xl hover:bg-slate-100/80 group">
                            <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                        </button>

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
                <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 flex-1">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation (Mobile Only) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] h-16 px-2">
                {hasPermission('dashboard') && (
                    <BottomNavItem icon={LayoutDashboard} label="Dashboard" href={route('dashboard')} isActive={route().current('dashboard')} />
                )}
                {hasPermission('pos') && (
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
                            <img src="/images/logo.png" alt="BuildyPOS Logo" className="h-8 w-auto object-contain" />
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
