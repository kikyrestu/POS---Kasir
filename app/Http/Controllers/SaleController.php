<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Sale;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $sales = Sale::with(['customer', 'user', 'warehouse'])
            ->when($request->search, function ($q, $s) {
                $q->where('invoice_number', 'like', "%{$s}%")
                  ->orWhereHas('customer', fn($q) => $q->where('name', 'like', "%{$s}%"));
            })
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->payment_status, fn($q, $s) => $q->where('payment_status', $s))
            ->when($request->date_from, fn($q, $d) => $q->where('sale_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('sale_date', '<=', $d))
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'filters' => $request->only('search', 'status', 'payment_status', 'date_from', 'date_to'),
        ]);
    }

    public function show(Sale $sale)
    {
        $sale->load(['customer', 'user', 'warehouse', 'details.product', 'payments', 'returns.details']);

        return Inertia::render('Sales/Show', [
            'sale' => $sale,
            'store' => Setting::whereIn('group', ['toko', 'struk'])->pluck('value', 'key'),
        ]);
    }

    public function printReceipt(Sale $sale)
    {
        $sale->load(['details.product', 'customer', 'user']);
        $store = Setting::whereIn('group', ['toko', 'struk'])->pluck('value', 'key');
        return view('print.receipt', compact('sale', 'store'));
    }

    public function destroy(Sale $sale)
    {
        // Restore stock (minus already-returned quantities)
        $sale->load(['details', 'returns.details']);
        $returnedQty = [];
        foreach ($sale->returns as $return) {
            foreach ($return->details as $rd) {
                $key = $rd->product_id;
                $returnedQty[$key] = ($returnedQty[$key] ?? 0) + $rd->quantity;
            }
        }

        foreach ($sale->details as $detail) {
            $alreadyReturned = $returnedQty[$detail->product_id] ?? 0;
            $restoreQty = $detail->quantity - $alreadyReturned;
            if ($restoreQty > 0) {
                $stock = \App\Models\ProductStock::where('product_id', $detail->product_id)
                    ->where('warehouse_id', $sale->warehouse_id)
                    ->first();
                if ($stock) {
                    $stock->increment('quantity', $restoreQty);
                }
            }
        }

        $sale->delete();

        return redirect()->route('sales.index')->with('success', 'Penjualan berhasil dihapus.');
    }
}
