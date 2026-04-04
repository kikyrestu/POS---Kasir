import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { Badge, Modal, Button, Input } from '@/Components/UI';
import { useState } from 'react';

export default function CategoryIndex({ categories }) {
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const form = useForm({
        name: '', icon: '', description: '', is_active: true,
    });

    const openCreate = () => {
        form.reset();
        form.clearErrors();
        setEditTarget(null);
        setShowForm(true);
    };

    const openEdit = (cat) => {
        form.setData({ name: cat.name, icon: cat.icon || '', description: cat.description || '', is_active: cat.is_active });
        form.clearErrors();
        setEditTarget(cat.id);
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editTarget) {
            form.put(route('categories.update', editTarget), { onSuccess: () => { setShowForm(false); setEditTarget(null); } });
        } else {
            form.post(route('categories.store'), { onSuccess: () => setShowForm(false) });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('categories.destroy', deleteTarget), { onSuccess: () => setDeleteTarget(null) });
    };

    return (
        <AppLayout title="Kategori">
            <Head title="Kategori" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Kategori Produk</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola kategori untuk pengelompokan produk</p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Tambah Kategori
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.length > 0 ? categories.map(cat => (
                    <div key={cat.id} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 hover:shadow-md hover:border-slate-300/80 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg">
                                    {cat.icon || <Tag className="w-5 h-5 text-blue-500" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{cat.name}</h3>
                                    <p className="text-xs text-slate-400">{cat.products_count || 0} produk</p>
                                </div>
                            </div>
                            <Badge variant={cat.is_active ? 'success' : 'danger'} className="text-[10px]">
                                {cat.is_active ? 'Aktif' : 'Off'}
                            </Badge>
                        </div>
                        {cat.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{cat.description}</p>}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(cat)} className="flex-1 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">Edit</button>
                            <button onClick={() => setDeleteTarget(cat.id)} className="flex-1 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">Hapus</button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Belum ada kategori</p>
                    </div>
                )}
            </div>

            <Modal show={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit Kategori' : 'Tambah Kategori'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nama Kategori *" value={form.data.name} onChange={e => form.setData('name', e.target.value)} error={form.errors.name} placeholder="Makanan, Minuman, dll" />
                    <Input label="Icon (Emoji)" value={form.data.icon} onChange={e => form.setData('icon', e.target.value)} placeholder="🍔 📱 👕" />
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi</label>
                        <textarea value={form.data.description} onChange={e => form.setData('description', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-16" placeholder="Deskripsi kategori (opsional)" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Batal</Button>
                        <Button type="submit" disabled={form.processing}>{form.processing ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Kategori">
                <p className="text-sm text-slate-600">Apakah Anda yakin? Produk di kategori ini akan menjadi tidak berkategori.</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}