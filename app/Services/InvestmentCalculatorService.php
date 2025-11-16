<?php

namespace App\Services;

use App\Models\HistoricalPrice;
use App\Models\DepositRate;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InvestmentCalculatorService
{
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
        // Fetch historical prices
        $prices = HistoricalPrice::forTicker($ticker)
            ->betweenDates($startDate, $endDate)
            ->orderByDate('asc')
            ->get();

        if ($prices->isEmpty()) {
            throw new \Exception("No historical data found for {$ticker} in the specified date range");
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

        foreach ($periods as $period) {
            $lowestPrice = $period->min('low');
            $sharesBought = $amount / $lowestPrice;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            $purchases[] = [
                'date' => $period->where('low', $lowestPrice)->first()->trade_date->format('Y-m-d'),
                'price' => $lowestPrice,
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
            ];
        }

        $finalPrice = $periods[count($periods) - 1]->last()->close;
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

        foreach ($periods as $period) {
            $firstDay = $period->first();
            $price = $firstDay->open ?? $firstDay->close;
            $sharesBought = $amount / $price;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            $purchases[] = [
                'date' => $firstDay->trade_date->format('Y-m-d'),
                'price' => $price,
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
            ];
        }

        $finalPrice = $periods[count($periods) - 1]->last()->close;
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

        foreach ($periods as $period) {
            // Use average price for the period (simulating regular purchases)
            $avgPrice = $period->avg('close');
            $sharesBought = $amount / $avgPrice;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            $purchases[] = [
                'date' => $period->last()->trade_date->format('Y-m-d'),
                'price' => round($avgPrice, 2),
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
                'note' => 'Average price for period',
            ];
        }

        $finalPrice = $periods[count($periods) - 1]->last()->close;
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

        foreach ($periods as $period) {
            $highestPrice = $period->max('high');
            $sharesBought = $amount / $highestPrice;

            $totalShares += $sharesBought;
            $totalInvested += $amount;

            $purchases[] = [
                'date' => $period->where('high', $highestPrice)->first()->trade_date->format('Y-m-d'),
                'price' => $highestPrice,
                'shares' => round($sharesBought, 4),
                'invested' => $amount,
            ];
        }

        $finalPrice = $periods[count($periods) - 1]->last()->close;
        $finalValue = $totalShares * $finalPrice;

        return $this->formatResult($totalInvested, $finalValue, $totalShares, $purchases);
    }

    /**
     * Strategy 5: Bank Deposit - compound interest calculation
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

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        // Calculate by year, applying respective deposit rates
        for ($i = 0; $i < $periods; $i++) {
            $currentDate = $start->copy()->addMonths($i);
            $year = $currentDate->year;

            // Get deposit rate for this year
            $rate = DepositRate::getRateForYear($year) ?? 7.0; // Default 7% if not found
            $monthlyRate = $rate / 100 / 12;

            // Add new deposit
            $balance += $amount;

            // Apply monthly compound interest for one month
            $balance *= (1 + $monthlyRate);

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
