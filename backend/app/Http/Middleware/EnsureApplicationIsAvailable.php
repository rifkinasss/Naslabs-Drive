<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApplicationIsAvailable
{
    public function handle(Request $request, Closure $next): Response
    {
        $maintenanceEnabled = SystemSetting::where('key', 'maintenance_mode')->value('value') === '1';
        $user = $request->user();

        // Administrators must retain access so they can turn maintenance mode off.
        if (!$maintenanceEnabled || $user?->isAdmin()) {
            return $next($request);
        }

        $message = SystemSetting::where('key', 'maintenance_message')->value('value')
            ?: 'Cloud NL is temporarily under maintenance.';

        return response()->json([
            'message' => $message,
            'maintenance_mode' => true,
        ], 503, [
            'Retry-After' => '3600',
        ]);
    }
}
