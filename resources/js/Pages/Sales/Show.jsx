import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Printer, Receipt } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Badge, Card } from '@/Components/UI';
import ReceiptComponent from '@/Components/Receipt';
import { useRef, useState } from 'react';

export default function SalesShow({ sale, store = {} }) {
    const receiptRef = useRef(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const paymentStatusMap = {
        paid: { label: 'Lunas', variant: 'success' },
        partial: { label: 'Sebagian', variant: 'warning' },
        unpaid: { label: 'Belum Bayar', variant: 'danger' },
    };

    return (
        <AppLayout title="Detail Penjualan">
            <Head title={`Detail ${sale.invoice_number}`} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start md:items-center gap-4">
                    <Link href={route('sales.index')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 break-all leading-tight">{sale.invoice_number}</h2>
                        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                            {new Date(sale.sale_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button
                        onClick={() => setShowReceipt(true)}
                        className="flex-1 md:flex-none justify-center inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    >
                        <Receipt className="w-4 h-4" /> Cetak Struk
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 md:flex-none justify-center inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    >
                        <Printer className="w-4 h-4" /> Cetak A4
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sale Info */}
                <Card className="p-6 space-y-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Receipt className="w-4 h-4 text-blue-600" /> Info Transaksi</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Invoice</span><span className="font-mono font-semibold">{sale.invoice_number}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Tanggal</span><span className="font-medium text-right">{new Date(sale.sale_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Pelanggan</span><span className="font-medium">{sale.customer?.name || 'Umum'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Kasir</span><span className="font-medium">{sale.user?.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Gudang</span><span className="font-medium">{sale.warehouse?.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Tipe Bayar</span><span className="font-medium capitalize">{sale.payment_type}</span></div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Status Bayar</span>
                            <Badge variant={paymentStatusMap[sale.payment_status]?.variant}>{paymentStatusMap[sale.payment_status]?.label}</Badge>
                        </div>
                        {sale.notes && <div className="pt-2 border-t border-slate-100"><p className="text-slate-500 text-xs">{sale.notes}</p></div>}
                    </div>
                </Card>

                {/* Items & Total */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">Detail Item</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                                        <th className="px-6 py-3 font-bold">Produk</th>
                                        <th className="px-6 py-3 font-bold text-right">Harga</th>
                                        <th className="px-6 py-3 font-bold text-right">Qty</th>
                                        <th className="px-6 py-3 font-bold text-right">Diskon</th>
                                        <th className="px-6 py-3 font-bold text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {sale.details?.map((detail, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-3 font-medium text-slate-800">{detail.product?.name}</td>
                                            <td className="px-6 py-3 text-right font-mono text-slate-600">{formatCurrency(detail.unit_price)}</td>
                                            <td className="px-6 py-3 text-right font-mono text-slate-600">{detail.quantity}</td>
                                            <td className="px-6 py-3 text-right font-mono text-slate-600">{formatCurrency(detail.discount)}</td>
                                            <td className="px-6 py-3 text-right font-mono font-semibold text-slate-800">{formatCurrency(detail.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="space-y-2 text-sm max-w-xs ml-auto">
                            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{formatCurrency(sale.subtotal)}</span></div>
                            {sale.discount_amount > 0 && (
                                <div className="flex justify-between text-rose-500"><span>Diskon</span><span className="font-mono">-{formatCurrency(sale.discount_amount)}</span></div>
                            )}
                            {sale.tax > 0 && (
                                <div className="flex justify-between"><span className="text-slate-500">Pajak</span><span className="font-mono">+{formatCurrency(sale.tax)}</span></div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-200">
                                <span>Total</span><span className="text-blue-600 font-mono">{formatCurrency(sale.total)}</span>
                            </div>
                            <div className="flex justify-between"><span className="text-slate-500">Dibayar</span><span className="font-mono font-semibold">{formatCurrency(sale.paid)}</span></div>
                            {sale.change_amount > 0 && (
                                <div className="flex justify-between text-emerald-600"><span>Kembalian</span><span className="font-mono font-bold">{formatCurrency(sale.change_amount)}</span></div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm print:bg-white print:backdrop-blur-none">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden max-h-[90vh] flex flex-col print:shadow-none print:rounded-none print:max-w-none print:max-h-none print:m-0">
                        <div className="overflow-y-auto flex-1 px-2 py-3 print:overflow-visible">
                            <ReceiptComponent ref={receiptRef} sale={sale} store={store} cashier={sale.user?.name} />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 flex gap-3 print:hidden">
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={() => {
                                    const content = receiptRef.current;
                                    if (!content) return;
                                    const printWindow = window.open('', '_blank', 'width=400,height=600');
                                    printWindow.document.write(`<html><head><title>Struk ${sale.invoice_number}</title><style>@page{margin:0;size:80mm auto}body{margin:0;padding:0}@media print{body{width:80mm}}</style></head><body>${content.outerHTML}</body></html>`);
                                    printWindow.document.close();
                                    printWindow.focus();
                                    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
                                }}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Cetak
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}