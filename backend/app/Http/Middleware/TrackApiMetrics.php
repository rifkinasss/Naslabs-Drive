<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class TrackApiMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $startedAt = microtime(true);
        $response = $next($request);
        $day = now()->format('Y-m-d');
        $prefix = 'cloud:metrics:api:' . $day;
        Cache::add($prefix . ':requests', 0, now()->endOfDay());
        Cache::add($prefix . ':errors', 0, now()->endOfDay());
        Cache::add($prefix . ':duration_ms', 0, now()->endOfDay());
        Cache::increment($prefix . ':requests');
        Cache::increment($prefix . ':duration_ms', (int) round((microtime(true) - $startedAt) * 1000));
        if ($response->getStatusCode() >= 500) Cache::increment($prefix . ':errors');
        return $response;
    }
}
