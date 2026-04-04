<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliers = Supplier::withCount('purchases')
            ->when($request->search, function ($q, $s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('company', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => $request->only('search'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:1000',
        ]);

        Supplier::create($validated);

        return redirect()->back()->with('success', 'Supplier berhasil ditambahkan.');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
        ]);

        $supplier->update($validated);

        return redirect()->back()->with('success', 'Supplier berhasil diperbarui.');
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->purchases()->count() > 0) {
            return redirect()->back()->with('error', 'Supplier memiliki data pembelian.');
        }

        $supplier->delete();
        return redirect()->back()->with('success', 'Supplier berhasil dihapus.');
    }
}
