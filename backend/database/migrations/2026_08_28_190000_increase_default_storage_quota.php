<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Increase only accounts still using the old default; preserve custom quotas.
        DB::table('users')
            ->where('storage_quota', 5368709120)
            ->update(['storage_quota' => 107374182400]);
    }

    public function down(): void
    {
        DB::table('users')
            ->where('storage_quota', 107374182400)
            ->update(['storage_quota' => 5368709120]);
    }
};
