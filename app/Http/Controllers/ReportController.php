<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function salesByInvoice(Request $request)
    {
        $sales = Sale::with(['customer', 'user'])
            ->where('status', 'completed')
            ->when($request->date_from, fn($q, $d) => $q->where('sale_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('sale_date', '<=', $d))
            ->when($request->user_id, fn($q, $u) => $q->where('user_id', $u))
            ->orderBy('sale_date', 'desc')
            ->paginate(20)
            ->withQueryString();

        $totals = Sale::where('status', 'completed')
            ->when($request->date_from, fn($q, $d) => $q->where('sale_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('sale_date', '<=', $d))
            ->when($request->user_id, fn($q, $u) => $q->where('user_id', $u))
            ->selectRaw('SUM(total) as total_sales, SUM(profit) as total_profit, COUNT(*) as total_transactions')
            ->first();

        return Inertia::render('Reports/SalesByInvoice', [
            'sales' => $sales,
            'totals' => $totals,
            'filters' => $request->only('date_from', 'date_to', 'user_id'),
            'cashiers' => \App\Models\User::whereHas('role', fn($q) => $q->whereIn('name', ['admin', 'kasir']))
                ->get(['id', 'name']),
        ]);
    }

    public function salesByItem(Request $request)
    {
        $items = SaleDetail::with('product')
            ->whereHas('sale', function ($q) use ($request) {
                $q->where('status', 'completed')
                  ->when($request->date_from, fn($q, $d) => $q->where('sale_date', '>=', $d))
                  ->when($request->date_to, fn($q, $d) => $q->where('sale_date', '<=', $d))
                  ->when($request->user_id, fn($q, $u) => $q->where('user_id', $u));
            })
            ->select('product_id',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(subtotal) as total_sales'),
                DB::raw('SUM(profit) as total_profit')
            )
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Reports/SalesByItem', [
            'items' => $items,
            'filters' => $request->only('date_from', 'date_to', 'user_id'),
        ]);
    }

    public function purchasesByInvoice(Request $request)
    {
        $purchases = Purchase::with(['supplier', 'user'])
            ->when($request->date_from, fn($q, $d) => $q->where('purchase_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('purchase_date', '<=', $d))
            ->when($request->supplier_id, fn($q, $s) => $q->where('supplier_id', $s))
            ->orderBy('purchase_date', 'desc')
            ->paginate(20)
            ->withQueryString();

        $totals = Purchase::query()
            ->when($request->date_from, fn($q, $d) => $q->where('purchase_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('purchase_date', '<=', $d))
            ->when($request->supplier_id, fn($q, $s) => $q->where('supplier_id', $s))
            ->selectRaw('SUM(total) as total_purchases, COUNT(*) as total_transactions')
            ->first();

        return Inertia::render('Reports/PurchasesByInvoice', [
            'purchases' => $purchases,
            'totals' => $totals,
            'filters' => $request->only('date_from', 'date_to', 'supplier_id'),
            'suppliers' => \App\Models\Supplier::orderBy('name')->get(['id', 'name']),
        ]);
    }
}
