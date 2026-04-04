<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseReturn extends Model
{
    protected $fillable = [
        'return_number', 'purchase_id', 'user_id', 'return_date', 'total', 'notes',
    ];

    protected $casts = [
        'return_date' => 'date',
        'total' => 'decimal:2',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(PurchaseReturnDetail::class);
    }

    public static function generateReturnNumber(): string
    {
        $today = now()->format('Ymd');
        $last = static::where('return_number', 'like', "RTB{$today}%")->orderBy('return_number', 'desc')->first();
        $seq = $last ? (int) substr($last->return_number, -4) + 1 : 1;
        return 'RTB' . $today . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
