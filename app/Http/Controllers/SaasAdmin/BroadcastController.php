<?php

namespace App\Http\Controllers\SaasAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Tenant;
use App\Notifications\SystemBroadcastNotification;
use Illuminate\Support\Facades\Notification;

class BroadcastController extends Controller
{
    public function index()
    {
        return Inertia::render('SaasAdmin/Broadcast/Index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:info,success,warning,error',
            'url' => 'nullable|url'
        ]);

        $tenants = Tenant::all();
        $broadcastCount = 0;

        foreach ($tenants as $tenant) {
            $tenant->run(function () use ($validated, &$broadcastCount) {
                // Get all users in the tenant database
                $users = \App\Models\User::all();
                if ($users->count() > 0) {
                    Notification::send($users, new SystemBroadcastNotification(
                        $validated['title'],
                        $validated['message'],
                        $validated['type'],
                        $validated['url']
                    ));
                    $broadcastCount++;
                }
            });
        }

        return redirect()->back()->with('success', "Pesan siaran berhasil dikirim ke {$broadcastCount} tenant.");
    }
}
