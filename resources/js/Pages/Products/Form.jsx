import { Head, useForm, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Save, ArrowLeft, Upload, X, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/Components/UI';
import { useState } from 'react';

export default function ProductForm({ product, categories, warehouses, generatedBarcode }) {
    const isEdit = !!product;

    const { data, setData, post, put, processing, errors } = useForm({
        name: product?.name || '',
        barcode: product?.barcode || generatedBarcode || '',
        code: product?.code || '',
        category_id: product?.category_id || '',
        unit: product?.unit || 'pcs',
        cost_price: product?.cost_price || '',
        selling_price: product?.selling_price || '',
        stock_minimum: product?.stock_minimum || 10,
        description: product?.description || '',
        image: null,
        expiry_date: product?.expiry_date || '',
        is_active: product?.is_active ?? true,
        stocks: product?.stocks?.map(s => ({ warehouse_id: s.warehouse_id, quantity: s.quantity }))
            || (warehouses?.length ? [{ warehouse_id: warehouses[0]?.id, quantity: 0 }] : []),
    });

    const [imagePreview, setImagePreview] = useState(product?.image ? `/storage/${product.image}` : null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            router.post(route('products.update', product.id), {
                ...data,
                _method: 'PUT',
            }, {
                forceFormData: true,
            });
        } else {
            post(route('products.store'), { forceFormData: true });
        }
    };

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const addStock = () => {
        setData('stocks', [...data.stocks, { warehouse_id: warehouses[0]?.id || '', quantity: 0 }]);
    };

    const removeStock = (idx) => {
        setData('stocks', data.stocks.filter((_, i) => i !== idx));
    };

    const updateStock = (idx, field, value) => {
        const updated = [...data.stocks];
        updated[idx][field] = field === 'quantity' ? parseInt(value) || 0 : value;
        setData('stocks', updated);
    };

    return (
        <AppLayout title={isEdit ? 'Edit Produk' : 'Tambah Produk'}>
            <Head title={isEdit ? 'Edit Produk' : 'Tambah Produk'} />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={route('products.index')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{isEdit ? `Edit data ${product.name}` : 'Isi data produk baru'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-5">
                        <h3 className="font-bold text-slate-900">Informasi Dasar</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Input label="Nama Produk *" value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} placeholder="Masukkan nama produk" />
                            </div>
                            <Input label="Barcode" value={data.barcode} onChange={e => setData('barcode', e.target.value)} error={errors.barcode} placeholder="Auto generate" />
                            <Input label="Kode Produk" value={data.code} onChange={e => setData('code', e.target.value)} error={errors.code} placeholder="SKU-001" />
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
                                <select
                                    value={data.category_id}
                                    onChange={e => setData('category_id', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                >
                                    <option value="">Pilih Kategori</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.category_id && <p className="text-xs text-rose-500 mt-1">{errors.category_id}</p>}
                            </div>
                            <Input label="Satuan *" value={data.unit} onChange={e => setData('unit', e.target.value)} error={errors.unit} placeholder="pcs, kg, liter" />
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-5">
                        <h3 className="font-bold text-slate-900">Harga</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Harga Beli *" type="number" value={data.cost_price} onChange={e => setData('cost_price', e.target.value)} error={errors.cost_price} placeholder="0" min="0" />
                            <Input label="Harga Jual *" type="number" value={data.selling_price} onChange={e => setData('selling_price', e.target.value)} error={errors.selling_price} placeholder="0" min="0" />
                            <Input label="Stok Minimum" type="number" value={data.stock_minimum} onChange={e => setData('stock_minimum', e.target.value)} error={errors.stock_minimum} placeholder="10" min="0" />
                        </div>
                        {data.cost_price && data.selling_price && (
                            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex items-center justify-between text-sm">
                                <span className="text-blue-700 font-medium">Margin Keuntungan</span>
                                <span className="font-bold text-blue-600">
                                    {((data.selling_price - data.cost_price) / data.cost_price * 100).toFixed(1)}% — Rp {(data.selling_price - data.cost_price).toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Stocks per warehouse */}
                    {!isEdit && warehouses?.length > 0 && (
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-900">Stok Awal per Gudang</h3>
                                <button type="button" onClick={addStock} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Tambah Gudang
                                </button>
                            </div>
                            {data.stocks.map((stock, idx) => (
                                <div key={idx} className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gudang</label>
                                        <select
                                            value={stock.warehouse_id}
                                            onChange={e => updateStock(idx, 'warehouse_id', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        >
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <Input label="Jumlah" type="number" value={stock.quantity} onChange={e => updateStock(idx, 'quantity', e.target.value)} min="0" />
                                    </div>
                                    {data.stocks.length > 1 && (
                                        <button type="button" onClick={() => removeStock(idx)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-slate-900">Informasi Tambahan</h3>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi</label>
                            <textarea
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-24"
                                placeholder="Deskripsi produk (opsional)"
                            />
                        </div>
                        <Input label="Tanggal Kadaluarsa" type="date" value={data.expiry_date} onChange={e => setData('expiry_date', e.target.value)} error={errors.expiry_date} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Image */}
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-slate-900">Gambar Produk</h3>
                        <div className="relative">
                            {imagePreview ? (
                                <div className="relative">
                                    <img src={imagePreview} alt="Preview" className="w-full aspect-square object-cover rounded-xl border border-slate-200" />
                                    <button
                                        type="button"
                                        onClick={() => { setImagePreview(null); setData('image', null); }}
                                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-rose-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                                    <Upload className="w-8 h-8 text-slate-300 mb-2" />
                                    <span className="text-sm font-medium text-slate-400">Upload gambar</span>
                                    <span className="text-xs text-slate-300 mt-1">PNG, JPG (Max 2MB)</span>
                                    <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    {isEdit && (
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-4">
                            <h3 className="font-bold text-slate-900">Status</h3>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData('is_active', e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-11 h-6 rounded-full transition-colors ${data.is_active ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${data.is_active ? 'translate-x-5' : ''}`} />
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-slate-700">{data.is_active ? 'Aktif' : 'Nonaktif'}</span>
                            </label>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {processing ? 'Menyimpan...' : isEdit ? 'Perbarui Produk' : 'Simpan Produk'}
                        </button>
                        <Link
                            href={route('products.index')}
                            className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm text-center hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </Link>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}