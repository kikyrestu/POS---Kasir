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

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
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
