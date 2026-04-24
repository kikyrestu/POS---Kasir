<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockMovementController extends Controller
{
    public function index(Request $request)
    {
        $movements = StockMovement::with(['product:id,name,code', 'warehouse:id,name', 'user:id,name'])
            ->when($request->product_id, fn($q, $id) => $q->where('product_id', $id))
            ->when($request->warehouse_id, fn($q, $id) => $q->where('warehouse_id', $id))
            ->when($request->type, fn($q, $t) => $q->where('type', $t))
            ->when($request->date_from, fn($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('StockMovements/Index', [
            'movements' => $movements,
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
            'products' => Product::where('is_active', true)->get(['id', 'name', 'code']),
            'filters' => $request->only('product_id', 'warehouse_id', 'type', 'date_from', 'date_to'),
        ]);
    }
}
