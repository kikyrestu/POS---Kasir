<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Product;
use App\Models\Category;
use App\Models\Sale;
use App\Models\SaleDetail;
use Illuminate\Support\Facades\DB;

class PosApiController extends Controller
{
    public function getProducts(Request $request)
    {
        // Get products along with category
        $products = Product::with('category')->get();
        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    public function getCategories(Request $request)
    {
        $categories = Category::all();
        return response()->json([
            'status' => 'success',
            'data' => $categories
        ]);
    }

    public function storeTransaction(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:products,id',
            'items.*.qty' => 'required|numeric|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'paid' => 'required|numeric|min:0',
            'payment_type' => 'required|string|in:cash,transfer,qris',
        ]);

        try {
            DB::beginTransaction();

            $subtotal = $request->total;
            $paid = $request->paid;
            $change = max(0, $paid - $subtotal);

            // Default warehouse fallback (assumes warehouse_id 1 is main)
            $warehouseId = 1; 
            
            // Note: Customer ID can be nullable for general POS guest customers.
            $customerId = $request->customer_id ?? null;

            // Open shift calculation (optional, fallback to null)
            $shift = $request->user()->shifts()->where('status', 'open')->first();

            $sale = Sale::create([
                'invoice_number' => Sale::generateInvoiceNumber(),
                'customer_id' => $customerId,
                'warehouse_id' => $warehouseId,
                'user_id' => $request->user()->id,
                'shift_id' => $shift ? $shift->id : null,
                'sale_date' => now()->toDateString(),
                'subtotal' => $subtotal,
                'discount_amount' => 0,
                'discount_percent' => 0,
                'tax' => 0,
                'total' => $subtotal,
                'paid' => min($paid, $subtotal),
                'change_amount' => $change,
                'profit' => 0, // Simplified for API, ideally calculated per item
                'payment_type' => $request->payment_type,
                'payment_status' => $paid >= $subtotal ? 'paid' : ($paid > 0 ? 'partial' : 'unpaid'),
                'status' => 'completed',
            ]);

            $totalProfit = 0;

            foreach ($request->items as $item) {
                $product = Product::find($item['id']);
                $itemSubtotal = $item['price'] * $item['qty'];
                $itemProfit = ($item['price'] - $product->cost_price) * $item['qty'];
                $totalProfit += $itemProfit;

                SaleDetail::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_variant_id' => null,
                    'quantity' => $item['qty'],
                    'unit_price' => $item['price'],
                    'cost_price' => $product->cost_price,
                    'discount' => 0,
                    'subtotal' => $itemSubtotal,
                    'profit' => $itemProfit,
                ]);

                // Decrease stock using ProductStock model
                $stock = \App\Models\ProductStock::firstOrCreate(
                    [
                        'product_id' => $product->id,
                        'product_variant_id' => null,
                        'warehouse_id' => $warehouseId
                    ],
                    ['quantity' => 0]
                );
                $stock->decrement('quantity', $item['qty']);
            }

            // Update total profit on Sale
            $sale->update(['profit' => $totalProfit]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi berhasil disimpan',
                'data' => $sale
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan transaksi: ' . $e->getMessage()
            ], 500);
        }
    }
}
