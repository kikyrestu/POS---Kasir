import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Settings, Store, Receipt, Printer, Bell, CreditCard, Wallet, Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@/Components/UI';
import { useState } from 'react';

const TABS = [
    { key: 'toko', label: 'Toko', icon: Store },
    { key: 'pembayaran', label: 'Pembayaran', icon: Wallet },
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
        { key: 'enable_kds', label: 'Aktifkan Kitchen Display System (KDS)', type: 'checkbox' },
        { key: 'enable_kot', label: 'Aktifkan Cetak KOT (Dapur)', type: 'checkbox' },
        { key: 'enable_table_management', label: 'Aktifkan Manajemen Meja', type: 'checkbox' },
        { key: 'enable_order_type', label: 'Aktifkan Pilihan Tipe Pesanan (Dine In / Takeaway)', type: 'checkbox' },
        { key: 'enable_open_bill', label: 'Aktifkan Open Bill (Simpan Pesanan Belum Bayar)', type: 'checkbox' },
        { key: 'enable_variants', label: 'Aktifkan Fitur Varian Produk (Ukuran, Warna, dll)', type: 'checkbox' },
    ],
    transaksi: [
        { key: 'enable_payment_gateway', label: 'Aktifkan Payment Gateway (Midtrans)', type: 'checkbox' },
        { key: 'discount_format', label: 'Format Diskon', type: 'select', options: [{ value: 'amount', label: 'Nominal (Rp)' }, { value: 'percent', label: 'Persentase (%)' }] },
        { key: 'tax_format', label: 'Format Pajak', type: 'select', options: [{ value: 'amount', label: 'Nominal (Rp)' }, { value: 'percent', label: 'Persentase (%)' }] },
        { key: 'global_tax_value', label: 'Nilai Pajak Global', type: 'number' },
    ],
    struk: [
        { key: 'receipt_header', label: 'Header Struk', type: 'textarea' },
        { key: 'receipt_footer', label: 'Footer Struk', type: 'textarea' },
        { key: 'receipt_show_logo', label: 'Tampilkan Logo', type: 'checkbox' },
        { key: 'receipt_paper_size', label: 'Ukuran Kertas', type: 'select', options: ['58mm', '80mm', 'A4'] },
    ],
    printer: [
        { key: 'printer_auto_print', label: 'Otomatis Buka Print Dialog', type: 'checkbox' },
        { key: 'enable_bluetooth_printer', label: 'Aktifkan Print Bluetooth Otomatis (Web Bluetooth)', type: 'checkbox' },
    ],
    notifikasi: [
        { key: 'notif_low_stock', label: 'Notifikasi Stok Rendah', type: 'checkbox' },
        { key: 'notif_low_stock_threshold', label: 'Batas Stok Rendah', type: 'number' },
        { key: 'notif_due_payment', label: 'Notifikasi Jatuh Tempo', type: 'checkbox' },
        { key: 'notif_due_days_before', label: 'Hari Sebelum Jatuh Tempo', type: 'number' },
    ],
};

function LogoUpload({ currentLogo }) {
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('logo', file);
        router.post(route('settings.logo'), formData, { preserveScroll: true, onSuccess: () => { e.target.value = ''; } });
    };
    return (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {currentLogo ? <img src={`/storage/${currentLogo}`} className="w-full h-full object-contain" /> : <Store className="w-8 h-8 text-slate-300" />}
            </div>
            <div>
                <p className="font-bold text-slate-800 text-sm mb-0.5">Logo Toko</p>
                <p className="text-xs text-slate-500 mb-2">Format JPG, PNG, WEBP. Maks 2MB.</p>
                <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="text-xs file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
        </div>
    );
}

function PaymentMethodsSetting({ paymentMethods }) {
    const [newMethod, setNewMethod] = useState('');
    
    const toggleActive = (pm) => router.post(route('payment-methods.toggle-active', pm.id), {}, { preserveScroll: true });
    const toggleGateway = (pm) => router.post(route('payment-methods.toggle-gateway', pm.id), {}, { preserveScroll: true });
    const deleteMethod = (pm) => {
        if(confirm('Yakin hapus metode pembayaran ini?')) {
            router.delete(route('payment-methods.destroy', pm.id), { preserveScroll: true });
        }
    };
    
    const addMethod = (e) => {
        e.preventDefault();
        if(!newMethod.trim()) return;
        router.post(route('payment-methods.store'), { name: newMethod }, {
            preserveScroll: true,
            onSuccess: () => setNewMethod('')
        });
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
            <h3 className="font-bold text-slate-900 mb-6">Metode Pembayaran</h3>
            
            <div className="space-y-4">
                {(paymentMethods || []).map(pm => (
                    <div key={pm.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div>
                            <p className="font-bold text-slate-800">{pm.name}</p>
                            <p className="text-xs text-slate-500 font-medium">Code: {pm.code}</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <span className="text-xs font-semibold text-slate-600">Aktif</span>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={pm.is_active} onChange={() => toggleActive(pm)} />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </div>
                            </label>
                            <button onClick={() => deleteMethod(pm)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-3 text-sm">Tambah Metode Baru</h4>
                <form onSubmit={addMethod} className="flex gap-3">
                    <input type="text" value={newMethod} onChange={e => setNewMethod(e.target.value)} placeholder="Nama Metode (ex: ShopeePay)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <Button type="submit"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
                </form>
            </div>
        </div>
    );
}

export default function SettingsIndex({ settings, paymentMethods }) {
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
                    {activeTab === 'pembayaran' ? (
                        <PaymentMethodsSetting paymentMethods={paymentMethods} />
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                                <h3 className="font-bold text-slate-900 mb-6">{TABS.find(t => t.key === activeTab)?.label}</h3>
                                {activeTab === 'toko' && (
                                    <LogoUpload currentLogo={getFieldValue('store_logo')} />
                                )}
                                <div className="space-y-4">
                                    {SETTINGS_FIELDS[activeTab]?.map(field => (
                                        <div key={field.key}>
                                            {field.type === 'checkbox' ? (
                                                <label className="flex items-center justify-between cursor-pointer p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                    <span className="text-sm font-semibold text-slate-700">{field.label}</span>
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only peer" checked={getFieldValue(field.key) === '1' || getFieldValue(field.key) === 'true'} onChange={e => updateField(field.key, e.target.checked ? '1' : '0')} />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </div>
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
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
