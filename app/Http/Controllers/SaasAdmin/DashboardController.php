<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Tenant;

class DashboardController extends Controller
{
    public function index()
    {
        $tenantsCount = Tenant::count();
        
        return Inertia::render('SaasAdmin/Dashboard', [
            'tenantsCount' => $tenantsCount,
        ]);
    }
}
