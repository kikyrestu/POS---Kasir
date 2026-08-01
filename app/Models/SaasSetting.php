<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaasSetting extends Model
{
    use HasFactory;
    
    protected $connection = 'mysql';

    protected $fillable = ['key', 'value'];

    /**
     * Helper to get a setting value easily
     */
    public static function getVal($key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }
}
