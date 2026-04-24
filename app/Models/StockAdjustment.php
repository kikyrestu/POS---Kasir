<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAdjustment extends Model
{
    protected $fillable = [
        'product_id', 'warehouse_id', 'user_id', 'type', 'quantity', 'reason', 'adjustment_date'
    ];

    protected $casts = [
        'adjustment_date' => 'date',
    ];

    public function product() { return $this->belongsTo(Product::class); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
    public function user() { return $this->belongsTo(User::class); }
}
