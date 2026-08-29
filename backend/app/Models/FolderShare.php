<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FolderShare extends Model
{
    protected $fillable = ['folder_id', 'created_by', 'token', 'password', 'expires_at', 'permission'];
    protected $hidden = ['password'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function folder(): BelongsTo { return $this->belongsTo(Folder::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }

    public function isAvailable(): bool
    {
        return !$this->expires_at || $this->expires_at->isFuture();
    }
}
