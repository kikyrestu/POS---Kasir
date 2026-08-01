import { Link, useForm } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button } from '@/Components/UI';
import { toast } from 'sonner';

export default function PlansIndex({ plans }) {
    const { delete: destroy } = useForm();

    const handleDelete = (id) => {
        if (confirm('Apakah Anda yakin ingin menghapus paket ini?')) {
            destroy(route('admin.plans.destroy', id), {
                onSuccess: () => toast.success('Paket berhasil dihapus.')
            });
        }
    };

    return (
        <SaasAdminLayout title="Manajemen Paket (Plans)">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-800">Daftar Paket Berlangganan</CardTitle>
                    <Link href={route('admin.plans.create')}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium px-4 py-2 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Tambah Paket
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead>Nama Paket</TableHead>
                                <TableHead>Harga Bulanan</TableHead>
                                <TableHead>Harga Tahunan</TableHead>
                                <TableHead>Limit Produk</TableHead>
                                <TableHead>Limit User</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-semibold">{plan.name}</TableCell>
                                    <TableCell>Rp {parseInt(plan.price_monthly).toLocaleString('id-ID')}</TableCell>
                                    <TableCell>Rp {parseInt(plan.price_yearly).toLocaleString('id-ID')}</TableCell>
                                    <TableCell>{plan.limits?.max_products === '-1' ? 'Unlimited' : plan.limits?.max_products || 0}</TableCell>
                                    <TableCell>{plan.limits?.max_users === '-1' ? 'Unlimited' : plan.limits?.max_users || 0}</TableCell>
                                    <TableCell>
                                        <Badge className={plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                                            {plan.is_active ? 'Aktif' : 'Tidak Aktif'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={route('admin.plans.edit', plan.id)}>
                                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(plan.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {plans.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                        Belum ada paket berlangganan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </SaasAdminLayout>
    );
}
