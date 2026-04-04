import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    ShoppingBag, Activity, Wallet, Users, ArrowUpRight, ArrowDownRight,
    Package, Search
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/Utils/format';
import { Badge, Pagination } from '@/Components/UI';
import { useState } from 'react';

// ─── Colors for charts ───
const PIE_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const LINE_COLORS = ['#ef4444', '#3b82f6', '#14b8a6'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const STAT_COLORS = [
    { bg: 'from-emerald-500 to-emerald-600', icon: ShoppingBag },
    { bg: 'from-blue-500 to-blue-600', icon: Activity },
    { bg: 'from-teal-500 to-teal-600', icon: Wallet },
    { bg: 'from-purple-500 to-purple-600', icon: Users },
];

// ─── Donut Chart Component ───
function DonutChart({ data, size = 180, thickness = 40 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <div className="flex items-center justify-center" style={{width:size,height:size}}><p className="text-sm text-slate-400">No data</p></div>;
    const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
    let cumAngle = -90;
    const arcs = data.map((d, i) => {
        const angle = (d.value / total) * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;
        const largeArc = angle > 180 ? 1 : 0;
        const toRad = a => (a * Math.PI) / 180;
        const x1 = cx + r * Math.cos(toRad(startAngle));
        const y1 = cy + r * Math.sin(toRad(startAngle));
        const x2 = cx + r * Math.cos(toRad(endAngle - 0.5));
        const y2 = cy + r * Math.sin(toRad(endAngle - 0.5));
        return (
            <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none" stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={thickness} />
        );
    });
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{arcs}</svg>;
}

// ─── Year Selector ───
function YearSelect({ value, onChange, years }) {
    return (
        <select value={value} onChange={e => onChange(parseInt(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
    );
}

// ─── Section Card ───
function Section({ title, children, className = '', extra }) {
    return (
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden ${className}`}>
            {title && (
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                    {extra}
                </div>
            )}
            {children}
        </div>
    );
}

export default function Dashboard({
    currentYear, availableYears, stats,
    monthlySales, yearlySales, stockComposition, stockProducts, categories,
    topReceivables, overdueSales, overdueFilter,
    topSellingProducts, grandTotalSales, mostSoldPie,
    topCategories, topCategorySales,
    latestProducts, topCustomers, recentSales,
}) {
    const [year, setYear] = useState(currentYear);
    const [stockSearch, setStockSearch] = useState('');
    const [stockCat, setStockCat] = useState('');

    const changeYear = (y) => {
        setYear(y);
        router.get(route('dashboard'), { year: y }, { preserveState: true, preserveScroll: true });
    };

    const filterStock = (e) => {
        e?.preventDefault();
        router.get(route('dashboard'), { year, stock_search: stockSearch || undefined, stock_category: stockCat || undefined },
            { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout title="Dashboard">
            <Head title="Dashboard" />

            {/* Title Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                    <p className="text-sm text-slate-500 mt-1">Ringkasan data & statistik bisnis</p>
                </div>
                <YearSelect value={year} onChange={changeYear} years={availableYears || []} />
            </div>

            {/* ═══ STAT CARDS ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {(stats || []).map((stat, idx) => {
                    const s = STAT_COLORS[idx];
                    const isPositive = stat.change >= 0;
                    const displayVal = stat.type === 'currency' ? formatCurrency(stat.value) : formatNumber(stat.value);
                    return (
                        <div key={idx} className={`bg-gradient-to-br ${s.bg} rounded-2xl p-5 text-white relative overflow-hidden group shadow-lg`}>
                            <div className="absolute top-3 right-3 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <s.icon className="w-5 h-5" />
                            </div>
                            <p className="text-3xl font-bold tracking-tight mb-1">{displayVal}</p>
                            <p className="text-white/80 text-sm font-medium">{stat.title}</p>
                            <div className="mt-3 flex items-center justify-between text-xs">
                                <span className={`flex items-center gap-1 font-semibold ${isPositive ? 'text-white' : 'text-white/80'}`}>
                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {isPositive ? '+' : ''}{stat.change}%
                                </span>
                                <span className="text-white/60 font-semibold">{stat.year}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ ROW: Monthly Sales + Yearly Sales ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Penjualan Perbulan */}
                <Section title="Penjualan Perbulan" className="xl:col-span-2"
                    extra={<div className="flex gap-2">{(availableYears || []).map((yr,i) => (
                        <span key={yr} className="flex items-center gap-1 text-xs font-semibold">
                            <span className="w-3 h-3 rounded-sm" style={{backgroundColor: LINE_COLORS[i]}} />
                            {yr}
                        </span>
                    ))}</div>}>
                    <div className="p-5">
                        <div className="relative h-[260px] w-full">
                            {(() => {
                                const allVals = Object.values(monthlySales || {}).flat();
                                const maxVal = Math.max(...allVals, 1);
                                return [maxVal, maxVal * 0.66, maxVal * 0.33, 0].map((v, i) => (
                                    <span key={i} className="absolute left-0 text-[10px] font-medium text-slate-400"
                                        style={{ top: `${(i / 3) * 85}%`, transform: 'translateY(-50%)' }}>
                                        {formatNumber(Math.round(v))}
                                    </span>
                                ));
                            })()}
                            <div className="absolute left-16 right-0 top-0" style={{height:'85%'}}>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="absolute w-full h-[1px] bg-slate-100" style={{top: `${(i/3)*100}%`}} />
                                ))}
                            </div>
                            <svg className="absolute left-16 right-0 top-0 overflow-visible" style={{height:'85%'}} viewBox="0 0 1100 100" preserveAspectRatio="none">
                                {Object.entries(monthlySales || {}).map(([yr, vals], lineIdx) => {
                                    const allVals = Object.values(monthlySales || {}).flat();
                                    const maxVal = Math.max(...allVals, 1);
                                    const pts = vals.map((v, i) => `${(i / 11) * 1100},${100 - (v / maxVal) * 90}`).join(' ');
                                    return <polyline key={yr} points={pts} fill="none" stroke={LINE_COLORS[lineIdx]} strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.8" />;
                                })}
                            </svg>
                            <div className="absolute left-16 right-0 bottom-0 flex justify-between text-[10px] font-medium text-slate-400">
                                {MONTHS.map(m => <span key={m}>{m}</span>)}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Penjualan Pertahun */}
                <Section title="Penjualan Pertahun">
                    <div className="p-5 flex items-end gap-4 h-[260px]">
                        {(() => {
                            const maxVal = Math.max(...(yearlySales || []).map(y => y.total), 1);
                            return (yearlySales || []).map((yr, i) => (
                                <div key={yr.year} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">{formatCurrency(yr.total)}</span>
                                    <div className="w-full rounded-t-lg transition-all"
                                        style={{
                                            height: `${Math.max((yr.total / maxVal) * 180, 8)}px`,
                                            backgroundColor: PIE_COLORS[i],
                                            opacity: 0.85,
                                        }} />
                                    <span className="text-xs font-bold text-slate-600">{yr.year}</span>
                                </div>
                            ));
                        })()}
                    </div>
                </Section>
            </div>

            {/* ═══ ROW: Komposisi Barang + Stok Barang ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Section title="Komposisi Barang">
                    <div className="p-5 flex flex-col items-center">
                        <DonutChart data={[
                            { name: 'Di Atas Stok Minimum', value: stockComposition?.above || 0 },
                            { name: 'Di Bawah Stok Minimum', value: stockComposition?.below || 0 },
                        ]} />
                        <div className="flex gap-4 mt-4 text-xs font-semibold">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" /> Di Atas Stok Min</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-500" /> Di Bawah Stok Min</span>
                        </div>
                    </div>
                </Section>

                <Section title="Stok Barang" className="xl:col-span-2"
                    extra={
                        <div className="flex gap-2">
                            <select value={stockCat} onChange={e => { setStockCat(e.target.value); }}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                <option value="">Semua Barang</option>
                                {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <form onSubmit={filterStock} className="relative">
                                <input type="text" value={stockSearch} onChange={e => setStockSearch(e.target.value)}
                                    placeholder="Search" className="bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2"><Search className="w-3 h-3 text-slate-400" /></button>
                            </form>
                        </div>
                    }>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-5 py-3 font-bold">No</th>
                                    <th className="px-5 py-3 font-bold">Nama Barang</th>
                                    <th className="px-5 py-3 font-bold text-right">Stok Min</th>
                                    <th className="px-5 py-3 font-bold text-right">Stok</th>
                                    <th className="px-5 py-3 font-bold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stockProducts?.data?.length > 0 ? stockProducts.data.map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-slate-50/60">
                                        <td className="px-5 py-2.5 text-slate-400">{(stockProducts.current_page - 1) * stockProducts.per_page + idx + 1}</td>
                                        <td className="px-5 py-2.5 font-medium text-slate-800">{p.name}</td>
                                        <td className="px-5 py-2.5 text-right text-slate-600">{p.stock_minimum}</td>
                                        <td className="px-5 py-2.5 text-right">
                                            <span className={`font-bold ${p.is_low ? 'text-rose-500' : 'text-emerald-600'}`}>{p.stock}</span>
                                        </td>
                                        <td className="px-5 py-2.5 text-right">
                                            <Link href={route('products.edit', p.id)} className="px-2.5 py-1 text-xs font-semibold bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Edit</Link>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400 text-xs">Tidak ada data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {stockProducts?.links && <Pagination links={stockProducts.links} />}
                </Section>
            </div>

            {/* ═══ ROW: Piutang Terbesar + Piutang Jatuh Tempo ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Section title="Piutang Terbesar">
                    <div className="p-5 space-y-3">
                        {topReceivables?.length > 0 ? topReceivables.map((r, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                                        {r.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{r.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(r.total)}</span>
                            </div>
                        )) : <p className="text-sm text-slate-400 text-center py-4">Tidak ada piutang</p>}
                    </div>
                </Section>

                <Section title="Piutang Jatuh Tempo" className="xl:col-span-2"
                    extra={
                        <select value={overdueFilter} onChange={e => router.get(route('dashboard'), { year, overdue_days: e.target.value }, { preserveState: true, preserveScroll: true })}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                            <option value="30">Lewat 30 hari</option>
                            <option value="60">Lewat 60 hari</option>
                            <option value="90">Lewat 90 hari</option>
                        </select>
                    }>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-5 py-3 font-bold">No</th>
                                    <th className="px-5 py-3 font-bold">Nama Customer</th>
                                    <th className="px-5 py-3 font-bold">No. Invoice</th>
                                    <th className="px-5 py-3 font-bold">Tgl. Transaksi</th>
                                    <th className="px-5 py-3 font-bold text-right">Neto</th>
                                    <th className="px-5 py-3 font-bold text-right">Kurang</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {overdueSales?.data?.length > 0 ? overdueSales.data.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50/60">
                                        <td className="px-5 py-2.5 text-slate-400">{(overdueSales.current_page - 1) * overdueSales.per_page + idx + 1}</td>
                                        <td className="px-5 py-2.5 font-medium text-slate-800">{s.customer}</td>
                                        <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{s.invoice}</td>
                                        <td className="px-5 py-2.5 text-slate-500">{s.date}</td>
                                        <td className="px-5 py-2.5 text-right font-mono text-slate-700">{formatCurrency(s.total)}</td>
                                        <td className="px-5 py-2.5 text-right font-mono font-bold text-rose-500">{formatCurrency(s.remaining)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400 text-xs">Tidak ada piutang jatuh tempo</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {overdueSales?.links && <Pagination links={overdueSales.links} />}
                </Section>
            </div>

            {/* ═══ ROW: Penjualan Barang Terbesar + Paling Banyak Terjual ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Section title="Penjualan Barang Terbesar" className="xl:col-span-2"
                    extra={<YearSelect value={year} onChange={changeYear} years={availableYears || []} />}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-5 py-3 font-bold">No</th>
                                    <th className="px-5 py-3 font-bold">Nama Barang</th>
                                    <th className="px-5 py-3 font-bold text-right">Harga Satuan</th>
                                    <th className="px-5 py-3 font-bold text-right">Jumlah</th>
                                    <th className="px-5 py-3 font-bold text-right">Total</th>
                                    <th className="px-5 py-3 font-bold text-right">Kontribusi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {topSellingProducts?.data?.length > 0 ? topSellingProducts.data.map((item, idx) => {
                                    const contrib = grandTotalSales > 0 ? ((item.total_sales / grandTotalSales) * 100).toFixed(0) : 0;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/60">
                                            <td className="px-5 py-2.5 text-slate-400">{(topSellingProducts.current_page - 1) * topSellingProducts.per_page + idx + 1}</td>
                                            <td className="px-5 py-2.5 font-medium text-slate-800">{item.product?.name}</td>
                                            <td className="px-5 py-2.5 text-right font-mono text-slate-600">{item.total_qty > 0 ? formatCurrency(item.total_sales / item.total_qty) : '-'}</td>
                                            <td className="px-5 py-2.5 text-right font-mono text-slate-600">{item.total_qty}</td>
                                            <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(item.total_sales)}</td>
                                            <td className="px-5 py-2.5 text-right font-bold text-blue-600">{contrib}%</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400 text-xs">Tidak ada data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {topSellingProducts?.links && <Pagination links={topSellingProducts.links} />}
                </Section>

                <Section title="Paling Banyak Terjual"
                    extra={<YearSelect value={year} onChange={changeYear} years={availableYears || []} />}>
                    <div className="p-5 flex flex-col items-center">
                        <DonutChart data={mostSoldPie || []} size={160} thickness={35} />
                        <div className="mt-4 space-y-1.5 w-full">
                            {(mostSoldPie || []).map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: PIE_COLORS[i]}} />
                                    <span className="truncate">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>
            </div>

            {/* ═══ ROW: Kategori Terlaris + Penjualan Terbesar per Kategori + Item Terbaru ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <Section title="Kategori Terlaris"
                    extra={<YearSelect value={year} onChange={changeYear} years={availableYears || []} />}>
                    <div className="p-5 flex flex-col items-center">
                        <DonutChart data={topCategories || []} size={150} thickness={30} />
                        <div className="mt-4 space-y-1.5 w-full">
                            {(topCategories || []).map((c, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor: PIE_COLORS[i]}} />
                                    <span>{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                <Section title="Penjualan Terbesar"
                    extra={<YearSelect value={year} onChange={changeYear} years={availableYears || []} />}>
                    <div className="p-5 space-y-3">
                        {(topCategorySales || []).map((c, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-sm shrink-0" style={{backgroundColor: PIE_COLORS[i]}} />
                                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(c.value)}</span>
                            </div>
                        ))}
                        {(!topCategorySales || topCategorySales.length === 0) && (
                            <p className="text-sm text-slate-400 text-center py-4">Tidak ada data</p>
                        )}
                    </div>
                </Section>

                <Section title="Item Terbaru">
                    <div className="p-5 space-y-3">
                        {(latestProducts || []).map((p) => (
                            <div key={p.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                        {p.image ? (
                                            <img src={`/storage/${p.image}`} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Package className="w-4 h-4 text-slate-300" />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{p.name}</span>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{formatCurrency(p.selling_price)}</span>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>

            {/* ═══ ROW: Pelanggan Terbesar + Penjualan Terbaru ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Section title="Pelanggan Terbesar"
                    extra={<YearSelect value={year} onChange={changeYear} years={availableYears || []} />}>
                    <div className="p-5 space-y-3">
                        {(topCustomers || []).map((c, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                                        {c.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(c.total)}</span>
                            </div>
                        ))}
                        {(!topCustomers || topCustomers.length === 0) && (
                            <p className="text-sm text-slate-400 text-center py-4">Tidak ada data</p>
                        )}
                    </div>
                </Section>

                <Section title="Penjualan Terbaru" className="xl:col-span-2"
                    extra={<YearSelect value={year} onChange={changeYear} years={availableYears || []} />}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-5 py-3 font-bold">No</th>
                                    <th className="px-5 py-3 font-bold">Nama Pembeli</th>
                                    <th className="px-5 py-3 font-bold text-right">Jml. Item</th>
                                    <th className="px-5 py-3 font-bold text-right">Nilai</th>
                                    <th className="px-5 py-3 font-bold">Tanggal Transaksi</th>
                                    <th className="px-5 py-3 font-bold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentSales?.data?.length > 0 ? recentSales.data.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50/60">
                                        <td className="px-5 py-2.5 text-slate-400">{(recentSales.current_page - 1) * recentSales.per_page + idx + 1}</td>
                                        <td className="px-5 py-2.5 font-medium text-slate-800">{s.customer}</td>
                                        <td className="px-5 py-2.5 text-right font-mono text-slate-600">{s.items_count}</td>
                                        <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(s.total)}</td>
                                        <td className="px-5 py-2.5 text-slate-500">{s.date}</td>
                                        <td className="px-5 py-2.5">
                                            <Badge variant={s.status === 'paid' ? 'success' : s.status === 'partial' ? 'warning' : 'danger'}>
                                                {s.status === 'paid' ? 'Lunas' : s.status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                                            </Badge>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400 text-xs">Belum ada data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {recentSales?.links && <Pagination links={recentSales.links} />}
                </Section>
            </div>
        </AppLayout>
    );
}
