<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockAdjustment;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockOpnameController extends Controller
{
    public function index(Request $request)
    {
        $adjustments = StockAdjustment::with(['product', 'warehouse', 'user'])
            ->when($request->search, function ($query, $search) {
                $query->whereHas('product', fn($q) => $q->where('name', 'like', "%{$search}%"));
            })
            ->when($request->warehouse_id, fn($q, $w) => $q->where('warehouse_id', $w))
            ->orderBy('adjustment_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('StockOpnames/Index', [
            'adjustments' => $adjustments,
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
            'filters' => $request->only('search', 'warehouse_id'),
        ]);
    }

    public function create()
    {
        return Inertia::render('StockOpnames/Create', [
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'adjustment_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.type' => 'required|in:addition,subtraction',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.reason' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $request) {
            foreach ($validated['items'] as $item) {
                // Determine stock record
                $stock = ProductStock::firstOrCreate(
                    ['product_id' => $item['product_id'], 'warehouse_id' => $validated['warehouse_id']],
                    ['quantity' => 0]
                );

                $balanceBefore = $stock->quantity;

                // Make adjustment
                $adjustment = StockAdjustment::create([
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $validated['warehouse_id'],
                    'user_id' => $request->user()->id,
                    'type' => $item['type'],
                    'quantity' => $item['quantity'],
                    'reason' => $item['reason'],
                    'adjustment_date' => $validated['adjustment_date'],
                ]);

                // Update stock
                if ($item['type'] === 'addition') {
                    $stock->increment('quantity', $item['quantity']);
                } else {
                    $stock->decrement('quantity', $item['quantity']);
                }

                $balanceAfter = $stock->fresh()->quantity;

                // Log movement
                StockMovement::create([
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $validated['warehouse_id'],
                    'user_id' => $request->user()->id,
                    'reference_type' => 'StockAdjustment',
                    'reference_id' => $adjustment->id,
                    'type' => $item['type'] === 'addition' ? 'in' : 'out',
                    'quantity' => $item['quantity'],
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'description' => $item['reason'] ?? 'Stock Opname',
                ]);
            }
        });

        return redirect()->route('stock-opnames.index')->with('success', 'Stock opname berhasil disimpan.');
    }
}
