<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('file_shares', function (Blueprint $table) {
            $table->string('visibility', 16)->default('public')->after('token');
            $table->string('permission', 16)->default('viewer')->after('visibility');
        });
        Schema::table('folder_shares', function (Blueprint $table) {
            $table->string('visibility', 16)->default('public')->after('token');
        });
        Schema::create('file_share_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('file_share_id')->constrained('file_shares')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['file_share_id', 'user_id']);
        });
        Schema::create('folder_share_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_share_id')->constrained('folder_shares')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['folder_share_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folder_share_recipients');
        Schema::dropIfExists('file_share_recipients');
        Schema::table('folder_shares', fn (Blueprint $table) => $table->dropColumn('visibility'));
        Schema::table('file_shares', fn (Blueprint $table) => $table->dropColumn(['visibility', 'permission']));
    }
};
