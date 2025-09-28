<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PortfolioController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\LiabilityController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Portfolio routes
Route::apiResource('portfolios', PortfolioController::class);

// Portfolio-specific assets and liabilities
Route::get('portfolios/{portfolio}/assets', [AssetController::class, 'index']);
Route::post('portfolios/{portfolio}/assets', [AssetController::class, 'store']);
Route::get('portfolios/{portfolio}/liabilities', [LiabilityController::class, 'index']);
Route::post('portfolios/{portfolio}/liabilities', [LiabilityController::class, 'store']);

// Individual asset and liability routes
Route::apiResource('assets', AssetController::class)->except(['index', 'store']);
Route::apiResource('liabilities', LiabilityController::class)->except(['index', 'store']);