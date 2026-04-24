<?php

use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PurchaseReturnController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\SaleTempoController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\StockOpnameController;
use App\Http\Controllers\StockMovementController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard')->middleware('permission:dashboard');

    // POS
    Route::get('/pos', [\App\Http\Controllers\PosController::class, 'index'])->name('pos.index')->middleware('permission:pos.view');
    Route::post('/pos', [\App\Http\Controllers\PosController::class, 'store'])->name('pos.store')->middleware('permission:pos.view');
    
    // Hold / Suspend Transactions
    Route::get('/pos/held', [\App\Http\Controllers\HoldTransactionController::class, 'index'])->name('pos.held.index')->middleware('permission:pos.view');
    Route::post('/pos/held', [\App\Http\Controllers\HoldTransactionController::class, 'store'])->name('pos.held.store')->middleware('permission:pos.view');
    Route::delete('/pos/held/{holdTransaction}', [\App\Http\Controllers\HoldTransactionController::class, 'destroy'])->name('pos.held.destroy')->middleware('permission:pos.view');
    // Shift Operations
    Route::post('/shifts/open', [\App\Http\Controllers\ShiftController::class, 'open'])->name('shifts.open')->middleware('permission:pos.view');
    Route::post('/shifts/close', [\App\Http\Controllers\ShiftController::class, 'close'])->name('shifts.close')->middleware('permission:pos.view');
    Route::get('/api/shifts/closing-data', [\App\Http\Controllers\ShiftController::class, 'getClosingData'])->name('shifts.closing-data')->middleware('permission:pos.view');

    // Petty Cash / Expenses
    Route::resource('expenses', \App\Http\Controllers\ExpenseController::class)->only(['index', 'store', 'destroy'])->middleware('permission:sales.view');

    // Sales
    Route::get('sales/{sale}/print', [SaleController::class, 'printReceipt'])->name('sales.print')->middleware('permission:sales.view');
    Route::resource('sales', SaleController::class)->only(['index', 'show', 'destroy'])->middleware('permission:sales.view');
    Route::delete('sales/{sale}', [SaleController::class, 'destroy'])->middleware('permission:sales.manage');
    
    // Sale Returns
    Route::resource('sale-returns', \App\Http\Controllers\SaleReturnController::class)->except(['edit', 'update'])->middleware('permission:sales.manage');

    // Products
    Route::get('/products/export', [ProductController::class, 'export'])->name('products.export')->middleware('permission:products.manage');
    Route::get('/products/template', [ProductController::class, 'downloadTemplate'])->name('products.template')->middleware('permission:products.manage');
    Route::post('/products/import', [ProductController::class, 'import'])->name('products.import')->middleware('permission:products.manage');
    Route::resource('products', ProductController::class)->only(['index', 'show'])->middleware('permission:products.view');
    Route::resource('products', ProductController::class)->except(['index', 'show'])->middleware('permission:products.manage');
    Route::get('/barcodes', [\App\Http\Controllers\BarcodeController::class, 'index'])->name('barcodes.index')->middleware('permission:products.manage');
    Route::get('/api/products/search', [ProductController::class, 'search'])->name('products.search')->middleware('permission:products.view');

    // Categories
    Route::resource('categories', CategoryController::class)->except(['show', 'create', 'edit'])->middleware('permission:categories.manage');

    // Customers
    Route::resource('customers', CustomerController::class)->except(['show', 'create', 'edit'])->middleware('permission:customers.manage');

    // Suppliers
    Route::resource('suppliers', SupplierController::class)->except(['show', 'create', 'edit'])->middleware('permission:suppliers.manage');

    // Warehouses
    Route::resource('warehouses', WarehouseController::class)->except(['create', 'edit'])->middleware('permission:warehouses.manage');

    // Sales
    Route::resource('sales', SaleController::class)->only(['index', 'show'])->middleware('permission:sales.view');
    Route::resource('sales', SaleController::class)->only(['destroy'])->middleware('permission:sales.manage');

    // Sale Returns
    Route::resource('sale-returns', SaleReturnController::class)->only(['index', 'create', 'store', 'show', 'destroy'])->middleware('permission:sale-returns.manage');

    // Sale Tempo (Piutang)
    Route::get('/sales-tempo', [SaleTempoController::class, 'index'])->name('sales-tempo.index')->middleware('permission:sales-tempo.view');
    Route::get('/sales-tempo/{sale}', [SaleTempoController::class, 'show'])->name('sales-tempo.show')->middleware('permission:sales-tempo.view');
    Route::post('/sales-tempo/{sale}/payment', [SaleTempoController::class, 'addPayment'])->name('sales-tempo.add-payment')->middleware('permission:sales-tempo.manage');

    // Purchases
    Route::resource('purchases', PurchaseController::class)->only(['index', 'show'])->middleware('permission:purchases.view');
    Route::resource('purchases', PurchaseController::class)->except(['index', 'show', 'edit', 'update'])->middleware('permission:purchases.manage');

    // Purchase Returns
    Route::resource('purchase-returns', PurchaseReturnController::class)->only(['index', 'create', 'store', 'show', 'destroy'])->middleware('permission:purchase-returns.manage');

    // Stock Transfers
    Route::resource('stock-transfers', StockTransferController::class)->only(['index', 'create', 'store', 'show', 'destroy'])->middleware('permission:stock-transfers.manage');

    // Stock Opnames
    Route::resource('stock-opnames', StockOpnameController::class)->only(['index', 'create', 'store'])->middleware('permission:warehouses.manage');
    
    // Stock Movements
    Route::get('/stock-movements', [StockMovementController::class, 'index'])->name('stock-movements.index')->middleware('permission:warehouses.manage');

    // Barcodes
    Route::get('/barcodes', [BarcodeController::class, 'index'])->name('barcodes.index')->middleware('permission:barcodes.print');

    // Reports
    Route::get('/reports/sales-by-invoice', [ReportController::class, 'salesByInvoice'])->name('reports.sales-by-invoice')->middleware('permission:reports.view');
    Route::get('/reports/sales-by-item', [ReportController::class, 'salesByItem'])->name('reports.sales-by-item')->middleware('permission:reports.view');
    Route::get('/reports/purchases-by-invoice', [ReportController::class, 'purchasesByInvoice'])->name('reports.purchases-by-invoice')->middleware('permission:reports.view');
    
    // Finance Reports
    Route::get('/reports/profit-loss', [\App\Http\Controllers\FinanceController::class, 'profitAndLoss'])->name('reports.profit-loss')->middleware('permission:reports.view');
    Route::get('/reports/receivables', [\App\Http\Controllers\FinanceController::class, 'receivables'])->name('reports.receivables')->middleware('permission:reports.view');

    // Settings & Activity Logs
    Route::get('/activity-logs', [\App\Http\Controllers\ActivityLogController::class, 'index'])->name('activity-logs.index')->middleware('permission:settings.manage');
    Route::get('/settings', [SettingController::class, 'index'])->name('settings.index')->middleware('permission:settings.manage');
    Route::post('/settings', [SettingController::class, 'update'])->name('settings.update')->middleware('permission:settings.manage');

    // User Management
    Route::resource('users', UserManagementController::class)->except(['show', 'create', 'edit'])->middleware('permission:users.manage');
    Route::patch('/users/{user}/toggle-active', [UserManagementController::class, 'toggleActive'])->name('users.toggle-active')->middleware('permission:users.manage');

    // Roles
    Route::resource('roles', RoleController::class)->except(['show', 'create', 'edit'])->middleware('permission:roles.manage');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
