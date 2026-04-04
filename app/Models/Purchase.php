<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    protected $fillable = [
        'invoice_number', 'supplier_id', 'warehouse_id', 'user_id',
        'purchase_date', 'due_date', 'subtotal', 'discount', 'tax',
        'total', 'paid', 'payment_status', 'status', 'notes',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'paid' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(PurchaseDetail::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PurchasePayment::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class);
    }

    public static function generateInvoiceNumber(): string
    {
        $prefix = 'PO';
        $date = now()->format('Ymd');
        $pattern = $prefix . $date;
        $last = self::where('invoice_number', 'like', $pattern . '%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');
        $seq = $last ? (int) substr($last, -4) + 1 : 1;
        return $pattern . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
