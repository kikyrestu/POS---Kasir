<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Product;

class BarcodeController extends Controller
{
    public function index()
    {
        $initialProducts = Product::where('is_active', true)
            ->select(['id', 'name', 'barcode', 'code', 'selling_price'])
            ->orderBy('name')
            ->limit(50)
            ->get();
            
        return Inertia::render('Products/Barcodes', [
            'initialProducts' => $initialProducts
        ]);
    }
}
