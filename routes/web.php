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
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // POS Kasir
    Route::get('/pos', [PosController::class, 'index'])->name('pos.index');
    Route::post('/pos', [PosController::class, 'store'])->name('pos.store');

    // Products
    Route::resource('products', ProductController::class);
    Route::get('/api/products/search', [ProductController::class, 'search'])->name('products.search');

    // Categories
    Route::resource('categories', CategoryController::class)->except(['show', 'create', 'edit']);

    // Customers
    Route::resource('customers', CustomerController::class)->except(['show', 'create', 'edit']);

    // Suppliers
    Route::resource('suppliers', SupplierController::class)->except(['show', 'create', 'edit']);

    // Warehouses
    Route::resource('warehouses', WarehouseController::class)->except(['create', 'edit']);

    // Sales
    Route::resource('sales', SaleController::class)->only(['index', 'show', 'destroy']);

    // Sale Returns
    Route::resource('sale-returns', SaleReturnController::class)->only(['index', 'create', 'store', 'show', 'destroy']);

    // Sale Tempo (Piutang)
    Route::get('/sales-tempo', [SaleTempoController::class, 'index'])->name('sales-tempo.index');
    Route::get('/sales-tempo/{sale}', [SaleTempoController::class, 'show'])->name('sales-tempo.show');
    Route::post('/sales-tempo/{sale}/payment', [SaleTempoController::class, 'addPayment'])->name('sales-tempo.add-payment');

    // Purchases
    Route::resource('purchases', PurchaseController::class)->except(['edit', 'update']);

    // Purchase Returns
    Route::resource('purchase-returns', PurchaseReturnController::class)->only(['index', 'create', 'store', 'show', 'destroy']);

    // Stock Transfers
    Route::resource('stock-transfers', StockTransferController::class)->only(['index', 'create', 'store', 'show', 'destroy']);

    // Barcodes
    Route::get('/barcodes', [BarcodeController::class, 'index'])->name('barcodes.index');

    // Reports
    Route::get('/reports/sales-by-invoice', [ReportController::class, 'salesByInvoice'])->name('reports.sales-by-invoice');
    Route::get('/reports/sales-by-item', [ReportController::class, 'salesByItem'])->name('reports.sales-by-item');
    Route::get('/reports/purchases-by-invoice', [ReportController::class, 'purchasesByInvoice'])->name('reports.purchases-by-invoice');

    // Settings
    Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
    Route::post('/settings', [SettingController::class, 'update'])->name('settings.update');

    // User Management
    Route::resource('users', UserManagementController::class)->except(['show', 'create', 'edit']);
    Route::patch('/users/{user}/toggle-active', [UserManagementController::class, 'toggleActive'])->name('users.toggle-active');

    // Roles
    Route::resource('roles', RoleController::class)->except(['show', 'create', 'edit']);

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
