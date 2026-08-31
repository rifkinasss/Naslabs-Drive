<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $setting = DB::table('system_settings')->where('key', 'allowed_extensions')->first();
        if (!$setting) return;

        $extensions = collect(explode(',', (string) $setting->value))
            ->map(fn (string $extension) => strtolower(trim($extension)))
            ->filter()
            ->merge(['heic', 'heif'])
            ->unique()
            ->implode(',');

        DB::table('system_settings')->where('key', 'allowed_extensions')->update(['value' => $extensions]);
    }

    public function down(): void
    {
        $setting = DB::table('system_settings')->where('key', 'allowed_extensions')->first();
        if (!$setting) return;

        $extensions = collect(explode(',', (string) $setting->value))
            ->reject(fn (string $extension) => in_array(strtolower(trim($extension)), ['heic', 'heif'], true))
            ->implode(',');

        DB::table('system_settings')->where('key', 'allowed_extensions')->update(['value' => $extensions]);
    }
};
