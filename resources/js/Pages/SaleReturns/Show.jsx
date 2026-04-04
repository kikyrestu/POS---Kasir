import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';

export default function SaleReturnShow({ saleReturn }) {
    return (
        <AppLayout title="Detail Retur Penjualan">
            <Head title="Detail Retur Penjualan" />

            <div className="flex items-center gap-4 mb-6">
                <Link href={route('sale-returns.index')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Detail Retur</h2>
                    <p className="text-sm text-slate-500 mt-1">{saleReturn.return_number}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Item Retur</h3>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase border-b border-slate-200">
                                    <th className="px-6 py-3 font-bold">Produk</th>
                                    <th className="px-6 py-3 font-bold text-center">Qty</th>
                                    <th className="px-6 py-3 font-bold text-right">Harga</th>
                                    <th className="px-6 py-3 font-bold text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {saleReturn.details?.map(detail => (
                                    <tr key={detail.id}>
                                        <td className="px-6 py-4 font-medium text-slate-800">{detail.product?.name}</td>
                                        <td className="px-6 py-4 text-center">{detail.quantity}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-600">{formatCurrency(detail.unit_price)}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">{formatCurrency(detail.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-200">
                                    <td colSpan="3" className="px-6 py-4 font-bold text-slate-900 text-right">Total</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-lg text-blue-600">{formatCurrency(saleReturn.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Informasi Retur</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">No. Retur</span>
                                <span className="font-mono font-semibold text-slate-800">{saleReturn.return_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Invoice</span>
                                <span className="font-mono text-slate-800">{saleReturn.sale?.invoice_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tanggal</span>
                                <span className="text-slate-800">{saleReturn.return_date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">User</span>
                                <span className="text-slate-800">{saleReturn.user?.name}</span>
                            </div>
                            {saleReturn.notes && (
                                <div className="pt-3 border-t border-slate-100">
                                    <span className="text-slate-500 block mb-1">Catatan</span>
                                    <p className="text-slate-800">{saleReturn.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
