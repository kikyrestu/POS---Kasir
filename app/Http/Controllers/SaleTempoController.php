<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SaleTempoController extends Controller
{
    public function index(Request $request)
    {
        $query = Sale::with(['customer', 'user'])
            ->where('payment_type', 'tempo')
            ->when($request->search, function ($q, $s) {
                $q->where('invoice_number', 'like', "%{$s}%")
                  ->orWhereHas('customer', fn($q) => $q->where('name', 'like', "%{$s}%"));
            })
            ->when($request->status, function ($q, $s) {
                if ($s === 'overdue') {
                    $q->where('payment_status', '!=', 'paid')->where('due_date', '<', now());
                } elseif ($s === 'upcoming') {
                    $q->where('payment_status', '!=', 'paid')
                      ->where('due_date', '>=', now())
                      ->where('due_date', '<=', now()->addDays(7));
                } elseif ($s === 'unpaid') {
                    $q->where('payment_status', '!=', 'paid');
                } elseif ($s === 'paid') {
                    $q->where('payment_status', 'paid');
                }
            })
            ->when($request->date_from, fn($q, $d) => $q->where('sale_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('sale_date', '<=', $d))
            ->orderByDesc('created_at');

        $sales = $query->paginate(15)->withQueryString();

        return Inertia::render('SalesTempo/Index', [
            'sales' => $sales,
            'filters' => $request->only('search', 'status', 'date_from', 'date_to'),
            'summary' => [
                'total_piutang' => Sale::where('payment_type', 'tempo')->where('payment_status', '!=', 'paid')->sum(\DB::raw('total - paid')),
                'overdue_count' => Sale::where('payment_type', 'tempo')->where('payment_status', '!=', 'paid')->where('due_date', '<', now())->count(),
                'upcoming_count' => Sale::where('payment_type', 'tempo')->where('payment_status', '!=', 'paid')->where('due_date', '>=', now())->where('due_date', '<=', now()->addDays(7))->count(),
            ],
        ]);
    }

    public function show(Sale $sale)
    {
        $sale->load(['customer', 'user', 'warehouse', 'details.product', 'payments']);

        return Inertia::render('SalesTempo/Show', [
            'sale' => $sale,
        ]);
    }

    public function addPayment(Request $request, Sale $sale)
    {
        $remaining = $sale->total - $sale->paid;

        $validated = $request->validate([
            'amount' => "required|numeric|min:1|max:{$remaining}",
            'method' => 'required|in:cash,transfer,ewallet,qris',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        SalePayment::create([
            'sale_id' => $sale->id,
            'amount' => $validated['amount'],
            'method' => $validated['method'],
            'payment_date' => $validated['payment_date'],
            'notes' => $validated['notes'],
        ]);

        $newPaid = $sale->paid + $validated['amount'];
        $sale->update([
            'paid' => $newPaid,
            'payment_status' => $newPaid >= $sale->total ? 'paid' : 'partial',
        ]);

        return redirect()->back()->with('success', 'Pembayaran berhasil ditambahkan.');
    }
}
