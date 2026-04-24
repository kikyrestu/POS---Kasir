<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function index()
    {
        $expenses = Expense::with(['user', 'shift'])
            ->orderBy('expense_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return Inertia::render('Expenses/Index', [
            'expenses' => $expenses
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'expense_date' => 'required|date',
            'type' => 'required|in:operasional,kasbon,lainnya',
            'amount' => 'required|numeric|min:0',
            'notes' => 'required|string',
        ]);

        $activeShift = $request->user()->shifts()->where('status', 'open')->first();

        Expense::create([
            'expense_date' => $request->expense_date,
            'type' => $request->type,
            'amount' => $request->amount,
            'notes' => $request->notes,
            'user_id' => $request->user()->id,
            'shift_id' => $activeShift ? $activeShift->id : null,
        ]);

        return back()->with('success', 'Pengeluaran berhasil dicatat.');
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return back()->with('success', 'Catatan pengeluaran dibatalkan.');
    }
}
