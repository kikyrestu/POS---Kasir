<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
use App\Http\Middleware\ForgetTenantParameter;

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
use App\Http\Controllers\VoucherController;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the TenantRouteServiceProvider.
|
*/

Route::middleware([
    'web',
    InitializeTenancyBySubdomain::class,
    PreventAccessFromCentralDomains::class,
    ForgetTenantParameter::class,
])->group(function () {
    Route::get('/', function () {
        return redirect()->route('login');
    });

    Route::middleware(['auth', 'verified'])->group(function () {
        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard')->middleware('permission:dashboard');

        // Notifications
        Route::get('/api/notifications', [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
        Route::post('/api/notifications/mark-all-read', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');
        Route::post('/api/notifications/{id}/mark-read', [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');

        // POS
        Route::middleware('saas.feature:pos')->group(function() {
            Route::get('/pos', [PosController::class, 'index'])->name('pos.index')->middleware('permission:pos');
            Route::post('/pos', [PosController::class, 'store'])->name('pos.store')->middleware('permission:pos');
            
            // Hold / Suspend Transactions
            Route::get('/pos/held', [\App\Http\Controllers\HoldTransactionController::class, 'index'])->name('pos.held.index')->middleware('permission:pos');
            Route::post('/pos/held', [\App\Http\Controllers\HoldTransactionController::class, 'store'])->name('pos.held.store')->middleware('permission:pos');
            Route::delete('/pos/held/{holdTransaction}', [\App\Http\Controllers\HoldTransactionController::class, 'destroy'])->name('pos.held.destroy')->middleware('permission:pos');
            // Shift Operations
            Route::post('/shifts/open', [\App\Http\Controllers\ShiftController::class, 'open'])->name('shifts.open')->middleware('permission:pos');
            Route::post('/shifts/close', [\App\Http\Controllers\ShiftController::class, 'close'])->name('shifts.close')->middleware('permission:pos');
            Route::get('/api/shifts/closing-data', [\App\Http\Controllers\ShiftController::class, 'getClosingData'])->name('shifts.closing-data')->middleware('permission:pos');
        });

        // Petty Cash / Expenses
        Route::middleware('saas.feature:expenses')->group(function() {
            Route::resource('expenses', \App\Http\Controllers\ExpenseController::class)->only(['index', 'store', 'destroy'])->middleware('permission:sales.view');
        });

        // Sales
        Route::get('sales/{sale}/print', [SaleController::class, 'printReceipt'])->name('sales.print')->middleware('permission:sales.view');
        Route::resource('sales', SaleController::class)->only(['index', 'show'])->middleware('permission:sales.view');
        Route::resource('sales', SaleController::class)->only(['destroy'])->middleware('permission:sales.manage');
        
        // Sale Returns
        Route::middleware('saas.feature:sale-returns')->group(function() {
            Route::resource('sale-returns', SaleReturnController::class)->only(['index', 'create', 'store', 'show', 'destroy'])->middleware('permission:sale-returns.manage');
        });

        // Products (Inventory)
        Route::middleware('saas.feature:inventory')->group(function() {
            Route::get('/products/export', [ProductController::class, 'export'])->name('products.export')->middleware('permission:products.manage');
            Route::get('/products/template', [ProductController::class, 'downloadTemplate'])->name('products.template')->middleware('permission:products.manage');
            Route::post('/products/import', [ProductController::class, 'import'])->name('products.import')->middleware('permission:products.manage');
            Route::resource('products', ProductController::class)->except(['index', 'show'])->middleware('permission:products.manage');
            Route::resource('products', ProductController::class)->only(['index', 'show'])->middleware('permission:products.view');
            Route::get('/api/products/search', [ProductController::class, 'search'])->name('products.search')->middleware('permission:products.view');
        });

        // Barcodes
        Route::middleware('saas.feature:barcodes')->group(function() {
            Route::get('/barcodes', [BarcodeController::class, 'index'])->name('barcodes.index')->middleware('permission:barcodes.print');
        });

        // KDS (Kitchen Display System)
        Route::get('/kds', [\App\Http\Controllers\KdsController::class, 'index'])->name('kds.index');
        Route::put('/kds/{sale}/status', [\App\Http\Controllers\KdsController::class, 'updateStatus'])->name('kds.updateStatus');

        // Vouchers
        Route::middleware('saas.feature:vouchers')->group(function() {
            Route::post('/api/vouchers/validate', [VoucherController::class, 'validateVoucher'])->name('vouchers.validate');
            Route::resource('vouchers', VoucherController::class)->except(['create', 'show', 'edit']);
        });

        // Categories
        Route::resource('categories', CategoryController::class)->except(['show', 'create', 'edit'])->middleware('permission:categories.manage');

        // Customers
        Route::middleware('saas.feature:customers')->group(function() {
            Route::resource('customers', CustomerController::class)->except(['show', 'create', 'edit'])->middleware('permission:customers.manage');
        });

        // Suppliers
        Route::middleware('saas.feature:suppliers')->group(function() {
            Route::resource('suppliers', SupplierController::class)->except(['show', 'create', 'edit'])->middleware('permission:suppliers.manage');
        });

        // Warehouses
        Route::middleware('saas.feature:warehouses')->group(function() {
            Route::resource('warehouses', WarehouseController::class)->except(['create', 'edit'])->middleware('permission:warehouses.manage');
        });

        // Sale Tempo (Piutang)
        Route::middleware('saas.feature:sales-tempo')->group(function() {
            Route::get('/sales-tempo', [SaleTempoController::class, 'index'])->name('sales-tempo.index')->middleware('permission:sales-tempo.view');
            Route::get('/sales-tempo/{sale}', [SaleTempoController::class, 'show'])->name('sales-tempo.show')->middleware('permission:sales-tempo.view');
            Route::post('/sales-tempo/{sale}/payment', [SaleTempoController::class, 'addPayment'])->name('sales-tempo.add-payment')->middleware('permission:sales-tempo.manage');
        });

        // Purchases
        Route::middleware('saas.feature:purchases')->group(function() {
            Route::resource('purchases', PurchaseController::class)->except(['index', 'show', 'edit', 'update'])->middleware('permission:purchases.manage');
            Route::resource('purchases', PurchaseController::class)->only(['index', 'show'])->middleware('permission:purchases.view');
        });

        // Purchase Returns
        Route::middleware('saas.feature:purchase-returns')->group(function() {
            Route::resource('purchase-returns', PurchaseReturnController::class)->only(['index', 'create', 'store', 'show', 'destroy'])->middleware('permission:purchase-returns.manage');
        });

        // Stock Transfers
        Route::middleware('saas.feature:stock-transfers')->group(function() {
            Route::resource('stock-transfers', StockTransferController::class)->only(['index', 'create', 'store', 'show', 'destroy'])->middleware('permission:stock-transfers.manage');
        });

        // Stock Opnames
        Route::middleware('saas.feature:stock-opnames')->group(function() {
            Route::resource('stock-opnames', StockOpnameController::class)->only(['index', 'create', 'store'])->middleware('permission:warehouses.manage');
            Route::get('/stock-movements', [StockMovementController::class, 'index'])->name('stock-movements.index')->middleware('permission:warehouses.manage');
        });

        // Reports
        Route::middleware('saas.feature:reports')->group(function() {
            Route::get('/reports/sales-by-invoice', [ReportController::class, 'salesByInvoice'])->name('reports.sales-by-invoice')->middleware('permission:reports.view');
            Route::get('/reports/sales-by-item', [ReportController::class, 'salesByItem'])->name('reports.sales-by-item')->middleware('permission:reports.view');
            Route::get('/reports/purchases-by-invoice', [ReportController::class, 'purchasesByInvoice'])->name('reports.purchases-by-invoice')->middleware('permission:reports.view');
            
            // Finance Reports
            Route::get('/reports/profit-loss', [\App\Http\Controllers\FinanceController::class, 'profitAndLoss'])->name('reports.profit-loss')->middleware('permission:reports.view');
            Route::get('/reports/receivables', [\App\Http\Controllers\FinanceController::class, 'receivables'])->name('reports.receivables')->middleware('permission:reports.view');
        });

        // Settings & Activity Logs
        Route::middleware('saas.feature:settings')->group(function() {
            Route::get('/activity-logs', [\App\Http\Controllers\ActivityLogController::class, 'index'])->name('activity-logs.index')->middleware('permission:settings.manage');
            Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index'])->name('settings.index')->middleware('permission:settings.manage');
            Route::post('/settings', [\App\Http\Controllers\SettingController::class, 'update'])->name('settings.update')->middleware('permission:settings.manage');
            
            // Payment Methods
            Route::post('/payment-methods', [\App\Http\Controllers\PaymentMethodController::class, 'store'])->name('payment-methods.store')->middleware('permission:settings.manage');
            Route::put('/payment-methods/{paymentMethod}', [\App\Http\Controllers\PaymentMethodController::class, 'update'])->name('payment-methods.update')->middleware('permission:settings.manage');
            Route::delete('/payment-methods/{paymentMethod}', [\App\Http\Controllers\PaymentMethodController::class, 'destroy'])->name('payment-methods.destroy')->middleware('permission:settings.manage');
            Route::post('/payment-methods/{paymentMethod}/toggle-active', [\App\Http\Controllers\PaymentMethodController::class, 'toggleActive'])->name('payment-methods.toggle-active')->middleware('permission:settings.manage');
            Route::post('/payment-methods/{paymentMethod}/toggle-gateway', [\App\Http\Controllers\PaymentMethodController::class, 'toggleGateway'])->name('payment-methods.toggle-gateway')->middleware('permission:settings.manage');
        });

        // Billing
        Route::get('/billing', [\App\Http\Controllers\BillingController::class, 'index'])->name('billing.index');
        Route::post('/billing/upgrade', [\App\Http\Controllers\BillingController::class, 'upgrade'])->name('billing.upgrade');
        Route::post('/billing/{invoice}/upload-proof', [\App\Http\Controllers\BillingController::class, 'uploadPaymentProof'])->name('billing.upload-proof');

        // User Management & Roles
        Route::middleware('saas.feature:user-management')->group(function() {
            Route::resource('users', UserManagementController::class)->except(['show', 'create', 'edit'])->middleware('permission:users.manage');
            Route::patch('/users/{user}/toggle-active', [UserManagementController::class, 'toggleActive'])->name('users.toggle-active')->middleware('permission:users.manage');
            Route::resource('roles', RoleController::class)->except(['show', 'create', 'edit'])->middleware('permission:roles.manage');
        });

        // Profile
        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    });

    require __DIR__.'/auth.php';
});

Route::middleware([
    'api',
    InitializeTenancyBySubdomain::class,
    PreventAccessFromCentralDomains::class,
])->prefix('api')->group(function () {
    require __DIR__.'/api.php';
});
