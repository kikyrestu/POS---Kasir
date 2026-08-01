<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaasFeature extends Model
{
    public function getConnectionName()
    {
        return config('tenancy.database.central_connection');
    }

    protected $fillable = [
        'key',
        'name',
        'description',
        'status',
    ];
}
