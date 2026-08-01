<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Models\Domain;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function currentSubscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->ofMany([
            'id' => 'max',
        ], function ($query) {
            $query->where('status', 'active');
        });
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public static function getCustomColumns(): array
    {
        return [
            'id',
            'name',
            'email',
            'is_active',
        ];
    }
}
