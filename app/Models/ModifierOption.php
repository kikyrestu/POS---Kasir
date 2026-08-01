<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ModifierOption extends Model
{
    use HasFactory;

    protected $fillable = ['product_modifier_id', 'name', 'price'];

    public function modifier()
    {
        return $this->belongsTo(ProductModifier::class, 'product_modifier_id');
    }
}
