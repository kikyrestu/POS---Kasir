import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ChefHat, Clock, CheckCircle2, ChevronRight, Utensils } from 'lucide-react';
import { useEffect } from 'react';

export default function KdsIndex({ orders }) {
    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['orders'], preserveScroll: true, preserveState: true });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const updateStatus = (saleId, status) => {
        router.put(route('kds.updateStatus', saleId), { status }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <AppLayout title="Kitchen Display System (KDS)">
            <Head title="Dapur (KDS)" />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ChefHat className="w-7 h-7 text-blue-600" /> Dapur (KDS)
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Layar pesanan masuk. Di-refresh otomatis setiap 10 detik.</p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl">
                    <Utensils className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Dapur Kosong</h3>
                    <p className="text-slate-500 mt-1 text-sm">Belum ada pesanan yang perlu disiapkan saat ini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 items-start">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            {/* Card Header */}
                            <div className={`p-4 border-b ${order.kitchen_status === 'preparing' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                            order.order_type === 'dine_in' ? 'bg-blue-100 text-blue-700' :
                                            order.order_type === 'takeaway' ? 'bg-purple-100 text-purple-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {order.order_type.replace('_', ' ')}
                                        </span>
                                        {order.table && (
                                            <span className="px-2 py-1 bg-slate-200 text-slate-800 rounded text-xs font-bold">
                                                MEJA {order.table.name}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> {formatTime(order.created_at)}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">{order.invoice_number}</h3>
                                {order.notes && (
                                    <div className="mt-2 bg-yellow-50 text-yellow-800 text-sm px-3 py-2 rounded-lg border border-yellow-200 font-medium">
                                        📝 Catatan: {order.notes}
                                    </div>
                                )}
                            </div>

                            {/* Card Body - Items */}
                            <div className="p-4 flex-1 space-y-3">
                                {order.details.map((detail) => (
                                    <div key={detail.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                        <div className="font-bold text-lg text-slate-800 w-8 text-center bg-slate-100 rounded-lg h-8 flex items-center justify-center shrink-0">
                                            {detail.quantity}x
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="font-semibold text-slate-900 text-base leading-tight">
                                                {detail.product?.name || 'Produk Dihapus'}
                                            </p>
                                            
                                            {/* Modifiers */}
                                            {detail.modifiers && Array.isArray(detail.modifiers) && detail.modifiers.length > 0 && (
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {detail.modifiers.map((mod, idx) => (
                                                        <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">
                                                            {mod.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Item Notes */}
                                            {detail.notes && (
                                                <p className="text-sm text-rose-600 font-medium mt-1.5">
                                                    * {detail.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Card Footer - Actions */}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                                {order.kitchen_status === 'pending' ? (
                                    <>
                                        <button 
                                            onClick={() => updateStatus(order.id, 'preparing')}
                                            className="col-span-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ChefHat className="w-5 h-5" /> Mulai Siapkan
                                        </button>
                                    </>
                                ) : order.kitchen_status === 'preparing' ? (
                                    <>
                                        <button 
                                            onClick={() => updateStatus(order.id, 'pending')}
                                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button 
                                            onClick={() => updateStatus(order.id, 'ready')}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-5 h-5" /> Siap Saji
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
