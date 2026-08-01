import { Link, router } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { ArrowLeft, User, Package, Calendar, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/Components/UI';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function SubscriptionsShow({ subscription }) {
    const { tenant, plan, invoices } = subscription;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-emerald-100 text-emerald-700">Aktif</Badge>;
            case 'expired':
                return <Badge className="bg-rose-100 text-rose-700">Kedaluwarsa</Badge>;
            case 'cancelled':
                return <Badge className="bg-slate-100 text-slate-700">Dibatalkan</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-500">{status}</Badge>;
        }
    };

    const handleApprove = () => {
        if (confirm('Apakah Anda yakin ingin menyetujui dan mengaktifkan langganan ini?')) {
            router.post(route('admin.subscriptions.approve', subscription.id));
        }
    };

    const getInvoiceStatus = (status) => {
        switch (status) {
            case 'paid':
                return <Badge className="bg-emerald-100 text-emerald-700">Lunas</Badge>;
            case 'unpaid':
                return <Badge className="bg-rose-100 text-rose-700">Belum Bayar</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-500">{status}</Badge>;
        }
    };

    return (
        <SaasAdminLayout title="Detail Subscription">
            <div className="max-w-4xl space-y-6">
                <div className="flex justify-between items-center">
                    <Link href={route('admin.subscriptions.index')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Langganan
                    </Link>
                    {subscription.status === 'pending' && (
                        <button 
                            onClick={handleApprove}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" /> Approve & Aktifkan
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Detail Langganan */}
                    <Card>
                        <CardHeader className="border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-600" /> Informasi Langganan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Status</span>
                                {getStatusBadge(subscription.status)}
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Paket</span>
                                <span className="font-semibold">{plan?.name || 'Unknown Plan'}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Mulai</span>
                                <span className="text-sm">
                                    {subscription.starts_at ? format(new Date(subscription.starts_at), 'dd MMMM yyyy', { locale: id }) : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Berakhir</span>
                                <span className="text-sm">
                                    {subscription.ends_at ? format(new Date(subscription.ends_at), 'dd MMMM yyyy', { locale: id }) : '-'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detail Tenant */}
                    <Card>
                        <CardHeader className="border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" /> Informasi Toko (Tenant)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex flex-col pb-3 border-b border-slate-50">
                                <span className="text-xs text-slate-500 mb-1">Nama Toko</span>
                                <span className="font-semibold text-slate-800">{tenant?.name}</span>
                            </div>
                            <div className="flex flex-col pb-3 border-b border-slate-50">
                                <span className="text-xs text-slate-500 mb-1">Email Pemilik</span>
                                <span className="text-sm text-slate-800">{tenant?.email}</span>
                            </div>
                            <div className="flex flex-col pb-3 border-b border-slate-50">
                                <span className="text-xs text-slate-500 mb-1">Domain URL</span>
                                <span className="text-sm text-blue-600">{tenant?.id}.buildypos.store</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Riwayat Invoice */}
                <Card>
                    <CardHeader className="border-b border-slate-100 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Riwayat Tagihan (Invoices)
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
                                    <TableHead>Bukti Bayar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices?.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium text-slate-700">{invoice.invoice_number}</TableCell>
                                        <TableCell>Rp {parseInt(invoice.amount).toLocaleString('id-ID')}</TableCell>
                                        <TableCell>{getInvoiceStatus(invoice.status)}</TableCell>
                                        <TableCell>{format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: id })}</TableCell>
                                        <TableCell>{invoice.paid_at ? format(new Date(invoice.paid_at), 'dd MMM yyyy', { locale: id }) : '-'}</TableCell>
                                        <TableCell>
                                            {invoice.payment_proof ? (
                                                <a href={`/storage/${invoice.payment_proof}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                                                    Lihat
                                                </a>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!invoices || invoices.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                                            Belum ada invoice untuk langganan ini.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </SaasAdminLayout>
    );
}
