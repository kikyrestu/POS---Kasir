<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentMethodController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'is_active' => 'boolean',
            'is_gateway' => 'boolean',
        ]);

        $validated['code'] = Str::slug($validated['name']);
        
        // Ensure unique code
        $baseCode = $validated['code'];
        $counter = 1;
        while (PaymentMethod::where('code', $validated['code'])->exists()) {
            $validated['code'] = $baseCode . '-' . $counter;
            $counter++;
        }

        PaymentMethod::create($validated);
        return back()->with('success', 'Metode pembayaran berhasil ditambahkan.');
    }

    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);
        
        // Only update name, code stays the same to prevent breaking old sales records
        $paymentMethod->update(['name' => $validated['name']]);
        
        return back()->with('success', 'Metode pembayaran berhasil diupdate.');
    }

    public function destroy(PaymentMethod $paymentMethod)
    {
        if (in_array($paymentMethod->code, ['cash', 'transfer', 'tempo'])) {
            return back()->with('error', 'Metode pembayaran bawaan sistem tidak dapat dihapus.');
        }

        $paymentMethod->delete();
        return back()->with('success', 'Metode pembayaran berhasil dihapus.');
    }

    public function toggleActive(PaymentMethod $paymentMethod)
    {
        $paymentMethod->update(['is_active' => !$paymentMethod->is_active]);
        return back()->with('success', 'Status metode pembayaran berhasil diubah.');
    }
    
    public function toggleGateway(PaymentMethod $paymentMethod)
    {
        $paymentMethod->update(['is_gateway' => !$paymentMethod->is_gateway]);
        return back()->with('success', 'Status payment gateway berhasil diubah.');
    }
}
