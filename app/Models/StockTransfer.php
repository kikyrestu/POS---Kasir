<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransfer extends Model
{
    protected $fillable = [
        'transfer_number', 'from_warehouse_id', 'to_warehouse_id',
        'user_id', 'transfer_date', 'status', 'notes',
    ];

    protected $casts = ['transfer_date' => 'date'];

    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'from_warehouse_id');
    }

    public function toWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'to_warehouse_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(StockTransferDetail::class);
    }

    public static function generateTransferNumber(): string
    {
        $prefix = 'TRF' . date('Ymd');
        $last = static::where('transfer_number', 'like', $prefix . '%')
            ->orderByDesc('transfer_number')
            ->first();
        $seq = $last ? (int) substr($last->transfer_number, -4) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
