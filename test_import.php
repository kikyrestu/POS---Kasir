<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\ProductImport;
try { 
    Excel::import(new ProductImport, 'C:\Users\Kikyrestu\Downloads\products.xlsx'); 
    echo 'SUCCESS'; 
} catch (\Exception $e) { 
    echo $e->getMessage(); 
}
