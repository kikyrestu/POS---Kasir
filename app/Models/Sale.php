<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'invoice_number', 'customer_id', 'warehouse_id', 'user_id',
        'sale_date', 'due_date', 'subtotal', 'discount_amount', 'discount_percent',
        'tax', 'total', 'paid', 'change_amount', 'profit',
        'payment_type', 'payment_status', 'status', 'notes',
    ];

    protected $casts = [
        'sale_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'paid' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'profit' => 'decimal:2',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
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
        return $this->hasMany(SaleDetail::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class);
    }

    public static function generateInvoiceNumber(): string
    {
        $prefix = 'INV';
        $date = now()->format('Ymd');
        $pattern = $prefix . $date;
        $last = self::where('invoice_number', 'like', $pattern . '%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');
        $seq = $last ? (int) substr($last, -4) + 1 : 1;
        return $pattern . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
