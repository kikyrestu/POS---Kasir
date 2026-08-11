<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\Plan;
use Inertia\Inertia;

class TenantController extends Controller
{
    public function index()
    {
        $tenants = Tenant::with('domains')->latest()->paginate(10);
        
        return Inertia::render('SaasAdmin/Tenants/Index', [
            'tenants' => $tenants
        ]);
    }

    public function create()
    {
        return Inertia::render('SaasAdmin/Tenants/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'id' => 'required|string|unique:tenants,id|alpha_dash',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
        ]);

        $tenant = Tenant::create([
            'id' => $request->id,
            'name' => $request->name,
            'email' => $request->email,
            'is_active' => true,
        ]);

        $tenant->domains()->create([
            'domain' => $request->id
        ]);

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant created successfully.');
    }

    public function edit(Tenant $tenant)
    {
        $tenant->load('domains');
        $subscription = $tenant->currentSubscription()->with('plan')->first();
        $plans = Plan::orderBy('name')->get(['id', 'name']);

        return Inertia::render('SaasAdmin/Tenants/Edit', [
            'tenant' => $tenant,
            'subscription' => $subscription,
            'plans' => $plans,
        ]);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'is_active' => 'required|boolean',
            'plan_id' => 'nullable|exists:plans,id',
            'subscription_status' => 'nullable|in:active,pending,expired,cancelled',
            'expires_at' => 'nullable|date',
        ]);

        $oldEmail = $tenant->email;
        $newEmail = $validated['email'];

        $tenant->update([
            'name' => $validated['name'],
            'email' => $newEmail,
            'is_active' => $validated['is_active'],
        ]);

        // Owner's login email lives in the tenant's own database, so it has
        // to be updated separately from the central `tenants.email` column.
        if ($oldEmail !== $newEmail) {
            $tenant->run(function () use ($oldEmail, $newEmail) {
                \App\Models\User::whereHas('role', fn ($q) => $q->where('name', 'admin'))
                    ->where('email', $oldEmail)
                    ->update(['email' => $newEmail]);
            });
        }

        if ($request->filled('plan_id') || $request->filled('subscription_status') || $request->filled('expires_at')) {
            $subscription = $tenant->currentSubscription;
            $subscriptionData = array_filter([
                'plan_id' => $validated['plan_id'] ?? null,
                'status' => $validated['subscription_status'] ?? null,
                'expires_at' => $validated['expires_at'] ?? null,
            ], fn ($value) => $value !== null);

            if ($subscription) {
                $subscription->update($subscriptionData);
            } elseif (!empty($validated['plan_id'])) {
                $tenant->subscriptions()->create(array_merge([
                    'status' => 'active',
                ], $subscriptionData));
            }
        }

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant updated successfully.');
    }

    /**
     * Reset the tenant owner's password to a random value and surface it
     * once to the SaaS admin (owner account = admin-role user in the
     * tenant DB whose email matches the central tenants.email record).
     */
    public function resetPassword(Tenant $tenant)
    {
        $newPassword = \Illuminate\Support\Str::password(12);

        $updated = $tenant->run(function () use ($tenant, $newPassword) {
            return \App\Models\User::whereHas('role', fn ($q) => $q->where('name', 'admin'))
                ->where('email', $tenant->email)
                ->update(['password' => \Illuminate\Support\Facades\Hash::make($newPassword)]);
        });

        if (!$updated) {
            return redirect()->route('admin.tenants.edit', $tenant->id)
                ->with('error', 'Owner account not found for this tenant (no admin-role user matching the tenant email).');
        }

        return redirect()->route('admin.tenants.edit', $tenant->id)
            ->with('success', 'Owner password reset successfully.')
            ->with('new_password', $newPassword);
    }

    public function destroy(Tenant $tenant)
    {
        $tenant->delete();

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant deleted successfully.');
    }
}
