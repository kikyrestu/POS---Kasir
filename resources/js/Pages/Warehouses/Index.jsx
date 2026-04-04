import { Head, useForm, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Edit2, Trash2, Warehouse, Package, Eye } from 'lucide-react';
import { Badge, Modal, Button, Input } from '@/Components/UI';
import { useState } from 'react';

export default function WarehouseIndex({ warehouses }) {
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const form = useForm({
        name: '', address: '', phone: '', is_default: false, is_active: true,
    });

    const openCreate = () => {
        form.reset(); form.clearErrors(); setEditTarget(null); setShowForm(true);
    };

    const openEdit = (wh) => {
        form.setData({
            name: wh.name, address: wh.address || '', phone: wh.phone || '', is_default: wh.is_default, is_active: wh.is_active,
        });
        form.clearErrors(); setEditTarget(wh.id); setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editTarget) {
            form.put(route('warehouses.update', editTarget), { onSuccess: () => { setShowForm(false); setEditTarget(null); } });
        } else {
            form.post(route('warehouses.store'), { onSuccess: () => setShowForm(false) });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('warehouses.destroy', deleteTarget), { onSuccess: () => setDeleteTarget(null) });
    };

    return (
        <AppLayout title="Gudang">
            <Head title="Gudang" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gudang</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola data gudang</p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Tambah Gudang
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses?.length > 0 ? warehouses.map(wh => (
                    <div key={wh.id} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Warehouse className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{wh.name}</h3>
                                    {wh.address && <p className="text-xs text-slate-400">{wh.address}</p>}
                                </div>
                            </div>
                            {wh.is_default && <Badge variant="success">Default</Badge>}
                            {!wh.is_active && <Badge variant="danger">Nonaktif</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                            <div className="flex items-center gap-1.5">
                                <Package className="w-4 h-4" />
                                <span>{wh.product_stocks_count || 0} produk</span>
                            </div>
                            <div className="font-mono text-xs">
                                Total: {wh.product_stocks_sum_quantity || 0} unit
                            </div>
                        </div>
                        {wh.phone && <p className="text-xs text-slate-400 mb-4">Tel: {wh.phone}</p>}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <Link href={route('warehouses.show', wh.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Lihat Stok
                            </Link>
                            <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(wh)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                {!wh.is_default && (
                                    <button onClick={() => setDeleteTarget(wh.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-12 text-center text-slate-400">
                        Belum ada gudang
                    </div>
                )}
            </div>

            <Modal show={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit Gudang' : 'Tambah Gudang'} maxWidth="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nama Gudang *" value={form.data.name} onChange={e => form.setData('name', e.target.value)} error={form.errors.name} />
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat</label>
                        <textarea value={form.data.address} onChange={e => form.setData('address', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-16" />
                    </div>
                    <Input label="Telepon" value={form.data.phone} onChange={e => form.setData('phone', e.target.value)} error={form.errors.phone} />
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.data.is_default} onChange={e => form.setData('is_default', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-slate-700">Jadikan gudang default</span>
                    </label>
                    {editTarget && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.data.is_active} onChange={e => form.setData('is_active', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-slate-700">Gudang aktif</span>
                        </label>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Batal</Button>
                        <Button type="submit" disabled={form.processing}>{form.processing ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Gudang">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus gudang ini? Pastikan gudang tidak memiliki stok.</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}
