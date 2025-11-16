<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily MOEX data update - runs at 3:00 AM Moscow time (after market closes)
Schedule::command('moex:fetch-historical --from=-30days')
    ->dailyAt('03:00')
    ->timezone('Europe/Moscow')
    ->name('moex-daily-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->onSuccess(function () {
        info('MOEX daily data update completed successfully');
    })
    ->onFailure(function () {
        logger()->error('MOEX daily data update failed');
    });
