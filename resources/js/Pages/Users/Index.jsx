import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Edit2, Trash2, Search, UserCheck, UserX, Shield } from 'lucide-react';
import { Badge, Pagination, Modal, Button, Input, Select } from '@/Components/UI';
import { useState } from 'react';

export default function UsersIndex({ users, roles, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const form = useForm({
        name: '', email: '', password: '', password_confirmation: '', role_id: '', is_active: true,
    });

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('users.index'), { search }, { preserveState: true });
    };

    const openCreate = () => {
        form.reset(); form.clearErrors(); setEditTarget(null); setShowForm(true);
    };

    const openEdit = (user) => {
        form.setData({
            name: user.name, email: user.email, password: '', password_confirmation: '',
            role_id: user.role_id || '', is_active: user.is_active,
        });
        form.clearErrors(); setEditTarget(user.id); setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editTarget) {
            form.put(route('users.update', editTarget), { onSuccess: () => { setShowForm(false); setEditTarget(null); } });
        } else {
            form.post(route('users.store'), { onSuccess: () => setShowForm(false) });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('users.destroy', deleteTarget), { onSuccess: () => setDeleteTarget(null) });
    };

    const handleToggleActive = (user) => {
        router.patch(route('users.toggle-active', user.id));
    };

    return (
        <AppLayout title="User Management">
            <Head title="User Management" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola pengguna sistem</p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Tambah User
                </button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <form onSubmit={handleSearch} className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari user..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </form>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Nama</th>
                                <th className="px-6 py-4 font-bold">Email</th>
                                <th className="px-6 py-4 font-bold">Role</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {users.data?.length > 0 ? users.data.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${user.is_active ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                                                <Shield className={`w-4 h-4 ${user.is_active ? 'text-emerald-500' : 'text-slate-400'}`} />
                                            </div>
                                            <p className="font-semibold text-slate-900">{user.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant="info">{user.role?.display_name || user.role?.name || '-'}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleToggleActive(user)} className="focus:outline-none">
                                            <Badge variant={user.is_active ? 'success' : 'danger'}>
                                                {user.is_active ? 'Aktif' : 'Nonaktif'}
                                            </Badge>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteTarget(user.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Belum ada user</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {users.links && <Pagination links={users.links} />}
            </div>

            <Modal show={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit User' : 'Tambah User'} maxWidth="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nama *" value={form.data.name} onChange={e => form.setData('name', e.target.value)} error={form.errors.name} />
                    <Input label="Email *" type="email" value={form.data.email} onChange={e => form.setData('email', e.target.value)} error={form.errors.email} />
                    <Input label={editTarget ? 'Password (kosongkan jika tidak diubah)' : 'Password *'} type="password" value={form.data.password} onChange={e => form.setData('password', e.target.value)} error={form.errors.password} />
                    <Input label="Konfirmasi Password" type="password" value={form.data.password_confirmation} onChange={e => form.setData('password_confirmation', e.target.value)} />
                    <Select label="Role *" value={form.data.role_id} onChange={e => form.setData('role_id', e.target.value)} error={form.errors.role_id}>
                        <option value="">Pilih Role</option>
                        {roles?.map(role => (
                            <option key={role.id} value={role.id}>{role.display_name || role.name}</option>
                        ))}
                    </Select>
                    {editTarget && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.data.is_active} onChange={e => form.setData('is_active', e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-slate-700">Aktif</span>
                        </label>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Batal</Button>
                        <Button type="submit" disabled={form.processing}>{form.processing ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus User">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus user ini?</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}
