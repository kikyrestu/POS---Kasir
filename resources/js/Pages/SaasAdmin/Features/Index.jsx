import { Head, router } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Select, Badge } from '@/Components/UI';
import { Settings } from 'lucide-react';

export default function Index({ features }) {
    const handleStatusChange = (feature, newStatus) => {
        router.put(route('admin.features.update', feature.id), { status: newStatus }, {
            preserveScroll: true,
        });
    };

    return (
        <SaasAdminLayout>
            <Head title="Manage Features" />
            
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Platform Features</h1>
                    <p className="text-gray-500">Manage global feature toggles and maintenance mode</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Feature Key</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Current Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {features.map((feature) => (
                                <TableRow key={feature.id}>
                                    <TableCell className="font-mono text-sm text-gray-500">{feature.key}</TableCell>
                                    <TableCell className="font-medium">{feature.name}</TableCell>
                                    <TableCell className="text-gray-500 max-w-md">{feature.description}</TableCell>
                                    <TableCell>
                                        {feature.status === 'active' && <Badge variant="success">Active</Badge>}
                                        {feature.status === 'inactive' && <Badge variant="danger">Inactive</Badge>}
                                        {feature.status === 'maintenance' && <Badge variant="warning">Maintenance</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <select 
                                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2.5 ml-auto"
                                            value={feature.status}
                                            onChange={(e) => handleStatusChange(feature, e.target.value)}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="maintenance">Maintenance</option>
                                        </select>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {features.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No features registered. Please run the seeder.
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
