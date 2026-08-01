<?php

namespace App\Http\Controllers;

use App\Models\Voucher;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VoucherController extends Controller
{
    public function index()
    {
        return Inertia::render('Vouchers/Index', [
            'vouchers' => Voucher::latest()->paginate(10)
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:vouchers,code',
            'name' => 'required|string',
            'type' => 'required|in:fixed,percent',
            'amount' => 'required|numeric|min:0',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date',
            'max_uses' => 'nullable|integer|min:1',
            'min_purchase' => 'numeric|min:0',
            'is_active' => 'boolean',
        ]);

        Voucher::create($validated);
        return redirect()->back()->with('success', 'Voucher berhasil ditambahkan.');
    }

    public function update(Request $request, Voucher $voucher)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:vouchers,code,' . $voucher->id,
            'name' => 'required|string',
            'type' => 'required|in:fixed,percent',
            'amount' => 'required|numeric|min:0',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date',
            'max_uses' => 'nullable|integer|min:1',
            'min_purchase' => 'numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $voucher->update($validated);
        return redirect()->back()->with('success', 'Voucher berhasil diupdate.');
    }

    public function destroy(Voucher $voucher)
    {
        $voucher->delete();
        return redirect()->back()->with('success', 'Voucher berhasil dihapus.');
    }

    public function validateVoucher(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'subtotal' => 'required|numeric|min:0'
        ]);

        $voucher = Voucher::where('code', $request->code)->first();

        if (!$voucher) {
            return response()->json(['success' => false, 'message' => 'Kode voucher tidak ditemukan.'], 404);
        }

        if (!$voucher->is_active) {
            return response()->json(['success' => false, 'message' => 'Voucher sudah tidak aktif.'], 400);
        }

        $now = now()->startOfDay();
        if ($voucher->valid_from && $voucher->valid_from > $now) {
            return response()->json(['success' => false, 'message' => 'Voucher belum berlaku.'], 400);
        }

        if ($voucher->valid_until && $voucher->valid_until < $now) {
            return response()->json(['success' => false, 'message' => 'Voucher sudah expired.'], 400);
        }

        if ($voucher->max_uses !== null && $voucher->used_count >= $voucher->max_uses) {
            return response()->json(['success' => false, 'message' => 'Kuota voucher sudah habis.'], 400);
        }

        if ($voucher->min_purchase > 0 && $request->subtotal < $voucher->min_purchase) {
            return response()->json(['success' => false, 'message' => 'Minimal belanja tidak terpenuhi (Min: ' . number_format($voucher->min_purchase, 0, ',', '.') . ').'], 400);
        }

        return response()->json([
            'success' => true,
            'voucher' => $voucher
        ]);
    }
}
