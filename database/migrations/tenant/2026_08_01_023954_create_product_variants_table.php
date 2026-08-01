<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add has_variants to products
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('has_variants')->default(false)->after('is_active');
        });

        // Create product_variants table
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('sku')->nullable();
            $table->decimal('price', 15, 2)->nullable()->comment('Null means use parent price');
            $table->timestamps();
        });

        // Add product_variant_id to product_stocks
        Schema::table('product_stocks', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropForeign(['warehouse_id']);
            $table->dropUnique(['product_id', 'warehouse_id']);
            
            $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->cascadeOnDelete();
            
            $table->unique(['product_id', 'product_variant_id', 'warehouse_id'], 'prod_var_wh_unique');
            
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->cascadeOnDelete();
        });

        // Add product_variant_id to stock_adjustments
        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->cascadeOnDelete();
        });

        // Add product_variant_id to sale_details
        Schema::table('sale_details', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sale_details', function (Blueprint $table) {
            $table->dropForeign(['product_variant_id']);
            $table->dropColumn('product_variant_id');
        });

        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->dropForeign(['product_variant_id']);
            $table->dropColumn('product_variant_id');
        });

        Schema::table('product_stocks', function (Blueprint $table) {
            $table->dropUnique('prod_var_wh_unique');
            $table->dropForeign(['product_variant_id']);
            $table->dropColumn('product_variant_id');
            $table->unique(['product_id', 'warehouse_id']);
        });

        Schema::dropIfExists('product_variants');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('has_variants');
        });
    }
};
