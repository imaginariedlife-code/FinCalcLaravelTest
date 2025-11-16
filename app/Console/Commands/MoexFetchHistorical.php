<?php

namespace App\Console\Commands;

use App\Services\MoexDataService;
use Illuminate\Console\Command;

class MoexFetchHistorical extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'moex:fetch-historical
                            {ticker? : Ticker symbol (e.g., SBER, GAZP). Leave empty to fetch all}
                            {--from=2010-01-01 : Start date (YYYY-MM-DD)}
                            {--to= : End date (YYYY-MM-DD). Defaults to today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch historical price data from MOEX API and store in database';

    /**
     * Execute the console command.
     */
    public function handle(MoexDataService $moexService)
    {
        $ticker = $this->argument('ticker');
        $startDate = $this->option('from');
        $endDate = $this->option('to') ?: now()->format('Y-m-d');

        $this->info("Fetching MOEX historical data...");
        $this->info("Date range: {$startDate} to {$endDate}");
        $this->line('');

        // Get list of tickers to process
        $tickers = $ticker
            ? [$ticker]
            : array_keys(MoexDataService::INSTRUMENTS);

        $progressBar = $this->output->createProgressBar(count($tickers));
        $progressBar->start();

        $totalRecords = 0;

        foreach ($tickers as $tickerSymbol) {
            try {
                $count = $moexService->syncHistoricalData($tickerSymbol, $startDate, $endDate);
                $totalRecords += $count;

                $progressBar->advance();

            } catch (\Exception $e) {
                $this->newLine();
                $this->error("Failed to fetch data for {$tickerSymbol}: " . $e->getMessage());
                $progressBar->advance();
            }
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->info("✓ Completed!");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Tickers processed', count($tickers)],
                ['Total records', number_format($totalRecords)],
                ['Date range', "{$startDate} to {$endDate}"],
            ]
        );

        return Command::SUCCESS;
    }
}
