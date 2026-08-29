<?php

namespace App\Services;

use App\Models\SystemSetting;
use Google\Client;
use Google\Service\Drive;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;
use App\Models\User;

class GoogleOAuthService
{
    public function client(string $mode = 'login'): Client
    {
        $clientId = SystemSetting::where('key', 'google_client_id')->value('value');
        $clientSecret = SystemSetting::where('key', 'google_client_secret_encrypted')->value('value');
        $redirectUri = SystemSetting::where('key', $mode === 'drive' ? 'google_drive_redirect_uri' : 'google_login_redirect_uri')->value('value');
        if (!$clientId || !$clientSecret || !$redirectUri) throw new RuntimeException('Google OAuth is not configured by the administrator.');

        $client = new Client();
        $client->setClientId($clientId);
        $client->setClientSecret(Crypt::decryptString($clientSecret));
        $client->setRedirectUri($redirectUri);
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setIncludeGrantedScopes(true);
        $client->setScopes($mode === 'drive'
            ? [Drive::DRIVE]
            : ['openid', 'email', 'profile']);
        return $client;
    }

    public function isEnabled(string $key): bool
    {
        return SystemSetting::where('key', $key)->value('value') === '1';
    }

    public function storeSecret(string $secret): void
    {
        SystemSetting::updateOrCreate(['key' => 'google_client_secret_encrypted'], ['value' => Crypt::encryptString($secret)]);
    }

    public function storeDriveToken(array $token): void
    {
        SystemSetting::updateOrCreate(['key' => 'google_drive_token_encrypted'], ['value' => Crypt::encryptString(json_encode($token))]);
    }

    public function driveClient(): Client
    {
        $client = $this->client('drive');
        $stored = SystemSetting::where('key', 'google_drive_token_encrypted')->value('value');
        if (!$stored) throw new RuntimeException('Google Drive is not connected.');
        $token = json_decode(Crypt::decryptString($stored), true);
        $client->setAccessToken($token);
        if ($client->isAccessTokenExpired() && $client->getRefreshToken()) {
            $token = $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
            $this->storeDriveToken(array_merge(json_decode(Crypt::decryptString($stored), true), $token));
        }
        return $client;
    }

    public function userDriveClient(User $user): Client
    {
        $client = $this->client('drive');
        if (!$user->google_drive_token_encrypted) throw new RuntimeException('Your Google Drive is not connected.');
        $token = json_decode(Crypt::decryptString($user->google_drive_token_encrypted), true);
        $client->setAccessToken($token);
        if ($client->isAccessTokenExpired() && $client->getRefreshToken()) {
            $refreshed = $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
            $user->forceFill(['google_drive_token_encrypted' => Crypt::encryptString(json_encode(array_merge($token, $refreshed)))])->save();
        }
        return $client;
    }

    public function storeUserDriveToken(User $user, array $token): void
    {
        $user->forceFill(['google_drive_token_encrypted' => Crypt::encryptString(json_encode($token))])->save();
    }
}
