import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Card, CardContent, Button, Input, Label, Select } from '@/Components/UI';
import { ArrowLeft, KeyRound } from 'lucide-react';

export default function Edit({ tenant, subscription, plans }) {
    const { flash } = usePage().props;

    const { data, setData, put, processing, errors } = useForm({
        name: tenant.name || '',
        email: tenant.email || '',
        is_active: tenant.is_active ? '1' : '0',
        plan_id: subscription?.plan_id ? String(subscription.plan_id) : '',
        subscription_status: subscription?.status || '',
        expires_at: subscription?.expires_at ? subscription.expires_at.slice(0, 10) : '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.tenants.update', tenant.id));
    };

    const resetPassword = () => {
        if (!confirm(`Reset the owner password for ${tenant.name}? A new random password will be generated.`)) return;
        router.post(route('admin.tenants.reset-password', tenant.id));
    };

    return (
        <SaasAdminLayout>
            <Head title={`Edit ${tenant.name}`} />

            <div className="flex items-center mb-8 gap-4">
                <Link href={route('admin.tenants.index')} className="text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Tenant</h1>
                    <p className="text-gray-500">{tenant.id}.buildypos.store</p>
                </div>
            </div>

            {flash?.success && (
                <div className="max-w-2xl mb-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-4">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="max-w-2xl mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4">
                    {flash.error}
                </div>
            )}
            {flash?.new_password && (
                <div className="max-w-2xl mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">New Owner Password</p>
                    <p className="text-xs text-amber-700 mb-3">
                        Save this now and send it to the owner — it is shown only once and cannot be recovered later.
                    </p>
                    <div className="text-sm font-mono bg-white rounded border border-amber-200 px-3 py-2">
                        {flash.new_password}
                    </div>
                </div>
            )}

            <Card className="max-w-2xl">
                <CardContent className="pt-6">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <Label htmlFor="name" value="Store Name" />
                            <Input
                                id="name"
                                type="text"
                                value={data.name}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                        </div>

                        <div>
                            <Label htmlFor="email" value="Owner Email" />
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Also updates the owner's login email inside the tenant's own database.
                            </p>
                            {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
                        </div>

                        <div>
                            <Label htmlFor="is_active" value="Status" />
                            <Select
                                id="is_active"
                                value={data.is_active}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('is_active', e.target.value)}
                            >
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </Select>
                            {errors.is_active && <div className="text-red-500 text-sm mt-1">{errors.is_active}</div>}
                        </div>

                        <hr className="my-2" />
                        <p className="text-sm font-semibold text-gray-700">Subscription</p>

                        <div>
                            <Label htmlFor="plan_id" value="Plan" />
                            <Select
                                id="plan_id"
                                value={data.plan_id}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('plan_id', e.target.value)}
                            >
                                <option value="">— No change —</option>
                                {plans.map((plan) => (
                                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                                ))}
                            </Select>
                            {errors.plan_id && <div className="text-red-500 text-sm mt-1">{errors.plan_id}</div>}
                        </div>

                        <div>
                            <Label htmlFor="subscription_status" value="Subscription Status" />
                            <Select
                                id="subscription_status"
                                value={data.subscription_status}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('subscription_status', e.target.value)}
                            >
                                <option value="">— No change —</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                            </Select>
                            {errors.subscription_status && <div className="text-red-500 text-sm mt-1">{errors.subscription_status}</div>}
                        </div>

                        <div>
                            <Label htmlFor="expires_at" value="Expires At" />
                            <Input
                                id="expires_at"
                                type="date"
                                value={data.expires_at}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('expires_at', e.target.value)}
                            />
                            {errors.expires_at && <div className="text-red-500 text-sm mt-1">{errors.expires_at}</div>}
                            {!subscription && (
                                <p className="text-xs text-gray-500 mt-1">
                                    This tenant has no subscription yet — pick a plan above to create one.
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={processing}>
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="max-w-2xl mt-6 border-red-200">
                <CardContent className="pt-6">
                    <p className="text-sm font-semibold text-gray-900">Owner Account</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">
                        Generate a new random password for the tenant owner's login. Use this when an owner is locked out
                        and can't use "forgot password" themselves.
                    </p>
                    <Button variant="secondary" onClick={resetPassword} type="button">
                        <KeyRound className="w-4 h-4 mr-2" />
                        Reset Owner Password
                    </Button>
                </CardContent>
            </Card>
        </SaasAdminLayout>
    );
}
