import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/Components/UI';

export default function StockTransferShow({ transfer }) {
    const statusMap = {
        pending: { label: 'Pending', variant: 'warning' },
        completed: { label: 'Selesai', variant: 'success' },
        cancelled: { label: 'Batal', variant: 'danger' },
    };

    return (
        <AppLayout title="Detail Transfer Barang">
            <Head title="Detail Transfer Barang" />

            <div className="flex items-center gap-4 mb-6">
                <Link href={route('stock-transfers.index')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Detail Transfer</h2>
                    <p className="text-sm text-slate-500 mt-1">{transfer.transfer_number}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Item Transfer</h3>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase border-b border-slate-200">
                                    <th className="px-6 py-3 font-bold">Produk</th>
                                    <th className="px-6 py-3 font-bold text-center">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transfer.details?.map(detail => (
                                    <tr key={detail.id}>
                                        <td className="px-6 py-4 font-medium text-slate-800">{detail.product?.name}</td>
                                        <td className="px-6 py-4 text-center font-bold">{detail.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Informasi Transfer</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">No. Transfer</span>
                                <span className="font-mono font-semibold text-slate-800">{transfer.transfer_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tanggal</span>
                                <span className="text-slate-800">{transfer.transfer_date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status</span>
                                <Badge variant={statusMap[transfer.status]?.variant || 'default'}>
                                    {statusMap[transfer.status]?.label || transfer.status}
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">User</span>
                                <span className="text-slate-800">{transfer.user?.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Gudang</h3>
                        <div className="flex items-center gap-3 justify-center">
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Dari</p>
                                <p className="font-bold text-slate-800">{transfer.from_warehouse?.name}</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-blue-500" />
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Ke</p>
                                <p className="font-bold text-slate-800">{transfer.to_warehouse?.name}</p>
                            </div>
                        </div>
                    </div>

                    {transfer.notes && (
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-2">Catatan</h3>
                            <p className="text-sm text-slate-600">{transfer.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
