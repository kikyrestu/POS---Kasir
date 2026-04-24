import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DownloadCloud, Users, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';

export default function Receivables({ receivables }) {
    const handleExport = () => {
        window.location.href = route('reports.receivables', { export: 'excel' });
    };

    const maxDebt = Math.max(...receivables.map(r => r.total_debt), 1);

    return (
        <AppLayout title="Aging Piutang (Receivables)">
            <Head title="Laporan Piutang" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Laporan Piutang Pelanggan</h2>
                    <p className="text-sm text-slate-500 mt-1">Aging report berdasarkan umur jatuh tempo hutang pelanggan</p>
                </div>
                <button onClick={handleExport} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:bg-emerald-700 transition-all">
                    <DownloadCloud className="w-4 h-4" /> Export Excel
                </button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold w-1/4">Nama Pelanggan</th>
                                <th className="px-6 py-4 font-bold text-right text-emerald-600 bg-emerald-50/30">&lt; 30 Hari</th>
                                <th className="px-6 py-4 font-bold text-right text-orange-500 bg-orange-50/30">30 - 60 Hari</th>
                                <th className="px-6 py-4 font-bold text-right text-rose-600 bg-rose-50/30">&gt; 60 Hari (Macet)</th>
                                <th className="px-6 py-4 font-bold text-right border-l border-slate-200">Total Piutang</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {receivables?.length > 0 ? receivables.map((recv) => (
                                <tr key={recv.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                {recv.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-base">{recv.name}</p>
                                                <p className="text-xs text-slate-500">{recv.phone || 'Tidak ada no. telp'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-mono text-emerald-600 bg-emerald-50/10 opacity-80">{recv.debt_under_30 > 0 ? formatCurrency(recv.debt_under_30) : '-'}</td>
                                    <td className="px-6 py-5 text-right font-mono text-orange-500 bg-orange-50/10 font-medium">{recv.debt_30_to_60 > 0 ? formatCurrency(recv.debt_30_to_60) : '-'}</td>
                                    <td className="px-6 py-5 text-right font-mono text-rose-600 bg-rose-50/10 font-bold">{recv.debt_over_60 > 0 ? (
                                        <div className="flex items-center justify-end gap-1"><AlertTriangle className="w-3 h-3" /> {formatCurrency(recv.debt_over_60)}</div>
                                    ) : '-'}</td>
                                    <td className="px-6 py-5 border-l border-slate-50">
                                        <div className="flex flex-col gap-1 items-end">
                                            <span className="font-mono font-bold text-slate-900 text-lg">{formatCurrency(recv.total_debt)}</span>
                                            {/* Bar indicator */}
                                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                                <div style={{ width: `${(recv.debt_under_30 / recv.total_debt) * 100}%` }} className="bg-emerald-400 h-full"></div>
                                                <div style={{ width: `${(recv.debt_30_to_60 / recv.total_debt) * 100}%` }} className="bg-orange-400 h-full"></div>
                                                <div style={{ width: `${(recv.debt_over_60 / recv.total_debt) * 100}%` }} className="bg-rose-500 h-full"></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <p>Tidak ada pelanggan yang masih menunggak piutang.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
