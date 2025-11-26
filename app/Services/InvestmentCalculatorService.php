<?php

namespace App\Services;

use App\Models\HistoricalPrice;
use App\Models\DepositRate;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class InvestmentCalculatorService
{
    public function __construct(
        private MoexDataService $moexService
    ) {}

    /**
     * Calculate all 5 investment strategies
     *
     * @param string $ticker
     * @param float $amount Amount to invest per period
     * @param string $frequency 'monthly', 'quarterly', 'yearly'
     * @param string $startDate
     * @param string $endDate
     * @return array
     */
    public function calculateAllStrategies(
        string $ticker,
        float $amount,
        string $frequency,
        string $startDate,
        string $endDate
    ): array {
        // Check if we have data for this ticker and date range
        $prices = HistoricalPrice::forTicker($ticker)
            ->betweenDates($startDate, $endDate)
            ->orderByDate('asc')
            ->get();

        // If no data or insufficient data, try to fetch from MOEX API
        if ($prices->isEmpty() || $this->needsDataUpdate($prices, $startDate, $endDate)) {
            Log::info("Fetching missing data for {$ticker} from {$startDate} to {$endDate}");

            try {
                $this->moexService->syncHistoricalData($ticker, $startDate, $endDate);

                // Refetch after sync
                $prices = HistoricalPrice::forTicker($ticker)
                    ->betweenDates($startDate, $endDate)
                    ->orderByDate('asc')
                    ->get();

                if ($prices->isEmpty()) {
                    throw new \Exception("Не удалось загрузить данные для {$ticker} за указанный период. Возможно, инструмент не торговался в эти даты или API недоступен.");
                }

                Log::info("Successfully fetched {$prices->count()} records for {$ticker}");
            } catch (\Exception $e) {
                Log::error("Failed to fetch data for {$ticker}: " . $e->getMessage());
                throw new \Exception("Ошибка загрузки данных для {$ticker}: " . $e->getMessage());
            }
        }

        // Group prices by investment periods
        $periods = $this->groupPricesByPeriod($prices, $frequency);

        return [
            'perfect_timing' => $this->calculatePerfectTiming($periods, $amount),
            'first_day' => $this->calculateFirstDay($periods, $amount),
            'dca' => $this->calculateDCA($periods, $amount),
            'worst_timing' => $this->calculateWorstTiming($periods, $amount),
            'deposit' => $this->calculateDeposit($amount, count($periods), $startDate, $endDate),
            'metadata' => [
                'ticker' => $ticker,
                'amount_per_period' => $amount,
                'frequency' => $frequency,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'total_periods' => count($periods),
                'current_price' => $prices->last()->close,
            ],
            'historical_prices' => $prices->map(function ($price) {
                return [
                    'date' => $price->trade_date->format('Y-m-d'),
                    'close' => (float) $price->close,
                    'high' => (float) $price->high,
                    'low' => (float) $price->low,
                ];
            })->values()->toArray(),
            'price_metrics' => [
                'start_price' => (float) $prices->first()->close,
                'end_price' => (float) $prices->last()->close,
                // Use 'low' for min, fallback to 'close' if low is 0 or null
                'min_price' => (float) ($prices->min('low') > 0 ? $prices->min('low') : $prices->min('close')),
                // Use 'high' for max, fallback to 'close' if high is 0 or null
                'max_price' => (float) ($prices->max('high') > 0 ? $prices->max('high') : $prices->max('close')),
                'change_absolute' => (float) ($prices->last()->close - $prices->first()->close),
                'change_percentage' => round((($prices->last()->close - $prices->first()->close) / $prices->first()->close) * 100, 2),
            ],
        ];
    }

    /**
     * Strategy 1: Perfect Timing - buy at the lowest price of each period
     */
    private function calculatePerfectTiming(array $periods, float $amount): array
    {
        $totalShares = 0;
        $totalInvested = 0;
        $purchases = [];
        $finalPrice = $periods[count($periods) - 1]->last()->close;

        foreach ($periods as $period) {
            // Use 'low' price, but fallback to 'close' if low is 0 or null
            $lowestPrice = $period->min('low');
            if ($lowestPrice <= 0) {
                $lowestPrice = $period->min('close');
            }

            $sharesBought = $amount / $lowestPrice;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            // Find the date with lowest price
            $targetRecord = $period->where('low', $lowestPrice)->first();
            if (!$targetRecord) {
                $targetRecord = $period->where('close', $lowestPrice)->first();
            }

            $purchases[] = [
                'date' => $targetRecord->trade_date->format('Y-m-d'),
                'price' => $lowestPrice,
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
                'current_value' => round($totalShares * $finalPrice, 2),
            ];
        }

        $finalValue = $totalShares * $finalPrice;

        return $this->formatResult($totalInvested, $finalValue, $totalShares, $purchases);
    }

    /**
     * Strategy 2: First Day - buy on the first trading day of each period
     */
    private function calculateFirstDay(array $periods, float $amount): array
    {
        $totalShares = 0;
        $totalInvested = 0;
        $purchases = [];
        $finalPrice = $periods[count($periods) - 1]->last()->close;

        foreach ($periods as $period) {
            $firstDay = $period->first();
            // Use open price, fallback to close if open is 0 or null
            $price = ($firstDay->open > 0) ? $firstDay->open : $firstDay->close;

            // Safety check: if price is still 0, skip this period
            if ($price <= 0) {
                continue;
            }

            $sharesBought = $amount / $price;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            $purchases[] = [
                'date' => $firstDay->trade_date->format('Y-m-d'),
                'price' => $price,
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
                'current_value' => round($totalShares * $finalPrice, 2),
            ];
        }

        $finalValue = $totalShares * $finalPrice;

        return $this->formatResult($totalInvested, $finalValue, $totalShares, $purchases);
    }

    /**
     * Strategy 3: DCA (Dollar Cost Averaging) - regular purchases throughout the period
     */
    private function calculateDCA(array $periods, float $amount): array
    {
        $totalShares = 0;
        $totalInvested = 0;
        $purchases = [];
        $finalPrice = $periods[count($periods) - 1]->last()->close;

        foreach ($periods as $period) {
            // Use average price for the period (simulating regular purchases)
            $avgPrice = $period->avg('close');

            // Safety check: if avgPrice is 0, skip this period
            if ($avgPrice <= 0) {
                continue;
            }

            $sharesBought = $amount / $avgPrice;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            $purchases[] = [
                'date' => $period->last()->trade_date->format('Y-m-d'),
                'price' => round($avgPrice, 2),
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
                'current_value' => round($totalShares * $finalPrice, 2),
                'note' => 'Average price for period',
            ];
        }

        $finalValue = $totalShares * $finalPrice;

        return $this->formatResult($totalInvested, $finalValue, $totalShares, $purchases);
    }

    /**
     * Strategy 4: Worst Timing - buy at the highest price of each period
     */
    private function calculateWorstTiming(array $periods, float $amount): array
    {
        $totalShares = 0;
        $totalInvested = 0;
        $purchases = [];
        $finalPrice = $periods[count($periods) - 1]->last()->close;

        foreach ($periods as $period) {
            // Use 'high' price, but fallback to 'close' if high is 0 or null
            $highestPrice = $period->max('high');
            if ($highestPrice <= 0) {
                $highestPrice = $period->max('close');
            }

            $sharesBought = $amount / $highestPrice;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            // Find the date with highest price
            $targetRecord = $period->where('high', $highestPrice)->first();
            if (!$targetRecord) {
                $targetRecord = $period->where('close', $highestPrice)->first();
            }

            $purchases[] = [
                'date' => $targetRecord->trade_date->format('Y-m-d'),
                'price' => $highestPrice,
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
                'current_value' => round($totalShares * $finalPrice, 2),
            ];
        }

        $finalValue = $totalShares * $finalPrice;

        return $this->formatResult($totalInvested, $finalValue, $totalShares, $purchases);
    }

    /**
     * Strategy 5: Bank Deposit - compound interest calculation with ANNUAL capitalization
     */
    private function calculateDeposit(
        float $amount,
        int $periods,
        string $startDate,
        string $endDate
    ): array {
        $totalInvested = $amount * $periods;
        $balance = 0;
        $deposits = [];
        $accruedInterest = 0; // Interest accumulated during the year

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        // Calculate with annual capitalization (realistic for bank deposits)
        for ($i = 0; $i < $periods; $i++) {
            $currentDate = $start->copy()->addMonths($i);
            $year = $currentDate->year;
            $isDecember = $currentDate->month === 12;
            $isLastPeriod = $i === $periods - 1;

            // Get deposit rate for this year
            $rate = DepositRate::getRateForYear($year) ?? 7.0; // Default 7% if not found
            $monthlyRate = $rate / 100 / 12;

            // Accrue interest on OLD balance FIRST (before adding new deposit)
            // This is realistic: money deposited today starts earning interest next month
            $monthlyInterest = $balance * $monthlyRate;
            $accruedInterest += $monthlyInterest;

            // THEN add new deposit
            $balance += $amount;

            // Capitalize interest at year-end (December) or at the end of period
            if ($isDecember || $isLastPeriod) {
                $balance += $accruedInterest;
                $accruedInterest = 0; // Reset for next year
            }

            $deposits[] = [
                'date' => $currentDate->format('Y-m-d'),
                'deposit' => $amount,
                'rate' => $rate,
                'balance' => round($balance, 2),
            ];
        }

        $finalValue = $balance;

        return [
            'total_invested' => $totalInvested,
            'final_value' => round($finalValue, 2),
            'absolute_return' => round($finalValue - $totalInvested, 2),
            'percentage_return' => round((($finalValue - $totalInvested) / $totalInvested) * 100, 2),
            'cagr' => $this->calculateCAGR($totalInvested, $finalValue, $start, $end),
            'deposits' => $deposits,
        ];
    }

    /**
     * Group historical prices by investment period
     */
    private function groupPricesByPeriod(Collection $prices, string $frequency): array
    {
        $periods = [];
        $currentPeriod = collect();
        $lastDate = null;

        foreach ($prices as $price) {
            $date = $price->trade_date;

            if ($lastDate === null) {
                $currentPeriod->push($price);
                $lastDate = $date;
                continue;
            }

            // Determine if we should start a new period
            $startNewPeriod = false;

            switch ($frequency) {
                case 'monthly':
                    $startNewPeriod = $date->month !== $lastDate->month;
                    break;
                case 'quarterly':
                    $startNewPeriod = $date->quarter !== $lastDate->quarter;
                    break;
                case 'yearly':
                    $startNewPeriod = $date->year !== $lastDate->year;
                    break;
            }

            if ($startNewPeriod) {
                if ($currentPeriod->isNotEmpty()) {
                    $periods[] = $currentPeriod;
                }
                $currentPeriod = collect();
            }

            $currentPeriod->push($price);
            $lastDate = $date;
        }

        // Add the last period
        if ($currentPeriod->isNotEmpty()) {
            $periods[] = $currentPeriod;
        }

        return $periods;
    }

    /**
     * Check if we need to update data (missing dates or gaps)
     */
    private function needsDataUpdate(Collection $prices, string $startDate, string $endDate): bool
    {
        if ($prices->isEmpty()) {
            return true;
        }

        $requestedStart = Carbon::parse($startDate);
        $requestedEnd = Carbon::parse($endDate);

        $actualStart = $prices->first()->trade_date;
        $actualEnd = $prices->last()->trade_date;

        // Check if we have data for the requested range (with 30 days tolerance for market holidays)
        $startDiff = abs($actualStart->diffInDays($requestedStart));
        $endDiff = abs($actualEnd->diffInDays($requestedEnd));

        // If start or end dates are significantly different (> 30 days), we need more data
        if ($startDiff > 30 || $endDiff > 30) {
            Log::info("Data range mismatch", [
                'requested' => "{$startDate} to {$endDate}",
                'actual' => "{$actualStart->format('Y-m-d')} to {$actualEnd->format('Y-m-d')}",
                'start_diff' => $startDiff,
                'end_diff' => $endDiff,
            ]);
            return true;
        }

        // Check for large gaps in data (more than 60 days between consecutive records)
        $previousDate = null;
        foreach ($prices as $price) {
            if ($previousDate !== null) {
                $gap = $previousDate->diffInDays($price->trade_date);
                if ($gap > 60) {
                    Log::info("Large gap found in data", [
                        'gap_days' => $gap,
                        'between' => "{$previousDate->format('Y-m-d')} and {$price->trade_date->format('Y-m-d')}",
                    ]);
                    return true;
                }
            }
            $previousDate = $price->trade_date;
        }

        return false;
    }

    /**
     * Calculate CAGR (Compound Annual Growth Rate)
     */
    private function calculateCAGR(
        float $initialValue,
        float $finalValue,
        Carbon $startDate,
        Carbon $endDate
    ): float {
        $years = $startDate->diffInDays($endDate) / 365.25;

        if ($years <= 0 || $initialValue <= 0) {
            return 0;
        }

        $cagr = (pow(($finalValue / $initialValue), (1 / $years)) - 1) * 100;

        return round($cagr, 2);
    }

    /**
     * Format result for a strategy
     */
    private function formatResult(
        float $totalInvested,
        float $finalValue,
        float $totalShares,
        array $purchases
    ): array {
        return [
            'total_invested' => round($totalInvested, 2),
            'final_value' => round($finalValue, 2),
            'total_shares' => round($totalShares, 4),
            'absolute_return' => round($finalValue - $totalInvested, 2),
            'percentage_return' => round((($finalValue - $totalInvested) / $totalInvested) * 100, 2),
            'cagr' => $this->calculateCAGR(
                $totalInvested,
                $finalValue,
                Carbon::parse($purchases[0]['date']),
                Carbon::parse($purchases[count($purchases) - 1]['date'])
            ),
            'purchases' => $purchases,
        ];
    }
}
