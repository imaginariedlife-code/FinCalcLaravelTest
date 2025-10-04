<?php

use Illuminate\Support\Facades\Route;

// Main landing page
Route::get('/', function () {
    return response()->file(public_path('index.html'));
});

// FinCalc application
Route::get('/FinCalc', function () {
    return response()->file(public_path('FinCalc/index.html'));
});
