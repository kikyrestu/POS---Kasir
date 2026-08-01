import React, { useState } from 'react';
import { useForm, Head } from '@inertiajs/react';
import SaasAdminLayout from '@/Layouts/SaasAdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/UI';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { Send, Megaphone } from 'lucide-react';

export default function BroadcastIndex() {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        message: '',
        type: 'info',
        url: ''
    });

    const [successMessage, setSuccessMessage] = useState(null);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.broadcast.store'), {
            onSuccess: (page) => {
                reset();
                setSuccessMessage(page.props.flash.success);
                setTimeout(() => setSuccessMessage(null), 5000);
            },
        });
    };

    return (
        <SaasAdminLayout title="Broadcast Notifikasi">
            <Head title="Broadcast Notifikasi - Admin Pusat" />
            
            <div className="max-w-4xl space-y-6">
                <Card>
                    <CardHeader className="border-b border-slate-100 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-blue-600" /> Kirim Pesan Siaran (Broadcast)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {successMessage && (
                            <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center gap-3">
                                <Send className="w-5 h-5" /> {successMessage}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <InputLabel htmlFor="title" value="Judul Notifikasi" />
                                <TextInput
                                    id="title"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    required
                                />
                                {errors.title && <div className="text-red-500 text-xs mt-1">{errors.title}</div>}
                            </div>

                            <div>
                                <InputLabel htmlFor="message" value="Isi Pesan" />
                                <textarea
                                    id="message"
                                    className="mt-1 block w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
                                    rows="4"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    required
                                />
                                {errors.message && <div className="text-red-500 text-xs mt-1">{errors.message}</div>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel htmlFor="type" value="Tipe Notifikasi" />
                                    <select
                                        id="type"
                                        className="mt-1 block w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
                                        value={data.type}
                                        onChange={(e) => setData('type', e.target.value)}
                                    >
                                        <option value="info">Info (Biru)</option>
                                        <option value="success">Sukses (Hijau)</option>
                                        <option value="warning">Peringatan (Kuning)</option>
                                        <option value="error">Error (Merah)</option>
                                    </select>
                                    {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type}</div>}
                                </div>

                                <div>
                                    <InputLabel htmlFor="url" value="URL Aksi (Opsional)" />
                                    <TextInput
                                        id="url"
                                        type="url"
                                        className="mt-1 block w-full"
                                        value={data.url}
                                        onChange={(e) => setData('url', e.target.value)}
                                        placeholder="https://example.com/update"
                                    />
                                    {errors.url && <div className="text-red-500 text-xs mt-1">{errors.url}</div>}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <PrimaryButton
                                    type="submit"
                                    disabled={processing}
                                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                                >
                                    <Send className="w-4 h-4" /> 
                                    {processing ? 'Mengirim...' : 'Kirim ke Semua Tenant'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </SaasAdminLayout>
    );
}
