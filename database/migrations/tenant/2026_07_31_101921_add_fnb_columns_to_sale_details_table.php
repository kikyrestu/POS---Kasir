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
        Schema::table('sale_details', function (Blueprint $table) {
            $table->json('modifiers')->nullable()->after('profit'); // Store selected modifiers: [{"name": "Boba", "price": 3000}]
            $table->text('notes')->nullable()->after('modifiers'); // Special requests per item
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_details', function (Blueprint $table) {
            $table->dropColumn(['modifiers', 'notes']);
        });
    }
};
