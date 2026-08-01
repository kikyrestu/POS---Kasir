<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // --- Roles & Permissions ---
        $adminRole = Role::create(['name' => 'admin', 'display_name' => 'Administrator', 'description' => 'Full access']);
        $kasirRole = Role::create(['name' => 'kasir', 'display_name' => 'Kasir', 'description' => 'POS cashier access']);

        $permissions = [
            ['name' => 'dashboard', 'module' => 'dashboard'],
            ['name' => 'pos', 'module' => 'pos'],
            ['name' => 'products.view', 'module' => 'products'],
            ['name' => 'products.manage', 'module' => 'products'],
            ['name' => 'categories.manage', 'module' => 'categories'],
            ['name' => 'customers.manage', 'module' => 'customers'],
            ['name' => 'sales.view', 'module' => 'sales'],
            ['name' => 'sales.manage', 'module' => 'sales'],
            ['name' => 'purchases.view', 'module' => 'purchases'],
            ['name' => 'purchases.manage', 'module' => 'purchases'],
            ['name' => 'reports.view', 'module' => 'reports'],
            ['name' => 'settings.manage', 'module' => 'settings'],
            ['name' => 'suppliers.manage', 'module' => 'suppliers'],
            ['name' => 'warehouses.manage', 'module' => 'warehouses'],
            ['name' => 'stock-transfers.manage', 'module' => 'warehouses'],
            ['name' => 'sale-returns.manage', 'module' => 'sales'],
            ['name' => 'purchase-returns.manage', 'module' => 'purchases'],
            ['name' => 'sales-tempo.view', 'module' => 'sales'],
            ['name' => 'sales-tempo.manage', 'module' => 'sales'],
            ['name' => 'barcodes.print', 'module' => 'products'],
            ['name' => 'users.manage', 'module' => 'settings'],
            ['name' => 'roles.manage', 'module' => 'settings'],
        ];

        foreach ($permissions as $perm) {
            $p = Permission::create([
                'name' => $perm['name'],
                'display_name' => ucwords(str_replace('.', ' ', $perm['name'])),
                'module' => $perm['module'],
            ]);
            $adminRole->permissions()->attach($p);
        }

        // Kasir permissions
        foreach (['dashboard', 'pos', 'products.view', 'sales.view', 'customers.manage'] as $perm) {
            $p = Permission::where('name', $perm)->first();
            if ($p) $kasirRole->permissions()->attach($p);
        }

        // --- Users ---
        $adminUser = User::create([
            'name' => 'Admin',
            'email' => 'admin@nexapos.com',
            'password' => 'password',
            'role_id' => $adminRole->id,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $adminUser->notify(new \App\Notifications\WelcomeNotification());

        User::create([
            'name' => 'Kasir 1',
            'email' => 'kasir@nexapos.com',
            'password' => 'password',
            'role_id' => $kasirRole->id,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // --- Warehouse ---
        $warehouse = Warehouse::create([
            'name' => 'Gudang Utama',
            'address' => 'Jl. Utama No.1',
            'is_default' => true,
            'is_active' => true,
        ]);

        // --- Default Customer ---
        Customer::create(['name' => 'Pelanggan Umum', 'type' => 'umum', 'is_active' => true]);

        // --- Default Payment Methods ---
        \App\Models\PaymentMethod::insert([
            ['name' => 'Cash', 'code' => 'cash', 'is_active' => true, 'is_gateway' => false, 'gateway_provider' => null],
            ['name' => 'Transfer Bank', 'code' => 'transfer', 'is_active' => true, 'is_gateway' => false, 'gateway_provider' => null],
            ['name' => 'Tempo', 'code' => 'tempo', 'is_active' => true, 'is_gateway' => false, 'gateway_provider' => null],
            ['name' => 'QRIS', 'code' => 'qris', 'is_active' => true, 'is_gateway' => false, 'gateway_provider' => null],
            ['name' => 'E-Wallet', 'code' => 'ewallet', 'is_active' => true, 'is_gateway' => false, 'gateway_provider' => null],
        ]);

        // --- Default Settings ---
        $defaultSettings = [
            ['key' => 'store_name', 'value' => 'BuildyPOS', 'group' => 'toko'],
            ['key' => 'store_address', 'value' => 'Jl. Contoh No. 1', 'group' => 'toko'],
            ['key' => 'store_phone', 'value' => '08123456789', 'group' => 'toko'],
            ['key' => 'receipt_header', 'value' => 'Terima Kasih', 'group' => 'struk'],
            ['key' => 'receipt_footer', 'value' => 'Barang yang sudah dibeli tidak dapat dikembalikan', 'group' => 'struk'],
            ['key' => 'receipt_paper_size', 'value' => '58mm', 'group' => 'struk'],
            ['key' => 'notif_low_stock', 'value' => '1', 'group' => 'notifikasi'],
            ['key' => 'notif_low_stock_threshold', 'value' => '10', 'group' => 'notifikasi'],
            ['key' => 'notif_due_payment', 'value' => '1', 'group' => 'notifikasi'],
            ['key' => 'notif_due_days_before', 'value' => '3', 'group' => 'notifikasi'],
            ['key' => 'discount_format', 'value' => 'amount', 'group' => 'transaksi'],
            ['key' => 'tax_format', 'value' => 'amount', 'group' => 'transaksi'],
        ];
        foreach ($defaultSettings as $setting) {
            Setting::create($setting);
        }
    }
}
