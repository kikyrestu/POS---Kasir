<?php

use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes (Central Domain)
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

use App\Http\Controllers\SaasAdmin\AuthController;
use App\Http\Controllers\SaasAdmin\DashboardController;
use App\Http\Controllers\SaasAdmin\TenantController;
use App\Http\Controllers\SaasAdmin\FeatureController;
use App\Http\Controllers\TenantRegistrationController;

Route::get('/', function () {
    return 'Welcome to NEXAPOS Central System. The central domain is working.';
});

Route::post('/webhooks/midtrans', [WebhookController::class, 'midtrans'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class]);

Route::get('/register-store', [TenantRegistrationController::class, 'create'])->name('tenant.register.create');
Route::post('/register-store', [TenantRegistrationController::class, 'store'])->name('tenant.register.store');

$adminDomain = env('ADMIN_DOMAIN', 'adminkita.' . env('CENTRAL_DOMAIN', 'nexapos.localhost'));

Route::domain($adminDomain)->name('admin.')->group(function () {
    Route::get('login', [AuthController::class, 'showLoginForm'])->name('login');
    Route::post('login', [AuthController::class, 'login']);
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    Route::middleware('saas_admin.auth')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::resource('/tenants', TenantController::class)->except(['show', 'edit', 'update']);
        Route::get('/features', [FeatureController::class, 'index'])->name('features.index');
        Route::post('/features/toggle', [FeatureController::class, 'toggle'])->name('features.toggle');
        Route::resource('/plans', \App\Http\Controllers\SaasAdmin\PlanController::class);
        Route::resource('/subscriptions', \App\Http\Controllers\SaasAdmin\SubscriptionController::class)->only(['index', 'show']);
        Route::post('/subscriptions/{id}/approve', [\App\Http\Controllers\SaasAdmin\SubscriptionController::class, 'approve'])->name('subscriptions.approve');
        Route::post('/subscriptions/{id}/reject', [\App\Http\Controllers\SaasAdmin\SubscriptionController::class, 'reject'])->name('subscriptions.reject');
        
        Route::get('/broadcast', [\App\Http\Controllers\SaasAdmin\BroadcastController::class, 'index'])->name('broadcast.index');
        Route::post('/broadcast', [\App\Http\Controllers\SaasAdmin\BroadcastController::class, 'store'])->name('broadcast.store');
        
        Route::get('/settings', [\App\Http\Controllers\SaasAdmin\SettingController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\SaasAdmin\SettingController::class, 'store'])->name('settings.store');
    });
});
