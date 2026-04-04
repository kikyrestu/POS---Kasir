<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SaleReturnDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SaleReturnController extends Controller
{
    public function index(Request $request)
    {
        $returns = SaleReturn::with(['sale.customer', 'user'])
            ->when($request->search, function ($q, $s) {
                $q->where('return_number', 'like', "%{$s}%")
                  ->orWhereHas('sale', fn($q) => $q->where('invoice_number', 'like', "%{$s}%"));
            })
            ->when($request->date_from, fn($q, $d) => $q->where('return_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('return_date', '<=', $d))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('SaleReturns/Index', [
            'returns' => $returns,
            'filters' => $request->only('search', 'date_from', 'date_to'),
        ]);
    }

    public function create(Request $request)
    {
        $sale = null;
        if ($request->sale_id) {
            $sale = Sale::with(['customer', 'details.product', 'returns.details'])
                ->findOrFail($request->sale_id);
        }

        $sales = Sale::where('status', 'completed')
            ->with('customer')
            ->orderByDesc('sale_date')
            ->get(['id', 'invoice_number', 'customer_id', 'sale_date', 'total']);

        return Inertia::render('SaleReturns/Create', [
            'sale' => $sale,
            'sales' => $sales,
            'returnNumber' => SaleReturn::generateReturnNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sale_id' => 'required|exists:sales,id',
            'return_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.sale_detail_id' => 'required|exists:sale_details,id',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $sale = Sale::with(['details', 'returns.details'])->findOrFail($validated['sale_id']);
            $total = 0;

            // Calculate already-returned quantities per sale_detail_id
            $alreadyReturned = [];
            foreach ($sale->returns as $existingReturn) {
                foreach ($existingReturn->details as $rd) {
                    $alreadyReturned[$rd->sale_detail_id] = ($alreadyReturned[$rd->sale_detail_id] ?? 0) + $rd->quantity;
                }
            }

            // Validate return quantities
            foreach ($validated['items'] as $item) {
                $saleDetail = $sale->details->firstWhere('id', $item['sale_detail_id']);
                if (!$saleDetail) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => 'Detail penjualan tidak ditemukan.',
                    ]);
                }
                $returned = $alreadyReturned[$item['sale_detail_id']] ?? 0;
                $maxReturnable = $saleDetail->quantity - $returned;
                if ($item['quantity'] > $maxReturnable) {
                    $product = Product::find($item['product_id']);
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => "Jumlah retur {$product->name} melebihi batas (maks: {$maxReturnable}).",
                    ]);
                }
                $total += $item['unit_price'] * $item['quantity'];
            }

            $return = SaleReturn::create([
                'return_number' => SaleReturn::generateReturnNumber(),
                'sale_id' => $validated['sale_id'],
                'user_id' => $request->user()->id,
                'return_date' => $validated['return_date'],
                'total' => $total,
                'notes' => $validated['notes'],
            ]);

            foreach ($validated['items'] as $item) {
                SaleReturnDetail::create([
                    'sale_return_id' => $return->id,
                    'sale_detail_id' => $item['sale_detail_id'],
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['unit_price'] * $item['quantity'],
                ]);

                // Restore stock
                $stock = ProductStock::firstOrCreate(
                    ['product_id' => $item['product_id'], 'warehouse_id' => $sale->warehouse_id],
                    ['quantity' => 0]
                );
                $stock->increment('quantity', $item['quantity']);
            }

            return redirect()->route('sale-returns.index')->with('success', 'Retur penjualan berhasil disimpan.');
        });
    }

    public function show(SaleReturn $saleReturn)
    {
        $saleReturn->load(['sale.customer', 'user', 'details.product']);

        return Inertia::render('SaleReturns/Show', [
            'saleReturn' => $saleReturn,
        ]);
    }

    public function destroy(SaleReturn $saleReturn)
    {
        DB::transaction(function () use ($saleReturn) {
            $sale = $saleReturn->sale;
            foreach ($saleReturn->details as $detail) {
                $stock = ProductStock::where('product_id', $detail->product_id)
                    ->where('warehouse_id', $sale->warehouse_id)
                    ->first();
                if ($stock) {
                    $stock->decrement('quantity', $detail->quantity);
                }
            }
            $saleReturn->delete();
        });

        return redirect()->route('sale-returns.index')->with('success', 'Retur penjualan berhasil dihapus.');
    }
}
