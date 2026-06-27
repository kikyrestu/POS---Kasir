import { Head, Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/30 flex flex-col">
                {/* Header */}
                <header className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
                    <ApplicationLogo />
                    <nav className="flex items-center gap-3">
                        {auth.user ? (
                            <Link href={route('dashboard')} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className="px-5 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors">
                                    Login
                                </Link>
                                <Link href={route('register')} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                                    Register
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                {/* Hero */}
                <main className="flex-1 flex items-center justify-center px-6">
                    <div className="max-w-3xl text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-600 mb-6">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            Point of Sale System
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                            Kelola Bisnis Anda dengan{' '}
                            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">BuildyPOS</span>
                        </h1>
                        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
                            Sistem kasir modern yang lengkap untuk mengelola penjualan, stok barang, pelanggan, dan laporan bisnis Anda secara real-time.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <Link href={auth.user ? route('dashboard') : route('login')} className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl text-sm font-bold hover:shadow-xl hover:shadow-blue-500/25 transition-all hover:-translate-y-0.5">
                                Mulai Sekarang
                            </Link>
                        </div>

                        {/* Feature grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16">
                            {[
                                { icon: '\uD83D\uDED2', title: 'POS Kasir', desc: 'Transaksi cepat dan mudah dengan antarmuka modern' },
                                { icon: '\uD83D\uDCE6', title: 'Manajemen Stok', desc: 'Pantau persediaan barang secara real-time' },
                                { icon: '\uD83D\uDCCA', title: 'Laporan Lengkap', desc: 'Analisis penjualan dengan grafik dan data detail' },
                            ].map((f, i) => (
                                <div key={i} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 text-left hover:shadow-lg hover:border-slate-300/80 transition-all">
                                    <span className="text-2xl mb-3 block">{f.icon}</span>
                                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                                    <p className="text-sm text-slate-500">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-6 text-center text-xs text-slate-400">
                    &copy; {new Date().getFullYear()} BuildyPOS. All rights reserved.
                </footer>
            </div>
        </>
    );
}
