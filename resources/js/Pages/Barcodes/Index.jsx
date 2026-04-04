import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Search, Printer, Plus, Trash2, Barcode } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Button } from '@/Components/UI';
import { useState, useRef, useEffect } from 'react';

export default function BarcodeIndex({ products, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [printItems, setPrintItems] = useState([]);
    const [labelSize, setLabelSize] = useState('medium');
    const printRef = useRef();

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('barcodes.index'), { search }, { preserveState: true });
    };

    const addToPrint = (product) => {
        const existing = printItems.find(i => i.id === product.id);
        if (existing) {
            setPrintItems(prev => prev.map(i => i.id === product.id ? { ...i, copies: i.copies + 1 } : i));
        } else {
            setPrintItems(prev => [...prev, { ...product, copies: 1 }]);
        }
    };

    const updateCopies = (id, copies) => {
        setPrintItems(prev => prev.map(i => i.id === id ? { ...i, copies: Math.max(1, parseInt(copies) || 1) } : i));
    };

    const removeItem = (id) => {
        setPrintItems(prev => prev.filter(i => i.id !== id));
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const sizeStyles = {
            small: { width: '35mm', height: '22mm', fontSize: '7px', barcodeSize: '10px' },
            medium: { width: '50mm', height: '30mm', fontSize: '9px', barcodeSize: '14px' },
            large: { width: '70mm', height: '40mm', fontSize: '11px', barcodeSize: '18px' },
        }[labelSize];

        let labelsHtml = '';
        printItems.forEach(item => {
            for (let i = 0; i < item.copies; i++) {
                labelsHtml += `
                    <div style="width:${sizeStyles.width};height:${sizeStyles.height};border:1px solid #ddd;padding:2mm;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:1mm;box-sizing:border-box;overflow:hidden;">
                        <div style="font-size:${sizeStyles.fontSize};font-weight:bold;text-align:center;line-height:1.2;margin-bottom:1mm;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</div>
                        <div style="font-family:monospace;font-size:${sizeStyles.barcodeSize};letter-spacing:2px;margin-bottom:1mm;">${item.barcode || item.code || '-'}</div>
                        <div style="font-size:${sizeStyles.fontSize};font-weight:bold;">Rp ${Number(item.selling_price).toLocaleString('id-ID')}</div>
                    </div>
                `;
            }
        });

        printWindow.document.write(`
            <html><head><title>Cetak Barcode</title>
            <style>@media print { body { margin: 0; } @page { margin: 5mm; } }</style>
            </head><body style="font-family:Arial,sans-serif;">${labelsHtml}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <AppLayout title="Cetak Barcode">
            <Head title="Cetak Barcode" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Cetak Barcode</h2>
                    <p className="text-sm text-slate-500 mt-1">Cari produk dan cetak label barcode</p>
                </div>
                {printItems.length > 0 && (
                    <Button onClick={handlePrint}>
                        <Printer className="w-4 h-4" /> Cetak ({printItems.reduce((s, i) => s + i.copies, 0)} label)
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left - Search */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama produk, barcode, atau kode produk..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </form>
                    </div>

                    {products?.length > 0 && (
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase border-b border-slate-200">
                                        <th className="px-6 py-3 font-bold">Produk</th>
                                        <th className="px-6 py-3 font-bold">Barcode</th>
                                        <th className="px-6 py-3 font-bold">Harga</th>
                                        <th className="px-6 py-3 font-bold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products.map(product => (
                                        <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                                                        <Barcode className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{product.name}</p>
                                                        <p className="text-xs text-slate-400">{product.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{product.barcode || '-'}</td>
                                            <td className="px-6 py-4 font-mono text-slate-700">{formatCurrency(product.selling_price)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => addToPrint(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right - Print Queue */}
                <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Antrian Cetak</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ukuran Label</label>
                            <select value={labelSize} onChange={e => setLabelSize(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                <option value="small">Kecil (35x22mm)</option>
                                <option value="medium">Sedang (50x30mm)</option>
                                <option value="large">Besar (70x40mm)</option>
                            </select>
                        </div>

                        {printItems.length > 0 ? (
                            <div className="space-y-2">
                                {printItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{item.barcode || item.code}</p>
                                        </div>
                                        <input type="number" min="1" value={item.copies} onChange={e => updateCopies(item.id, e.target.value)}
                                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center" />
                                        <button onClick={() => removeItem(item.id)} className="p-1 text-slate-400 hover:text-rose-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Total Label</span>
                                    <span className="font-bold text-slate-800">{printItems.reduce((s, i) => s + i.copies, 0)}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-8">Belum ada item. Cari dan tambahkan produk.</p>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
