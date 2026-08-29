<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FileVersion extends Model
{
    protected $fillable = ['file_id', 'created_by', 'version', 'name', 'mime_type', 'extension', 'size', 'storage_path', 'checksum'];
    protected $casts = ['size' => 'integer', 'version' => 'integer'];
    public function file(): BelongsTo { return $this->belongsTo(File::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
