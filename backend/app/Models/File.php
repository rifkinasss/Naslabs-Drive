<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class File extends Model
{
    use SoftDeletes;

    protected $appends = ['size_human'];

    protected $fillable = [
        'uuid',
        'user_id',
        'folder_id',
        'name',
        'original_name',
        'mime_type',
        'extension',
        'size',
        'storage_path',
        'checksum',
        'is_favorite',
        'tags',
        'scan_status',
        'scan_message',
        'scanned_at',
    ];

    protected $casts = [
        'size' => 'integer',
        'is_favorite' => 'boolean',
        'tags' => 'array',
        'scanned_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($file) {
            if (empty($file->uuid)) {
                $file->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function shares(): HasMany
    {
        return $this->hasMany(FileShare::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(FileVersion::class);
    }

    public function getSizeHumanAttribute(): string
    {
        // Some legacy records may not have a size yet. Never pass null or a
        // negative value to log(), otherwise serializing the upload response
        // fails after the file has already been stored.
        $bytes = max(0, (int) ($this->size ?? 0));
        if ($bytes === 0) return '0 B';
        $k = 1024;
        $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = min(count($sizes) - 1, (int) floor(log($bytes) / log($k)));
        return round($bytes / pow($k, $i), 1) . ' ' . $sizes[$i];
    }
}
