<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SaasSetting;

class SettingController extends Controller
{
    public function index()
    {
        $settings = SaasSetting::all()->pluck('value', 'key')->toArray();

        return Inertia::render('SaasAdmin/Settings/Index', [
            'settings' => $settings
        ]);
    }

    public function store(Request $request)
    {
        $settings = $request->except(['_token']);

        foreach ($settings as $key => $value) {
            SaasSetting::updateOrCreate(
                ['key' => $key],
                ['value' => is_array($value) ? json_encode($value) : $value]
            );
        }

        return redirect()->back()->with('success', 'Pengaturan Global berhasil diperbarui.');
    }
}
