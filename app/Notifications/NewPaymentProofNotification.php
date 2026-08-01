<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewPaymentProofNotification extends Notification
{
    use Queueable;

    public $invoice;
    public $tenantName;

    public function __construct($invoice, $tenantName)
    {
        $this->invoice = $invoice;
        $this->tenantName = $tenantName;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Bukti Pembayaran Baru',
            'message' => 'Toko ' . $this->tenantName . ' telah mengunggah bukti pembayaran untuk invoice ' . $this->invoice->invoice_number,
            'invoice_id' => $this->invoice->id,
            'subscription_id' => $this->invoice->subscription_id,
            'type' => 'payment_proof',
            'icon' => 'Receipt'
        ];
    }
}
