<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;
use RuntimeException;

class AntivirusService
{
    public function scan(string $path): array
    {
        if (!config('antivirus.enabled')) return ['status' => 'skipped', 'message' => 'Antivirus scanning is disabled.'];
        $command = escapeshellcmd((string) config('antivirus.binary', 'clamscan')) . ' --no-summary --infected ' . escapeshellarg($path);
        try { $result = Process::timeout((int) config('antivirus.timeout', 120))->run($command); }
        catch (\Throwable $exception) {
            if (config('antivirus.required')) throw new RuntimeException('Antivirus scanner is unavailable. Upload has been blocked.');
            return ['status' => 'unavailable', 'message' => 'Antivirus scanner is unavailable.'];
        }
        return match ($result->exitCode()) {
            0 => ['status' => 'clean', 'message' => 'No threat detected.'],
            1 => throw new RuntimeException('Upload blocked: antivirus detected a potentially harmful file.'),
            default => config('antivirus.required')
                ? throw new RuntimeException('Antivirus scan failed. Upload has been blocked.')
                : ['status' => 'unavailable', 'message' => trim($result->errorOutput()) ?: 'Antivirus scan could not be completed.'],
        };
    }
}
