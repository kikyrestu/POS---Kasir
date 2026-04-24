<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class Customer extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = ['name', 'email', 'phone', 'address', 'type', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
