<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Subscription;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function index()
    {
        $subscriptions = Subscription::with(['tenant', 'plan', 'invoices'])->latest()->get();
        return Inertia::render('SaasAdmin/Subscriptions/Index', [
            'subscriptions' => $subscriptions
        ]);
    }

    public function show($id)
    {
        $subscription = Subscription::with(['tenant', 'plan', 'invoices'])->findOrFail($id);
        return Inertia::render('SaasAdmin/Subscriptions/Show', [
            'subscription' => $subscription
        ]);
    }
    
    public function reject($id)
    {
        $subscription = Subscription::with(['tenant', 'plan'])->findOrFail($id);
        
        if ($subscription->status !== 'pending') {
            return redirect()->back()->with('error', 'Hanya langganan berstatus pending yang bisa di-reject.');
        }

        $tenant = $subscription->tenant;

        // Cancel the pending subscription
        $subscription->update([
            'status' => 'cancelled',
        ]);

        // Cancel the invoice
        \App\Models\Invoice::where('subscription_id', $subscription->id)
            ->where('status', 'pending')
            ->update([
                'status' => 'cancelled',
            ]);

        // Notify all users in the tenant
        $tenant->run(function () use ($subscription) {
            $users = \App\Models\User::all();
            if ($users->count() > 0) {
                // We'll send a notification that the payment was rejected
                \Illuminate\Support\Facades\Notification::send($users, new \App\Notifications\PlanUpgradedNotification('DITOLAK - ' . $subscription->plan->name));
            }
        });

        return redirect()->back()->with('success', 'Langganan berhasil ditolak (dibatalkan).');
    }

    public function approve($id)
    {
        $subscription = Subscription::with(['tenant', 'plan'])->findOrFail($id);
        
        if ($subscription->status !== 'pending') {
            return redirect()->back()->with('error', 'Hanya langganan berstatus pending yang bisa di-approve.');
        }

        $tenant = $subscription->tenant;

        // Cancel other active subscriptions for this tenant
        $tenant->subscriptions()
            ->where('id', '!=', $subscription->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        // Activate the new subscription
        $subscription->update([
            'status' => 'active',
            'starts_at' => now(),
            // ends_at is already calculated when created
        ]);

        // Mark the invoice as paid
        \App\Models\Invoice::where('subscription_id', $subscription->id)
            ->where('status', 'unpaid')
            ->update([
                'status' => 'paid',
                'paid_at' => now()
            ]);

        // Notify all users in the tenant
        $tenant->run(function () use ($subscription) {
            $users = \App\Models\User::all();
            if ($users->count() > 0) {
                \Illuminate\Support\Facades\Notification::send($users, new \App\Notifications\PlanUpgradedNotification($subscription->plan->name));
            }
        });

        return redirect()->back()->with('success', 'Langganan berhasil diaktifkan dan Notifikasi telah dikirim ke toko.');
    }
}
