<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->string('scan_status')->default('pending')->after('checksum');
            $table->text('scan_message')->nullable()->after('scan_status');
            $table->timestamp('scanned_at')->nullable()->after('scan_message');
        });
    }

    public function down(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->dropColumn(['scan_status', 'scan_message', 'scanned_at']);
        });
    }
};
