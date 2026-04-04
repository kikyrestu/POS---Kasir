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

class DatabaseSeeder extends Seeder
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
        User::create([
            'name' => 'Admin',
            'email' => 'admin@nexapos.com',
            'password' => 'password',
            'role_id' => $adminRole->id,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

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

        // --- Categories ---
        $categories = [
            ['name' => 'Makanan', 'icon' => '🍔'],
            ['name' => 'Minuman', 'icon' => '🥤'],
            ['name' => 'Snack', 'icon' => '🍿'],
            ['name' => 'Rokok', 'icon' => '🚬'],
            ['name' => 'Kebutuhan Rumah', 'icon' => '🏠'],
            ['name' => 'Elektronik', 'icon' => '📱'],
            ['name' => 'Alat Tulis', 'icon' => '✏️'],
        ];
        foreach ($categories as $cat) {
            Category::create(array_merge($cat, ['is_active' => true]));
        }

        // --- Suppliers ---
        Supplier::create(['name' => 'PT Supplier Utama', 'phone' => '08123456789', 'address' => 'Jl. Supplier No.1', 'is_active' => true]);
        Supplier::create(['name' => 'CV Distributor Jaya', 'phone' => '08198765432', 'address' => 'Jl. Distributor No.2', 'is_active' => true]);

        // --- Customers ---
        Customer::create(['name' => 'Pelanggan Umum', 'type' => 'umum', 'is_active' => true]);
        Customer::create(['name' => 'Budi Santoso', 'phone' => '08111222333', 'type' => 'member', 'is_active' => true]);
        Customer::create(['name' => 'Toko Makmur', 'phone' => '08222333444', 'type' => 'reseller', 'is_active' => true]);

        // --- Products ---
        $sampleProducts = [
            ['name' => 'Nasi Goreng Spesial', 'category' => 'Makanan', 'cost' => 12000, 'sell' => 18000, 'unit' => 'porsi', 'stock' => 50],
            ['name' => 'Mie Goreng', 'category' => 'Makanan', 'cost' => 10000, 'sell' => 15000, 'unit' => 'porsi', 'stock' => 40],
            ['name' => 'Ayam Geprek', 'category' => 'Makanan', 'cost' => 13000, 'sell' => 20000, 'unit' => 'porsi', 'stock' => 30],
            ['name' => 'Es Teh Manis', 'category' => 'Minuman', 'cost' => 2000, 'sell' => 5000, 'unit' => 'gelas', 'stock' => 100],
            ['name' => 'Kopi Susu', 'category' => 'Minuman', 'cost' => 5000, 'sell' => 12000, 'unit' => 'gelas', 'stock' => 80],
            ['name' => 'Jus Jeruk', 'category' => 'Minuman', 'cost' => 4000, 'sell' => 10000, 'unit' => 'gelas', 'stock' => 60],
            ['name' => 'Chitato Original', 'category' => 'Snack', 'cost' => 7000, 'sell' => 10000, 'unit' => 'pcs', 'stock' => 45],
            ['name' => 'Oreo Vanilla', 'category' => 'Snack', 'cost' => 5000, 'sell' => 8000, 'unit' => 'pcs', 'stock' => 55],
            ['name' => 'Pocky Strawberry', 'category' => 'Snack', 'cost' => 8000, 'sell' => 12000, 'unit' => 'pcs', 'stock' => 35],
            ['name' => 'Indomie Goreng', 'category' => 'Makanan', 'cost' => 2500, 'sell' => 4000, 'unit' => 'pcs', 'stock' => 200],
            ['name' => 'Aqua 600ml', 'category' => 'Minuman', 'cost' => 2000, 'sell' => 3500, 'unit' => 'botol', 'stock' => 150],
            ['name' => 'Tisu Paseo', 'category' => 'Kebutuhan Rumah', 'cost' => 8000, 'sell' => 12000, 'unit' => 'pcs', 'stock' => 40],
            ['name' => 'Sabun Cuci Piring', 'category' => 'Kebutuhan Rumah', 'cost' => 6000, 'sell' => 9000, 'unit' => 'botol', 'stock' => 30],
            ['name' => 'Pulpen Pilot', 'category' => 'Alat Tulis', 'cost' => 3000, 'sell' => 5000, 'unit' => 'pcs', 'stock' => 70],
            ['name' => 'Buku Tulis A5', 'category' => 'Alat Tulis', 'cost' => 4000, 'sell' => 6000, 'unit' => 'pcs', 'stock' => 50],
        ];

        foreach ($sampleProducts as $idx => $sp) {
            $category = Category::where('name', $sp['category'])->first();
            $product = Product::create([
                'name' => $sp['name'],
                'barcode' => sprintf('88%010d', $idx + 1),
                'code' => 'PRD-' . str_pad($idx + 1, 4, '0', STR_PAD_LEFT),
                'category_id' => $category?->id,
                'unit' => $sp['unit'],
                'cost_price' => $sp['cost'],
                'selling_price' => $sp['sell'],
                'stock_minimum' => 10,
                'is_active' => true,
            ]);

            ProductStock::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'quantity' => $sp['stock'],
            ]);
        }

        // --- Default Settings ---
        $defaultSettings = [
            ['key' => 'store_name', 'value' => 'NEXAPOS', 'group' => 'toko'],
            ['key' => 'store_address', 'value' => 'Jl. Contoh No. 1', 'group' => 'toko'],
            ['key' => 'store_phone', 'value' => '08123456789', 'group' => 'toko'],
            ['key' => 'receipt_header', 'value' => 'Terima Kasih', 'group' => 'struk'],
            ['key' => 'receipt_footer', 'value' => 'Barang yang sudah dibeli tidak dapat dikembalikan', 'group' => 'struk'],
            ['key' => 'receipt_paper_size', 'value' => '58mm', 'group' => 'struk'],
            ['key' => 'notif_low_stock', 'value' => '1', 'group' => 'notifikasi'],
            ['key' => 'notif_low_stock_threshold', 'value' => '10', 'group' => 'notifikasi'],
            ['key' => 'notif_due_payment', 'value' => '1', 'group' => 'notifikasi'],
            ['key' => 'notif_due_days_before', 'value' => '3', 'group' => 'notifikasi'],
        ];
        foreach ($defaultSettings as $setting) {
            Setting::create($setting);
        }
    }
}
