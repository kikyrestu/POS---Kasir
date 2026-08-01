<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SaasAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\SaasAdmin::create([
            'name' => 'Superadmin SaaS',
            'email' => 'admin@nexapos.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
        ]);
    }
}
