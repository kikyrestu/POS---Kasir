<?php

namespace App\Http\Controllers;

use App\Models\HeldTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HoldTransactionController extends Controller
{
    /**
     * Get all currently held transactions
     */
    public function index()
    {
        $held = HeldTransaction::with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($held);
    }

    /**
     * Suspend a transaction/cart
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'reference_number' => 'required|string|unique:held_transactions',
            'customer_name' => 'nullable|string',
            'cart_data' => 'required|array',
            'subtotal' => 'required|numeric',
        ]);

        $held = HeldTransaction::create([
            'user_id' => $request->user()->id,
            'reference_number' => $validated['reference_number'],
            'customer_name' => $validated['customer_name'],
            'cart_data' => $validated['cart_data'],
            'subtotal' => $validated['subtotal'],
        ]);

        return response()->json(['success' => true, 'data' => $held]);
    }

    /**
     * Delete a held transaction (e.g. when resumed or cancelled)
     */
    public function destroy(HeldTransaction $holdTransaction)
    {
        $holdTransaction->delete();
        return response()->json(['success' => true]);
    }
}
