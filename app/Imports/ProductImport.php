<?php

namespace App\Imports;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Warehouse;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class ProductImport implements ToModel, WithHeadingRow, WithValidation
{
    public function model(array $row)
    {
        $identifier = $row['barcode_atau_kode'];
        if (!$identifier) return null;

        $product = Product::updateOrCreate(
            ['barcode' => (string) $identifier],
            [
                'name' => $row['nama_produk'],
                'unit' => strtolower($row['unit'] ?? 'pcs'),
                'cost_price' => $row['harga_beli'],
                'selling_price' => $row['harga_jual_default'],
                'category_id' => $row['id_kategori'] ?? null,
                'is_active' => true,
            ]
        );

        $defaultWarehouse = Warehouse::where('is_default', true)->first() ?? Warehouse::first();
        if ($defaultWarehouse) {
            ProductStock::firstOrCreate([
                'product_id' => $product->id,
                'warehouse_id' => $defaultWarehouse->id
            ], ['quantity' => 0]);
        }

        return $product;
    }

    public function rules(): array
    {
        return [
            'barcode_atau_kode' => 'required',
            'nama_produk' => 'required|string',
            'harga_beli' => 'required|numeric',
            'harga_jual_default' => 'required|numeric',
        ];
    }
}
