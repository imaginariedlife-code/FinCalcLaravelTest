<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InvestmentCalculatorService;
use App\Services\MoexDataService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InvestmentCalculatorController extends Controller
{
    public function __construct(
        private InvestmentCalculatorService $calculatorService,
        private MoexDataService $moexService
    ) {}

    /**
     * Get list of available instruments
     *
     * GET /api/investment/instruments
     */
    public function instruments()
    {
        return response()->json([
            'instruments' => $this->moexService->getAvailableInstruments(),
        ]);
    }

    /**
     * Calculate investment strategies
     *
     * POST /api/investment/calculate
     * Body: {
     *   "ticker": "IMOEX",
     *   "amount": 10000,
     *   "frequency": "monthly",
     *   "start_date": "2020-01-01",
     *   "end_date": "2024-12-31"
     * }
     */
    public function calculate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ticker' => 'required|string|max:20',
            'amount' => 'required|numeric|min:1',
            'frequency' => 'required|in:monthly,quarterly,yearly',
            'start_date' => 'required|date|before:end_date',
            'end_date' => 'required|date|after:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->calculatorService->calculateAllStrategies(
                $request->ticker,
                $request->amount,
                $request->frequency,
                $request->start_date,
                $request->end_date
            );

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Calculation failed',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Compare multiple instruments using DCA strategy
     *
     * POST /api/investment/compare
     * Body: {
     *   "tickers": ["SBER", "GAZP", "IMOEX"],
     *   "amount": 10000,
     *   "frequency": "monthly",
     *   "start_date": "2020-01-01",
     *   "end_date": "2024-12-31"
     * }
     */
    public function compare(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tickers' => 'required|array|min:1|max:5',
            'tickers.*' => 'required|string|max:20',
            'amount' => 'required|numeric|min:1',
            'frequency' => 'required|in:monthly,quarterly,yearly',
            'start_date' => 'required|date|before:end_date',
            'end_date' => 'required|date|after:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            $results = [];

            foreach ($request->tickers as $ticker) {
                try {
                    $result = $this->calculatorService->calculateAllStrategies(
                        $ticker,
                        $request->amount,
                        $request->frequency,
                        $request->start_date,
                        $request->end_date
                    );

                    $results[$ticker] = [
                        'name' => MoexDataService::INSTRUMENTS[$ticker] ?? $ticker,
                        'dca' => $result['dca'],
                        'metadata' => $result['metadata'],
                    ];

                } catch (\Exception $e) {
                    $results[$ticker] = [
                        'name' => MoexDataService::INSTRUMENTS[$ticker] ?? $ticker,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            return response()->json([
                'comparison' => $results,
                'parameters' => [
                    'amount' => $request->amount,
                    'frequency' => $request->frequency,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Comparison failed',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
