<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('barcode', 20)->nullable()->unique();
            $table->string('code', 50)->nullable()->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('unit')->default('pcs');
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->integer('stock_minimum')->default(0);
            $table->string('image')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('price_type');
            $table->decimal('price', 15, 2);
            $table->integer('min_qty')->default(1);
            $table->timestamps();
        });

        Schema::create('product_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity')->default(0);
            $table->unique(['product_id', 'warehouse_id']);
            $table->timestamps();
        });

        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['addition', 'subtraction']);
            $table->integer('quantity');
            $table->text('reason')->nullable();
            $table->date('adjustment_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
        Schema::dropIfExists('product_stocks');
        Schema::dropIfExists('product_prices');
        Schema::dropIfExists('products');
    }
};
