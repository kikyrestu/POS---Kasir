import { useState, useEffect } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { CreditCard, CheckCircle2, AlertCircle, FileText, Package, X, Copy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/Components/UI';
import InputLabel from '@/Components/InputLabel';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

export default function BillingIndex({ currentSubscription, pendingSubscription, invoices, availablePlans, midtransClientKey, midtransEnvironment, bankTransferDetails }) {
    const { flash } = usePage().props;
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [showInvoiceModal, setShowInvoiceModal] = useState(null);
    const { data, setData, post, processing, errors } = useForm({
        plan_id: '',
        billing_cycle: 'monthly'
    });
    const { data: uploadData, setData: setUploadData, post: postUpload, processing: uploading, errors: uploadErrors, clearErrors: clearUploadErrors, reset: resetUpload } = useForm({
        payment_proof: null
    });

    useEffect(() => {
        // Load Midtrans Snap Script dynamically
        if (midtransClientKey) {
            const scriptUrl = midtransEnvironment === 'production' 
                ? 'https://app.midtrans.com/snap/snap.js'
                : 'https://app.sandbox.midtrans.com/snap/snap.js';
                
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.setAttribute('data-client-key', midtransClientKey);
            document.body.appendChild(script);

            return () => {
                document.body.removeChild(script);
            }
        }
    }, [midtransClientKey, midtransEnvironment]);

    useEffect(() => {
        if (flash?.pendingInvoice) {
            setShowInvoiceModal(flash.pendingInvoice);
        }
    }, [flash?.pendingInvoice]);

    useEffect(() => {
        // If the backend generated a snap token, trigger the popup
        if (flash?.snapToken) {
            if (window.snap) {
                window.snap.pay(flash.snapToken, {
                    onSuccess: function(result) {
                        toast.success('Pembayaran sukses! Langganan Anda akan segera aktif.');
                        router.reload();
                    },
                    onPending: function(result) {
                        toast.info('Menunggu pembayaran Anda...');
                        router.reload();
                    },
                    onError: function(result) {
                        toast.error('Pembayaran gagal atau dibatalkan.');
                    },
                    onClose: function() {
                        toast.warning('Anda menutup pop-up pembayaran sebelum menyelesaikannya.');
                    }
                });
            } else {
                toast.error('Midtrans Snap tidak dapat dimuat.');
            }
        }
    }, [flash]);

    const handleUpgrade = (plan) => {
        setSelectedPlan(plan);
        setData('plan_id', plan.id);
    };

    const confirmUpgrade = () => {
        post(route('billing.upgrade'), {
            preserveScroll: true,
            onSuccess: (page) => {
                // If it's manual fallback (no snapToken), just show success and clear selection
                if (!page.props.flash?.snapToken) {
                    toast.success(page.props.flash?.success || 'Paket berhasil diperbarui!');
                    setSelectedPlan(null);
                }
            }
        });
    };

    const handlePayInvoice = (invoice) => {
        if (midtransClientKey && invoice.snap_token) {
             // If midtrans has snap_token stored (optional enhancement later)
        } else {
             setShowInvoiceModal(invoice);
        }
    };

    const handleUploadProof = (e) => {
        e.preventDefault();
        postUpload(route('billing.upload-proof', showInvoiceModal.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowInvoiceModal(null);
                resetUpload();
                toast.success('Bukti pembayaran berhasil diunggah!');
            }
        });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Disalin ke clipboard');
    };

    const getInvoiceStatus = (status) => {
        switch (status) {
            case 'paid':
                return <Badge className="bg-emerald-100 text-emerald-700">Lunas</Badge>;
            case 'unpaid':
                return <Badge className="bg-rose-100 text-rose-700">Belum Bayar</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700">Menunggu Verifikasi</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-500">{status}</Badge>;
        }
    };

    return (
        <AppLayout title="Billing & Paket Langganan">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {pendingSubscription && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-bold text-amber-800">Menunggu Verifikasi Pembayaran</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Anda telah mengajukan upgrade ke paket <strong>{pendingSubscription.plan?.name}</strong>. Fitur baru akan otomatis aktif setelah pembayaran diverifikasi oleh Admin.
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Header Status Saat Ini */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Package className="w-32 h-32" />
                        </div>
                        <CardContent className="pt-6 pb-6 relative z-10">
                            <h2 className="text-blue-100 font-medium mb-1">Paket Saat Ini</h2>
                            <div className="flex items-end gap-3 mb-4">
                                <span className="text-3xl font-bold">{currentSubscription?.plan?.name || 'Free Plan'}</span>
                                {currentSubscription?.status === 'active' && (
                                    <Badge className="bg-blue-400/30 text-blue-50 border-0">Aktif</Badge>
                                )}
                            </div>
                            
                            <div className="space-y-2 text-sm text-blue-50">
                                <div className="flex justify-between">
                                    <span>Masa Aktif Berakhir:</span>
                                    <span className="font-semibold">
                                        {currentSubscription?.ends_at 
                                            ? format(new Date(currentSubscription.ends_at), 'dd MMM yyyy') 
                                            : 'Selamanya'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Limit Produk:</span>
                                    <span className="font-semibold">
                                        {currentSubscription?.plan?.limits?.max_products == -1 ? 'Unlimited' : (currentSubscription?.plan?.limits?.max_products || 'Basic')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Limit User Kasir:</span>
                                    <span className="font-semibold">
                                        {currentSubscription?.plan?.limits?.max_users == -1 ? 'Unlimited' : (currentSubscription?.plan?.limits?.max_users || 1)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" /> Butuh Lebih Banyak Fitur?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col justify-center h-[calc(100%-60px)]">
                            <p className="text-slate-600 mb-4 text-sm">
                                Upgrade paket Anda untuk mendapatkan akses ke modul tambahan, kapasitas produk yang lebih besar, dan dukungan prioritas.
                            </p>
                            <Button 
                                onClick={() => document.getElementById('pricing-plans').scrollIntoView({ behavior: 'smooth' })}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5"
                            >
                                Lihat Pilihan Paket
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Pilih Paket Baru */}
                <div id="pricing-plans" className="pt-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upgrade Paket Anda</h2>
                        <p className="text-slate-500">Pilih paket yang paling sesuai dengan kebutuhan bisnis Anda.</p>
                        
                        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl mt-6">
                            <button 
                                onClick={() => { setBillingCycle('monthly'); setData('billing_cycle', 'monthly'); }}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Bulanan
                            </button>
                            <button 
                                onClick={() => { setBillingCycle('yearly'); setData('billing_cycle', 'yearly'); }}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Tahunan (Hemat 20%)
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {availablePlans.map((plan) => (
                            <Card key={plan.id} className={`relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${selectedPlan?.id === plan.id ? 'border-blue-600 shadow-lg shadow-blue-100' : 'border-transparent'}`}>
                                {selectedPlan?.id === plan.id && (
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                        Dipilih
                                    </div>
                                )}
                                <CardHeader className="text-center pb-0">
                                    <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                                    <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
                                </CardHeader>
                                <CardContent className="pt-6 text-center space-y-6">
                                    <div>
                                        <span className="text-3xl font-extrabold text-slate-900">
                                            Rp {billingCycle === 'monthly' ? parseInt(plan.price_monthly).toLocaleString('id-ID') : parseInt(plan.price_yearly).toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-slate-500 text-sm">/{billingCycle === 'monthly' ? 'bulan' : 'tahun'}</span>
                                    </div>
                                    
                                    <div className="space-y-3 text-left">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                            <span className="text-sm text-slate-700"><strong>{plan.limits?.max_products == -1 ? 'Unlimited' : plan.limits?.max_products}</strong> Produk</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                            <span className="text-sm text-slate-700"><strong>{plan.limits?.max_users == -1 ? 'Unlimited' : plan.limits?.max_users}</strong> User Kasir/Staf</span>
                                        </div>
                                        
                                        {/* Modul/Fitur Ekstra */}
                                        {plan.features?.map(featureKey => (
                                            <div key={featureKey} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                                                <span className="text-sm text-slate-700">Modul {featureKey.replace('-', ' ').toUpperCase()}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Button 
                                        onClick={() => handleUpgrade(plan)}
                                        className={`w-full py-2.5 rounded-xl ${
                                            currentSubscription?.plan_id === plan.id
                                                ? 'bg-slate-100 text-slate-500 cursor-not-allowed hover:bg-slate-100' 
                                                : selectedPlan?.id === plan.id 
                                                    ? 'bg-blue-700 hover:bg-blue-800 text-white' 
                                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        }`}
                                        disabled={currentSubscription?.plan_id === plan.id}
                                    >
                                        {currentSubscription?.plan_id === plan.id ? 'Paket Aktif' : 'Pilih Paket Ini'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {selectedPlan && currentSubscription?.plan_id !== selectedPlan.id && (
                        <div className="mt-8 bg-white border border-blue-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg">Konfirmasi Upgrade</h4>
                                <p className="text-slate-500 text-sm">Anda memilih <strong>{selectedPlan.name}</strong> dengan penagihan {billingCycle === 'monthly' ? 'Bulanan' : 'Tahunan'}.</p>
                                <p className="text-sm text-blue-600 mt-1">Total Tagihan: Rp {billingCycle === 'monthly' ? parseInt(selectedPlan.price_monthly).toLocaleString('id-ID') : parseInt(selectedPlan.price_yearly).toLocaleString('id-ID')}</p>
                            </div>
                            <Button 
                                onClick={confirmUpgrade} 
                                disabled={processing}
                                className="mt-4 md:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-3 flex items-center gap-2"
                            >
                                <CreditCard className="w-5 h-5" />
                                Bayar & Aktifkan Sekarang
                            </Button>
                        </div>
                    )}
                </div>

                {/* Riwayat Tagihan */}
                <div className="pt-8">
                    <Card>
                        <CardHeader className="border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-slate-600" /> Riwayat Tagihan (Invoices)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead>No. Invoice</TableHead>
                                        <TableHead>Total (Rp)</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Tgl Tagihan</TableHead>
                                        <TableHead>Tgl Bayar</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices?.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium text-slate-700">{invoice.invoice_number}</TableCell>
                                            <TableCell>Rp {parseInt(invoice.amount).toLocaleString('id-ID')}</TableCell>
                                            <TableCell>{getInvoiceStatus(invoice.status)}</TableCell>
                                            <TableCell>{format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: localeId })}</TableCell>
                                            <TableCell>{invoice.paid_at ? format(new Date(invoice.paid_at), 'dd MMM yyyy', { locale: localeId }) : '-'}</TableCell>
                                            <TableCell className="text-right">
                                                {invoice.status === 'unpaid' && (
                                                    <Button size="sm" onClick={() => handlePayInvoice(invoice)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3">
                                                        Bayar
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!invoices || invoices.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                                                Belum ada riwayat tagihan.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Modal Invoice / Cara Pembayaran */}
            {showInvoiceModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">Detail Tagihan</h3>
                            <button onClick={() => { setShowInvoiceModal(null); resetUpload(); clearUploadErrors(); }} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="text-center space-y-1">
                                <p className="text-slate-500 text-sm">Total Pembayaran</p>
                                <p className="text-4xl font-black text-slate-900">
                                    Rp {parseInt(showInvoiceModal.amount).toLocaleString('id-ID')}
                                </p>
                                <p className="text-xs font-semibold text-slate-400">Order ID: {showInvoiceModal.invoice_number}</p>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                                <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-blue-600" /> Instruksi Pembayaran Manual
                                </p>
                                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                    Silakan transfer sejumlah <strong>Rp {parseInt(showInvoiceModal.amount).toLocaleString('id-ID')}</strong> ke rekening berikut:
                                </p>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 relative group">
                                    <p className="font-mono font-bold text-lg text-slate-900 tracking-wide">{bankTransferDetails}</p>
                                    <button 
                                        onClick={() => copyToClipboard(bankTransferDetails)}
                                        className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 hover:text-slate-900"
                                        title="Salin Nomor Rekening"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-4">
                                    Setelah melakukan transfer, silakan unggah bukti pembayaran di bawah ini.
                                </p>
                            </div>
                            
                            <form onSubmit={handleUploadProof} className="space-y-4">
                                <div>
                                    <InputLabel value="Upload Bukti Pembayaran (JPG/PNG/PDF, Max 2MB)" />
                                    <input 
                                        type="file" 
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={(e) => setUploadData('payment_proof', e.target.files[0])}
                                        className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {uploadErrors.payment_proof && <p className="text-sm text-rose-500 mt-1">{uploadErrors.payment_proof}</p>}
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={uploading || !uploadData.payment_proof}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl"
                                >
                                    {uploading ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
                                </Button>
                            </form>
                            
                            <Button 
                                type="button"
                                onClick={() => { setShowInvoiceModal(null); resetUpload(); clearUploadErrors(); }}
                                className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 py-2.5 rounded-xl"
                            >
                                Tutup
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
