<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Folder;
use App\Models\File as FileModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin User
        $admin = User::firstOrCreate(
            ['email' => 'rifki@naslabs.id'],
            [
                'name' => 'Rifki Anashirul',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'storage_quota' => 5368709120, // 5GB
                'used_storage' => 0,
                'is_drive_enabled' => true,
            ]
        );

        // Regular User
        $user = User::firstOrCreate(
            ['email' => 'budi@naslabs.id'],
            [
                'name' => 'Budi Santoso',
                'password' => Hash::make('password'),
                'role' => 'user',
                'storage_quota' => 5368709120,
                'used_storage' => 0,
                'is_drive_enabled' => true,
            ]
        );

        // Create sample folder for Admin
        $folder = Folder::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $admin->id,
            'name' => 'Dokumen Kerja',
            'color' => '#3B82F6',
        ]);
    }
}
