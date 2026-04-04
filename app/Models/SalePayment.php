<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalePayment extends Model
{
    protected $fillable = ['sale_id', 'amount', 'method', 'payment_date', 'notes'];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
