<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Sale;
use App\Models\SaleDetail;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->period ?? 'this_month';
        $today = Carbon::today();
        
        $startDate = match($period) {
            'today' => Carbon::today(),
            '7days' => Carbon::today()->subDays(6),
            'this_month' => Carbon::today()->startOfMonth(),
            'last_month' => Carbon::today()->subMonth()->startOfMonth(),
            'this_year' => Carbon::today()->startOfYear(),
            default => Carbon::today()->startOfMonth(),
        };
        
        $endDate = match($period) {
            'last_month' => Carbon::today()->subMonth()->endOfMonth(),
            default => Carbon::today()->endOfDay(),
        };

        // Prev period for percentage comparison
        $prevEndDate = $startDate->copy()->subDay()->endOfDay();
        $daysDiff = $startDate->diffInDays($endDate);
        $prevStartDate = $prevEndDate->copy()->subDays($daysDiff)->startOfDay();

        // ── Stats Cards ──
        $totalItemSold = SaleDetail::whereHas('sale', fn($q) => $q->where('status', 'completed')
            ->whereBetween('sale_date', [$startDate, $endDate]))
            ->sum('quantity');
        $prevItemSold = SaleDetail::whereHas('sale', fn($q) => $q->where('status', 'completed')
            ->whereBetween('sale_date', [$prevStartDate, $prevEndDate]))
            ->sum('quantity');

        $totalTransactions = Sale::where('status', 'completed')->whereBetween('sale_date', [$startDate, $endDate])->count();
        $prevTransactions = Sale::where('status', 'completed')->whereBetween('sale_date', [$prevStartDate, $prevEndDate])->count();

        $totalIncome = Sale::where('status', 'completed')->whereBetween('sale_date', [$startDate, $endDate])->sum('total');
        $prevIncome = Sale::where('status', 'completed')->whereBetween('sale_date', [$prevStartDate, $prevEndDate])->sum('total');

        $totalActiveCustomers = Customer::where('is_active', true)->count();
        $prevActiveCustomers = Customer::where('is_active', true)
            ->where('created_at', '<', $startDate)->count();

        $pctChange = fn($cur, $prev) => $prev > 0 ? round(($cur - $prev) / $prev * 100, 1) : ($cur > 0 ? 100 : 0);

        // ── Sales Graph (Dynamic: Daily vs Monthly) ──
        $salesGraph = [];
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        
        if (in_array($period, ['today', '7days', 'this_month', 'last_month'])) {
            // Daily Chart
            $dateSelect = $isSqlite ? 'date(sale_date)' : 'DATE(sale_date)';
            $data = Sale::where('status', 'completed')
                ->whereBetween('sale_date', [$startDate, $endDate])
                ->selectRaw("{$dateSelect} as date_str, SUM(total) as total")
                ->groupBy('date_str')
                ->pluck('total', 'date_str')
                ->toArray();
                
            $currentDate = $startDate->copy();
            while ($currentDate->lte($endDate)) {
                $dateStr = $currentDate->format('Y-m-d');
                $salesGraph[] = [
                    'label' => clone $currentDate, 
                    'total' => (float) ($data[$dateStr] ?? 0),
                ];
                $currentDate->addDay();
            }
            
            // Format labels
            foreach($salesGraph as &$item) {
                 if ($period === 'today') {
                     $item['label'] = 'Hari Ini';
                 } else {
                     $item['label'] = $item['label']->format('d M');
                 }
            }
        } else {
            // Monthly Chart
            $monthSelect = $isSqlite ? 'CAST(strftime("%m", sale_date) AS INTEGER)' : 'MONTH(sale_date)';
            $data = Sale::where('status', 'completed')
                ->whereBetween('sale_date', [$startDate, $endDate])
                ->selectRaw("{$monthSelect} as month, SUM(total) as total")
                ->groupBy('month')
                ->pluck('total', 'month')
                ->toArray();
                
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            for ($m = 1; $m <= 12; $m++) {
                $salesGraph[] = [
                    'label' => $months[$m - 1],
                    'total' => (float) ($data[$m] ?? 0),
                ];
            }
        }

        // ── Komposisi Barang (stock vs minimum) ──
        $allProducts = Product::where('is_active', true)->count();
        $belowMin = Product::where('is_active', true)
            ->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM product_stocks WHERE product_stocks.product_id = products.id) < stock_minimum')
            ->count();
        $aboveMin = $allProducts - $belowMin;

        // ── Stok Barang ──
        $stockCategory = $request->stock_category;
        $stockSearch = $request->stock_search;
        $stockProducts = Product::with(['stocks', 'category'])
            ->where('is_active', true)
            ->when($stockCategory, fn($q, $c) => $q->where('category_id', $c))
            ->when($stockSearch, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->paginate(5, ['*'], 'stock_page')
            ->through(function ($product) {
                $totalStock = $product->stocks->sum('quantity');
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'stock_minimum' => $product->stock_minimum,
                    'stock' => $totalStock,
                    'is_low' => $totalStock < $product->stock_minimum,
                    'category' => $product->category?->name,
                ];
            })
            ->withQueryString();

        // ── Piutang Terbesar (customers with unpaid/partial sales) ──
        $topReceivables = Customer::select('customers.*')
            ->selectRaw('(SELECT SUM(s.total - s.paid) FROM sales s WHERE s.customer_id = customers.id AND s.payment_status IN ("unpaid", "partial") AND s.status = "completed") as total_debt')
            ->whereRaw('(SELECT SUM(s.total - s.paid) FROM sales s WHERE s.customer_id = customers.id AND s.payment_status IN ("unpaid", "partial") AND s.status = "completed") > 0')
            ->orderByDesc('total_debt')
            ->limit(5)
            ->get()
            ->map(fn($c) => ['name' => $c->name, 'total' => (float) $c->total_debt]);

        // Non-customer (umum) receivables
        $umumDebt = Sale::whereNull('customer_id')
            ->whereIn('payment_status', ['unpaid', 'partial'])
            ->where('status', 'completed')
            ->selectRaw('SUM(total - paid) as total_debt')
            ->value('total_debt');
        if ($umumDebt > 0) {
            $topReceivables->push(['name' => 'Umum', 'total' => (float) $umumDebt]);
            $topReceivables = $topReceivables->sortByDesc('total')->values()->take(5);
        }

        // ── Piutang Jatuh Tempo ──
        $overdueFilter = (int) ($request->overdue_days ?? 30);
        $overdueDate = Carbon::now()->subDays($overdueFilter)->toDateString();
        $overdueSales = Sale::with('customer')
            ->whereIn('payment_status', ['unpaid', 'partial'])
            ->where('status', 'completed')
            ->where('sale_date', '<=', $overdueDate)
            ->orderBy('sale_date')
            ->paginate(5, ['*'], 'overdue_page')
            ->through(fn($s) => [
                'id' => $s->id,
                'customer' => $s->customer?->name ?? 'Umum',
                'invoice' => $s->invoice_number,
                'date' => $s->sale_date,
                'total' => (float) $s->total,
                'remaining' => (float) ($s->total - $s->paid),
            ])
            ->withQueryString();

        // ── Penjualan Barang Terbesar ──
        $topSellingProducts = SaleDetail::with('product:id,name')
            ->whereHas('sale', fn($q) => $q->where('status', 'completed')->whereBetween('sale_date', [$startDate, $endDate]))
            ->select('product_id',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(subtotal) as total_sales')
            )
            ->groupBy('product_id')
            ->orderByDesc('total_sales')
            ->paginate(5, ['*'], 'topselling_page')
            ->withQueryString();

        $grandTotalSales = Sale::where('status', 'completed')->whereBetween('sale_date', [$startDate, $endDate])->sum('total');

        // ── Paling Banyak Terjual - pie chart data ──
        $mostSoldPie = SaleDetail::with('product:id,name')
            ->whereHas('sale', fn($q) => $q->where('status', 'completed')->whereBetween('sale_date', [$startDate, $endDate]))
            ->select('product_id', DB::raw('SUM(quantity) as total_qty'))
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get()
            ->map(fn($d) => ['name' => $d->product?->name ?? 'N/A', 'value' => (int) $d->total_qty]);

        // ── Kategori Terlaris - pie chart ──
        $topCategories = Category::select('categories.id', 'categories.name')
            ->selectRaw('COALESCE(SUM(sd.quantity), 0) as total_qty')
            ->leftJoin('products as p', 'p.category_id', '=', 'categories.id')
            ->leftJoin('sale_details as sd', 'sd.product_id', '=', 'p.id')
            ->leftJoin('sales as s', function ($join) use ($startDate, $endDate) {
                $join->on('s.id', '=', 'sd.sale_id')
                    ->where('s.status', 'completed')
                    ->whereBetween('s.sale_date', [$startDate, $endDate]);
            })
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get()
            ->map(fn($c) => ['name' => $c->name, 'value' => (int) $c->total_qty]);

        // ── Penjualan Terbesar per Kategori ──
        $topCategorySales = Category::select('categories.id', 'categories.name')
            ->selectRaw('COALESCE(SUM(sd.subtotal), 0) as total_sales')
            ->leftJoin('products as p', 'p.category_id', '=', 'categories.id')
            ->leftJoin('sale_details as sd', 'sd.product_id', '=', 'p.id')
            ->leftJoin('sales as s', function ($join) use ($startDate, $endDate) {
                $join->on('s.id', '=', 'sd.sale_id')
                    ->where('s.status', 'completed')
                    ->whereBetween('s.sale_date', [$startDate, $endDate]);
            })
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_sales')
            ->limit(5)
            ->get()
            ->map(fn($c) => ['name' => $c->name, 'value' => (float) $c->total_sales]);

        // ── Item Terbaru ──
        $latestProducts = Product::where('is_active', true)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'name', 'selling_price', 'image']);

        // ── Pelanggan Terbesar ──
        $topCustomers = Customer::select('customers.id', 'customers.name')
            ->selectRaw('COALESCE(SUM(s.total), 0) as total_spend')
            ->leftJoin('sales as s', function ($join) use ($startDate, $endDate) {
                $join->on('s.customer_id', '=', 'customers.id')
                    ->where('s.status', 'completed')
                    ->whereBetween('s.sale_date', [$startDate, $endDate]);
            })
            ->groupBy('customers.id', 'customers.name')
            ->orderByDesc('total_spend')
            ->limit(5)
            ->get()
            ->map(fn($c) => ['name' => $c->name, 'total' => (float) $c->total_spend]);

        // ── Penjualan Terbaru ──
        $recentSales = Sale::with('customer')
            ->where('status', 'completed')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->orderByDesc('sale_date')
            ->paginate(5, ['*'], 'recent_page')
            ->through(fn($s) => [
                'id' => $s->id,
                'customer' => $s->customer?->name ?? 'Umum',
                'items_count' => $s->details()->sum('quantity'),
                'total' => (float) $s->total,
                'date' => $s->sale_date,
                'status' => $s->payment_status,
            ])
            ->withQueryString();

        // ── Categories list for stock filter ──
        $categories = Category::where('is_active', true)->get(['id', 'name']);

        // ── Low Stock & Expiry Alerts ──
        $lowStockAlerts = Product::with('category')
            ->where('is_active', true)
            ->whereRaw('COALESCE((SELECT SUM(quantity) FROM product_stocks WHERE product_stocks.product_id = products.id), 0) < stock_minimum')
            ->get(['id', 'name', 'code', 'stock_minimum', 'category_id'])
            ->map(function ($p) {
                $actual = DB::table('product_stocks')->where('product_id', $p->id)->sum('quantity');
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'code' => $p->code,
                    'stock_minimum' => $p->stock_minimum,
                    'actual_stock' => $actual,
                    'category' => $p->category?->name
                ];
            });

        $expiryAlerts = Product::with('category')
            ->where('is_active', true)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', Carbon::now()->addDays(30)->toDateString())
            ->orderBy('expiry_date', 'asc')
            ->get(['id', 'name', 'code', 'expiry_date', 'category_id'])
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'code' => $p->code,
                    'expiry_date' => $p->expiry_date->format('Y-m-d'),
                    'days_left' => Carbon::now()->diffInDays($p->expiry_date, false),
                    'category' => $p->category?->name
                ];
            });

        return Inertia::render('Dashboard', [
            'period' => $period,
            'stats' => [
                ['title' => 'Total Item Terjual', 'value' => $totalItemSold, 'change' => $pctChange($totalItemSold, $prevItemSold)],
                ['title' => 'Total Transaksi', 'value' => $totalTransactions, 'change' => $pctChange($totalTransactions, $prevTransactions)],
                ['title' => 'Total Pendapatan', 'value' => $totalIncome, 'change' => $pctChange($totalIncome, $prevIncome), 'type' => 'currency'],
                ['title' => 'Total Pelanggan Aktif', 'value' => $totalActiveCustomers, 'change' => $pctChange($totalActiveCustomers, $prevActiveCustomers)],
            ],
            'salesGraph' => $salesGraph,
            'stockComposition' => ['above' => $aboveMin, 'below' => $belowMin],
            'stockProducts' => $stockProducts,
            'categories' => $categories,
            'topReceivables' => $topReceivables,
            'overdueSales' => $overdueSales,
            'overdueFilter' => $overdueFilter,
            'topSellingProducts' => $topSellingProducts,
            'grandTotalSales' => $grandTotalSales,
            'mostSoldPie' => $mostSoldPie,
            'topCategories' => $topCategories,
            'topCategorySales' => $topCategorySales,
            'latestProducts' => $latestProducts,
            'topCustomers' => $topCustomers,
            'recentSales' => $recentSales,
            'lowStockAlerts' => $lowStockAlerts,
            'expiryAlerts' => $expiryAlerts,
        ]);
    }
}
