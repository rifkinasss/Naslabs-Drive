<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Notifications\ResetPasswordNotification;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'avatar_path',
        'password',
        'role',
        'storage_quota',
        'used_storage',
        'is_drive_enabled',
        'google_drive_token_encrypted',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'google_drive_token_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'storage_quota' => 'integer',
            'used_storage' => 'integer',
            'is_drive_enabled' => 'boolean',
        ];
    }

    public function folders(): HasMany
    {
        return $this->hasMany(Folder::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function loginOtpCodes(): HasMany
    {
        return $this->hasMany(LoginOtpCode::class);
    }

    public function notificationReads(): HasMany
    {
        return $this->hasMany(NotificationRead::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isManager(): bool
    {
        return $this->role === 'manager';
    }

    public function canManageUsers(): bool
    {
        return $this->isAdmin() || $this->isManager();
    }

    public function hasAvailableQuota(int $bytes): bool
    {
        return ($this->used_storage + $bytes) <= $this->storage_quota;
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
