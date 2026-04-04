import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/30 px-4">
            <div className="mb-6">
                <Link href="/">
                    <ApplicationLogo />
                </Link>
            </div>

            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 px-8 py-8 shadow-xl">
                {children}
            </div>

            <p className="mt-6 text-xs text-slate-400">&copy; {new Date().getFullYear()} NEXAPOS. All rights reserved.</p>
        </div>
    );
}
