<?php

namespace App\Policies;

use App\Models\Folder;
use App\Models\User;

class FolderPolicy
{
    public function view(User $user, Folder $folder): bool
    {
        return $user->isAdmin() || $user->id === $folder->user_id;
    }

    public function update(User $user, Folder $folder): bool
    {
        return $user->isAdmin() || $user->id === $folder->user_id;
    }

    public function delete(User $user, Folder $folder): bool
    {
        return $user->isAdmin() || $user->id === $folder->user_id;
    }
}
