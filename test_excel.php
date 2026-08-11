<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ProductTemplateExport;

Excel::store(new ProductTemplateExport, 'test.xlsx', 'local');

class TestImport implements \Maatwebsite\Excel\Concerns\ToArray, \Maatwebsite\Excel\Concerns\WithHeadingRow {
    public function array(array $array) {}
}
$data = Excel::toArray(new TestImport, storage_path('app/test.xlsx'));
print_r($data);
