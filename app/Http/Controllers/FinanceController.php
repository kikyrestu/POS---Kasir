<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Customer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Traits\ExportsToCsv;
use App\Exports\GenericDataExport;
use Maatwebsite\Excel\Facades\Excel;

class FinanceController extends Controller
{
    use ExportsToCsv;

    public function profitAndLoss(Request $request)
    {
        $dateFrom = $request->date_from ? Carbon::parse($request->date_from)->startOfDay() : Carbon::now()->startOfMonth();
        $dateTo = $request->date_to ? Carbon::parse($request->date_to)->endOfDay() : Carbon::now()->endOfMonth();

        // Query standard profit/loss data from sales
        $salesData = Sale::where('status', 'completed')
            ->whereBetween('sale_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->selectRaw('
                sale_date,
                SUM(subtotal) as gross_revenue,
                SUM(discount_amount) as total_discounts,
                SUM(total) as net_revenue,
                SUM(profit) as total_profit
            ')
            ->groupBy('sale_date')
            ->orderBy('sale_date', 'asc')
            ->get();

        $totals = [
            'gross_revenue' => $salesData->sum('gross_revenue'),
            'total_discounts' => $salesData->sum('total_discounts'),
            'net_revenue' => $salesData->sum('net_revenue'),
            'total_profit' => $salesData->sum('total_profit'),
        ];

        // Export handling
        if ($request->export === 'csv' || $request->export === 'excel') {
            $filename = 'profit_loss_' . $dateFrom->format('Ymd') . '_' . $dateTo->format('Ymd');
            $headings = ['Tanggal', 'Pendapatan Kotor', 'Diskon', 'Pendapatan Bersih', 'Laba Kotor'];
            $data = $salesData->map(fn($row) => [
                $row->sale_date->format('Y-m-d'),
                $row->gross_revenue,
                $row->total_discounts,
                $row->net_revenue,
                $row->total_profit,
            ])->toArray();

            if ($request->export === 'excel') {
                return Excel::download(new GenericDataExport($headings, $data), $filename . '.xlsx');
            }
            return $this->exportCsv($filename, $headings, $data);
        }

        return Inertia::render('Reports/ProfitLoss', [
            'salesData' => $salesData,
            'totals' => $totals,
            'filters' => [
                'date_from' => $dateFrom->toDateString(),
                'date_to' => $dateTo->toDateString(),
            ]
        ]);
    }

    public function receivables(Request $request)
    {
        $receivables = Customer::select('customers.id', 'customers.name', 'customers.phone')
            ->selectRaw('COALESCE(SUM(s.total - s.paid), 0) as total_debt')
            ->selectRaw('SUM(CASE WHEN s.sale_date >= ? THEN s.total - s.paid ELSE 0 END) as debt_under_30', [Carbon::now()->subDays(30)->toDateString()])
            ->selectRaw('SUM(CASE WHEN s.sale_date >= ? AND s.sale_date < ? THEN s.total - s.paid ELSE 0 END) as debt_30_to_60', [Carbon::now()->subDays(60)->toDateString(), Carbon::now()->subDays(30)->toDateString()])
            ->selectRaw('SUM(CASE WHEN s.sale_date < ? THEN s.total - s.paid ELSE 0 END) as debt_over_60', [Carbon::now()->subDays(60)->toDateString()])
            ->leftJoin('sales as s', function ($join) {
                $join->on('s.customer_id', '=', 'customers.id')
                    ->where('s.status', 'completed')
                    ->whereIn('s.payment_status', ['unpaid', 'partial']);
            })
            ->groupBy('customers.id', 'customers.name', 'customers.phone')
            ->having('total_debt', '>', 0)
            ->orderByDesc('total_debt')
            ->get();

        // Export handling
        if ($request->export === 'csv' || $request->export === 'excel') {
            $filename = 'aging_report_' . Carbon::now()->format('Ymd');
            $headings = ['Nama Pelanggan', 'No Handphone', 'Total Piutang', '< 30 Hari', '30-60 Hari', '> 60 Hari'];
            $data = $receivables->map(fn($c) => [
                $c->name,
                $c->phone,
                $c->total_debt,
                $c->debt_under_30,
                $c->debt_30_to_60,
                $c->debt_over_60,
            ])->toArray();

            if ($request->export === 'excel') {
                return Excel::download(new GenericDataExport($headings, $data), $filename . '.xlsx');
            }
            return $this->exportCsv($filename, $headings, $data);
        }

        return Inertia::render('Reports/Receivables', [
            'receivables' => $receivables,
        ]);
    }
}
