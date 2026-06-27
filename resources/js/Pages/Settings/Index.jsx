import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Settings, Store, Receipt, Printer, Bell, CreditCard } from 'lucide-react';
import { Button, Input } from '@/Components/UI';
import { useState } from 'react';

const TABS = [
    { key: 'toko', label: 'Toko', icon: Store },
    { key: 'transaksi', label: 'Transaksi', icon: CreditCard },
    { key: 'struk', label: 'Struk', icon: Receipt },
    { key: 'printer', label: 'Printer', icon: Printer },
    { key: 'notifikasi', label: 'Notifikasi', icon: Bell },
];

const SETTINGS_FIELDS = {
    toko: [
        { key: 'store_name', label: 'Nama Toko', type: 'text' },
        { key: 'store_address', label: 'Alamat', type: 'textarea' },
        { key: 'store_phone', label: 'Telepon', type: 'text' },
        { key: 'store_email', label: 'Email', type: 'email' },
        { key: 'store_tax_number', label: 'NPWP', type: 'text' },
    ],
    transaksi: [
        { key: 'discount_format', label: 'Format Diskon', type: 'select', options: [{ value: 'amount', label: 'Nominal (Rp)' }, { value: 'percent', label: 'Persentase (%)' }] },
        { key: 'tax_format', label: 'Format Pajak', type: 'select', options: [{ value: 'amount', label: 'Nominal (Rp)' }, { value: 'percent', label: 'Persentase (%)' }] },
    ],
    struk: [
        { key: 'receipt_header', label: 'Header Struk', type: 'textarea' },
        { key: 'receipt_footer', label: 'Footer Struk', type: 'textarea' },
        { key: 'receipt_show_logo', label: 'Tampilkan Logo', type: 'checkbox' },
        { key: 'receipt_paper_size', label: 'Ukuran Kertas', type: 'select', options: ['58mm', '80mm', 'A4'] },
    ],
    printer: [
        { key: 'printer_auto_print', label: 'Otomatis Buka Print Dialog', type: 'checkbox' },
    ],
    notifikasi: [
        { key: 'notif_low_stock', label: 'Notifikasi Stok Rendah', type: 'checkbox' },
        { key: 'notif_low_stock_threshold', label: 'Batas Stok Rendah', type: 'number' },
        { key: 'notif_due_payment', label: 'Notifikasi Jatuh Tempo', type: 'checkbox' },
        { key: 'notif_due_days_before', label: 'Hari Sebelum Jatuh Tempo', type: 'number' },
    ],
};

export default function SettingsIndex({ settings }) {
    const [activeTab, setActiveTab] = useState('toko');

    const getVal = (group, key) => {
        return settings?.[group]?.[key] || '';
    };

    const form = useForm({
        settings: Object.entries(SETTINGS_FIELDS).flatMap(([group, fields]) =>
            fields.map(field => ({
                key: field.key,
                value: getVal(group, field.key),
                group,
            }))
        ),
    });

    const updateField = (key, value) => {
        form.setData('settings', form.data.settings.map(s =>
            s.key === key ? { ...s, value } : s
        ));
    };

    const getFieldValue = (key) => {
        return form.data.settings.find(s => s.key === key)?.value || '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('settings.update'));
    };

    return (
        <AppLayout title="Pengaturan">
            <Head title="Pengaturan" />

            <div>
                <h2 className="text-2xl font-bold text-slate-900">Pengaturan</h2>
                <p className="text-sm text-slate-500 mt-1">Konfigurasi sistem POS</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Tabs */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4">
                    <nav className="space-y-1">
                        {TABS.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                            <h3 className="font-bold text-slate-900 mb-6">{TABS.find(t => t.key === activeTab)?.label}</h3>
                            <div className="space-y-4">
                                {SETTINGS_FIELDS[activeTab]?.map(field => (
                                    <div key={field.key}>
                                        {field.type === 'checkbox' ? (
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={getFieldValue(field.key) === '1' || getFieldValue(field.key) === 'true'}
                                                    onChange={e => updateField(field.key, e.target.checked ? '1' : '0')}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm text-slate-700">{field.label}</span>
                                            </label>
                                        ) : field.type === 'textarea' ? (
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.label}</label>
                                                <textarea value={getFieldValue(field.key)} onChange={e => updateField(field.key, e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-20" />
                                            </div>
                                        ) : field.type === 'select' ? (
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.label}</label>
                                                <select value={getFieldValue(field.key)} onChange={e => updateField(field.key, e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                                    {field.options.map(opt => (
                                                        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                                                            {typeof opt === 'string' ? opt : opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <Input label={field.label} type={field.type} value={getFieldValue(field.key)} onChange={e => updateField(field.key, e.target.value)} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
                                <Button type="submit" disabled={form.processing}>{form.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}</Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
