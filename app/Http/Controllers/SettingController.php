<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->groupBy('group')->map(function ($items) {
            return $items->pluck('value', 'key');
        });
        
        $paymentMethods = \App\Models\PaymentMethod::all();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
            'paymentMethods' => $paymentMethods,
        ]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            Setting::set('store_logo', $path, 'toko');
            return redirect()->back()->with('success', 'Logo berhasil diupload.');
        }

        return redirect()->back()->with('error', 'Gagal upload logo.');
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable|string',
            'settings.*.group' => 'required|string',
        ]);

        foreach ($data['settings'] as $item) {
            Setting::set($item['key'], $item['value'], $item['group']);
        }

        return redirect()->back()->with('success', 'Pengaturan berhasil disimpan.');
    }
}
