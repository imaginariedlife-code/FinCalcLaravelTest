<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Liability;
use App\Models\Portfolio;
use Illuminate\Http\Request;

class LiabilityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Portfolio $portfolio)
    {
        return $portfolio->liabilities;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, Portfolio $portfolio)
    {
        $request->validate([
            'type' => 'required|string',
            'name' => 'required|string|max:255',
            'principal' => 'required|numeric|min:0',
            'rate' => 'required|numeric|min:0',
            'term' => 'required|integer|min:1'
        ]);

        return $portfolio->liabilities()->create($request->all());
    }

    /**
     * Display the specified resource.
     */
    public function show(Liability $liability)
    {
        return $liability;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Liability $liability)
    {
        $request->validate([
            'type' => 'string',
            'name' => 'string|max:255',
            'principal' => 'numeric|min:0',
            'rate' => 'numeric|min:0',
            'term' => 'integer|min:1'
        ]);

        $liability->update($request->all());
        return $liability;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Liability $liability)
    {
        $liability->delete();
        return response()->json(['message' => 'Liability deleted successfully']);
    }
}
