import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Search, ShieldAlert, Edit, Trash2, PlusCircle, RotateCcw } from 'lucide-react';
import { Badge, Pagination } from '@/Components/UI';
import { useState } from 'react';

export default function ActivityLogs({ logs, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [actionType, setActionType] = useState(filters?.action_type || '');

    const handleFilter = (e) => {
        e?.preventDefault();
        router.get(route('activity-logs.index'), {
            search: search,
            action_type: actionType,
        }, { preserveState: true });
    };

    const actionIcons = {
        created: <PlusCircle className="w-4 h-4 text-emerald-500" />,
        updated: <Edit className="w-4 h-4 text-blue-500" />,
        deleted: <Trash2 className="w-4 h-4 text-rose-500" />,
        restored: <RotateCcw className="w-4 h-4 text-purple-500" />
    };
    
    const actionColors = {
        created: 'success',
        updated: 'info',
        deleted: 'danger',
        restored: 'warning'
    };

    return (
        <AppLayout title="Log Aktivitas Sistem">
            <Head title="Audit Trail" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Log Aktivitas (Audit Trail)</h2>
                    <p className="text-sm text-slate-500 mt-1">Lacak dan pantau semua aktivitas penting pengguna dalam sistem</p>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 flex flex-wrap gap-4 mt-6">
                <form onSubmit={handleFilter} className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama user atau entitas..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </form>
                <select value={actionType} onChange={e => { setActionType(e.target.value); setTimeout(() => handleFilter(), 10); }} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="">Semua Aksi</option>
                    <option value="created">Dibuat (Created)</option>
                    <option value="updated">Diperbarui (Updated)</option>
                    <option value="deleted">Dihapus (Deleted)</option>
                    <option value="restored">Dipulihkan (Restored)</option>
                </select>
                <button type="button" onClick={() => { setSearch(''); setActionType(''); router.get(route('activity-logs.index')); }} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200">Reset</button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold w-1/5">Waktu / User</th>
                                <th className="px-6 py-4 font-bold border-l border-slate-100">Aksi</th>
                                <th className="px-6 py-4 font-bold">Modul / ID</th>
                                <th className="px-6 py-4 font-bold">Detail Perubahan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {logs.data?.length > 0 ? logs.data.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors align-top">
                                    <td className="px-6 py-4">
                                        <p className="font-mono text-xs text-slate-500 font-semibold mb-1">
                                            {new Date(log.created_at).toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                                        </p>
                                        <p className="font-bold text-slate-800">{log.user?.name || 'Sistem'}</p>
                                    </td>
                                    <td className="px-6 py-4 border-l border-slate-50">
                                        <div className="flex items-center gap-2">
                                            {actionIcons[log.action] || <ShieldAlert className="w-4 h-4 text-slate-400" />}
                                            <Badge variant={actionColors[log.action] || 'default'} className="uppercase text-[10px]">
                                                {log.action}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-700">{log.model_type?.split('\\').pop()}</p>
                                        <p className="font-mono text-xs text-slate-400">ID: {log.model_id}</p>
                                    </td>
                                    <td className="px-6 py-4 w-1/2">
                                        {log.changes ? (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                                <pre className="text-[10px] text-slate-600 font-mono leading-relaxed max-h-32 overflow-y-auto">
                                                    {JSON.stringify(log.changes, null, 2)}
                                                </pre>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic text-xs">Tidak ada data/perubahan terekam</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-16 text-center text-slate-400">
                                        <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <p>Belum ada rekaman aktivitas apa pun di sistem.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {logs.links && <Pagination links={logs.links} />}
            </div>
        </AppLayout>
    );
}
