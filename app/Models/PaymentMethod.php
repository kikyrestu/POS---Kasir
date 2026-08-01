<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'is_active',
        'is_gateway',
        'gateway_provider',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_gateway' => 'boolean',
    ];
}
