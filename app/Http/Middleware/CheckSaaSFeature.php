<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\SaasFeature;
use Symfony\Component\HttpFoundation\Response;

class CheckSaaSFeature
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $featureKey): Response
    {
        // 1. Get the global feature status from central DB
        // Because this middleware runs in tenant context, we need to query central DB explicitly
        // If SaasFeature is using default connection, it might fail in tenant context if we don't specify central.
        // Let's set connection to central just in case, but actually models without HasDatabase trait 
        // might use default connection which might be overridden by tenancy.
        // It's safer to read from central DB using DB facade or set connection on model.
        
        $feature = \App\Models\SaasFeature::on(env('DB_CONNECTION', 'sqlite'))->where('key', $featureKey)->first();

        if (!$feature) {
            // Feature not registered globally, assume inactive
            return abort(404, 'Feature not found.');
        }

        if ($feature->status === 'maintenance') {
            return abort(503, 'Fitur sedang dalam pemeliharaan (Maintenance Mode).');
        }

        if ($feature->status === 'inactive') {
            return abort(403, 'Fitur ini sedang dinonaktifkan secara global.');
        }

        // 2. Check tenant-specific access
        $tenant = tenant();
        if ($tenant) {
            $subscription = $tenant->activeSubscription()->with('plan')->first();
            if (!$subscription || $subscription->status !== 'active') {
                // No active subscription, maybe limit access to billing page only?
                // For now, allow basic things or just block all non-essential.
                // Or maybe the 'Free' plan should always be there.
                // Let's assume if no subscription, they don't have access to this feature.
                return abort(403, 'Akses ditolak: Anda belum berlangganan atau masa aktif habis.');
            }

            $plan = $subscription->plan;
            if (!$plan || !in_array($featureKey, $plan->features ?? [])) {
                return abort(403, 'Akses ditolak: Paket Anda ('.$plan->name.') tidak mencakup fitur ini. Silakan Upgrade Paket.');
            }
        }

        return $next($request);
    }
}
