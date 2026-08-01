<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Subscription;
use App\Models\SaasSetting;
use Carbon\Carbon;

class CheckExpiredSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'saas:check-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check and update expired SaaS subscriptions based on grace period';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting SaaS Subscription Expiry Check...');
        
        $gracePeriodDays = (int) SaasSetting::getVal('grace_period_days', '3');
        $suspendAction = SaasSetting::getVal('suspend_action', 'suspend');

        // Find active subscriptions that have passed their ends_at + grace period
        $expiredDate = Carbon::now()->subDays($gracePeriodDays);
        
        $subscriptions = Subscription::where('status', 'active')
            ->where('ends_at', '<=', $expiredDate)
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info('No expired subscriptions found beyond grace period.');
            return;
        }

        foreach ($subscriptions as $subscription) {
            if ($suspendAction === 'downgrade') {
                // Find Free plan
                $freePlan = \App\Models\Plan::where('price_monthly', 0)->first();
                if ($freePlan) {
                    $subscription->update(['status' => 'cancelled']); // cancel old
                    
                    // Create new free plan
                    Subscription::create([
                        'tenant_id' => $subscription->tenant_id,
                        'plan_id' => $freePlan->id,
                        'status' => 'active',
                        'starts_at' => now(),
                        'ends_at' => null // free forever until upgraded
                    ]);
                    $this->line("Downgraded tenant {$subscription->tenant_id} to Free Plan.");
                } else {
                    $subscription->update(['status' => 'expired']);
                    $this->line("Expired tenant {$subscription->tenant_id} (No free plan found to downgrade).");
                }
            } else {
                // Default suspend action
                $subscription->update(['status' => 'expired']);
                $this->line("Expired tenant {$subscription->tenant_id}.");
            }
        }
        
        $this->info('SaaS Subscription Expiry Check completed!');
    }
}
