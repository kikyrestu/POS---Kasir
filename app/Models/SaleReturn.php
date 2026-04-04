<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaleReturn extends Model
{
    protected $fillable = ['return_number', 'sale_id', 'user_id', 'return_date', 'total', 'notes'];

    protected $casts = ['return_date' => 'date', 'total' => 'decimal:2'];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(SaleReturnDetail::class);
    }

    public static function generateReturnNumber(): string
    {
        $prefix = 'RTJ' . date('Ymd');
        $last = static::where('return_number', 'like', $prefix . '%')
            ->orderByDesc('return_number')
            ->first();
        $seq = $last ? (int) substr($last->return_number, -4) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
