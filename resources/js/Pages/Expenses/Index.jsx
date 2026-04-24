import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Wallet, Plus, X, Trash2, Calendar, FileText } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';

export default function ExpensesIndex({ expenses }) {
    const [showModal, setShowModal] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        expense_date: new Date().toISOString().split('T')[0],
        type: 'operasional',
        amount: '',
        notes: ''
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('expenses.store'), {
            onSuccess: () => {
                setShowModal(false);
                reset();
            }
        });
    };

    return (
        <AppLayout title="Kasbon & Biaya Operasional">
            <Head title="Kasbon & Biaya Operasional" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Kasbon & Biaya</h2>
                    <p className="text-sm text-slate-500 mt-1">Catat pengeluaran tunai laci kasir (listrik, kasbon, makan, dll)</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" /> Catat Pengeluaran
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-900">
                            <tr>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Tipe Biaya</th>
                                <th className="px-6 py-4 font-bold">Nominal (Rp)</th>
                                <th className="px-6 py-4 font-bold">Keterangan</th>
                                <th className="px-6 py-4 font-bold">Pencatat</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.data.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        Belum ada catatan pengeluaran.
                                    </td>
                                </tr>
                            ) : expenses.data.map((expense) => (
                                <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-800">{new Date(expense.expense_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            expense.type === 'kasbon' ? 'bg-amber-100 text-amber-700' :
                                            expense.type === 'operasional' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {expense.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 font-bold text-rose-600">-Rp{new Intl.NumberFormat('id-ID').format(expense.amount)}</td>
                                    <td className="px-6 py-3 truncate max-w-[200px]">{expense.notes}</td>
                                    <td className="px-6 py-3 text-slate-500">
                                        {expense.user?.name}
                                        {expense.shift_id && <span className="block text-[10px] text-emerald-600 font-semibold">[Shift Terpotong]</span>}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <Link
                                            href={route('expenses.destroy', expense.id)}
                                            method="delete"
                                            as="button"
                                            className="text-slate-400 hover:text-rose-600 transition-colors bg-white p-2 rounded-lg hover:bg-rose-50"
                                            preserveScroll
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Create Expense */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Catat Pengeluaran Baru</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={submit} className="p-6 space-y-4">
                            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-semibold mb-2">
                                Info: Catatan biaya di sini akan otomatis MENGURANGI saldo Uang Fisik Laci (Actual Cash) di Shift Anda saat ini.
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        value={data.expense_date}
                                        onChange={e => setData('expense_date', e.target.value)}
                                        className="w-full border-slate-200 rounded-xl focus:ring-blue-500"
                                    />
                                    {errors.expense_date && <p className="text-xs text-rose-500 mt-1">{errors.expense_date}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Biaya</label>
                                    <select
                                        value={data.type}
                                        onChange={e => setData('type', e.target.value)}
                                        className="w-full border-slate-200 rounded-xl focus:ring-blue-500"
                                    >
                                        <option value="operasional">Operasional (Parkir, Listrik dll)</option>
                                        <option value="kasbon">Kasbon Pegawai</option>
                                        <option value="lainnya">Lainnya</option>
                                    </select>
                                    {errors.type && <p className="text-xs text-rose-500 mt-1">{errors.type}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.amount}
                                        onChange={e => setData('amount', e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-12 pr-4 py-2 border-slate-200 rounded-xl focus:ring-blue-500 font-bold text-lg"
                                    />
                                </div>
                                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Keterangan / Tujuan</label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Contoh: Beli galon 2 buah..."
                                    className="w-full border-slate-200 rounded-xl focus:ring-blue-500 min-h-[80px]"
                                />
                                {errors.notes && <p className="text-xs text-rose-500 mt-1">{errors.notes}</p>}
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-xl bg-blue-600 font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 inline-flex justify-center items-center gap-2">
                                    {processing ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
