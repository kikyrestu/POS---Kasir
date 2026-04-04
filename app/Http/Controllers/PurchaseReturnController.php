<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\ProductStock;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseReturnController extends Controller
{
    public function index(Request $request)
    {
        $returns = PurchaseReturn::with(['purchase.supplier', 'user'])
            ->when($request->search, function ($q, $s) {
                $q->where('return_number', 'like', "%{$s}%")
                  ->orWhereHas('purchase', fn($q) => $q->where('invoice_number', 'like', "%{$s}%"));
            })
            ->when($request->date_from, fn($q, $d) => $q->where('return_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('return_date', '<=', $d))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('PurchaseReturns/Index', [
            'returns' => $returns,
            'filters' => $request->only('search', 'date_from', 'date_to'),
        ]);
    }

    public function create(Request $request)
    {
        $purchase = null;
        if ($request->purchase_id) {
            $purchase = Purchase::with(['supplier', 'details.product', 'returns.details'])
                ->findOrFail($request->purchase_id);
        }

        $purchases = Purchase::where('status', 'received')
            ->with('supplier')
            ->orderByDesc('purchase_date')
            ->get(['id', 'invoice_number', 'supplier_id', 'purchase_date', 'total']);

        return Inertia::render('PurchaseReturns/Create', [
            'purchase' => $purchase,
            'purchases' => $purchases,
            'returnNumber' => PurchaseReturn::generateReturnNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'purchase_id' => 'required|exists:purchases,id',
            'return_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.purchase_detail_id' => 'required|exists:purchase_details,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $purchase = Purchase::with(['details', 'returns.details'])->findOrFail($validated['purchase_id']);
            $total = 0;

            // Calculate already-returned quantities per purchase_detail_id
            $alreadyReturned = [];
            foreach ($purchase->returns as $existingReturn) {
                foreach ($existingReturn->details as $rd) {
                    $alreadyReturned[$rd->purchase_detail_id] = ($alreadyReturned[$rd->purchase_detail_id] ?? 0) + $rd->quantity;
                }
            }

            // Validate return quantities
            foreach ($validated['items'] as $item) {
                $purchaseDetail = $purchase->details->firstWhere('id', $item['purchase_detail_id']);
                if (!$purchaseDetail) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => 'Detail pembelian tidak ditemukan.',
                    ]);
                }
                $returned = $alreadyReturned[$item['purchase_detail_id']] ?? 0;
                $maxReturnable = $purchaseDetail->quantity - $returned;
                if ($item['quantity'] > $maxReturnable) {
                    $product = \App\Models\Product::find($item['product_id']);
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => "Jumlah retur {$product->name} melebihi batas (maks: {$maxReturnable}).",
                    ]);
                }
                $total += $item['unit_price'] * $item['quantity'];
            }

            $return = PurchaseReturn::create([
                'return_number' => PurchaseReturn::generateReturnNumber(),
                'purchase_id' => $validated['purchase_id'],
                'user_id' => $request->user()->id,
                'return_date' => $validated['return_date'],
                'total' => $total,
                'notes' => $validated['notes'],
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseReturnDetail::create([
                    'purchase_return_id' => $return->id,
                    'purchase_detail_id' => $item['purchase_detail_id'],
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['unit_price'] * $item['quantity'],
                ]);

                // Reduce stock
                $stock = ProductStock::where('product_id', $item['product_id'])
                    ->where('warehouse_id', $purchase->warehouse_id)
                    ->first();
                if ($stock) {
                    $stock->decrement('quantity', $item['quantity']);
                }
            }

            return redirect()->route('purchase-returns.index')->with('success', 'Retur pembelian berhasil disimpan.');
        });
    }

    public function show(PurchaseReturn $purchaseReturn)
    {
        $purchaseReturn->load(['purchase.supplier', 'user', 'details.product']);

        return Inertia::render('PurchaseReturns/Show', [
            'purchaseReturn' => $purchaseReturn,
        ]);
    }

    public function destroy(PurchaseReturn $purchaseReturn)
    {
        DB::transaction(function () use ($purchaseReturn) {
            $purchase = $purchaseReturn->purchase;
            foreach ($purchaseReturn->details as $detail) {
                $stock = ProductStock::firstOrCreate(
                    ['product_id' => $detail->product_id, 'warehouse_id' => $purchase->warehouse_id],
                    ['quantity' => 0]
                );
                $stock->increment('quantity', $detail->quantity);
            }
            $purchaseReturn->delete();
        });

        return redirect()->route('purchase-returns.index')->with('success', 'Retur pembelian berhasil dihapus.');
    }
}
