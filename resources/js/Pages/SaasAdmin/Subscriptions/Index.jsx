import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Eye, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Modal } from '@/Components/UI';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function SubscriptionsIndex({ subscriptions }) {
    const [expandedRow, setExpandedRow] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', id: null });

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

    const toggleRow = (id) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    const handleApproveClick = (e, id) => {
        e.stopPropagation();
        setConfirmModal({ isOpen: true, type: 'approve', id });
    };

    const handleRejectClick = (e, id) => {
        e.stopPropagation();
        setConfirmModal({ isOpen: true, type: 'reject', id });
    };

    const handleConfirmAction = () => {
        if (confirmModal.type === 'approve') {
            router.post(route('admin.subscriptions.approve', confirmModal.id), {}, {
                onFinish: () => setConfirmModal({ isOpen: false, type: '', id: null })
            });
        } else if (confirmModal.type === 'reject') {
            router.post(route('admin.subscriptions.reject', confirmModal.id), {}, {
                onFinish: () => setConfirmModal({ isOpen: false, type: '', id: null })
            });
        }
    };

    return (
        <SaasAdminLayout title="Manajemen Subscriptions">
            <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800">Daftar Langganan (Subscriptions)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Toko (Tenant)</TableHead>
                                <TableHead>Paket</TableHead>
                                <TableHead>Mulai</TableHead>
                                <TableHead>Berakhir</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.map((sub) => (
                                <React.Fragment key={sub.id}>
                                    <TableRow 
                                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => toggleRow(sub.id)}
                                    >
                                        <TableCell>
                                            {expandedRow === sub.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900">{sub.tenant?.name || 'Unknown'}</TableCell>
                                        <TableCell>{sub.plan?.name || 'Unknown'}</TableCell>
                                        <TableCell>
                                            {sub.starts_at ? format(new Date(sub.starts_at), 'dd MMM yyyy', { locale: id }) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {sub.ends_at ? format(new Date(sub.ends_at), 'dd MMM yyyy', { locale: id }) : '-'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {sub.status === 'pending' && (
                                                    <>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={(e) => handleApproveClick(e, sub.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={(e) => handleRejectClick(e, sub.id)}
                                                            className="bg-rose-600 hover:bg-rose-700 text-white"
                                                        >
                                                            <XCircle className="w-4 h-4 mr-1" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Link href={route('admin.subscriptions.show', sub.id)} onClick={(e) => e.stopPropagation()}>
                                                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {expandedRow === sub.id && (
                                        <TableRow className="bg-slate-50/50">
                                            <TableCell colSpan={7} className="p-0 border-b-0">
                                                <div className="p-6">
                                                    <h4 className="font-semibold text-slate-800 mb-4">Detail Tagihan (Invoices)</h4>
                                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                        <Table>
                                                            <TableHeader className="bg-slate-50">
                                                                <TableRow>
                                                                    <TableHead>Invoice #</TableHead>
                                                                    <TableHead>Total Tagihan</TableHead>
                                                                    <TableHead>Status Pembayaran</TableHead>
                                                                    <TableHead>Bukti Transfer</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {sub.invoices && sub.invoices.length > 0 ? (
                                                                    sub.invoices.map((inv) => (
                                                                        <TableRow key={inv.id}>
                                                                            <TableCell className="font-medium text-slate-900">{inv.invoice_number}</TableCell>
                                                                            <TableCell>Rp {Number(inv.amount).toLocaleString('id-ID')}</TableCell>
                                                                            <TableCell>
                                                                                {inv.status === 'paid' ? (
                                                                                    <Badge className="bg-emerald-100 text-emerald-700">Lunas</Badge>
                                                                                ) : inv.status === 'pending' ? (
                                                                                    <Badge className="bg-amber-100 text-amber-700 flex w-max items-center gap-1">
                                                                                        <Clock className="w-3 h-3"/> Menunggu Konfirmasi
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge className="bg-rose-100 text-rose-700">Belum Dibayar</Badge>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {inv.payment_proof ? (
                                                                                    <a 
                                                                                        href={`/storage/${inv.payment_proof}`} 
                                                                                        target="_blank" 
                                                                                        rel="noreferrer"
                                                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                                                                                    >
                                                                                        <Eye className="w-4 h-4"/> Lihat Bukti
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className="text-slate-400 italic text-sm">Belum ada file</span>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                ) : (
                                                                    <TableRow>
                                                                        <TableCell colSpan={4} className="text-center py-4 text-slate-500 text-sm">Tidak ada invoice untuk langganan ini.</TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                            {subscriptions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                        Belum ada data langganan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: '', id: null })}
                title={confirmModal.type === 'approve' ? 'Konfirmasi Setujui Langganan' : 'Konfirmasi Tolak Langganan'}
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        {confirmModal.type === 'approve'
                            ? 'Apakah Anda yakin ingin menyetujui langganan ini? Status toko akan menjadi aktif.'
                            : 'Apakah Anda yakin ingin MENOLAK langganan ini? Langganan akan dibatalkan.'}
                    </p>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button
                            variant="secondary"
                            onClick={() => setConfirmModal({ isOpen: false, type: '', id: null })}
                        >
                            Batal
                        </Button>
                        <Button
                            variant={confirmModal.type === 'approve' ? 'primary' : 'danger'}
                            onClick={handleConfirmAction}
                        >
                            Ya, {confirmModal.type === 'approve' ? 'Setujui' : 'Tolak'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </SaasAdminLayout>
    );
}
