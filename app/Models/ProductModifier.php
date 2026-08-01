<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductModifier extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'name', 'type', 'is_required'];

    public function options()
    {
        return $this->hasMany(ModifierOption::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
