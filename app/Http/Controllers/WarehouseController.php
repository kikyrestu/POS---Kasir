<?php

namespace App\Http\Controllers;

use App\Models\ProductStock;
use App\Models\Sale;
use App\Models\Purchase;
use App\Models\StockTransfer;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $warehouses = Warehouse::withCount('productStocks')
            ->withSum('productStocks', 'quantity')
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return Inertia::render('Warehouses/Index', [
            'warehouses' => $warehouses,
            'filters' => $request->only('search'),
        ]);
    }

    public function show(Request $request, Warehouse $warehouse)
    {
        $stocks = ProductStock::with('product.category')
            ->where('warehouse_id', $warehouse->id)
            ->when($request->search, function ($q, $s) {
                $q->whereHas('product', fn($q) => $q->where('name', 'like', "%{$s}%")
                    ->orWhere('barcode', 'like', "%{$s}%")
                    ->orWhere('code', 'like', "%{$s}%"));
            })
            ->when($request->stock_filter === 'low', function ($q) {
                $q->whereHas('product', function ($pq) use ($q) {
                    $pq->whereRaw('product_stocks.quantity <= products.stock_minimum')
                        ->where('product_stocks.quantity', '>', 0);
                });
            })
            ->when($request->stock_filter === 'empty', fn($q) => $q->where('quantity', 0))
            ->orderBy('quantity', 'desc')
            ->paginate(20)
            ->withQueryString();

        $totalProducts = ProductStock::where('warehouse_id', $warehouse->id)->where('quantity', '>', 0)->count();
        $totalQty = ProductStock::where('warehouse_id', $warehouse->id)->sum('quantity');

        return Inertia::render('Warehouses/Show', [
            'warehouse' => $warehouse,
            'stocks' => $stocks,
            'totalProducts' => $totalProducts,
            'totalQty' => $totalQty,
            'filters' => $request->only('search', 'stock_filter'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:20',
            'is_default' => 'boolean',
        ]);

        if (!empty($validated['is_default'])) {
            Warehouse::where('is_default', true)->update(['is_default' => false]);
        }

        Warehouse::create($validated);

        return redirect()->back()->with('success', 'Gudang berhasil ditambahkan.');
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:20',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ]);

        // Prevent unsetting default if it's the only default
        if ($warehouse->is_default && empty($validated['is_default'])) {
            $otherDefaults = Warehouse::where('id', '!=', $warehouse->id)->where('is_default', true)->exists();
            if (!$otherDefaults) {
                $validated['is_default'] = true;
            }
        }

        if (!empty($validated['is_default'])) {
            Warehouse::where('id', '!=', $warehouse->id)->where('is_default', true)->update(['is_default' => false]);
        }

        $warehouse->update($validated);

        return redirect()->back()->with('success', 'Gudang berhasil diperbarui.');
    }

    public function destroy(Warehouse $warehouse)
    {
        if ($warehouse->is_default) {
            return redirect()->back()->with('error', 'Tidak dapat menghapus gudang default.');
        }

        if ($warehouse->productStocks()->where('quantity', '>', 0)->exists()) {
            return redirect()->back()->with('error', 'Gudang masih memiliki stok barang.');
        }

        // Check for historical transactions
        $hasSales = Sale::where('warehouse_id', $warehouse->id)->exists();
        $hasPurchases = Purchase::where('warehouse_id', $warehouse->id)->exists();
        $hasTransfers = StockTransfer::where('from_warehouse_id', $warehouse->id)
            ->orWhere('to_warehouse_id', $warehouse->id)->exists();

        if ($hasSales || $hasPurchases || $hasTransfers) {
            return redirect()->back()->with('error', 'Gudang memiliki data transaksi dan tidak dapat dihapus. Nonaktifkan saja gudang ini.');
        }

        $warehouse->delete();
        return redirect()->back()->with('success', 'Gudang berhasil dihapus.');
    }
}
