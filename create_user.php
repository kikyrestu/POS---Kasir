<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::firstOrCreate(
    ['email' => 'admin@pos.com'],
    [
        'name' => 'Admin POS',
        'password' => bcrypt('password')
    ]
);
echo "User created: " . $user->email . "\n";
