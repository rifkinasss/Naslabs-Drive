<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

class ActivityLogService
{
    public function log(
        User $user,
        string $action,
        string $subjectType,
        string $subjectName,
        ?int $subjectId = null,
        ?Request $request = null
    ): ActivityLog {
        return ActivityLog::create([
            'user_id' => $user->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'subject_name' => $subjectName,
            'ip_address' => $request ? $request->ip() : request()->ip(),
            'user_agent' => $request ? $request->userAgent() : request()->userAgent(),
        ]);
    }
}
