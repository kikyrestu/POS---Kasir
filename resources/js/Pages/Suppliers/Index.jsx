import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Edit2, Trash2, Search, Truck } from 'lucide-react';
import { Badge, Pagination, Modal, Button, Input } from '@/Components/UI';
import { useState } from 'react';

export default function SupplierIndex({ suppliers, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const form = useForm({
        name: '', company: '', phone: '', email: '', address: '',
    });

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('suppliers.index'), { search }, { preserveState: true });
    };

    const openCreate = () => {
        form.reset(); form.clearErrors(); setEditTarget(null); setShowForm(true);
    };

    const openEdit = (supplier) => {
        form.setData({
            name: supplier.name || '', company: supplier.company || '', phone: supplier.phone || '',
            email: supplier.email || '', address: supplier.address || '',
        });
        form.clearErrors(); setEditTarget(supplier.id); setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editTarget) {
            form.put(route('suppliers.update', editTarget), { onSuccess: () => { setShowForm(false); setEditTarget(null); } });
        } else {
            form.post(route('suppliers.store'), { onSuccess: () => setShowForm(false) });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('suppliers.destroy', deleteTarget), { onSuccess: () => setDeleteTarget(null) });
    };

    return (
        <AppLayout title="Supplier">
            <Head title="Supplier" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Supplier</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola data supplier</p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Tambah Supplier
                </button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <form onSubmit={handleSearch} className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari supplier..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </form>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Nama</th>
                                <th className="px-6 py-4 font-bold">Perusahaan</th>
                                <th className="px-6 py-4 font-bold">Telepon</th>
                                <th className="px-6 py-4 font-bold">Email</th>
                                <th className="px-6 py-4 font-bold text-center">Pembelian</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {suppliers.data?.length > 0 ? suppliers.data.map(supplier => (
                                <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-teal-50 rounded-full flex items-center justify-center">
                                                <Truck className="w-4 h-4 text-teal-500" />
                                            </div>
                                            <p className="font-semibold text-slate-900">{supplier.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{supplier.company || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">{supplier.phone || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">{supplier.email || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="info">{supplier.purchases_count || 0}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(supplier)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteTarget(supplier.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Belum ada supplier</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/50">
                    {suppliers.data?.length > 0 ? suppliers.data.map(supplier => (
                        <div key={supplier.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center shrink-0">
                                    <Truck className="w-5 h-5 text-teal-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{supplier.name}</p>
                                    {supplier.company && <p className="text-xs font-semibold text-slate-600 mt-0.5">{supplier.company}</p>}
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2 mt-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500">Telepon</span>
                                    <span className="text-sm font-semibold text-slate-700">{supplier.phone || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500">Email</span>
                                    <span className="text-sm font-semibold text-slate-700">{supplier.email || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500">Total Pembelian</span>
                                    <Badge variant="info">{supplier.purchases_count || 0}</Badge>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => openEdit(supplier)}
                                    className="flex-1 py-2 text-center text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Edit2 className="w-4 h-4" /> Edit
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(supplier.id)}
                                    className="flex-1 py-2 text-center text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" /> Hapus
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Belum ada supplier</p>
                        </div>
                    )}
                </div>

                {suppliers.links && <Pagination links={suppliers.links} />}
            </div>

            <Modal show={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit Supplier' : 'Tambah Supplier'} maxWidth="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nama *" value={form.data.name} onChange={e => form.setData('name', e.target.value)} error={form.errors.name} />
                    <Input label="Perusahaan" value={form.data.company} onChange={e => form.setData('company', e.target.value)} error={form.errors.company} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Telepon" value={form.data.phone} onChange={e => form.setData('phone', e.target.value)} error={form.errors.phone} />
                        <Input label="Email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} error={form.errors.email} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat</label>
                        <textarea value={form.data.address} onChange={e => form.setData('address', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-16" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Batal</Button>
                        <Button type="submit" disabled={form.processing}>{form.processing ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Supplier">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus supplier ini?</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}
