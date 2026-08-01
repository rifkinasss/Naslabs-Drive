<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('user')->after('email');
            $table->unsignedBigInteger('storage_quota')->default(5368709120)->after('role'); // 5 GB
            $table->unsignedBigInteger('used_storage')->default(0)->after('storage_quota');
            $table->boolean('is_drive_enabled')->default(true)->after('used_storage');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'storage_quota', 'used_storage', 'is_drive_enabled']);
        });
    }
};
