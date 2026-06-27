import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            <Head title="BuildyPOS Cashier App - Log in" />

            {/* Left side styling - Brand */}
            <div className="hidden lg:flex lg:flex-col lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-teal-900 p-12 text-white justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center mb-10">
                        <img src="/images/logo.png" alt="BuildyPOS Logo" className="h-10 w-auto object-contain brightness-0 invert" />
                    </div>
                    <h2 className="text-5xl font-black mb-6 leading-tight" style={{fontFamily: "'Inter', sans-serif"}}>
                        Empower your retail business.
                    </h2>
                    <p className="text-blue-200 text-lg max-w-md">
                        The fully-featured cashier and inventory system for modern retail experiences. Secure, fast, and completely customizable.
                    </p>
                </div>
                
                {/* Decorative background vectors */}
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-1/4 -right-20 w-80 h-80 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                
                <div className="relative z-10 text-sm text-blue-300">
                    &copy; {new Date().getFullYear()} BuildyPOS Team. All rights reserved.
                </div>
            </div>

            {/* Right side styling - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-24 relative bg-white">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center mb-8">
                        <img src="/images/logo.png" alt="BuildyPOS Logo" className="h-8 w-auto object-contain" />
                    </div>

                    <h3 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h3>
                    <p className="text-slate-500 mb-8">Please enter your credentials to access the terminal.</p>

                    {status && <div className="mb-4 text-sm font-medium text-green-600 px-4 py-3 bg-green-50 rounded-lg border border-green-100">{status}</div>}

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <InputLabel htmlFor="email" value="Email Address" className="text-slate-700" />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm px-4 py-3"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mt-1">
                                <InputLabel htmlFor="password" value="Password" className="text-slate-700" />
                                {canResetPassword && (
                                    <Link href={route('password.request')} className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                                        Forgot password?
                                    </Link>
                                )}
                            </div>
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm px-4 py-3"
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center cursor-pointer group">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5 rounded"
                                />
                                <span className="ms-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                            </label>
                        </div>

                        <button 
                            disabled={processing}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 mt-4 flex justify-center items-center h-12"
                        >
                            {processing ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Sign In to Terminal"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
