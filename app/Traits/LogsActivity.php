<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    protected static function bootLogsActivity()
    {
        $events = ['created', 'updated', 'deleted', 'restored'];

        foreach ($events as $event) {
            if (method_exists(static::class, $event)) {
                static::$event(function ($model) use ($event) {
                    $userId = Auth::id() ?? 1; // Default to admin if no user (e.g. seeders/CLI)
                    
                    // Don't log timestamps updates if that's the only change
                    if ($event === 'updated' && count($model->getDirty()) <= 1 && (isset($model->getDirty()['updated_at']))) {
                        return;
                    }

                    ActivityLog::create([
                        'user_id' => $userId,
                        'action' => $event,
                        'model_type' => class_basename($model),
                        'model_id' => $model->id,
                        'details' => json_encode([
                            'old' => $event === 'updated' || $event === 'deleted' ? $model->getOriginal() : null,
                            'new' => $model->getAttributes()
                        ]),
                    ]);
                });
            }
        }
    }
}
