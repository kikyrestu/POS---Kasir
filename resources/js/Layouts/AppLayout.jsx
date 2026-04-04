import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
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
    { icon: LayoutDashboard, label: 'Dashboard', route: 'dashboard' },
    { icon: ShoppingBag, label: 'POS Kasir', route: 'pos.index' },
    {
        icon: Package, label: 'Produk', children: [
            { label: 'Daftar Produk', route: 'products.index' },
            { label: 'Kategori', route: 'categories.index' },
            { label: 'Cetak Barcode', route: 'barcodes.index' },
        ]
    },
    {
        icon: Warehouse, label: 'Gudang', children: [
            { label: 'Daftar Gudang', route: 'warehouses.index' },
            { label: 'Transfer Barang', route: 'stock-transfers.index' },
        ]
    },
    { icon: TruckIcon, label: 'Supplier', route: 'suppliers.index' },
    {
        icon: CreditCard, label: 'Penjualan', children: [
            { label: 'Daftar Penjualan', route: 'sales.index' },
            { label: 'Penjualan Tempo', route: 'sales-tempo.index' },
            { label: 'Retur Penjualan', route: 'sale-returns.index' },
        ]
    },
    {
        icon: ShoppingBag, label: 'Pembelian', children: [
            { label: 'Daftar Pembelian', route: 'purchases.index' },
            { label: 'Retur Pembelian', route: 'purchase-returns.index' },
        ]
    },
    { icon: Users, label: 'Pelanggan', route: 'customers.index' },
    {
        icon: BarChart3, label: 'Laporan', children: [
            { label: 'Penjualan Per Invoice', route: 'reports.sales-by-invoice' },
            { label: 'Penjualan Per Item', route: 'reports.sales-by-item' },
            { label: 'Pembelian Per Invoice', route: 'reports.purchases-by-invoice' },
        ]
    },
    {
        icon: Settings, label: 'Setting', children: [
            { label: 'Pengaturan', route: 'settings.index' },
            { label: 'User', route: 'users.index' },
            { label: 'Role & Permission', route: 'roles.index' },
        ]
    },
];

export default function AppLayout({ children, title }) {
    const { auth, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(null);

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

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-slate-200/60 bg-white/80 backdrop-blur-xl flex flex-col justify-between py-6 transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div>
                    {/* Logo */}
                    <div className="px-6 mb-10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-[0_4px_15px_rgba(59,130,246,0.25)]">
                            <Box className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">
                            NEXA<span className="font-light">POS</span>
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-1 px-3">
                        {NAV_ITEMS.map((item) => (
                            <div key={item.label}>
                                {item.children ? (
                                    <div>
                                        <button
                                            onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                                            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium`}
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
            <main className="flex-1 flex flex-col h-screen overflow-y-auto z-10 custom-scrollbar">
                {/* Header */}
                <header className="min-h-[72px] lg:min-h-[88px] py-3 lg:py-4 bg-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100/80 transition-colors">
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

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mx-4 lg:mx-8 mt-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mx-4 lg:mx-8 mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                        {flash.error}
                    </div>
                )}

                {/* Page Content */}
                <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 flex-1">
                    {children}
                </div>
            </main>

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
