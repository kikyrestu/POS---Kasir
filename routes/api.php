<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PosApiController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (Butuh Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // POS Routes
    Route::get('/products', [PosApiController::class, 'getProducts']);
    Route::get('/categories', [PosApiController::class, 'getCategories']);
    Route::post('/transactions', [PosApiController::class, 'storeTransaction']);
});
