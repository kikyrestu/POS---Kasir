<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('wholesale_min_qty')->nullable()->after('selling_price');
            $table->decimal('wholesale_price', 15, 2)->nullable()->after('wholesale_min_qty');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['wholesale_min_qty', 'wholesale_price']);
        });
    }
};
