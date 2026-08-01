<?php

namespace App\Traits;

use App\Models\Tenant;

trait ChecksTenantLimits
{
    /**
     * Check if a specific limit is reached for the current tenant.
     *
     * @param string $limitKey (e.g. 'max_products', 'max_users')
     * @param int $currentCount
     * @return bool True if limit is reached/exceeded, False if still okay
     */
    public function hasReachedLimit(string $limitKey, int $currentCount): bool
    {
        $tenant = tenant();
        if (!$tenant) {
            return false;
        }

        $subscription = $tenant->currentSubscription()->with('plan')->first();
        if (!$subscription || $subscription->status !== 'active' || !$subscription->plan) {
            // No active subscription, technically limit is 0
            return true;
        }

        $limits = $subscription->plan->limits ?? [];
        if (!isset($limits[$limitKey])) {
            // If limit is not set for this plan, assume unlimited
            return false;
        }

        // e.g. -1 means unlimited
        if ($limits[$limitKey] == -1) {
            return false;
        }

        return $currentCount >= $limits[$limitKey];
    }

    /**
     * Throw a 403 if limit is reached.
     */
    public function authorizeLimit(string $limitKey, int $currentCount, string $entityName = 'item')
    {
        if ($this->hasReachedLimit($limitKey, $currentCount)) {
            abort(403, "Paket berlangganan Anda sudah mencapai batas maksimal untuk {$entityName}. Silakan Upgrade Paket.");
        }
    }
}
