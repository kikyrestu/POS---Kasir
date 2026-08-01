<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $featuresAll = \App\Models\SaasFeature::pluck('key')->toArray();

        \App\Models\Plan::updateOrCreate(
            ['name' => 'Free Plan'],
            [
                'description' => 'Paket dasar gratis.',
                'price_monthly' => 0,
                'price_yearly' => 0,
                'features' => ['pos', 'inventory', 'customers', 'reports', 'settings', 'user-management'],
                'limits' => ['max_products' => 50, 'max_users' => 1],
                'is_active' => true,
            ]
        );

        \App\Models\Plan::updateOrCreate(
            ['name' => 'Cafe Plan (F&B)'],
            [
                'description' => 'Paket khusus untuk Cafe & Resto dengan fitur lengkap F&B.',
                'price_monthly' => 99000,
                'price_yearly' => 990000,
                'features' => $featuresAll,
                'limits' => ['max_products' => -1, 'max_users' => 10],
                'is_active' => true,
            ]
        );

        \App\Models\Plan::updateOrCreate(
            ['name' => 'Retail Pro'],
            [
                'description' => 'Paket khusus Retail menengah ke atas.',
                'price_monthly' => 149000,
                'price_yearly' => 1490000,
                'features' => $featuresAll,
                'limits' => ['max_products' => -1, 'max_users' => -1],
                'is_active' => true,
            ]
        );
    }
}
