import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Save, Search, Package } from 'lucide-react';
import { Button, Input } from '@/Components/UI';
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function StockOpnameCreate({ warehouses }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        warehouse_id: warehouses.length === 1 ? warehouses[0].id : '',
        adjustment_date: new Date().toISOString().split('T')[0],
        items: []
    });

    const [loadedProducts, setLoadedProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimeout = useRef(null);

    // Filter submit data to only include items with adjusted quantities
    transform((data) => ({
        ...data,
        items: data.items.filter(i => i.quantity > 0)
    }));

    const fetchProducts = async (pageNum, query = '', append = false) => {
        setIsLoading(true);
        try {
            const res = await axios.get(route('products.search'), { 
                params: { page: pageNum, query } 
            });
            const newProducts = res.data.data;
            if (append) {
                setLoadedProducts(prev => [...prev, ...newProducts]);
            } else {
                setLoadedProducts(newProducts);
            }
            setHasMore(newProducts.length > 0 && res.data.current_page < res.data.last_page);
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts(1, searchQuery, false);
    }, [searchQuery]);

    const observer = useRef();
    const lastProductElementRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchProducts(nextPage, searchQuery, true);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, page, searchQuery]);

    const handleSearch = (e) => {
        const query = e.target.value;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setSearchQuery(query);
            setPage(1);
        }, 300);
    };

    const getItemData = (product_id) => {
        return data.items.find(i => i.product_id === product_id) || {
            product_id,
            type: 'addition',
            quantity: 0,
            reason: ''
        };
    };

    const updateItem = (product, field, value) => {
        const existingIndex = data.items.findIndex(i => i.product_id === product.id);
        const newItems = [...data.items];
        
        if (existingIndex >= 0) {
            newItems[existingIndex][field] = value;
        } else {
            newItems.push({
                product_id: product.id,
                type: 'addition',
                quantity: 0,
                reason: '',
                [field]: value
            });
        }
        setData('items', newItems);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (data.items.filter(i => i.quantity > 0).length === 0) {
            alert('Masukkan angka penyesuaian (kuantitas) minimal pada 1 produk sebelum menyimpan.');
            return;
        }

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
                    <p className="text-sm text-slate-500 mt-1">Sesuaikan stok fisik toko dengan sistem (Lazy Loaded)</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm sticky top-6">
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
                            
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-slate-500">Produk Disesuaikan</span>
                                    <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                                        {data.items.filter(i => i.quantity > 0).length} Item
                                    </span>
                                </div>
                                <Button type="submit" disabled={processing} className="w-full gap-2">
                                    <Save className="w-4 h-4" /> {processing ? 'Menyimpan...' : 'Simpan Opname'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col - Items */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-5 border-b border-slate-100 pb-3">Daftar Produk</h3>
                        
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                onChange={handleSearch}
                                placeholder="Cari spesifik (opsional)..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700 font-medium text-sm"
                            />
                        </div>

                        {/* List Area */}
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                            {loadedProducts.length === 0 && !isLoading && (
                                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                    <Package className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm">Tidak ada produk ditemukan.</p>
                                </div>
                            )}
                            
                            {loadedProducts.map((product, index) => {
                                const itemData = getItemData(product.id);
                                const isLastElement = loadedProducts.length === index + 1;
                                
                                const systemStock = product.stocks?.find(s => s.warehouse_id === parseInt(data.warehouse_id))?.quantity || 0;

                                return (
                                    <div 
                                        ref={isLastElement ? lastProductElementRef : null}
                                        key={product.id} 
                                        className={`flex flex-col xl:flex-row xl:items-center gap-4 p-4 border rounded-xl transition-colors ${itemData.quantity > 0 ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div className="flex-1 min-w-[200px]">
                                            <p className="font-bold text-slate-800 text-sm">{product.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">Stok Sistem: <span className="font-bold text-slate-700">{systemStock} {product.unit}</span></p>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                                            <select 
                                                value={itemData.type} 
                                                onChange={e => updateItem(product, 'type', e.target.value)} 
                                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 shrink-0"
                                            >
                                                <option value="addition">Tambah (+)</option>
                                                <option value="subtraction">Kurang (-)</option>
                                            </select>
                                            
                                            <div className="flex items-center shrink-0">
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    placeholder="Qty"
                                                    value={itemData.quantity || ''} 
                                                    onChange={e => updateItem(product, 'quantity', parseInt(e.target.value) || 0)} 
                                                    className={`w-20 text-center py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-mono font-bold ${itemData.quantity > 0 ? 'bg-white border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`} 
                                                />
                                            </div>
                                            
                                            <input 
                                                type="text" 
                                                placeholder="Alasan (Opsional)" 
                                                value={itemData.reason} 
                                                onChange={e => updateItem(product, 'reason', e.target.value)} 
                                                className="flex-1 xl:w-40 py-2 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm" 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Skeleton Loader */}
                            {isLoading && (
                                <div className="flex flex-col gap-3 mt-4">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="animate-pulse bg-slate-100 border border-slate-200 h-24 w-full rounded-xl"></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
