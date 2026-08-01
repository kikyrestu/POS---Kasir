<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'saas_admin.auth' => \App\Http\Middleware\SaasAdminAuth::class,
            'saas.feature' => \App\Http\Middleware\CheckSaaSFeature::class,
        ]);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (\Stancl\Tenancy\Exceptions\TenantCouldNotBeIdentifiedByIdException|\Stancl\Tenancy\Exceptions\TenantCouldNotBeIdentifiedOnDomainException $e, $request) {
            return response()->view('errors.404', ['message' => 'Toko tidak ditemukan atau sudah dihapus.'], 404);
        });
    })->create();
