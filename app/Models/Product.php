<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'barcode', 'code', 'name', 'description', 'unit',
        'cost_price', 'selling_price', 'stock_minimum', 'image',
        'expiry_date', 'is_active',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'expiry_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    public function getTotalStockAttribute(): int
    {
        return $this->stocks()->sum('quantity');
    }

    public static function generateBarcode(): string
    {
        do {
            $countryCode = '899';
            $manufacturerCode = str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $productCode = str_pad(random_int(0, 99999), 5, '0', STR_PAD_LEFT);
            $partial = $countryCode . $manufacturerCode . $productCode;

            $sum = 0;
            for ($i = 0; $i < 12; $i++) {
                $sum += (int)$partial[$i] * ($i % 2 === 0 ? 1 : 3);
            }
            $checkDigit = (10 - ($sum % 10)) % 10;
            $barcode = $partial . $checkDigit;
        } while (self::where('barcode', $barcode)->exists());

        return $barcode;
    }
}
