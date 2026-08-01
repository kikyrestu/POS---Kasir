<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\SaasSetting;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function midtrans(Request $request)
    {
        $serverKey = SaasSetting::getVal('midtrans_server_key', env('MIDTRANS_SERVER_KEY'));
        $hashed = hash("sha512", $request->order_id . $request->status_code . $request->gross_amount . $serverKey);
        
        if ($hashed !== $request->signature_key) {
            return response()->json(['message' => 'Invalid signature'], 403);
        }

        $invoice = Invoice::where('invoice_number', $request->order_id)->first();
        
        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found'], 404);
        }

        if ($request->transaction_status == 'capture' || $request->transaction_status == 'settlement') {
            $invoice->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            // Need to know what plan they bought. The Snap token generation didn't save the pending plan_id in the invoice directly, but we can decode it if we need.
            // Wait, currently Invoice doesn't store plan_id. But it's linked to a Tenant.
            // Wait, in BillingController, we didn't create the subscription yet if midtrans is enabled!
            // I should have created a 'pending' subscription and linked it to the invoice!
            
            // Let's modify the assumption: if invoice doesn't have subscription_id, we can't know the plan.
            // Oh, I need to fix BillingController to create a 'pending' subscription first, then update it to 'active'.
            
            if ($invoice->subscription_id) {
                $subscription = Subscription::find($invoice->subscription_id);
                if ($subscription && $subscription->status !== 'active') {
                    // Cancel old active ones
                    $tenant = $subscription->tenant;
                    $tenant->subscriptions()->where('id', '!=', $subscription->id)->where('status', 'active')->update(['status' => 'cancelled']);
                    
                    $subscription->update([
                        'status' => 'active',
                        'starts_at' => now(),
                    ]);

                    // Notify all users in the tenant
                    $tenant->run(function () use ($subscription) {
                        $users = \App\Models\User::all();
                        if ($users->count() > 0) {
                            \Illuminate\Support\Facades\Notification::send($users, new \App\Notifications\PlanUpgradedNotification($subscription->plan->name));
                        }
                    });
                }
            }
        } elseif ($request->transaction_status == 'cancel' || $request->transaction_status == 'deny' || $request->transaction_status == 'expire') {
            $invoice->update(['status' => 'failed']);
            if ($invoice->subscription_id) {
                Subscription::where('id', $invoice->subscription_id)->update(['status' => 'cancelled']);
            }
        }

        return response()->json(['message' => 'OK']);
    }
}
