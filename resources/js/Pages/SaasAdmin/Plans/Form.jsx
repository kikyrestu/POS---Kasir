import { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Input, Label, Button } from '@/Components/UI';
import { toast } from 'sonner';

export default function PlansForm({ plan, availableFeatures }) {
    const isEdit = !!plan;
    
    // Default form setup
    const { data, setData, post, put, processing, errors } = useForm({
        name: plan?.name || '',
        description: plan?.description || '',
        price_monthly: plan?.price_monthly || 0,
        price_yearly: plan?.price_yearly || 0,
        features: plan?.features || [],
        limits: plan?.limits || { max_products: 50, max_users: 2 },
        is_active: plan?.is_active ?? true
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(route('admin.plans.update', plan.id), {
                onSuccess: () => toast.success('Paket berhasil diperbarui.')
            });
        } else {
            post(route('admin.plans.store'), {
                onSuccess: () => toast.success('Paket berhasil ditambahkan.')
            });
        }
    };

    const toggleFeature = (featureKey) => {
        const currentFeatures = [...data.features];
        if (currentFeatures.includes(featureKey)) {
            setData('features', currentFeatures.filter(f => f !== featureKey));
        } else {
            setData('features', [...currentFeatures, featureKey]);
        }
    };

    return (
        <SaasAdminLayout title={isEdit ? "Edit Paket" : "Tambah Paket Baru"}>
            <div className="max-w-4xl">
                <Link href={route('admin.plans.index')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Paket
                </Link>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Info Utama */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader className="border-b border-slate-100 pb-4">
                                    <CardTitle className="text-lg font-bold">Informasi Utama</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-1.5">
                                        <Label>Nama Paket (Plan Name)</Label>
                                        <Input
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            placeholder="Contoh: Pro Plan"
                                            required
                                        />
                                        {errors.name && <p className="text-sm text-rose-500">{errors.name}</p>}
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <Label>Deskripsi</Label>
                                        <textarea
                                            className="w-full rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm shadow-sm"
                                            rows="3"
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder="Penjelasan singkat mengenai paket ini..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label>Harga Bulanan (Rp)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.price_monthly}
                                                onChange={e => setData('price_monthly', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Harga Tahunan (Rp)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.price_yearly}
                                                onChange={e => setData('price_yearly', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="border-b border-slate-100 pb-4">
                                    <CardTitle className="text-lg font-bold">Akses Modul & Fitur</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {availableFeatures.map((f) => (
                                            <label key={f.key} className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    checked={data.features.includes(f.key)}
                                                    onChange={() => toggleFeature(f.key)}
                                                    className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                                                    <p className="text-xs text-slate-500">{f.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Setting Limits & Status */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="border-b border-slate-100 pb-4">
                                    <CardTitle className="text-lg font-bold">Limitasi Kuota</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-xl flex gap-2">
                                        <Info className="w-4 h-4 shrink-0" />
                                        <p>Isi dengan angka <strong>-1</strong> jika ingin memberikan akses <em>Unlimited</em> (Tanpa batas).</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Maksimal Produk</Label>
                                        <Input
                                            type="number"
                                            value={data.limits.max_products}
                                            onChange={e => setData('limits', { ...data.limits, max_products: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Maksimal User (Kasir/Staf)</Label>
                                        <Input
                                            type="number"
                                            value={data.limits.max_users}
                                            onChange={e => setData('limits', { ...data.limits, max_users: e.target.value })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={data.is_active}
                                                onChange={e => setData('is_active', e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Status Paket Aktif</span>
                                    </label>

                                    <Button type="submit" disabled={processing} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 py-2.5">
                                        <Save className="w-4 h-4" />
                                        {isEdit ? 'Simpan Perubahan' : 'Buat Paket Baru'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </SaasAdminLayout>
    );
}
