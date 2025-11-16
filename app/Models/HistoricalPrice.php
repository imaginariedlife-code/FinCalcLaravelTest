<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistoricalPrice extends Model
{
    protected $fillable = [
        'ticker',
        'trade_date',
        'open',
        'high',
        'low',
        'close',
        'volume',
        'value',
    ];

    protected $casts = [
        'trade_date' => 'date',
        'open' => 'decimal:4',
        'high' => 'decimal:4',
        'low' => 'decimal:4',
        'close' => 'decimal:4',
        'volume' => 'integer',
        'value' => 'decimal:2',
    ];

    /**
     * Scope to filter by ticker
     */
    public function scopeForTicker($query, string $ticker)
    {
        return $query->where('ticker', $ticker);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('trade_date', [$startDate, $endDate]);
    }

    /**
     * Scope to order by trade date
     */
    public function scopeOrderByDate($query, $direction = 'asc')
    {
        return $query->orderBy('trade_date', $direction);
    }
}
