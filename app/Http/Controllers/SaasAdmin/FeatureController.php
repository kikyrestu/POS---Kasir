<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SaasFeature;
use Inertia\Inertia;

class FeatureController extends Controller
{
    public function index()
    {
        $features = SaasFeature::orderBy('name')->get();
        return Inertia::render('SaasAdmin/Features/Index', [
            'features' => $features
        ]);
    }

    public function update(Request $request, SaasFeature $feature)
    {
        $request->validate([
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        $feature->update([
            'status' => $request->status,
        ]);

        return redirect()->back()->with('success', 'Status fitur berhasil diupdate.');
    }
}
