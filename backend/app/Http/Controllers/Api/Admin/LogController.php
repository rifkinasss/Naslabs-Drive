<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $logs = ActivityLog::with('user:id,name,email')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'user_name' => $log->user ? $log->user->name : 'Unknown User',
                    'action' => $log->action,
                    'subject_type' => $log->subject_type,
                    'subject_name' => $log->subject_name,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                ];
            });

        return response()->json(['logs' => $logs]);
    }
}
