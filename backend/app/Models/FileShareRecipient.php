<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FileShareRecipient extends Model
{
    protected $fillable = ['file_share_id', 'user_id'];
    public function share(): BelongsTo { return $this->belongsTo(FileShare::class, 'file_share_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
