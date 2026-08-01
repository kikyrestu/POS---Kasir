<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Tenant;

tenancy()->runForMultiple(null, function ($tenant) {
    echo "Running for tenant: {$tenant->id}\n";
    $setting = \App\Models\Setting::where('key', 'store_name')->first();
    if ($setting && $setting->value === 'NEXAPOS') {
        $setting->value = 'BuildyPOS';
        $setting->save();
        echo "Updated store_name to BuildyPOS\n";
    }
});

echo "Done\n";
