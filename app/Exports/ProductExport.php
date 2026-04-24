<?php

namespace App\Exports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProductExport implements FromQuery, WithHeadings, WithMapping
{
    use Exportable;

    public function query()
    {
        return Product::query()->with(['category', 'stocks']);
    }

    public function headings(): array
    {
        return [
            'ID Produk', 'Kode/Barcode', 'Nama Produk', 'Unit', 'Harga Beli', 'Harga Jual', 'Kategori', 'Total Stok'
        ];
    }

    public function map($product): array
    {
        return [
            $product->id,
            $product->barcode ?? $product->code,
            $product->name,
            $product->unit,
            $product->cost_price,
            $product->selling_price,
            $product->category?->name ?? '-',
            $product->stocks->sum('quantity')
        ];
    }
}
