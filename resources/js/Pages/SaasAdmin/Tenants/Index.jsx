import { Head, Link } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/Components/UI';
import { Plus, Store, Trash2 } from 'lucide-react';

export default function Index({ tenants }) {
    return (
        <SaasAdminLayout>
            <Head title="Tenants" />
            
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
                    <p className="text-gray-500">Manage your SaaS tenants</p>
                </div>
                <Link href={route('admin.tenants.create')}>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Tenant
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tenant ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Domains</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tenants.data.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell className="font-medium">{tenant.id}</TableCell>
                                    <TableCell>{tenant.name}</TableCell>
                                    <TableCell>{tenant.email}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {tenant.domains?.map(d => (
                                                <a key={d.id} href={`http://${d.domain}.${window.location.host.replace('admin.', '')}`} target="_blank" className="text-primary-600 hover:underline">
                                                    {d.domain}
                                                </a>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {tenant.is_active ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Inactive</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={route('admin.tenants.destroy', tenant.id)}
                                            method="delete"
                                            as="button"
                                            className="text-red-600 hover:text-red-900 ml-4"
                                            onClick={(e) => {
                                                if (!confirm('Are you sure? This will delete the tenant and all its data!')) e.preventDefault();
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tenants.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No tenants found.
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
