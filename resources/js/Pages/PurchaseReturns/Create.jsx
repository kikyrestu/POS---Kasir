import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Button, Input, Select } from '@/Components/UI';
import { useState } from 'react';

export default function PurchaseReturnCreate({ purchase, purchases }) {
    const existingReturns = purchase?.returns || [];
    const [items, setItems] = useState([]);

    const form = useForm({
        purchase_id: purchase?.id || '',
        return_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
    });

    const handlePurchaseChange = (e) => {
        if (!e.target.value) {
            router.get(route('purchase-returns.create'));
        } else {
            router.get(route('purchase-returns.create', { purchase_id: e.target.value }));
        }
    };

    const addItem = (detail) => {
        const returned = (existingReturns || []).flatMap(r => r.details || []).filter(d => d.purchase_detail_id === detail.id).reduce((sum, d) => sum + d.quantity, 0);
        const maxQty = detail.quantity - returned;
        if (maxQty <= 0) return;
        if (items.find(i => i.purchase_detail_id === detail.id)) return;

        setItems(prev => [...prev, {
            purchase_detail_id: detail.id,
            product_id: detail.product_id,
            product_name: detail.product?.name,
            quantity: 1,
            max_quantity: maxQty,
            unit_price: detail.unit_price,
        }]);
    };

    const updateQty = (idx, qty) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.min(Math.max(1, parseInt(qty) || 1), item.max_quantity) } : item));
    };

    const removeItem = (idx) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        form.transform(() => ({
            purchase_id: purchase.id,
            return_date: form.data.return_date,
            notes: form.data.notes,
            items: items.map(({ purchase_detail_id, product_id, quantity, unit_price }) => ({
                purchase_detail_id, product_id, quantity, unit_price, subtotal: quantity * unit_price,
            })),
        })).post(route('purchase-returns.store'));
    };

    return (
        <AppLayout title="Buat Retur Pembelian">
            <Head title="Buat Retur Pembelian" />

            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Buat Retur Pembelian</h2>
                    <p className="text-sm text-slate-500 mt-1">Invoice: {purchase?.invoice_number}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Pemilihan Invoice */}
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Pilih Pembelian</h3>
                            <Select label="Invoice Pembelian *" value={purchase?.id || ''} onChange={handlePurchaseChange}>
                                <option value="">Pilih Invoice...</option>
                                {purchases?.map(p => (
                                    <option key={p.id} value={p.id}>{p.invoice_number} - {p.supplier?.name}</option>
                                ))}
                            </Select>
                        </div>

                        {/* List Item Pembelian */}
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Item Pembelian</h3>
                            {!purchase ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Package className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Belum ada invoice dipilih</p>
                                    <p className="text-xs mt-1">Silakan pilih invoice pembelian di atas</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-slate-400 mb-3">Klik item untuk menambahkan ke retur</p>
                                    <div className="space-y-2">
                                        {purchase?.details?.map(detail => {
                                            const returned = (existingReturns || []).flatMap(r => r.details || []).filter(d => d.purchase_detail_id === detail.id).reduce((sum, d) => sum + d.quantity, 0);
                                            const available = detail.quantity - returned;
                                            const added = items.find(i => i.purchase_detail_id === detail.id);
                                            return (
                                                <div key={detail.id} onClick={() => !added && available > 0 && addItem(detail)}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${added ? 'bg-blue-50 border-blue-200' : available <= 0 ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-800">{detail.product?.name}</p>
                                                        <p className="text-xs text-slate-400">Qty: {detail.quantity} | Diretur: {returned} | Sisa: {available}</p>
                                                    </div>
                                                    <p className="font-mono text-sm text-slate-700">{formatCurrency(detail.unit_price)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                                <h3 className="font-bold text-slate-900 mb-4">Item Retur</h3>
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-slate-500 text-xs uppercase border-b border-slate-200">
                                            <th className="pb-3 font-bold">Produk</th>
                                            <th className="pb-3 font-bold w-24">Qty</th>
                                            <th className="pb-3 font-bold text-right">Harga</th>
                                            <th className="pb-3 font-bold text-right">Subtotal</th>
                                            <th className="pb-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-3 font-medium text-slate-800">{item.product_name}</td>
                                                <td className="py-3">
                                                    <input type="number" min="1" max={item.max_quantity} value={item.quantity} onChange={e => updateQty(idx, e.target.value)}
                                                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                                </td>
                                                <td className="py-3 text-right font-mono text-slate-600">{formatCurrency(item.unit_price)}</td>
                                                <td className="py-3 text-right font-mono font-bold text-slate-800">{formatCurrency(item.quantity * item.unit_price)}</td>
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

                    <div className="space-y-6">
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-4">
                            <h3 className="font-bold text-slate-900">Detail Retur</h3>
                            <Input label="Tanggal Retur" type="date" value={form.data.return_date} onChange={e => form.setData('return_date', e.target.value)} error={form.errors.return_date} />
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan</label>
                                <textarea value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-20" placeholder="Alasan retur..." />
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-slate-500">Total Item</span>
                                <span className="font-bold text-slate-800">{items.length}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                <span className="font-bold text-slate-900">Total Retur</span>
                                <span className="text-xl font-bold text-blue-600">{formatCurrency(total)}</span>
                            </div>
                            <Button type="submit" disabled={items.length === 0 || form.processing} className="w-full mt-4">
                                {form.processing ? 'Menyimpan...' : 'Simpan Retur'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
