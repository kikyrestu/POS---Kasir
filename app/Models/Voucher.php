<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'code',
        'name',
        'type',
        'amount',
        'valid_from',
        'valid_until',
        'max_uses',
        'used_count',
        'min_purchase',
        'is_active',
    ];

    protected $casts = [
        'valid_from' => 'date',
        'valid_until' => 'date',
        'is_active' => 'boolean',
        'amount' => 'decimal:2',
        'min_purchase' => 'decimal:2',
    ];

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
