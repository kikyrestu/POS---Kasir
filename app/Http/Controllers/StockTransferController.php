<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\StockTransfer;
use App\Models\StockTransferDetail;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $transfers = StockTransfer::with(['fromWarehouse', 'toWarehouse', 'user'])
            ->withCount('details')
            ->when($request->search, fn($q, $s) => $q->where('transfer_number', 'like', "%{$s}%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->date_from, fn($q, $d) => $q->where('transfer_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('transfer_date', '<=', $d))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('StockTransfers/Index', [
            'transfers' => $transfers,
            'filters' => $request->only('search', 'status', 'date_from', 'date_to'),
        ]);
    }

    public function create()
    {
        return Inertia::render('StockTransfers/Create', [
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
            'products' => Product::where('is_active', true)->get(['id', 'name', 'code', 'barcode']),
            'transferNumber' => StockTransfer::generateTransferNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'from_warehouse_id' => 'required|exists:warehouses,id|different:to_warehouse_id',
            'to_warehouse_id' => 'required|exists:warehouses,id',
            'transfer_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $transfer = StockTransfer::create([
                'transfer_number' => StockTransfer::generateTransferNumber(),
                'from_warehouse_id' => $validated['from_warehouse_id'],
                'to_warehouse_id' => $validated['to_warehouse_id'],
                'user_id' => $request->user()->id,
                'transfer_date' => $validated['transfer_date'],
                'status' => 'completed',
                'notes' => $validated['notes'],
            ]);

            foreach ($validated['items'] as $item) {
                // Check stock sufficiency at source warehouse
                $fromStock = ProductStock::where('product_id', $item['product_id'])
                    ->where('warehouse_id', $validated['from_warehouse_id'])
                    ->first();
                $available = $fromStock ? $fromStock->quantity : 0;
                if ($available < $item['quantity']) {
                    $product = Product::find($item['product_id']);
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => "Stok {$product->name} di gudang asal tidak cukup (tersedia: {$available}, diminta: {$item['quantity']}).",
                    ]);
                }

                StockTransferDetail::create([
                    'stock_transfer_id' => $transfer->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                ]);

                // Decrement from source
                $fromStock = ProductStock::where('product_id', $item['product_id'])
                    ->where('warehouse_id', $validated['from_warehouse_id'])
                    ->first();
                if ($fromStock) {
                    $fromStock->decrement('quantity', $item['quantity']);
                }

                // Increment at destination
                $toStock = ProductStock::firstOrCreate(
                    ['product_id' => $item['product_id'], 'warehouse_id' => $validated['to_warehouse_id']],
                    ['quantity' => 0]
                );
                $toStock->increment('quantity', $item['quantity']);
            }

            return redirect()->route('stock-transfers.index')->with('success', 'Transfer barang berhasil disimpan.');
        });
    }

    public function show(StockTransfer $stockTransfer)
    {
        $stockTransfer->load(['fromWarehouse', 'toWarehouse', 'user', 'details.product']);

        return Inertia::render('StockTransfers/Show', [
            'transfer' => $stockTransfer,
        ]);
    }

    public function destroy(StockTransfer $stockTransfer)
    {
        if ($stockTransfer->status !== 'completed') {
            $stockTransfer->delete();
            return redirect()->route('stock-transfers.index')->with('success', 'Transfer barang berhasil dihapus.');
        }

        DB::transaction(function () use ($stockTransfer) {
            foreach ($stockTransfer->details as $detail) {
                // Reverse: add back to source
                $fromStock = ProductStock::firstOrCreate(
                    ['product_id' => $detail->product_id, 'warehouse_id' => $stockTransfer->from_warehouse_id],
                    ['quantity' => 0]
                );
                $fromStock->increment('quantity', $detail->quantity);

                // Reverse: remove from destination
                $toStock = ProductStock::where('product_id', $detail->product_id)
                    ->where('warehouse_id', $stockTransfer->to_warehouse_id)
                    ->first();
                if ($toStock) {
                    $toStock->decrement('quantity', $detail->quantity);
                }
            }
            $stockTransfer->delete();
        });

        return redirect()->route('stock-transfers.index')->with('success', 'Transfer barang berhasil dihapus.');
    }
}
