import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Users, LogOut, Menu, X, Store, Settings, CreditCard, Megaphone, Bell } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function SaasAdminLayout({ children }) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: route('admin.dashboard'), icon: LayoutDashboard },
        { name: 'Tenants', href: route('admin.tenants.index'), icon: Store },
        { name: 'Plans', href: route('admin.plans.index'), icon: CreditCard },
        { name: 'Subscriptions', href: route('admin.subscriptions.index'), icon: Users },
        { name: 'Features', href: route('admin.features.index'), icon: Settings },
        { name: 'Global Settings', href: route('admin.settings.index'), icon: Settings },
        { name: 'Broadcast', href: route('admin.broadcast.index'), icon: Megaphone },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <span className="text-xl font-bold text-primary-600">NEXA<span className="text-gray-900">SaaS</span></span>
                    <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const active = route().current(item.href.split('?')[0].split('/').pop() + '*'); // basic active check
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                                    active
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <item.icon className={`mr-3 w-5 h-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 justify-between lg:justify-end">
                    <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-4">
                        
                        {/* Notifications */}
                        <div className="relative group">
                            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                                <Bell className="w-5 h-5" />
                                {auth?.user?.unread_notifications?.length > 0 && (
                                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                    </span>
                                )}
                            </button>
                            
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                                    <h3 className="font-semibold text-gray-800">Notifikasi</h3>
                                    {auth?.user?.unread_notifications?.length > 0 && (
                                        <button 
                                            onClick={() => router.post(route('admin.notifications.read-all'))}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            Tandai semua dibaca
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[320px] overflow-y-auto">
                                    {auth?.user?.unread_notifications?.length > 0 ? (
                                        auth.user.unread_notifications.map(notif => (
                                            <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-blue-50/30 transition-colors flex gap-3 relative group/item cursor-pointer">
                                                <div className="bg-blue-100 p-2 rounded-full h-fit text-blue-600 shrink-0">
                                                    <CreditCard className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-800">{notif.data.title}</p>
                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.data.message}</p>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.post(route('admin.notifications.read', notif.id));
                                                        }}
                                                        className="text-[10px] text-blue-600 font-medium mt-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    >
                                                        Tandai dibaca
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                                            <Bell className="w-8 h-8 text-gray-300 mb-2" />
                                            <p className="text-sm">Tidak ada notifikasi baru.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <span className="text-sm font-medium text-gray-700">{auth?.user?.name}</span>
                        <Link
                            href={route('admin.logout')}
                            method="post"
                            as="button"
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <LogOut className="w-5 h-5" />
                        </Link>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
