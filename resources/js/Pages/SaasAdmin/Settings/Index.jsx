import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/Components/UI';
import { Settings, CreditCard, Mail, Clock, Save } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function SettingsIndex({ settings }) {
    const [activeTab, setActiveTab] = useState('midtrans');

    const { data, setData, post, processing, errors } = useForm({
        midtrans_environment: settings.midtrans_environment || 'sandbox',
        midtrans_server_key: settings.midtrans_server_key || '',
        midtrans_client_key: settings.midtrans_client_key || '',
        midtrans_enabled: settings.midtrans_enabled || '0',
        
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || '',
        smtp_username: settings.smtp_username || '',
        smtp_password: settings.smtp_password || '',
        smtp_from_address: settings.smtp_from_address || '',
        smtp_from_name: settings.smtp_from_name || '',

        grace_period_days: settings.grace_period_days || '3',
        suspend_action: settings.suspend_action || 'suspend',
        
        default_plan_id: settings.default_plan_id || '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.settings.store'), {
            onSuccess: () => toast.success('Pengaturan berhasil disimpan!'),
        });
    };

    return (
        <SaasAdminLayout>
            <Toaster richColors position="top-right" />
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Global SaaS Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Kelola konfigurasi payment gateway, email, dan otomatisasi cron.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-sm">
                    {/* Tabs Sidebar */}
                    <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex md:flex-col">
                        <button
                            onClick={() => setActiveTab('midtrans')}
                            className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors border-l-4 ${activeTab === 'midtrans' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
                        >
                            <CreditCard className="w-5 h-5" /> Payment Gateway
                        </button>
                        <button
                            onClick={() => setActiveTab('cron')}
                            className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors border-l-4 ${activeTab === 'cron' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Clock className="w-5 h-5" /> Auto-Suspend
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors border-l-4 ${activeTab === 'email' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Mail className="w-5 h-5" /> SMTP Email
                        </button>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors border-l-4 ${activeTab === 'general' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Settings className="w-5 h-5" /> General
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 md:p-8">
                        <form onSubmit={submit} className="space-y-6">
                            
                            {/* Midtrans Tab */}
                            {activeTab === 'midtrans' && (
                                <div className="space-y-5 animate-in fade-in">
                                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Midtrans Settings</h2>
                                    
                                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div>
                                            <label className="font-semibold text-slate-800 text-sm">Aktifkan Payment Gateway</label>
                                            <p className="text-xs text-slate-500">Jika mati, pembayaran akan manual.</p>
                                        </div>
                                        <select
                                            value={data.midtrans_enabled}
                                            onChange={e => setData('midtrans_enabled', e.target.value)}
                                            className="rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="1">Aktif</option>
                                            <option value="0">Mati</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                                        <select
                                            value={data.midtrans_environment}
                                            onChange={e => setData('midtrans_environment', e.target.value)}
                                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        >
                                            <option value="sandbox">Sandbox (Testing)</option>
                                            <option value="production">Production (Live)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Server Key</label>
                                        <input
                                            type="text"
                                            value={data.midtrans_server_key}
                                            onChange={e => setData('midtrans_server_key', e.target.value)}
                                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="SB-Mid-server-xxx..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Key</label>
                                        <input
                                            type="text"
                                            value={data.midtrans_client_key}
                                            onChange={e => setData('midtrans_client_key', e.target.value)}
                                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="SB-Mid-client-xxx..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Cron Tab */}
                            {activeTab === 'cron' && (
                                <div className="space-y-5 animate-in fade-in">
                                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Auto-Suspend & Expiry Settings</h2>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Masa Tenggang)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={data.grace_period_days}
                                                onChange={e => setData('grace_period_days', e.target.value)}
                                                className="w-24 rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-gray-500">hari setelah paket kedaluwarsa.</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tindakan Jika Masa Tenggang Habis</label>
                                        <select
                                            value={data.suspend_action}
                                            onChange={e => setData('suspend_action', e.target.value)}
                                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        >
                                            <option value="suspend">Suspend/Lock Aplikasi Kasir Sepenuhnya</option>
                                            <option value="downgrade">Downgrade otomatis ke Free Plan</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Email Tab */}
                            {activeTab === 'email' && (
                                <div className="space-y-5 animate-in fade-in">
                                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">SMTP Email Settings</h2>
                                    <p className="text-xs text-amber-600 mb-4 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                        Perhatian: Pengaturan ini akan me-override MAIL_ setinggan di .env agar email dikirim dinamis.
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                                            <input type="text" value={data.smtp_host} onChange={e => setData('smtp_host', e.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm" placeholder="smtp.gmail.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                            <input type="text" value={data.smtp_port} onChange={e => setData('smtp_port', e.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm" placeholder="587" />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                            <input type="text" value={data.smtp_username} onChange={e => setData('smtp_username', e.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                            <input type="password" value={data.smtp_password} onChange={e => setData('smtp_password', e.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
                                            <input type="email" value={data.smtp_from_address} onChange={e => setData('smtp_from_address', e.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm" placeholder="noreply@nexapos.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                                            <input type="text" value={data.smtp_from_name} onChange={e => setData('smtp_from_name', e.target.value)} className="w-full rounded-xl border-gray-300 shadow-sm" placeholder="NEXA POS" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* General Tab */}
                            {activeTab === 'general' && (
                                <div className="space-y-5 animate-in fade-in">
                                    <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">General Settings</h2>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Default Paket Gratis (Register Baru)</label>
                                        <input
                                            type="text"
                                            value={data.default_plan_id}
                                            onChange={e => setData('default_plan_id', e.target.value)}
                                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="Kosongkan jika auto-create"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Opsional. Masukkan ID Paket (Plan ID) untuk otomatis diberikan pada tenant yang baru mendaftar.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
                                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 flex items-center gap-2">
                                    <Save className="w-5 h-5" />
                                    Simpan Pengaturan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </SaasAdminLayout>
    );
}
