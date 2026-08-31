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

        $kind = match (true) {
            str_contains($request->path(), '/upload') => 'upload',
            str_contains($request->path(), '/download') => 'download',
            str_contains($request->path(), '/preview') => 'preview',
            default => 'api',
        };
        $bucket = now()->format('Y-m-d-H');
        $bucketPrefix = "cloud:metrics:latency:{$bucket}:{$kind}";
        $expiresAt = now()->addDays(3);
        Cache::add($bucketPrefix . ':requests', 0, $expiresAt);
        Cache::add($bucketPrefix . ':errors', 0, $expiresAt);
        Cache::add($bucketPrefix . ':duration_ms', 0, $expiresAt);
        Cache::increment($bucketPrefix . ':requests');
        Cache::increment($bucketPrefix . ':duration_ms', (int) round((microtime(true) - $startedAt) * 1000));
        if ($response->getStatusCode() >= 400) Cache::increment($bucketPrefix . ':errors');

        return $response;
    }
}
