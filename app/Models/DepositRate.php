<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepositRate extends Model
{
    protected $primaryKey = 'year';
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'year',
        'rate',
    ];

    protected $casts = [
        'year' => 'integer',
        'rate' => 'decimal:2',
    ];

    /**
     * Get rate for a specific year
     */
    public static function getRateForYear(int $year): ?float
    {
        $depositRate = self::find($year);
        return $depositRate ? (float) $depositRate->rate : null;
    }

    /**
     * Get rate for a date, fallback to nearest year
     */
    public static function getRateForDate($date): ?float
    {
        $year = is_string($date) ? (int) date('Y', strtotime($date)) : $date->year;
        return self::getRateForYear($year);
    }
}
