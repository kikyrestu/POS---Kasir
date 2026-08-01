<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KdsController extends Controller
{
    public function index()
    {
        $orders = Sale::with(['details.product', 'table'])
            ->whereIn('kitchen_status', ['pending', 'preparing'])
            ->whereIn('order_type', ['dine_in', 'takeaway', 'delivery'])
            ->orderBy('created_at', 'asc')
            ->get();

        return Inertia::render('Kds/Index', [
            'orders' => $orders
        ]);
    }

    public function updateStatus(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,preparing,ready,delivered'
        ]);

        $sale->update(['kitchen_status' => $validated['status']]);

        return redirect()->back();
    }
}
