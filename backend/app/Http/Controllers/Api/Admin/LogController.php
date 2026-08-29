<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $query = ActivityLog::with('user:id,name,email')
            ->when($request->filled('user_id'), fn ($builder) => $builder->where('user_id', $request->integer('user_id')))
            ->when($request->filled('action') && $request->string('action')->toString() !== 'All', fn ($builder) => $builder->where('action', $request->string('action')->toString()))
            ->when($request->filled('search'), fn ($builder) => $builder->where('subject_name', 'like', '%' . $request->string('search')->toString() . '%'))
            ->when($request->filled('from'), fn ($builder) => $builder->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($builder) => $builder->whereDate('created_at', '<=', $request->date('to')));

        $logs = $query
            ->orderByDesc('created_at')
            ->limit(min(500, max(1, $request->integer('limit', 100))))
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

    public function export(Request $request): StreamedResponse
    {
        if (!$request->user()->isAdmin()) abort(403, 'Unauthorized admin access');

        $request->merge(['limit' => 5000]);
        $logs = ActivityLog::with('user:id,name,email')
            ->when($request->filled('user_id'), fn ($builder) => $builder->where('user_id', $request->integer('user_id')))
            ->when($request->filled('action') && $request->string('action')->toString() !== 'All', fn ($builder) => $builder->where('action', $request->string('action')->toString()))
            ->when($request->filled('search'), fn ($builder) => $builder->where('subject_name', 'like', '%' . $request->string('search')->toString() . '%'))
            ->when($request->filled('from'), fn ($builder) => $builder->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($builder) => $builder->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('created_at')->limit(5000)->get();

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'wb');
            fputcsv($handle, ['id', 'user', 'email', 'action', 'subject_type', 'subject_name', 'ip_address', 'created_at']);
            foreach ($logs as $log) fputcsv($handle, [$log->id, $log->user?->name ?? 'Unknown', $log->user?->email ?? '', $log->action, $log->subject_type, $log->subject_name, $log->ip_address, $log->created_at]);
            fclose($handle);
        }, 'cloud-nl-activity-logs.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
