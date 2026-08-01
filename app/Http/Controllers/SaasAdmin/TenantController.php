<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tenant;
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

    public function destroy(Tenant $tenant)
    {
        $tenant->delete();

        return redirect()->route('admin.tenants.index')->with('success', 'Tenant deleted successfully.');
    }
}
