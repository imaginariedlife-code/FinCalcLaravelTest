<?php

namespace App\Console\Commands;

use App\Models\HistoricalPrice;
use Illuminate\Console\Command;
use Carbon\Carbon;

class ImportImoexCsv extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'moex:import-csv {file=IMOEX.csv : Path to CSV file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import historical price data from IMOEX CSV file';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = base_path($this->argument('file'));

        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return Command::FAILURE;
        }

        $this->info("Importing data from: {$filePath}");

        $file = fopen($filePath, 'r');
        $headers = null;
        $data = [];
        $count = 0;

        while (($row = fgetcsv($file, 0, ';')) !== false) {
            // Skip header rows
            if (!$headers) {
                if (isset($row[0]) && $row[0] === 'BOARDID') {
                    $headers = $row;
                }
                continue;
            }

            // Map row to associative array
            $record = array_combine($headers, $row);

            // Extract relevant fields
            $ticker = $record['SECID'] ?? null;
            $tradeDateStr = $record['TRADEDATE'] ?? null;
            $close = $record['CLOSE'] ?? null;
            $open = $record['OPEN'] ?? null;
            $high = $record['HIGH'] ?? null;
            $low = $record['LOW'] ?? null;
            $volume = $record['VOLUME'] ?? null;
            $value = $record['VALUE'] ?? null;

            // Skip invalid rows
            if (!$ticker || !$tradeDateStr || !$close) {
                continue;
            }

            // Parse date (format: DD.MM.YYYY)
            try {
                $tradeDate = Carbon::createFromFormat('d.m.Y', $tradeDateStr)->format('Y-m-d');
            } catch (\Exception $e) {
                continue;
            }

            $data[] = [
                'ticker' => $ticker,
                'trade_date' => $tradeDate,
                'open' => $open ? str_replace(',', '.', $open) : null,
                'high' => $high ? str_replace(',', '.', $high) : null,
                'low' => $low ? str_replace(',', '.', $low) : null,
                'close' => str_replace(',', '.', $close),
                'volume' => $volume ?: null,
                'value' => $value ?: null,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $count++;

            // Batch insert every 500 records
            if (count($data) >= 500) {
                HistoricalPrice::upsert(
                    $data,
                    ['ticker', 'trade_date'],
                    ['open', 'high', 'low', 'close', 'volume', 'value', 'updated_at']
                );
                $this->info("Imported {$count} records...");
                $data = [];
            }
        }

        // Insert remaining records
        if (!empty($data)) {
            HistoricalPrice::upsert(
                $data,
                ['ticker', 'trade_date'],
                ['open', 'high', 'low', 'close', 'volume', 'value', 'updated_at']
            );
        }

        fclose($file);

        $this->info("✓ Import completed!");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total records imported', number_format($count)],
                ['File', $filePath],
            ]
        );

        return Command::SUCCESS;
    }
}
