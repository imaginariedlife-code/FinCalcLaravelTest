<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Portfolio extends Model
{
    protected $fillable = [
        'name',
        'settings'
    ];

    protected $casts = [
        'settings' => 'array'
    ];

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }

    public function liabilities()
    {
        return $this->hasMany(Liability::class);
    }
}
