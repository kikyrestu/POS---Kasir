import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Printer } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Badge, Card } from '@/Components/UI';

export default function PurchaseShow({ purchase }) {
    const statusMap = {
        received: { label: 'Diterima', variant: 'success' },
        ordered: { label: 'Dipesan', variant: 'warning' },
        cancelled: { label: 'Batal', variant: 'danger' },
    };

    return (
        <AppLayout title="Detail Pembelian">
            <Head title={`Detail ${purchase.invoice_number}`} />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={route('purchases.index')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{purchase.invoice_number}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{purchase.purchase_date}</p>
                    </div>
                </div>
                <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                    <Printer className="w-4 h-4" /> Cetak
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 space-y-4">
                    <h3 className="font-bold text-slate-900">Info Pembelian</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Invoice</span><span className="font-mono font-semibold">{purchase.invoice_number}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Tanggal</span><span className="font-medium">{purchase.purchase_date}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span className="font-medium">{purchase.supplier?.name || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Gudang</span><span className="font-medium">{purchase.warehouse?.name}</span></div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Status</span>
                            <Badge variant={statusMap[purchase.status]?.variant}>{statusMap[purchase.status]?.label}</Badge>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">Tipe Bayar</span><span className="font-medium capitalize">{purchase.payment_type}</span></div>
                        {purchase.notes && <div className="pt-2 border-t border-slate-100"><p className="text-slate-500 text-xs">{purchase.notes}</p></div>}
                    </div>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">Detail Item</h3>
                        </div>
                        <table className="w-full text-left text-sm">
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
                                {purchase.details?.map((d, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 font-medium text-slate-800">{d.product?.name}</td>
                                        <td className="px-6 py-3 text-right font-mono text-slate-600">{formatCurrency(d.unit_price)}</td>
                                        <td className="px-6 py-3 text-right font-mono text-slate-600">{d.quantity}</td>
                                        <td className="px-6 py-3 text-right font-mono text-slate-600">{formatCurrency(d.discount)}</td>
                                        <td className="px-6 py-3 text-right font-mono font-semibold text-slate-800">{formatCurrency(d.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    <Card className="p-6">
                        <div className="space-y-2 text-sm max-w-xs ml-auto">
                            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{formatCurrency(purchase.subtotal)}</span></div>
                            {purchase.discount_amount > 0 && <div className="flex justify-between text-rose-500"><span>Diskon</span><span className="font-mono">-{formatCurrency(purchase.discount_amount)}</span></div>}
                            {purchase.tax > 0 && <div className="flex justify-between"><span className="text-slate-500">Pajak</span><span className="font-mono">+{formatCurrency(purchase.tax)}</span></div>}
                            <div className="flex justify-between text-lg font-bold pt-3 border-t border-slate-200">
                                <span>Total</span><span className="text-blue-600 font-mono">{formatCurrency(purchase.total)}</span>
                            </div>
                            <div className="flex justify-between"><span className="text-slate-500">Dibayar</span><span className="font-mono font-semibold">{formatCurrency(purchase.paid)}</span></div>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}