<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Portfolio;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Portfolio::with(['assets', 'liabilities'])->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'settings' => 'required|array'
        ]);

        return Portfolio::create($request->all());
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Portfolio::with(['assets', 'liabilities'])->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $portfolio = Portfolio::findOrFail($id);

        $request->validate([
            'name' => 'string|max:255',
            'settings' => 'array'
        ]);

        $portfolio->update($request->all());
        return $portfolio;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $portfolio = Portfolio::findOrFail($id);
        $portfolio->delete();
        return response()->json(['message' => 'Portfolio deleted successfully']);
    }
}
