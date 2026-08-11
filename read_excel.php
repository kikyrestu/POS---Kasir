<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Maatwebsite\Excel\Facades\Excel;

class TestImport implements \Maatwebsite\Excel\Concerns\ToArray, \Maatwebsite\Excel\Concerns\WithHeadingRow {
    public function array(array $array) {}
}

$data = Excel::toArray(new TestImport, 'C:\Users\Kikyrestu\Downloads\products.xlsx');
print_r($data[0][0] ?? []);
