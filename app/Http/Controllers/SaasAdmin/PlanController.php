<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Plan;
use App\Models\SaasFeature;

class PlanController extends Controller
{
    public function index()
    {
        $plans = Plan::latest()->get();
        return Inertia::render('SaasAdmin/Plans/Index', [
            'plans' => $plans
        ]);
    }

    public function create()
    {
        $features = SaasFeature::all();
        return Inertia::render('SaasAdmin/Plans/Form', [
            'availableFeatures' => $features
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price_monthly' => 'required|numeric|min:0',
            'price_yearly' => 'required|numeric|min:0',
            'features' => 'nullable|array',
            'limits' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        Plan::create($validated);

        return redirect()->route('admin.plans.index')->with('success', 'Paket berhasil ditambahkan.');
    }

    public function edit(Plan $plan)
    {
        $features = SaasFeature::all();
        return Inertia::render('SaasAdmin/Plans/Form', [
            'plan' => $plan,
            'availableFeatures' => $features
        ]);
    }

    public function update(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price_monthly' => 'required|numeric|min:0',
            'price_yearly' => 'required|numeric|min:0',
            'features' => 'nullable|array',
            'limits' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        $plan->update($validated);

        return redirect()->route('admin.plans.index')->with('success', 'Paket berhasil diperbarui.');
    }

    public function destroy(Plan $plan)
    {
        $plan->delete();
        return redirect()->route('admin.plans.index')->with('success', 'Paket berhasil dihapus.');
    }
}

