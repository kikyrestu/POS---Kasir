import { Head } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/UI';
import { Store, Users, Activity } from 'lucide-react';

export default function Dashboard({ tenantsCount }) {
    return (
        <SaasAdminLayout>
            <Head title="SaaS Admin Dashboard" />
            
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Overview of your SaaS platform</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Tenants</CardTitle>
                        <Store className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{tenantsCount}</div>
                    </CardContent>
                </Card>
            </div>
        </SaasAdminLayout>
    );
}
