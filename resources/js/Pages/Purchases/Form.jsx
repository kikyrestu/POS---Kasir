import { Head, useForm, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Save, Plus, Trash2, Search } from 'lucide-react';
import { Input } from '@/Components/UI';
import { formatCurrency } from '@/Utils/format';
import { useState, useRef } from 'react';

export default function PurchaseForm({ suppliers, warehouses, categories }) {
    const { global_settings } = usePage().props;
    const { data, setData, post, processing, errors, transform } = useForm({
        supplier_id: '',
        warehouse_id: warehouses[0]?.id || '',
        purchase_date: new Date().toISOString().split('T')[0],
        paid: 0,
        discount: 0,
        tax: 0,
        notes: '',
        status: 'received',
        items: [],
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef(null);

    const searchProducts = (q) => {
        setSearchQuery(q);
        clearTimeout(searchTimeout.current);
        if (!q) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(() => {
            setSearching(true);
            fetch(`/api/products/search?q=${encodeURIComponent(q)}`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            })
                .then(r => r.json())
                .then(data => { setSearchResults(data); setSearching(false); })
                .catch(() => setSearching(false));
        }, 300);
    };

    const addItem = (product) => {
        const exists = data.items.find(i => i.product_id === product.id);
        if (exists) {
            setData('items', data.items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setData('items', [...data.items, {
                product_id: product.id,
                name: product.name,
                quantity: 1,
                unit_price: product.cost_price || 0,
                discount: 0,
            }]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const updateItem = (idx, field, value) => {
        const items = [...data.items];
        items[idx][field] = ['quantity'].includes(field) ? parseInt(value) || 0 : parseFloat(value) || 0;
        setData('items', items);
    };

    const removeItem = (idx) => {
        setData('items', data.items.filter((_, i) => i !== idx));
    };

    const discountFormat = global_settings?.discount_format || 'amount';
    const taxFormat = global_settings?.tax_format || 'amount';

    const subtotal = data.items.reduce((sum, i) => sum + (i.unit_price * i.quantity) - i.discount, 0);
    const discountAmount = discountFormat === 'percent' ? subtotal * ((data.discount || 0) / 100) : (data.discount || 0);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxFormat === 'percent' ? taxableAmount * ((data.tax || 0) / 100) : (data.tax || 0);
    const total = taxableAmount + taxAmount;

    const handleSubmit = (e) => {
        e.preventDefault();
        transform((data) => ({
            ...data,
            discount: discountAmount,
            tax: taxAmount,
        }));
        post(route('purchases.store'));
    };

    return (
        <AppLayout title="Buat Pembelian">
            <Head title="Buat Pembelian" />

            <div className="flex items-center gap-4">
                <Link href={route('purchases.index')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Purchase Order Baru</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Buat pembelian baru dari supplier</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Info */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                    <h3 className="font-bold text-slate-900 mb-4">Informasi Pembelian</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier</label>
                            <select value={data.supplier_id} onChange={e => setData('supplier_id', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                <option value="">Pilih Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {errors.supplier_id && <p className="text-xs text-rose-500 mt-1">{errors.supplier_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gudang</label>
                            <select value={data.warehouse_id} onChange={e => setData('warehouse_id', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <Input label="Tanggal" type="date" value={data.purchase_date} onChange={e => setData('purchase_date', e.target.value)} error={errors.purchase_date} />
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                            <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                <option value="received">Diterima</option>
                                <option value="pending">Dipesan</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                    <h3 className="font-bold text-slate-900 mb-4">Item Pembelian</h3>

                    {/* Product search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => searchProducts(e.target.value)}
                            placeholder="Cari produk untuk ditambahkan..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(p => (
                                    <button key={p.id} type="button" onClick={() => addItem(p)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex justify-between items-center border-b border-slate-50 last:border-0">
                                        <span className="font-medium text-slate-800">{p.name}</span>
                                        <span className="text-slate-400 font-mono text-xs">{formatCurrency(p.cost_price)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Items table */}
                    {data.items.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-4 py-3 text-left font-bold">Produk</th>
                                        <th className="px-4 py-3 text-right font-bold">Harga</th>
                                        <th className="px-4 py-3 text-right font-bold w-24">Qty</th>
                                        <th className="px-4 py-3 text-right font-bold">Diskon</th>
                                        <th className="px-4 py-3 text-right font-bold">Subtotal</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                                            <td className="px-4 py-3">
                                                <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono" min="0" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono" min="1" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input type="number" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono" min="0" />
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency((item.unit_price * item.quantity) - item.discount)}</td>
                                            <td className="px-4 py-3">
                                                <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-slate-400 py-8 text-sm">Cari dan tambahkan produk di atas</p>
                    )}
                    {errors.items && <p className="text-xs text-rose-500 mt-2">{errors.items}</p>}
                </div>

                {/* Payment & Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-slate-900">Pembayaran</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <Input label="Jumlah Bayar" type="number" value={data.paid} onChange={e => setData('paid', parseFloat(e.target.value) || 0)} min="0" />
                        </div>
                        <Input label={`Diskon ${discountFormat === 'percent' ? '(%)' : '(Rp)'}`} type="number" value={data.discount} onChange={e => setData('discount', parseFloat(e.target.value) || 0)} min="0" />
                        <Input label={`Pajak ${taxFormat === 'percent' ? '(%)' : '(Rp)'}`} type="number" value={data.tax} onChange={e => setData('tax', parseFloat(e.target.value) || 0)} min="0" />
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan</label>
                            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-20" placeholder="Catatan (opsional)" />
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between">
                        <div className="space-y-2 text-sm">
                            <h3 className="font-bold text-slate-900 mb-4">Ringkasan</h3>
                            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                            {discountAmount > 0 && <div className="flex justify-between text-rose-500"><span>Diskon</span><span className="font-mono">-{formatCurrency(discountAmount)}</span></div>}
                            {taxAmount > 0 && <div className="flex justify-between"><span className="text-slate-500">Pajak</span><span className="font-mono">+{formatCurrency(taxAmount)}</span></div>}
                            <div className="flex justify-between text-xl font-bold pt-3 border-t border-slate-200">
                                <span>Total</span><span className="text-blue-600 font-mono">{formatCurrency(total)}</span>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Link href={route('purchases.index')} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm text-center hover:bg-slate-50 transition-colors">Batal</Link>
                            <button type="submit" disabled={processing || data.items.length === 0} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> {processing ? 'Menyimpan...' : 'Simpan PO'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}