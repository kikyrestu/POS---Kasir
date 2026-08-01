<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function markAsRead($id)
    {
        $notification = auth('saas_admin')->user()->notifications()->find($id);
        if ($notification) {
            $notification->markAsRead();
        }
        return redirect()->back();
    }

    public function markAllAsRead()
    {
        auth('saas_admin')->user()->unreadNotifications->markAsRead();
        return redirect()->back();
    }
}
