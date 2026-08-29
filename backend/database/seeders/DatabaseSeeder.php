<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\SystemSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
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
                'storage_quota' => 107374182400, // 100GB
                'used_storage' => 0,
                'is_drive_enabled' => true,
            ]
        );
        if (!$admin->email_verified_at) {
            $admin->forceFill(['email_verified_at' => now()])->save();
        }

        // Keep the bundled frontend logo as the initial branding asset.
        // Admin uploads are preserved because this only runs when the key is absent.
        SystemSetting::firstOrCreate(['key' => 'logo_path'], ['value' => 'default:logo.png']);
        SystemSetting::firstOrCreate(['key' => 'favicon_path'], ['value' => 'default:logo.png']);
        SystemSetting::firstOrCreate(['key' => 'pwa_icon_path'], ['value' => 'default:logo.png']);
    }
}
