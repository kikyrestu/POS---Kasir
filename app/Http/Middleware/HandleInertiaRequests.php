<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $isTenant = tenant('id') !== null;
        $user = null;
        
        if ($isTenant && $request->user()) {
            $user = [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'avatar' => $request->user()->avatar,
                'role' => $request->user()->role?->only('id', 'name', 'display_name'),
                'permissions' => $request->user()->isAdmin()
                    ? \App\Models\Permission::pluck('name')->toArray()
                    : ($request->user()->role ? $request->user()->role->permissions->pluck('name')->toArray() : []),
            ];
        } elseif (!$isTenant && \Illuminate\Support\Facades\Auth::guard('saas_admin')->check()) {
            $saasAdmin = \Illuminate\Support\Facades\Auth::guard('saas_admin')->user();
            $user = [
                'id' => $saasAdmin->id,
                'name' => $saasAdmin->name,
                'email' => $saasAdmin->email,
                'role' => ['name' => 'saas_admin', 'display_name' => 'SaaS Admin'],
                'unread_notifications' => $saasAdmin->unreadNotifications,
            ];
        }

        $globalFeatures = \App\Models\SaasFeature::on(env('DB_CONNECTION', 'sqlite'))->get()->keyBy('key');
        
        $planFeatures = null;
        if ($isTenant) {
            $tenant = tenant();
            $subscription = $tenant->activeSubscription()->with('plan')->first();
            if ($subscription && $subscription->status === 'active' && $subscription->plan) {
                $planFeatures = $subscription->plan->features ?? [];
            } else {
                $planFeatures = []; // No active subscription means no features
            }
        }

        $saasFeatures = $globalFeatures->map(function($f) use ($isTenant, $planFeatures) {
            if ($isTenant && $planFeatures !== null) {
                if (!in_array($f->key, $planFeatures)) {
                    return 'inactive'; // Override status to inactive if not in plan
                }
            }
            return $f->status; // 'active', 'inactive', 'maintenance'
        })->toArray();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'global_settings' => $isTenant ? \App\Models\Setting::pluck('value', 'key')->toArray() : [],
            'is_tenant' => $isTenant,
            'saas_features' => $saasFeatures,
        ];
    }
}
