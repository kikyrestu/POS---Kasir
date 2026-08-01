import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useState } from 'react';
import { Plus, Edit, Trash2, X, Tags } from 'lucide-react';
import { Button, Input, Modal } from '@/Components/UI';
import { formatCurrency, formatDate } from '@/Utils/format';

export default function VouchersIndex({ vouchers }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const { data, setData, post, put, delete: destroy, reset, processing, errors } = useForm({
        code: '',
        name: '',
        type: 'fixed',
        amount: '',
        valid_from: '',
        valid_until: '',
        max_uses: '',
        min_purchase: '0',
        is_active: true,
    });

    const openModal = (voucher = null) => {
        if (voucher) {
            setEditingId(voucher.id);
            setData({
                code: voucher.code,
                name: voucher.name,
                type: voucher.type,
                amount: voucher.amount,
                valid_from: voucher.valid_from ? voucher.valid_from.split('T')[0] : '',
                valid_until: voucher.valid_until ? voucher.valid_until.split('T')[0] : '',
                max_uses: voucher.max_uses || '',
                min_purchase: voucher.min_purchase,
                is_active: !!voucher.is_active,
            });
        } else {
            setEditingId(null);
            reset();
            setData('is_active', true);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            put(route('vouchers.update', editingId), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('vouchers.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id) => {
        if (confirm('Yakin ingin menghapus voucher ini?')) {
            destroy(route('vouchers.destroy', id));
        }
    };

    return (
        <AppLayout title="Voucher & Promo">
            <Head title="Voucher & Promo" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Manajemen Voucher</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola kode promo dan diskon untuk pelanggan.</p>
                </div>
                <Button onClick={() => openModal()} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Voucher
                </Button>
            </div>

            {vouchers.data.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm px-6 py-12 text-center text-slate-500">
                    <Tags className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Belum ada data voucher.</p>
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                        {vouchers.data.map((voucher) => (
                            <div key={voucher.id} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">{voucher.code}</span>
                                        <span className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full ${voucher.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openModal(voucher)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(voucher.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="font-semibold text-slate-800 text-sm">{voucher.name}</p>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <p className="text-slate-400 font-medium">Diskon</p>
                                        <p className="font-bold text-slate-700 mt-0.5">
                                            {voucher.type === 'percent' ? `${parseFloat(voucher.amount)}%` : formatCurrency(voucher.amount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-medium">Min. Belanja</p>
                                        <p className="font-semibold text-slate-600 mt-0.5">{formatCurrency(voucher.min_purchase)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-medium">Masa Berlaku</p>
                                        <p className="text-slate-600 mt-0.5">
                                            {voucher.valid_from ? formatDate(voucher.valid_from) : '∞'} — {voucher.valid_until ? formatDate(voucher.valid_until) : '∞'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 font-medium">Kuota</p>
                                        <p className="text-slate-600 mt-0.5">{voucher.used_count} / {voucher.max_uses || '∞'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Kode</th>
                                        <th className="px-6 py-4 font-semibold">Nama / Promo</th>
                                        <th className="px-6 py-4 font-semibold">Tipe & Nilai</th>
                                        <th className="px-6 py-4 font-semibold">Masa Berlaku</th>
                                        <th className="px-6 py-4 font-semibold">Kuota</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vouchers.data.map((voucher) => (
                                        <tr key={voucher.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{voucher.code}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800">{voucher.name}</p>
                                                <p className="text-xs text-slate-500">Min. Trx: {formatCurrency(voucher.min_purchase)}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-700">
                                                    {voucher.type === 'percent' ? `${parseFloat(voucher.amount)}%` : formatCurrency(voucher.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs">
                                                {voucher.valid_from ? formatDate(voucher.valid_from) : 'Selamanya'} <br/>
                                                s/d <br/>
                                                {voucher.valid_until ? formatDate(voucher.valid_until) : 'Selamanya'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-600">
                                                    {voucher.used_count} / {voucher.max_uses || '∞'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${voucher.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openModal(voucher)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(voucher.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Voucher' : 'Tambah Voucher'} maxWidth="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Kode Voucher (Unik)" value={data.code} onChange={e => setData('code', e.target.value.toUpperCase())} error={errors.code} placeholder="Cth: DISKON20" required />
                    
                    <Input label="Nama Promo" value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} placeholder="Cth: Promo Kemerdekaan" required />
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipe Diskon</label>
                            <select value={data.type} onChange={e => setData('type', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                <option value="fixed">Nominal (Rp)</option>
                                <option value="percent">Persentase (%)</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <Input label="Nilai Diskon" type="number" value={data.amount} onChange={e => setData('amount', e.target.value)} error={errors.amount} min="0" step="any" required />
                        </div>
                    </div>

                    <Input label="Minimal Belanja (Rp)" type="number" value={data.min_purchase} onChange={e => setData('min_purchase', e.target.value)} error={errors.min_purchase} min="0" />

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input label="Berlaku Dari" type="date" value={data.valid_from} onChange={e => setData('valid_from', e.target.value)} error={errors.valid_from} />
                        </div>
                        <div className="flex-1">
                            <Input label="Berlaku Sampai" type="date" value={data.valid_until} onChange={e => setData('valid_until', e.target.value)} error={errors.valid_until} />
                        </div>
                    </div>

                    <Input label="Batas Maksimal Pemakaian (Kosong = Unlimited)" type="number" value={data.max_uses} onChange={e => setData('max_uses', e.target.value)} error={errors.max_uses} min="1" />

                    <label className="flex items-center gap-3 cursor-pointer pt-2">
                        <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5" />
                        <span className="text-sm font-medium text-slate-700">Voucher Aktif</span>
                    </label>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={closeModal}>Batal</Button>
                        <Button type="submit" disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan Voucher'}</Button>
                    </div>
                </form>
            </Modal>

        </AppLayout>
    );
}
