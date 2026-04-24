<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HeldTransaction extends Model
{
    protected $fillable = ['user_id', 'reference_number', 'customer_name', 'cart_data', 'subtotal'];

    protected $casts = [
        'cart_data' => 'array',
    ];

    public function user() { return $this->belongsTo(User::class); }
}
