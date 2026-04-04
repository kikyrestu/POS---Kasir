import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Edit2, Trash2, Shield, Users } from 'lucide-react';
import { Badge, Modal, Button, Input } from '@/Components/UI';
import { useState } from 'react';

export default function RolesIndex({ roles, permissions, modules }) {
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const form = useForm({
        name: '', display_name: '', description: '', permissions: [],
    });

    const openCreate = () => {
        form.reset(); form.clearErrors(); setEditTarget(null); setShowForm(true);
    };

    const openEdit = (role) => {
        form.setData({
            name: role.name, display_name: role.display_name || '',
            description: role.description || '',
            permissions: role.permissions?.map(p => p.id) || [],
        });
        form.clearErrors(); setEditTarget(role.id); setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editTarget) {
            form.put(route('roles.update', editTarget), { onSuccess: () => { setShowForm(false); setEditTarget(null); } });
        } else {
            form.post(route('roles.store'), { onSuccess: () => setShowForm(false) });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('roles.destroy', deleteTarget), { onSuccess: () => setDeleteTarget(null) });
    };

    const togglePermission = (permId) => {
        const current = form.data.permissions;
        if (current.includes(permId)) {
            form.setData('permissions', current.filter(id => id !== permId));
        } else {
            form.setData('permissions', [...current, permId]);
        }
    };

    const toggleModule = (moduleName) => {
        const modulePerms = (modules?.[moduleName] || []).map(p => p.id);
        const allSelected = modulePerms.every(id => form.data.permissions.includes(id));
        if (allSelected) {
            form.setData('permissions', form.data.permissions.filter(id => !modulePerms.includes(id)));
        } else {
            form.setData('permissions', [...new Set([...form.data.permissions, ...modulePerms])]);
        }
    };

    return (
        <AppLayout title="Role & Permission">
            <Head title="Role & Permission" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Role & Permission</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola role dan hak akses</p>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Tambah Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles?.map(role => (
                    <div key={role.id} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{role.display_name || role.name}</h3>
                                    <p className="text-xs text-slate-400">{role.name}</p>
                                </div>
                            </div>
                        </div>
                        {role.description && <p className="text-xs text-slate-500 mb-3">{role.description}</p>}
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{role.users_count || 0} user</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-4 h-4" />
                                <span>{role.permissions?.length || 0} permission</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-4">
                            {role.permissions?.slice(0, 5).map(perm => (
                                <Badge key={perm.id} variant="default">{perm.display_name || perm.name}</Badge>
                            ))}
                            {(role.permissions?.length || 0) > 5 && (
                                <Badge variant="info">+{role.permissions.length - 5}</Badge>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                            <button onClick={() => openEdit(role)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            {role.users_count === 0 && (
                                <button onClick={() => setDeleteTarget(role.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            <Modal show={showForm} onClose={() => setShowForm(false)} title={editTarget ? 'Edit Role' : 'Tambah Role'} maxWidth="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Nama (slug) *" value={form.data.name} onChange={e => form.setData('name', e.target.value)} error={form.errors.name} />
                        <Input label="Display Name *" value={form.data.display_name} onChange={e => form.setData('display_name', e.target.value)} error={form.errors.display_name} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi</label>
                        <textarea value={form.data.description} onChange={e => form.setData('description', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-16" />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Permissions</label>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {modules && Object.entries(modules).map(([moduleName, perms]) => (
                                <div key={moduleName} className="border border-slate-200 rounded-xl p-4">
                                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                                        <input type="checkbox"
                                            checked={perms.every(p => form.data.permissions.includes(p.id))}
                                            onChange={() => toggleModule(moduleName)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-bold text-slate-800 capitalize">{moduleName}</span>
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                                        {perms.map(perm => (
                                            <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox"
                                                    checked={form.data.permissions.includes(perm.id)}
                                                    onChange={() => togglePermission(perm.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-xs text-slate-600">{perm.display_name || perm.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Batal</Button>
                        <Button type="submit" disabled={form.processing}>{form.processing ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Role">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus role ini?</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}
