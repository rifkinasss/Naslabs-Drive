<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FolderShareRecipient extends Model
{
    protected $fillable = ['folder_share_id', 'user_id'];
    public function share(): BelongsTo { return $this->belongsTo(FolderShare::class, 'folder_share_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
