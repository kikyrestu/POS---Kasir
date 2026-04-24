import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Save, Plus, Trash2, Search, Package } from 'lucide-react';
import { Button, Input } from '@/Components/UI';
import { useState, useRef } from 'react';
import axios from 'axios';

export default function StockOpnameCreate({ warehouses }) {
    const { data, setData, post, processing, errors } = useForm({
        warehouse_id: warehouses.length === 1 ? warehouses[0].id : '',
        adjustment_date: new Date().toISOString().split('T')[0],
        items: []
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef(null);

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await axios.get(route('products.search'), { params: { query } });
                setSearchResults(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const addItem = (product) => {
        if (data.items.some(i => i.product_id === product.id)) return;
        setData('items', [
            ...data.items,
            { product_id: product.id, name: product.name, type: 'addition', quantity: 1, reason: '' }
        ]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeItem = (index) => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;
        setData('items', newItems);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('stock-opnames.store'));
    };

    return (
        <AppLayout title="Buat Penyesuaian Stok">
            <Head title="Buat Stock Opname" />

            <div className="flex items-center gap-4 mb-6">
                <Link href={route('stock-opnames.index')} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Buat Penyesuaian Stok</h2>
                    <p className="text-sm text-slate-500 mt-1">Manual catat plus/minus stok fisik ke sistem</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-5 border-b border-slate-100 pb-3">Informasi Utama</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gudang <span className="text-rose-500">*</span></label>
                                <select value={data.warehouse_id} onChange={e => setData('warehouse_id', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                    <option value="">-- Pilih Gudang --</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                {errors.warehouse_id && <p className="text-xs text-rose-500 mt-1">{errors.warehouse_id}</p>}
                            </div>

                            <Input type="date" label="Tanggal Penyesuaian" required value={data.adjustment_date} onChange={e => setData('adjustment_date', e.target.value)} error={errors.adjustment_date} />
                        </div>
                    </div>
                </div>

                {/* Right Col - Items */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-5 border-b border-slate-100 pb-3">Daftar Produk Opname</h3>
                        
                        {/* Auto-complete Search */}
                        <div className="relative mb-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    placeholder="Cari produk (ketik minimal 3 huruf)..."
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700 font-medium"
                                />
                                {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                    {searchResults.map(p => (
                                        <button key={p.id} type="button" onClick={() => addItem(p)} className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex items-center justify-between transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                                                    <p className="text-xs text-slate-500">{p.code}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Items */}
                        <div className="overflow-x-auto space-y-3">
                            {data.items.length === 0 && <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">Gunakan kolom pencarian di atas untuk menambahkan produk.</div>}
                            
                            {data.items.map((item, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-slate-100 rounded-xl bg-white shadow-sm hover:border-slate-300 transition-colors">
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
                                        <select value={item.type} onChange={e => updateItem(index, 'type', e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                            <option value="addition">Tambah (+)</option>
                                            <option value="subtraction">Kurang (-)</option>
                                        </select>
                                        
                                        <div className="flex items-center">
                                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} className="w-20 text-center py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-mono font-bold" />
                                        </div>
                                        
                                        <input type="text" placeholder="Catatan/Alasan" value={item.reason} onChange={e => updateItem(index, 'reason', e.target.value)} className="w-40 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm" />
                                        
                                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {errors[`items.${index}.quantity`] && <p className="text-xs text-rose-500">{errors[`items.${index}.quantity`]}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Link href={route('stock-opnames.index')} className="px-6 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors">Batal</Link>
                        <Button type="submit" disabled={processing || data.items.length === 0} className="w-full sm:w-auto px-8 gap-2">
                            <Save className="w-4 h-4" /> {processing ? 'Menyimpan...' : 'Simpan Opname'}
                        </Button>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
