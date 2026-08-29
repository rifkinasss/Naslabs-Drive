<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('files', function (Blueprint $table) {
            $table->json('tags')->nullable()->after('is_favorite');
        });
    }

    public function down(): void
    {
        Schema::table('files', fn (Blueprint $table) => $table->dropColumn('tags'));
    }
};
