<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use Inertia\Inertia;

class TenantRegistrationController extends Controller
{
    public function create()
    {
        return Inertia::render('Tenant/Register');
    }

    public function store(Request $request)
    {
        $request->validate([
            'store_name' => 'required|string|max:255',
            'subdomain' => 'required|string|unique:tenants,id|alpha_dash|max:64',
            'email' => 'required|email|max:255',
            'password' => 'required|min:8',
        ]);

        $tenant = Tenant::create([
            'id' => $request->subdomain,
            'name' => $request->store_name,
            'email' => $request->email,
            'is_active' => true,
        ]);

        $tenant->domains()->create([
            'domain' => $request->subdomain
        ]);

        // Note: TenancyServiceProvider's JobPipeline will automatically
        // create the DB, migrate, and seed it (DatabaseSeeder).
        // After that, we need to create the admin user inside the tenant context.
        
        $tenant->run(function () use ($request) {
            \App\Models\User::create([
                'name' => 'Admin ' . $request->store_name,
                'email' => $request->email,
                'password' => \Illuminate\Support\Facades\Hash::make($request->password),
                'role_id' => \App\Models\Role::where('name', 'admin')->first()->id ?? null,
            ]);

            \App\Models\User::create([
                'name' => 'Kasir 1',
                'email' => 'kasir@' . $request->subdomain . '.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role_id' => \App\Models\Role::where('name', 'kasir')->first()->id ?? null,
                'is_active' => true,
            ]);
        });

        // Assign Free Plan
        $freePlan = \App\Models\Plan::where('price_monthly', 0)->first();
        if (!$freePlan) {
            $freePlan = \App\Models\Plan::create([
                'name' => 'Free Plan',
                'description' => 'Paket dasar gratis.',
                'price_monthly' => 0,
                'price_yearly' => 0,
                'features' => [
                    'pos', 'inventory', 'customers', 'reports', 'settings', 
                    'barcodes', 'user-management'
                ],
                'limits' => ['max_products' => 50, 'max_users' => 2],
                'is_active' => true,
            ]);
        }

        \App\Models\Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => null // Lifetime for free plan
        ]);

        // Redirect to the tenant's login page
        $tenantUrl = 'http://' . $request->subdomain . '.' . env('CENTRAL_DOMAIN', 'nexapos.localhost') . ':8000/login';
        
        return Inertia::render('Tenant/RegisterSuccess', [
            'url' => $tenantUrl
        ]);
    }
}
