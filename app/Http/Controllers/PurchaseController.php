<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\PurchaseDetail;
use App\Models\PurchasePayment;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Supplier;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $purchases = Purchase::with(['supplier', 'user', 'warehouse'])
            ->when($request->search, function ($q, $s) {
                $q->where('invoice_number', 'like', "%{$s}%")
                  ->orWhereHas('supplier', fn($q) => $q->where('name', 'like', "%{$s}%"));
            })
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->date_from, fn($q, $d) => $q->where('purchase_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('purchase_date', '<=', $d))
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Purchases/Index', [
            'purchases' => $purchases,
            'filters' => $request->only('search', 'status', 'date_from', 'date_to'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Purchases/Form', [
            'suppliers' => Supplier::where('is_active', true)->get(['id', 'name']),
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
            'invoiceNumber' => Purchase::generateInvoiceNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'purchase_date' => 'required|date',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'status' => 'required|in:received,pending,cancelled',
            'paid' => 'numeric|min:0',
            'discount' => 'numeric|min:0',
            'tax' => 'numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'numeric|min:0',
            'items.*.expiry_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $discount = $item['discount'] ?? 0;
                $subtotal += ($item['unit_price'] * $item['quantity']) - $discount;
            }

            $discountAmount = $validated['discount'] ?? 0;
            $tax = $validated['tax'] ?? 0;
            $total = $subtotal - $discountAmount + $tax;
            $paid = $validated['paid'] ?? 0;

            $paymentStatus = 'unpaid';
            if ($paid >= $total) $paymentStatus = 'paid';
            elseif ($paid > 0) $paymentStatus = 'partial';

            $purchase = Purchase::create([
                'invoice_number' => Purchase::generateInvoiceNumber(),
                'supplier_id' => $validated['supplier_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'user_id' => $request->user()->id,
                'purchase_date' => $validated['purchase_date'],
                'due_date' => $validated['due_date'],
                'subtotal' => $subtotal,
                'discount' => $discountAmount,
                'tax' => $tax,
                'total' => $total,
                'paid' => min($paid, $total),
                'payment_status' => $paymentStatus,
                'status' => $validated['status'],
                'notes' => $validated['notes'],
            ]);

            foreach ($validated['items'] as $item) {
                $discount = $item['discount'] ?? 0;
                $itemSubtotal = ($item['unit_price'] * $item['quantity']) - $discount;

                PurchaseDetail::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $discount,
                    'subtotal' => $itemSubtotal,
                    'expiry_date' => $item['expiry_date'] ?? null,
                ]);

                // Add stock if received
                if ($validated['status'] === 'received') {
                    $stock = ProductStock::firstOrCreate(
                        ['product_id' => $item['product_id'], 'warehouse_id' => $validated['warehouse_id']],
                        ['quantity' => 0]
                    );
                    $stock->increment('quantity', $item['quantity']);
                }
            }

            // Create payment record if paid
            if ($paid > 0) {
                PurchasePayment::create([
                    'purchase_id' => $purchase->id,
                    'amount' => min($paid, $total),
                    'method' => 'cash',
                    'payment_date' => $validated['purchase_date'],
                ]);
            }

            return redirect()->route('purchases.index')->with('success', 'Pembelian berhasil ditambahkan.');
        });
    }

    public function show(Purchase $purchase)
    {
        $purchase->load(['supplier', 'user', 'warehouse', 'details.product', 'payments']);

        return Inertia::render('Purchases/Show', [
            'purchase' => $purchase,
        ]);
    }

    public function destroy(Purchase $purchase)
    {
        DB::transaction(function () use ($purchase) {
            if ($purchase->status === 'received') {
                $purchase->load(['details', 'returns.details']);

                // Calculate already-returned quantities
                $returnedQty = [];
                foreach ($purchase->returns as $return) {
                    foreach ($return->details as $rd) {
                        $returnedQty[$rd->product_id] = ($returnedQty[$rd->product_id] ?? 0) + $rd->quantity;
                    }
                }

                foreach ($purchase->details as $detail) {
                    $alreadyReturned = $returnedQty[$detail->product_id] ?? 0;
                    $restoreQty = $detail->quantity - $alreadyReturned;
                    if ($restoreQty > 0) {
                        $stock = ProductStock::where('product_id', $detail->product_id)
                            ->where('warehouse_id', $purchase->warehouse_id)
                            ->first();
                        if ($stock) {
                            $stock->decrement('quantity', $restoreQty);
                        }
                    }
                }
            }
            $purchase->delete();
        });

        return redirect()->route('purchases.index')->with('success', 'Pembelian berhasil dihapus.');
    }
}
