import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Plus, DollarSign, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Badge, Modal, Button, Input, Select } from '@/Components/UI';
import { useState } from 'react';

export default function SalesTempoShow({ sale }) {
    const [showPayment, setShowPayment] = useState(false);
    const remaining = sale.total - sale.paid;
    const isOverdue = sale.payment_status !== 'paid' && sale.due_date && new Date(sale.due_date) < new Date();

    const form = useForm({
        amount: '',
        method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const handlePayment = (e) => {
        e.preventDefault();
        form.post(route('sales-tempo.add-payment', sale.id), {
            onSuccess: () => { setShowPayment(false); form.reset(); },
        });
    };

    return (
        <AppLayout title="Detail Penjualan Tempo">
            <Head title="Detail Penjualan Tempo" />

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href={route('sales-tempo.index')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Detail Piutang</h2>
                        <p className="text-sm text-slate-500 mt-1">{sale.invoice_number}</p>
                    </div>
                </div>
                {sale.payment_status !== 'paid' && (
                    <button onClick={() => setShowPayment(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                        <Plus className="w-4 h-4" /> Tambah Pembayaran
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Sale Details */}
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Item Penjualan</h3>
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
                                {sale.details?.map(detail => (
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
                                    <td className="px-6 py-4 text-right font-mono font-bold text-lg">{formatCurrency(sale.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Payment History */}
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Riwayat Pembayaran</h3>
                        </div>
                        {sale.payments?.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase border-b border-slate-200">
                                        <th className="px-6 py-3 font-bold">Tanggal</th>
                                        <th className="px-6 py-3 font-bold">Metode</th>
                                        <th className="px-6 py-3 font-bold text-right">Jumlah</th>
                                        <th className="px-6 py-3 font-bold">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sale.payments.map(payment => (
                                        <tr key={payment.id}>
                                            <td className="px-6 py-4 text-slate-600">{payment.payment_date}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="info">{payment.method}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{formatCurrency(payment.amount)}</td>
                                            <td className="px-6 py-4 text-slate-500">{payment.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="px-6 py-8 text-center text-slate-400 text-sm">Belum ada pembayaran</div>
                        )}
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Informasi</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Pelanggan</span>
                                <span className="font-semibold text-slate-800">{sale.customer?.name || 'Umum'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tanggal</span>
                                <span className="text-slate-800">{sale.sale_date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Jatuh Tempo</span>
                                <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-800'}>{sale.due_date || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Kasir</span>
                                <span className="text-slate-800">{sale.user?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status</span>
                                {sale.payment_status === 'paid' ? <Badge variant="success">Lunas</Badge> : isOverdue ? <Badge variant="danger">Jatuh Tempo</Badge> : <Badge variant="warning">Belum Lunas</Badge>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200/60 rounded-2xl p-6">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Total</span>
                                <span className="font-mono font-bold">{formatCurrency(sale.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Dibayar</span>
                                <span className="font-mono font-bold text-emerald-600">{formatCurrency(sale.paid)}</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-blue-200">
                                <span className="font-bold text-slate-900">Sisa</span>
                                <span className="text-xl font-bold text-blue-600">{formatCurrency(remaining)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal show={showPayment} onClose={() => setShowPayment(false)} title="Tambah Pembayaran" maxWidth="md">
                <form onSubmit={handlePayment} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                        <span className="text-slate-600">Sisa pembayaran: </span>
                        <span className="font-bold text-blue-600">{formatCurrency(remaining)}</span>
                    </div>
                    <Input label="Jumlah *" type="number" min="1" max={remaining} value={form.data.amount} onChange={e => form.setData('amount', e.target.value)} error={form.errors.amount} />
                    <Select label="Metode *" value={form.data.method} onChange={e => form.setData('method', e.target.value)} error={form.errors.method}>
                        <option value="cash">Cash</option>
                        <option value="transfer">Transfer</option>
                        <option value="ewallet">E-Wallet</option>
                        <option value="qris">QRIS</option>
                    </Select>
                    <Input label="Tanggal Bayar *" type="date" value={form.data.payment_date} onChange={e => form.setData('payment_date', e.target.value)} error={form.errors.payment_date} />
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan</label>
                        <textarea value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-16" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" type="button" onClick={() => setShowPayment(false)}>Batal</Button>
                        <Button type="submit" disabled={form.processing}>{form.processing ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
