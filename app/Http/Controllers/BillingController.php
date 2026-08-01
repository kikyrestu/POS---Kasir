<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Invoice;
use Carbon\Carbon;

class BillingController extends Controller
{
    public function index()
    {
        $tenant = tenant();
        $currentSubscription = $tenant->activeSubscription()->with('plan')->first();
        $pendingSubscription = $tenant->subscriptions()->where('status', 'pending')->with('plan')->latest()->first();
        $invoices = $tenant->invoices()->latest()->get();
        $availablePlans = Plan::where('is_active', true)->get();

        return Inertia::render('Billing/Index', [
            'currentSubscription' => $currentSubscription,
            'pendingSubscription' => $pendingSubscription,
            'invoices' => $invoices,
            'availablePlans' => $availablePlans,
            'midtransClientKey' => \App\Models\SaasSetting::getVal('midtrans_client_key'),
            'midtransEnvironment' => \App\Models\SaasSetting::getVal('midtrans_environment', 'sandbox'),
            'bankTransferDetails' => \App\Models\SaasSetting::getVal('bank_transfer_details', 'Bank BCA 1234567890 a/n NEXA POS'),
        ]);
    }

    public function upgrade(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:mysql.plans,id',
            'billing_cycle' => 'required|in:monthly,yearly'
        ]);

        $tenant = tenant();
        $plan = Plan::findOrFail($validated['plan_id']);

        // Check if Midtrans is enabled
        $midtransEnabled = \App\Models\SaasSetting::getVal('midtrans_enabled', '0') === '1';

        // Get environment and keys
        $isProduction = \App\Models\SaasSetting::getVal('midtrans_environment', 'sandbox') === 'production';
        $serverKey = \App\Models\SaasSetting::getVal('midtrans_server_key', env('MIDTRANS_SERVER_KEY'));
        
        \Midtrans\Config::$serverKey = $serverKey;
        \Midtrans\Config::$isProduction = $isProduction;
        \Midtrans\Config::$isSanitized = true;
        \Midtrans\Config::$is3ds = true;

        $amount = $validated['billing_cycle'] === 'monthly' ? $plan->price_monthly : $plan->price_yearly;
        $orderId = 'INV-' . strtoupper(uniqid());

        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => null, // Will update via webhook or manually below
            'invoice_number' => $orderId,
            'amount' => $amount,
            'status' => $midtransEnabled ? 'unpaid' : 'paid', 
            'paid_at' => $midtransEnabled ? null : now(),
            'due_date' => now()->addDays(3),
        ]);

        $duration = $validated['billing_cycle'] === 'monthly' ? 1 : 12;
        
        if (!$midtransEnabled) {
            // Manual fallback: pending subscription & unpaid invoice
            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => 'pending',
                'starts_at' => now(),
                'ends_at' => now()->addMonths($duration)
            ]);
            
            $invoice->update([
                'subscription_id' => $subscription->id,
                'status' => 'unpaid',
                'paid_at' => null
            ]);
            
            return redirect()->route('billing.index')
                ->with('success', 'Permintaan upgrade paket berhasil diajukan. Silakan lakukan pembayaran.')
                ->with('pendingInvoice', $invoice);
        }

        // Midtrans flow: create pending subscription
        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => 'pending',
            'starts_at' => now(),
            'ends_at' => now()->addMonths($duration)
        ]);
        $invoice->update(['subscription_id' => $subscription->id]);

        // Generate Snap Token
        $params = array(
            'transaction_details' => array(
                'order_id' => $orderId,
                'gross_amount' => (int) $amount,
            ),
            'customer_details' => array(
                'first_name' => auth()->user()->name,
                'email' => auth()->user()->email,
            ),
            'item_details' => array(
                [
                    'id' => $plan->id,
                    'price' => (int) $amount,
                    'quantity' => 1,
                    'name' => 'Langganan ' . $plan->name . ' (' . ucfirst($validated['billing_cycle']) . ')'
                ]
            )
        );

        try {
            $snapToken = \Midtrans\Snap::getSnapToken($params);
            
            // Return back with snap token so frontend can trigger payment
            return redirect()->back()->with('snapToken', $snapToken);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal memproses pembayaran: ' . $e->getMessage());
        }
    }

    public function uploadPaymentProof(Request $request, Invoice $invoice)
    {
        $request->validate([
            'payment_proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
        ]);

        $tenant = tenant();

        if ($invoice->tenant_id !== $tenant->id) {
            abort(403);
        }

        if ($request->hasFile('payment_proof')) {
            $path = $request->file('payment_proof')->store('payment_proofs', 'global_public');
            
            $invoice->update([
                'payment_proof' => $path,
                // Status remains unpaid but we could change to pending_verification if we wanted
                // For now, let's keep it 'unpaid' and we just check if payment_proof is not null
            ]);
            
            // Wait, let's change status to pending so admin knows it's paid but pending approval.
            $invoice->update(['status' => 'pending']);

            // Notify all SaaS Admins
            $admins = \App\Models\SaasAdmin::all();
            if ($admins->count() > 0) {
                \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewPaymentProofNotification($invoice, $tenant->name));
            }
        }

        return redirect()->back()->with('success', 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.');
    }
}

