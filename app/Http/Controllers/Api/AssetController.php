<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Portfolio;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Portfolio $portfolio)
    {
        return $portfolio->assets;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, Portfolio $portfolio)
    {
        $request->validate([
            'type' => 'required|string',
            'name' => 'required|string|max:255',
            'value' => 'required|numeric|min:0'
        ]);

        return $portfolio->assets()->create($request->all());
    }

    /**
     * Display the specified resource.
     */
    public function show(Asset $asset)
    {
        return $asset;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Asset $asset)
    {
        $request->validate([
            'type' => 'string',
            'name' => 'string|max:255',
            'value' => 'numeric|min:0'
        ]);

        $asset->update($request->all());
        return $asset;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Asset $asset)
    {
        $asset->delete();
        return response()->json(['message' => 'Asset deleted successfully']);
    }
}
