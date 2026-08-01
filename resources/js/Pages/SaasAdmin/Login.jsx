import { useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button, Input, Label } from '@/Components/UI';

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.login'));
    };

    return (
        <GuestLayout>
            <Head title="SaaS Admin Login" />

            <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900">SaaS Admin</h2>
                <p className="text-sm text-gray-500">Log in to central dashboard</p>
            </div>

            {status && <div className="mb-4 font-medium text-sm text-green-600">{status}</div>}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <Label htmlFor="email" value="Email" />
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        autoFocus={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
                </div>

                <div>
                    <Label htmlFor="password" value="Password" />
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    {errors.password && <div className="text-red-500 text-sm mt-1">{errors.password}</div>}
                </div>

                <div className="block mt-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                        />
                        <span className="ms-2 text-sm text-gray-600">Remember me</span>
                    </label>
                </div>

                <div className="flex items-center justify-end mt-4">
                    <Button type="submit" className="w-full" disabled={processing}>
                        Log in
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
