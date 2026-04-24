<?php

namespace App\Http\Controllers;

use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Traits\ExportsToCsv;
use App\Exports\GenericDataExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    use ExportsToCsv;

    public function salesByInvoice(Request $request)
    {
        $query = Sale::with(['customer', 'user'])
            ->where('status', 'completed')
            ->when($request->date_from, fn($q, $d) => $q->where('sale_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('sale_date', '<=', $d))
            ->when($request->user_id, fn($q, $u) => $q->where('user_id', $u))
            ->orderBy('sale_date', 'desc');

        if ($request->export === 'csv' || $request->export === 'excel') {
            $data = $query->get();
            $filename = 'sales_by_invoice_' . now()->format('Ymd');
            $headings = ['Tanggal', 'No. Invoice', 'Kasir', 'Pelanggan', 'Status', 'Total', 'Profit'];
            $exportData = $data->map(fn($s) => [
                $s->sale_date->format('Y-m-d'),
                $s->invoice_number,
                $s->user->name ?? '-',
                $s->customer->name ?? '-',
                $s->status,
                $s->total,
                $s->profit
            ])->toArray();

            if ($request->export === 'excel') {
                return Excel::download(new GenericDataExport($headings, $exportData), $filename . '.xlsx');
            }
            return $this->exportCsv($filename, $headings, $exportData);
        }

        $sales = $query->paginate(20)->withQueryString();

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
        $query = SaleDetail::with('product')
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
            ->orderByDesc('total_qty');

        if ($request->export === 'csv' || $request->export === 'excel') {
            $data = $query->get();
            $filename = 'sales_by_item_' . now()->format('Ymd');
            $headings = ['Kode/Barcode', 'Nama Produk', 'Terjual', 'Total Omset', 'Total Profit'];
            $exportData = $data->map(fn($item) => [
                $item->product->code ?? $item->product->barcode ?? '-',
                $item->product->name ?? '-',
                $item->total_qty,
                $item->total_sales,
                $item->total_profit
            ])->toArray();

            if ($request->export === 'excel') {
                return Excel::download(new GenericDataExport($headings, $exportData), $filename . '.xlsx');
            }
            return $this->exportCsv($filename, $headings, $exportData);
        }

        $items = $query->paginate(20)->withQueryString();

        return Inertia::render('Reports/SalesByItem', [
            'items' => $items,
            'filters' => $request->only('date_from', 'date_to', 'user_id'),
        ]);
    }

    public function purchasesByInvoice(Request $request)
    {
        $query = Purchase::with(['supplier', 'user'])
            ->when($request->date_from, fn($q, $d) => $q->where('purchase_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('purchase_date', '<=', $d))
            ->when($request->supplier_id, fn($q, $s) => $q->where('supplier_id', $s))
            ->orderBy('purchase_date', 'desc');

        if ($request->export === 'csv' || $request->export === 'excel') {
            $data = $query->get();
            $filename = 'purchases_by_invoice_' . now()->format('Ymd');
            $headings = ['Tanggal', 'No. Invoice', 'User', 'Supplier', 'Status', 'Total Pembelian'];
            $exportData = $data->map(fn($p) => [
                $p->purchase_date->format('Y-m-d'),
                $p->invoice_number,
                $p->user->name ?? '-',
                $p->supplier->name ?? '-',
                $p->status,
                $p->total
            ])->toArray();

            if ($request->export === 'excel') {
                return Excel::download(new GenericDataExport($headings, $exportData), $filename . '.xlsx');
            }
            return $this->exportCsv($filename, $headings, $exportData);
        }

        $purchases = $query->paginate(20)->withQueryString();

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
