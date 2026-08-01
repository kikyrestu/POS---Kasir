<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SaasFeatureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $features = [
            ['key' => 'pos', 'name' => 'Point of Sale (POS)', 'description' => 'Sistem kasir utama untuk transaksi penjualan.'],
            ['key' => 'inventory', 'name' => 'Inventory / Products', 'description' => 'Manajemen stok barang dan produk.'],
            ['key' => 'vouchers', 'name' => 'Vouchers & Discounts', 'description' => 'Sistem kode promo, voucher, dan diskon.'],
            ['key' => 'customers', 'name' => 'Customer CRM', 'description' => 'Manajemen data pelanggan.'],
            ['key' => 'reports', 'name' => 'Reports & Analytics', 'description' => 'Laporan penjualan, pembelian, laba rugi, dan analitik bisnis.'],
            ['key' => 'settings', 'name' => 'Store Settings', 'description' => 'Pengaturan toko, pajak, dan struk.'],
            ['key' => 'expenses', 'name' => 'Expenses / Petty Cash', 'description' => 'Pencatatan pengeluaran operasional toko.'],
            ['key' => 'sale-returns', 'name' => 'Sale Returns', 'description' => 'Retur penjualan dari pelanggan.'],
            ['key' => 'barcodes', 'name' => 'Barcode Generator', 'description' => 'Fitur cetak barcode label produk.'],
            ['key' => 'suppliers', 'name' => 'Suppliers', 'description' => 'Manajemen data pemasok/supplier.'],
            ['key' => 'warehouses', 'name' => 'Warehouses', 'description' => 'Manajemen gudang multi-lokasi.'],
            ['key' => 'sales-tempo', 'name' => 'Sales Tempo (Piutang)', 'description' => 'Manajemen penjualan kredit/tempo dan pembayaran piutang.'],
            ['key' => 'purchases', 'name' => 'Purchases', 'description' => 'Pembelian stok dari supplier.'],
            ['key' => 'purchase-returns', 'name' => 'Purchase Returns', 'description' => 'Retur pembelian ke supplier.'],
            ['key' => 'stock-transfers', 'name' => 'Stock Transfers', 'description' => 'Transfer stok antar gudang atau cabang.'],
            ['key' => 'stock-opnames', 'name' => 'Stock Opname', 'description' => 'Penyesuaian stok fisik (Stock Opname).'],
            ['key' => 'user-management', 'name' => 'User & Roles Management', 'description' => 'Manajemen staf kasir, admin, dan hak akses.'],
        ];

        foreach ($features as $feature) {
            \App\Models\SaasFeature::updateOrCreate(['key' => $feature['key']], $feature);
        }
    }
}
