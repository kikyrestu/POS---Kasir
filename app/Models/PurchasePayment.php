<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchasePayment extends Model
{
    protected $fillable = ['purchase_id', 'amount', 'method', 'payment_date', 'notes'];

    protected $casts = ['amount' => 'decimal:2', 'payment_date' => 'date'];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }
}
