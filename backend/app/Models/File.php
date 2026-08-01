<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class File extends Model
{
    use SoftDeletes;

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
    ];

    protected $casts = [
        'size' => 'integer',
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

    public function getSizeHumanAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes === 0) return '0 B';
        $k = 1024;
        $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = (int) floor(log($bytes) / log($k));
        return round($bytes / pow($k, $i), 1) . ' ' . $sizes[$i];
    }
}
