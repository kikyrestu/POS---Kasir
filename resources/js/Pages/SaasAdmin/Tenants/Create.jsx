import { Head, Link, useForm } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label } from '@/Components/UI';
import { ArrowLeft } from 'lucide-react';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        id: '',
        name: '',
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.tenants.store'));
    };

    return (
        <SaasAdminLayout>
            <Head title="Create Tenant" />
            
            <div className="flex items-center mb-8 gap-4">
                <Link href={route('admin.tenants.index')} className="text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Tenant</h1>
                    <p className="text-gray-500">Add a new store to the platform</p>
                </div>
            </div>

            <Card className="max-w-2xl">
                <CardContent className="pt-6">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <Label htmlFor="name" value="Store Name" />
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={data.name}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                        </div>

                        <div>
                            <Label htmlFor="id" value="Subdomain (Tenant ID)" />
                            <div className="flex mt-1 shadow-sm rounded-md">
                                <Input
                                    id="id"
                                    type="text"
                                    name="id"
                                    value={data.id}
                                    className="block w-full rounded-r-none"
                                    placeholder="tokobaju"
                                    onChange={(e) => setData('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                />
                                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    .buildypos.store
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and dashes.</p>
                            {errors.id && <div className="text-red-500 text-sm mt-1">{errors.id}</div>}
                        </div>

                        <div>
                            <Label htmlFor="email" value="Owner Email" />
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={processing}>
                                Create Store
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </SaasAdminLayout>
    );
}
