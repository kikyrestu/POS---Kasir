import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Printer, Search, Plus, Minus, Trash2, Package, XCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import axios from 'axios';

const BarcodeItem = ({ value, text }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                JsBarcode(svgRef.current, String(value), {
                    format: "CODE128",
                    width: 1.5,
                    height: 40,
                    displayValue: true,
                    text: text,
                    fontSize: 12,
                    margin: 5
                });
            } catch (error) {
                console.error("Barcode generation failed for:", value, error);
            }
        }
    }, [value, text]);

    if (!value) {
        return <div className="text-[10px] text-rose-500 font-bold border border-rose-200 bg-rose-50 px-2 py-4 rounded my-1 text-center w-full">BARCODE / KODE KOSONG</div>;
    }

    return <svg ref={svgRef}></svg>;
};

export default function Barcodes({ initialProducts = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [printList, setPrintList] = useState([]);
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

    const addProduct = (product) => {
        const existing = printList.find(p => p.id === product.id);
        if (existing) {
            setPrintList(printList.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
        } else {
            setPrintList([...printList, { ...product, qty: 1 }]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const updateQty = (id, qty) => {
        if (qty < 1) return;
        setPrintList(printList.map(p => p.id === id ? { ...p, qty } : p));
    };

    const removeProduct = (id) => {
        setPrintList(printList.filter(p => p.id !== id));
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate total labels we're printing
    const totalLabels = printList.reduce((sum, item) => sum + item.qty, 0);

    return (
        <AppLayout title="Cetak Label Barcode">
            <Head title="Cetak Barcode" />

            {/* Hidden Print Wrapper - ONLY shows during printing */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] m-0 p-0 text-black">
                {/* 
                    Label layout designed for standard A4 sticker paper (3 or 4 cols) 
                    or discrete thermal label continuous scroll. 
                */}
                <div className="grid grid-cols-3 gap-2 p-4">
                    {printList.flatMap((item) => 
                        Array.from({ length: item.qty }).map((_, i) => (
                            <div key={`${item.id}-${i}`} className="flex flex-col items-center justify-center p-2 border border-dashed border-gray-300 rounded-lg text-center break-inside-avoid">
                                <p className="font-bold text-xs uppercase truncate w-32">{item.name}</p>
                                <p className="text-[10px] text-gray-500 mb-1">Rp {new Intl.NumberFormat('id-ID').format(item.selling_price)}</p>
                                {/* The Barcode Itself */}
                                <BarcodeItem value={item.barcode || item.code} text={item.barcode || item.code} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* UI Application */}
            <div className="print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Cetak Barcode Massal</h2>
                        <p className="text-sm text-slate-500 mt-1">Pilih barang dan jumlah barcode label yang ingin dicetak</p>
                    </div>
                    <button 
                        onClick={handlePrint}
                        disabled={printList.length === 0}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${printList.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        <Printer className="w-4 h-4" /> Cetak {totalLabels} Label Barcode
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Col - Search and List */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
                            <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                                <Search className="w-4 h-4 text-slate-500" /> Cari Produk
                            </h3>
                            
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    placeholder="Ketik kode / nama barang..."
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-medium"
                                />
                                {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                            </div>

                            {/* Catalog Results (Inline) */}
                            <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col max-h-[300px]">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase sticky top-0">
                                    {searchQuery ? 'Hasil Pencarian' : 'Daftar Produk Aktif'}
                                </div>
                                <div className="overflow-y-auto custom-scrollbar">
                                    {(searchQuery ? searchResults : initialProducts).map(p => (
                                        <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-blue-50/50 flex flex-col transition-colors">
                                            <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{p.barcode || p.code || '-'}</span>
                                                <span className="text-[11px] font-semibold text-emerald-600">Rp{new Intl.NumberFormat('id-ID').format(p.selling_price)}</span>
                                            </div>
                                        </button>
                                    ))}
                                    {(searchQuery ? searchResults : initialProducts).length === 0 && (
                                        <div className="p-4 text-center text-sm text-slate-400">Tidak ada produk ditemukan.</div>
                                    )}
                                </div>
                            </div>

                            <hr className="my-6 border-slate-100" />
                            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-slate-500" /> Antrian Cetak
                            </h3>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {printList.length === 0 && (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl text-slate-400">
                                        <p className="text-xs">Antrian kosong. Klik produk di atas.</p>
                                    </div>
                                )}
                                
                                {printList.map(item => (
                                    <div key={item.id} className="p-3 border border-slate-100 bg-white shadow-sm rounded-xl flex flex-col gap-3 group hover:border-slate-300 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="pr-4">
                                                <p className="font-bold text-slate-700 text-sm leading-tight">{item.name}</p>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">{item.barcode || item.code}</p>
                                            </div>
                                            <button onClick={() => removeProduct(item.id)} className="p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                                            <span className="text-xs font-semibold text-slate-500">Jumlah cetak:</span>
                                            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                                                <button onClick={() => updateQty(item.id, item.qty - 1)} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded shadow-sm">
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <input type="number" readOnly value={item.qty} className="w-12 text-center text-sm font-bold bg-transparent border-none p-0 focus:ring-0" />
                                                <button onClick={() => updateQty(item.id, item.qty + 1)} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded shadow-sm">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Col - Live Preview */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 min-h-[600px] flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Printer className="w-4 h-4 text-slate-500" /> Preview Kertas Labels
                            </h3>
                            
                            <div className="flex-1 bg-white border border-slate-300 shadow-sm rounded-lg p-6 max-h-[800px] overflow-y-auto custom-scrollbar">
                                {printList.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-300">Preview label kosong</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {printList.flatMap((item) => 
                                            Array.from({ length: item.qty }).map((_, i) => (
                                                <div key={`${item.id}-${i}`} className="flex flex-col items-center justify-center p-3 border border-dashed border-blue-200 bg-blue-50/10 rounded-xl text-center transform scale-90 sm:scale-100 origin-top">
                                                    <p className="font-bold text-[11px] text-slate-800 uppercase truncate w-[130px]">{item.name}</p>
                                                    <p className="text-[10px] text-emerald-600 font-semibold mb-1">Rp {new Intl.NumberFormat('id-ID').format(item.selling_price)}</p>
                                                    <div className="h-[40px] flex items-center justify-center overflow-hidden">
                                                        <BarcodeItem value={item.barcode || item.code} text={item.barcode || item.code} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
                                Tampilan di atas adalah preview (ilustrasi).<br/>Hasil cetak akan 100% mengikuti kertas stiker A4 (3 kolom) melalui kapabilitas Print Settings browser.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom CSS specifically for this page */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 10mm; size: auto; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}} />
        </AppLayout>
    );
}
