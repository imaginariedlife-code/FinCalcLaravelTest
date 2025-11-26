<?php

namespace App\Services;

use App\Models\HistoricalPrice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MoexDataService
{
    private const MOEX_API_BASE = 'https://iss.moex.com/iss';
    private const BATCH_SIZE = 100; // MOEX API pagination limit

    /**
     * Available instruments for trading
     */
    public const INSTRUMENTS = [
        'SBER' => 'Сбербанк',
        'GAZP' => 'Газпром',
        'LKOH' => 'Лукойл',
        'YNDX' => 'Яндекс',
        'MOEX' => 'Московская биржа',
        'IMOEX' => 'Индекс МосБиржи',
        'MCFTR' => 'Индекс полной доходности',
    ];

    /**
     * Fetch historical data for a ticker from MOEX API
     *
     * @param string $ticker
     * @param string $startDate Format: YYYY-MM-DD
     * @param string $endDate Format: YYYY-MM-DD
     * @return array
     */
    public function fetchHistoricalData(string $ticker, string $startDate, string $endDate): array
    {
        $allData = [];
        $start = 0;

        // Determine market and board based on ticker
        $market = 'shares';
        $board = 'TQBR'; // Default: main board for stocks

        if ($ticker === 'IMOEX') {
            $market = 'index';
            $board = 'SNDX'; // IMOEX on Stock Index board
        } elseif ($ticker === 'MCFTR') {
            $market = 'index';
            $board = 'RTSI'; // MCFTR on RTS Index board
        }

        do {
            $url = sprintf(
                '%s/history/engines/stock/markets/%s/boards/%s/securities/%s.json',
                self::MOEX_API_BASE,
                $market,
                $board,
                $ticker
            );

            try {
                $response = Http::timeout(30)->get($url, [
                    'from' => $startDate,
                    'till' => $endDate,
                    'start' => $start,
                ]);

                if (!$response->successful()) {
                    Log::error("MOEX API request failed for {$ticker}", [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    break;
                }

                $data = $response->json();

                // MOEX API returns data in a specific structure
                if (!isset($data['history']['data']) || empty($data['history']['data'])) {
                    break;
                }

                $columns = $data['history']['columns'] ?? [];
                $rows = $data['history']['data'];

                // Map column names to indices
                $columnMap = array_flip($columns);

                foreach ($rows as $row) {
                    // Only process rows with valid data
                    if (isset($row[$columnMap['CLOSE']]) && $row[$columnMap['CLOSE']] !== null) {
                        $allData[] = [
                            'ticker' => $ticker,
                            'trade_date' => $row[$columnMap['TRADEDATE']] ?? null,
                            'open' => $row[$columnMap['OPEN']] ?? null,
                            'high' => $row[$columnMap['HIGH']] ?? null,
                            'low' => $row[$columnMap['LOW']] ?? null,
                            'close' => $row[$columnMap['CLOSE']],
                            'volume' => $row[$columnMap['VOLUME']] ?? null,
                            'value' => $row[$columnMap['VALUE']] ?? null,
                        ];
                    }
                }

                // Check if there are more results
                $cursor = $data['history.cursor']['data'][0] ?? [];
                $cursorColumns = $data['history.cursor']['columns'] ?? [];
                $cursorMap = array_flip($cursorColumns);

                $totalRecords = $cursor[$cursorMap['TOTAL']] ?? 0;
                $pageSize = $cursor[$cursorMap['PAGESIZE']] ?? self::BATCH_SIZE;

                $start += $pageSize;

                // Break if we've fetched all data
                if ($start >= $totalRecords) {
                    break;
                }

                // Be nice to the API - small delay between requests
                usleep(250000); // 250ms

            } catch (\Exception $e) {
                Log::error("Error fetching MOEX data for {$ticker}", [
                    'error' => $e->getMessage(),
                    'start' => $start
                ]);
                break;
            }

        } while (true);

        return $allData;
    }

    /**
     * Save historical data to database (upsert)
     *
     * @param array $data
     * @return int Number of records inserted/updated
     */
    public function saveHistoricalData(array $data): int
    {
        if (empty($data)) {
            return 0;
        }

        // Add timestamps to each record
        $now = Carbon::now();
        foreach ($data as &$record) {
            $record['created_at'] = $now;
            $record['updated_at'] = $now;
        }

        // Upsert data (insert new, update existing based on ticker + trade_date)
        HistoricalPrice::upsert(
            $data,
            ['ticker', 'trade_date'], // Unique keys
            ['open', 'high', 'low', 'close', 'volume', 'value', 'updated_at'] // Columns to update
        );

        return count($data);
    }

    /**
     * Fetch and save historical data for a ticker
     *
     * @param string $ticker
     * @param string $startDate
     * @param string $endDate
     * @return int Number of records saved
     */
    public function syncHistoricalData(string $ticker, string $startDate, string $endDate): int
    {
        Log::info("Syncing historical data for {$ticker} from {$startDate} to {$endDate}");

        $data = $this->fetchHistoricalData($ticker, $startDate, $endDate);
        $count = $this->saveHistoricalData($data);

        Log::info("Synced {$count} records for {$ticker}");

        return $count;
    }

    /**
     * Get list of available instruments
     *
     * @return array
     */
    public function getAvailableInstruments(): array
    {
        return collect(self::INSTRUMENTS)->map(function ($name, $ticker) {
            $latestPrice = HistoricalPrice::forTicker($ticker)
                ->orderByDate('desc')
                ->first();

            $earliestPrice = HistoricalPrice::forTicker($ticker)
                ->orderByDate('asc')
                ->first();

            return [
                'ticker' => $ticker,
                'name' => $name,
                'last_updated' => $latestPrice?->trade_date?->format('Y-m-d'),
                'last_price' => $latestPrice?->close,
                'min_date' => $earliestPrice?->trade_date?->format('Y-m-d'),
                'max_date' => $latestPrice?->trade_date?->format('Y-m-d'),
            ];
        })->values()->toArray();
    }

    /**
     * Get historical prices for a ticker within date range
     *
     * @param string $ticker
     * @param string $startDate
     * @param string $endDate
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getHistoricalPrices(string $ticker, string $startDate, string $endDate)
    {
        return HistoricalPrice::forTicker($ticker)
            ->betweenDates($startDate, $endDate)
            ->orderByDate('asc')
            ->get();
    }
}
