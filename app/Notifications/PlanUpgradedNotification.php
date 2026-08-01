<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PlanUpgradedNotification extends Notification
{
    use Queueable;

    public $planName;
    public $message;

    /**
     * Create a new notification instance.
     */
    public function __construct($planName, $message = null)
    {
        $this->planName = $planName;
        $this->message = $message ?: "Selamat! Langganan toko Anda berhasil diupgrade ke paket {$this->planName}.";
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'info',
            'title' => 'Langganan Diperbarui',
            'message' => $this->message,
            'url' => route('billing.index'),
        ];
    }
}
