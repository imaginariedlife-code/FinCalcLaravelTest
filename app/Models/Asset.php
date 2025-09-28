<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    protected $fillable = [
        'portfolio_id',
        'type',
        'name',
        'value'
    ];

    public function portfolio()
    {
        return $this->belongsTo(Portfolio::class);
    }
}
