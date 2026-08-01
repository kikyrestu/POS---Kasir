<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification
{
    use Queueable;

    public function __construct()
    {
        //
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => 'Selamat Datang di NexaPOS!',
            'message' => 'Akun toko Anda berhasil dibuat. Silakan jelajahi fitur-fitur yang kami sediakan.',
            'icon' => '🎉',
            'type' => 'success'
        ];
    }
}
