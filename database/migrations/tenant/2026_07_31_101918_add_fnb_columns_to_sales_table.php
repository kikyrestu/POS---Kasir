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
        Schema::table('sales', function (Blueprint $table) {
            $table->string('order_type')->default('dine_in')->after('customer_id'); // dine_in, takeaway, delivery
            $table->foreignId('table_id')->nullable()->after('order_type')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['table_id']);
            $table->dropColumn(['order_type', 'table_id']);
        });
    }
};
