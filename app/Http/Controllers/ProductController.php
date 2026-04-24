<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::with(['category', 'stocks.warehouse'])
            ->when($request->search, function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                      ->orWhere('barcode', 'like', "%{$s}%")
                      ->orWhere('code', 'like', "%{$s}%");
                });
            })
            ->when($request->category, fn($q, $c) => $q->where('category_id', $c))
            ->when($request->stock === 'low', function ($q) {
                $q->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM product_stocks WHERE product_stocks.product_id = products.id) < products.stock_minimum');
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => Category::where('is_active', true)->get(['id', 'name']),
            'filters' => $request->only('search', 'category', 'stock'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Products/Form', [
            'categories' => Category::where('is_active', true)->get(['id', 'name']),
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
            'generatedBarcode' => Product::generateBarcode(),
        ]);
    }

    public function show(Product $product)
    {
        return redirect()->route('products.edit', $product);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:20|unique:products',
            'code' => 'nullable|string|max:50|unique:products',
            'category_id' => 'nullable|exists:categories,id',
            'unit' => 'required|string|max:50',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'stock_minimum' => 'integer|min:0',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'expiry_date' => 'nullable|date',
            'stocks' => 'nullable|array',
            'stocks.*.warehouse_id' => 'required|exists:warehouses,id',
            'stocks.*.quantity' => 'required|integer|min:0',
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($validated);

        if (!empty($validated['stocks'])) {
            foreach ($validated['stocks'] as $stock) {
                ProductStock::create([
                    'product_id' => $product->id,
                    'warehouse_id' => $stock['warehouse_id'],
                    'quantity' => $stock['quantity'],
                ]);
            }
        }

        return redirect()->route('products.index')->with('success', 'Produk berhasil ditambahkan.');
    }



    public function edit(Product $product)
    {
        $product->load(['category', 'stocks.warehouse', 'prices']);

        return Inertia::render('Products/Form', [
            'product' => $product,
            'categories' => Category::where('is_active', true)->get(['id', 'name']),
            'warehouses' => Warehouse::where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:20|unique:products,barcode,' . $product->id,
            'code' => 'nullable|string|max:50|unique:products,code,' . $product->id,
            'category_id' => 'nullable|exists:categories,id',
            'unit' => 'required|string|max:50',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'stock_minimum' => 'integer|min:0',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'expiry_date' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $validated['image'] = $request->file('image')->store('products', 'public');
        }

        $product->update($validated);

        return redirect()->route('products.index')->with('success', 'Produk berhasil diperbarui.');
    }

    public function destroy(Product $product)
    {
        // Check for existing transactions
        $hasSales = \App\Models\SaleDetail::where('product_id', $product->id)->exists();
        $hasPurchases = \App\Models\PurchaseDetail::where('product_id', $product->id)->exists();

        if ($hasSales || $hasPurchases) {
            return redirect()->back()->with('error', 'Produk memiliki data transaksi dan tidak dapat dihapus. Nonaktifkan saja produk ini.');
        }

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }
        $product->delete();

        return redirect()->back()->with('success', 'Produk berhasil dihapus.');
    }

    // API endpoint for POS search
    public function search(Request $request)
    {
        $searchTerm = $request->q ?? $request->query('query');
        
        $products = Product::with(['stocks.warehouse', 'category'])
            ->where('is_active', true)
            ->when($searchTerm, function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                      ->orWhere('barcode', $s)
                      ->orWhere('code', 'like', "%{$s}%");
                });
            })
            ->when($request->category_id, fn($q, $c) => $q->where('category_id', $c))
            ->limit(20)
            ->get();

        return response()->json($products);
    }

    public function export()
    {
        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ProductExport, 'products.xlsx');
    }

    public function downloadTemplate()
    {
        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ProductTemplateExport, 'product_template.xlsx');
    }

    public function import(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:5120',
        ]);

        try {
            \Maatwebsite\Excel\Facades\Excel::import(new \App\Imports\ProductImport, $request->file('file'));
            return redirect()->back()->with('success', 'Data produk berhasil ter-import ke database.');
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            $failures = $e->failures();
            $msg = "Error pada baris: " . $failures[0]->row() . " - " . implode(", ", $failures[0]->errors());
            return redirect()->back()->with('error', $msg);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Terjadi kesalahan sistem: ' . $e->getMessage());
        }
    }
}
