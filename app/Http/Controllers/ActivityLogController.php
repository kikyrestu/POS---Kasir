<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = ActivityLog::with('user:id,name,email')
            ->when($request->search, function ($query, $search) {
                $query->whereHas('user', fn($q) => $q->where('name', 'like', "%{$search}%"))
                      ->orWhere('action', 'like', "%{$search}%")
                      ->orWhere('model_type', 'like', "%{$search}%");
            })
            ->when($request->action_type, fn($q, $type) => $q->where('action', $type))
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Settings/ActivityLogs', [
            'logs' => $logs,
            'filters' => $request->only('search', 'action_type')
        ]);
    }
}
