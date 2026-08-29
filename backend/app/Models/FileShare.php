<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FileShare extends Model
{
    protected $fillable = [
        'file_id', 'created_by', 'token', 'password', 'expires_at', 'max_downloads', 'download_count',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'max_downloads' => 'integer', 'download_count' => 'integer'];
    }

    public function file(): BelongsTo { return $this->belongsTo(File::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }

    public function isAvailable(): bool
    {
        return (!$this->expires_at || $this->expires_at->isFuture())
            && (!$this->max_downloads || $this->download_count < $this->max_downloads);
    }
}
