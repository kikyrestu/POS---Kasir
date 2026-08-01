<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change payment_type in sales from enum to string
        Schema::table('sales', function (Blueprint $table) {
            $table->string('payment_type', 50)->default('cash')->change();
        });

        // Change method in sale_payments from enum to string
        Schema::table('sale_payments', function (Blueprint $table) {
            $table->string('method', 50)->default('cash')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Not safely reversible if dynamic values were added
    }
};
