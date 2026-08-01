<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tenant = \App\Models\Tenant::first();
tenancy()->initialize($tenant);

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

// Drop foreign keys first
DB::statement('SET FOREIGN_KEY_CHECKS=0;');

Schema::table('product_stocks', function (Blueprint $table) {
    if (Schema::hasColumn('product_stocks', 'product_variant_id')) {
        $table->dropForeign(['product_variant_id']);
        $table->dropColumn('product_variant_id');
    }
});

Schema::table('sale_details', function (Blueprint $table) {
    if (Schema::hasColumn('sale_details', 'product_variant_id')) {
        $table->dropForeign(['product_variant_id']);
        $table->dropColumn('product_variant_id');
    }
});

Schema::table('stock_adjustments', function (Blueprint $table) {
    if (Schema::hasColumn('stock_adjustments', 'product_variant_id')) {
        $table->dropForeign(['product_variant_id']);
        $table->dropColumn('product_variant_id');
    }
});

Schema::dropIfExists('product_variants');

Schema::table('products', function (Blueprint $table) {
    if (Schema::hasColumn('products', 'has_variants')) {
        $table->dropColumn('has_variants');
    }
});

DB::statement('SET FOREIGN_KEY_CHECKS=1;');
echo "Cleanup done\n";
