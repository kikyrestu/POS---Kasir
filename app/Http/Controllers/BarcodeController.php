<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BarcodeController extends Controller
{
    public function index(Request $request)
    {
        $products = [];
        if ($request->search) {
            $products = Product::where('is_active', true)
                ->where(function ($q) use ($request) {
                    $q->where('name', 'like', "%{$request->search}%")
                      ->orWhere('barcode', 'like', "%{$request->search}%")
                      ->orWhere('code', 'like', "%{$request->search}%");
                })
                ->limit(20)
                ->get(['id', 'name', 'barcode', 'code', 'selling_price']);
        }

        return Inertia::render('Barcodes/Index', [
            'products' => $products,
            'filters' => $request->only('search'),
        ]);
    }
}
