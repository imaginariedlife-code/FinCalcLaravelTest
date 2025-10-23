<?php

use Illuminate\Support\Facades\Route;

// Main landing page
Route::get('/', function () {
    return response()->file(public_path('index.html'));
});

// Case-insensitive routing helper
Route::get('/{app}', function ($app) {
    $appLower = strtolower($app);

    // FinCalc application (case-insensitive)
    if ($appLower === 'fincalc') {
        return response()->file(public_path('FinCalc/index.html'));
    }

    // FinTest - Mobile financial calculator (case-insensitive)
    if ($appLower === 'fintest') {
        return response()->file(public_path('FinTest/index.html'));
    }

    abort(404);
})->where('app', '[a-zA-Z]+');
