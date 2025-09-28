<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Liability extends Model
{
    protected $fillable = [
        'portfolio_id',
        'type',
        'name',
        'principal',
        'rate',
        'term'
    ];

    public function portfolio()
    {
        return $this->belongsTo(Portfolio::class);
    }
}
