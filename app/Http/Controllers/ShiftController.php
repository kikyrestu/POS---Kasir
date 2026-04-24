<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\Sale;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function current()
    {
        $shift = Shift::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();
        return response()->json(['shift' => $shift]);
    }

    public function getClosingData()
    {
        $shift = Shift::where('user_id', auth()->id())->where('status', 'open')->first();
        if (!$shift) return response()->json(['error' => 'No active shift'], 404);

        $cashSales = Sale::where('shift_id', $shift->id)
            ->where('payment_type', 'cash')
            ->where('status', '!=', 'cancelled')
            ->sum('total');

        $expenses = \App\Models\Expense::where('shift_id', $shift->id)->sum('amount');

        return response()->json([
            'starting_cash' => $shift->starting_cash,
            'cash_sales' => $cashSales,
            'expenses' => $expenses,
            'expected_cash' => $shift->starting_cash + $cashSales - $expenses
        ]);
    }

    public function open(Request $request)
    {
        $request->validate([
            'starting_cash' => 'required|numeric|min:0'
        ]);

        if (Shift::where('user_id', auth()->id())->where('status', 'open')->exists()) {
            return back()->with('error', 'Anda masih memiliki shift yang belum ditutup.');
        }

        Shift::create([
            'user_id' => auth()->id(),
            'start_time' => now(),
            'starting_cash' => $request->starting_cash,
            'status' => 'open'
        ]);

        return back()->with('success', 'Shift kasir berhasil dibuka! Hitungan POS aktif.');
    }

    public function close(Request $request)
    {
        $request->validate([
            'actual_cash_ending' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $shift = Shift::where('user_id', auth()->id())->where('status', 'open')->first();
        if (!$shift) {
            return back()->with('error', 'Tidak ada shift yang aktif.');
        }

        $cashSales = Sale::where('shift_id', $shift->id)
            ->where('payment_type', 'cash')
            ->sum('total');
            
        $expenses = \App\Models\Expense::where('shift_id', $shift->id)->sum('amount');
        $expected = $shift->starting_cash + $cashSales - $expenses;

        $shift->update([
            'end_time' => now(),
            'expected_cash_ending' => $expected,
            'actual_cash_ending' => $request->actual_cash_ending,
            'notes' => $request->notes,
            'status' => 'closed'
        ]);

        return back()->with('success', 'Shift berhasil ditutup dan direkap!');
    }
}
