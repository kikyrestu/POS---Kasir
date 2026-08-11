<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Stancl\Tenancy\Facades\Tenancy::initialize('lokabrew');
$u = App\Models\User::first();
var_dump($u->email);
var_dump(auth()->attempt(['email' => $u->email, 'password' => 'password']));
