<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Models\Setting;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PosController extends Controller
{
    public function index(Request $request)
    {
        $defaultWarehouse = Warehouse::where('is_default', true)->first()
            ?? Warehouse::first();

        return Inertia::render('Pos/Index', [
            'customers' => Customer::where('is_active', true)->get(['id', 'name', 'type']),
            'categories' => \App\Models\Category::where('is_active', true)->get(['id', 'name', 'icon']),
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
            'defaultWarehouseId' => $defaultWarehouse?->id,
            'invoiceNumber' => Sale::generateInvoiceNumber(),
            'initialActiveShift' => $request->user()->shifts()->where('status', 'open')->first(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'payment_type' => 'required|in:cash,transfer,qris,ewallet,tempo',
            'paid' => 'required|numeric|min:0',
            'discount_amount' => 'numeric|min:0',
            'discount_percent' => 'numeric|min:0|max:100',
            'tax' => 'numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $subtotal = 0;
            $totalProfit = 0;
            $items = [];

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Check stock sufficiency
                $stock = ProductStock::where('product_id', $item['product_id'])
                    ->where('warehouse_id', $validated['warehouse_id'])
                    ->first();
                $available = $stock ? $stock->quantity : 0;
                if ($available < $item['quantity']) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => "Stok {$product->name} tidak cukup (tersedia: {$available}, diminta: {$item['quantity']}).",
                    ]);
                }

                $discount = $item['discount'] ?? 0;
                $itemSubtotal = ($item['unit_price'] * $item['quantity']) - $discount;
                $itemProfit = $itemSubtotal - ($product->cost_price * $item['quantity']);

                $subtotal += $itemSubtotal;
                $totalProfit += $itemProfit;

                $items[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'cost_price' => $product->cost_price,
                    'discount' => $discount,
                    'subtotal' => $itemSubtotal,
                    'profit' => $itemProfit,
                ];

                // Decrease stock
                $stock = ProductStock::firstOrCreate(
                    ['product_id' => $item['product_id'], 'warehouse_id' => $validated['warehouse_id']],
                    ['quantity' => 0]
                );
                $stock->decrement('quantity', $item['quantity']);
            }

            // Calculate totals
            $discountAmount = $validated['discount_amount'] ?? 0;
            $discountPercent = $validated['discount_percent'] ?? 0;
            if ($discountPercent > 0) {
                $discountAmount = $subtotal * ($discountPercent / 100);
            }
            $tax = $validated['tax'] ?? 0;
            $total = $subtotal - $discountAmount + $tax;
            $paid = $validated['paid'];
            $change = max(0, $paid - $total);

            $paymentStatus = 'paid';
            if ($paid < $total) {
                $paymentStatus = $paid > 0 ? 'partial' : 'unpaid';
            }

            $shift = $request->user()->shifts()->where('status', 'open')->first();
            
            $sale = Sale::create([
                'invoice_number' => Sale::generateInvoiceNumber(),
                'customer_id' => $validated['customer_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'user_id' => $request->user()->id,
                'shift_id' => $shift ? $shift->id : null,
                'sale_date' => now()->toDateString(),
                'due_date' => $validated['payment_type'] === 'tempo' ? now()->addDays(30)->toDateString() : null,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'discount_percent' => $discountPercent,
                'tax' => $tax,
                'total' => $total,
                'paid' => min($paid, $total),
                'change_amount' => $change,
                'profit' => $totalProfit - $discountAmount,
                'payment_type' => $validated['payment_type'],
                'payment_status' => $paymentStatus,
                'status' => 'completed',
                'notes' => $validated['notes'],
            ]);

            foreach ($items as $item) {
                $sale->details()->create($item);
            }

            if ($paid > 0) {
                SalePayment::create([
                    'sale_id' => $sale->id,
                    'amount' => min($paid, $total),
                    'method' => $validated['payment_type'] === 'tempo' ? 'cash' : $validated['payment_type'],
                    'payment_date' => now()->toDateString(),
                ]);
            }

            return response()->json([
                'success' => true,
                'sale' => $sale->load('details.product', 'customer'),
                'cashier' => $request->user()->name,
                'store' => Setting::where('group', 'toko')
                    ->orWhere('group', 'struk')
                    ->pluck('value', 'key'),
            ]);
        });
    }
}
