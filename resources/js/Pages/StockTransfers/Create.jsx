import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Button, Input, Select } from '@/Components/UI';
import { useState } from 'react';

export default function StockTransferCreate({ warehouses, products }) {
    const [items, setItems] = useState([]);
    const [productSearch, setProductSearch] = useState('');

    const form = useForm({
        from_warehouse_id: '',
        to_warehouse_id: '',
        transfer_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const filteredProducts = (products || []).filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()))
    ).slice(0, 10);

    const addItem = (product) => {
        if (items.find(i => i.product_id === product.id)) return;
        setItems(prev => [...prev, {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
        }]);
        setProductSearch('');
    };

    const updateQty = (idx, qty) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, parseInt(qty) || 1) } : item));
    };

    const removeItem = (idx) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.data.from_warehouse_id || !form.data.to_warehouse_id || items.length === 0) return;
        if (form.data.from_warehouse_id === form.data.to_warehouse_id) return;

        router.post(route('stock-transfers.store'), {
            ...form.data,
            items: items.map(({ product_id, quantity }) => ({ product_id, quantity })),
        });
    };

    return (
        <AppLayout title="Buat Transfer Barang">
            <Head title="Buat Transfer Barang" />

            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Buat Transfer Barang</h2>
                    <p className="text-sm text-slate-500 mt-1">Pindahkan stok antar gudang</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Warehouse Selection */}
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Gudang</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Dari Gudang *" value={form.data.from_warehouse_id} onChange={e => form.setData('from_warehouse_id', e.target.value)} error={form.errors.from_warehouse_id}>
                                    <option value="">Pilih Gudang</option>
                                    {warehouses?.map(wh => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </Select>
                                <Select label="Ke Gudang *" value={form.data.to_warehouse_id} onChange={e => form.setData('to_warehouse_id', e.target.value)} error={form.errors.to_warehouse_id}>
                                    <option value="">Pilih Gudang</option>
                                    {warehouses?.filter(wh => String(wh.id) !== String(form.data.from_warehouse_id)).map(wh => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {/* Product Search */}
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Tambah Produk</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Cari produk..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                            </div>
                            {productSearch && filteredProducts.length > 0 && (
                                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} onClick={() => addItem(product)}
                                            className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm">
                                            <div>
                                                <p className="font-semibold text-slate-800">{product.name}</p>
                                                <p className="text-xs text-slate-400">{product.code}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-blue-500" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        {items.length > 0 && (
                            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                                <h3 className="font-bold text-slate-900 mb-4">Item Transfer</h3>
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-slate-500 text-xs uppercase border-b border-slate-200">
                                            <th className="pb-3 font-bold">Produk</th>
                                            <th className="pb-3 font-bold w-32">Qty</th>
                                            <th className="pb-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-3 font-medium text-slate-800">{item.product_name}</td>
                                                <td className="py-3">
                                                    <input type="number" min="1" value={item.quantity} onChange={e => updateQty(idx, e.target.value)}
                                                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                                </td>
                                                <td className="py-3">
                                                    <button type="button" onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-rose-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-4">
                            <h3 className="font-bold text-slate-900">Detail Transfer</h3>
                            <Input label="Tanggal Transfer" type="date" value={form.data.transfer_date} onChange={e => form.setData('transfer_date', e.target.value)} />
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan</label>
                                <textarea value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-20" placeholder="Catatan transfer..." />
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-slate-500">Total Item</span>
                                <span className="font-bold text-slate-800">{items.length}</span>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-slate-500">Total Qty</span>
                                <span className="font-bold text-slate-800">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                            </div>
                            <Button type="submit" disabled={items.length === 0 || form.processing} className="w-full mt-2">
                                {form.processing ? 'Menyimpan...' : 'Simpan Transfer'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
