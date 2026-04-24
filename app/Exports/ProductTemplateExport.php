<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ProductTemplateExport implements FromArray, WithHeadings
{
    public function array(): array
    {
        return [
            ['899123456789', 'Minyak Goreng Bimoli 1L', 'PCS', '15000', '18000', '1'],
            ['KODE-MIE', 'Mie Sedaap Goreng', 'PCS', '2500', '3500', '1'],
        ];
    }

    public function headings(): array
    {
        return [
            'Barcode_Atau_Kode', 
            'Nama_Produk', 
            'Unit', 
            'Harga_Beli', 
            'Harga_Jual_Default', 
            'ID_Kategori'
        ];
    }
}
