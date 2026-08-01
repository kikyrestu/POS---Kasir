import { useEffect, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button, Input, Label, Card, CardContent } from '@/Components/UI';
import { Store } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        store_name: '',
        subdomain: '',
        email: '',
        password: '',
    });

    const [domainBase, setDomainBase] = useState('.buildypos.store');

    useEffect(() => {
        setDomainBase('.' + window.location.host);
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('tenant.register.store'));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <Head title="Register Your Store" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <Store className="mx-auto h-12 w-12 text-primary-600" />
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Start your SaaS POS today
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Set up your store in minutes
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card>
                    <CardContent className="py-8 px-4 sm:px-10">
                        <form className="space-y-6" onSubmit={submit}>
                            <div>
                                <Label htmlFor="store_name" value="Store Name" />
                                <Input
                                    id="store_name"
                                    type="text"
                                    value={data.store_name}
                                    className="mt-1 block w-full"
                                    onChange={(e) => setData('store_name', e.target.value)}
                                    required
                                />
                                {errors.store_name && <p className="mt-2 text-sm text-red-600">{errors.store_name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="subdomain" value="Store URL (Subdomain)" />
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <Input
                                        id="subdomain"
                                        type="text"
                                        value={data.subdomain}
                                        className="flex-1 min-w-0 block w-full rounded-none rounded-l-md"
                                        onChange={(e) => setData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="my-store"
                                        required
                                    />
                                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                        {domainBase}
                                    </span>
                                </div>
                                {errors.subdomain && <p className="mt-2 text-sm text-red-600">{errors.subdomain}</p>}
                            </div>

                            <div>
                                <Label htmlFor="email" value="Owner Email" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    className="mt-1 block w-full"
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
                            </div>

                            <div>
                                <Label htmlFor="password" value="Password" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    className="mt-1 block w-full"
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                />
                                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
                            </div>

                            <div>
                                <Button type="submit" className="w-full justify-center" disabled={processing}>
                                    {processing ? 'Creating your store...' : 'Create Store'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
