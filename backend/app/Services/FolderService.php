<?php

namespace App\Services;

use App\Models\Folder;
use App\Models\User;

class FolderService
{
    public function getBreadcrumbs(?Folder $folder): array
    {
        $breadcrumbs = [];
        $current = $folder;

        while ($current !== null) {
            array_unshift($breadcrumbs, [
                'id' => $current->id,
                'uuid' => $current->uuid,
                'name' => $current->name,
            ]);
            $current = $current->parent;
        }

        array_unshift($breadcrumbs, [
            'id' => null,
            'uuid' => null,
            'name' => 'My Drive',
        ]);

        return $breadcrumbs;
    }

    public function cascadeSoftDelete(Folder $folder): void
    {
        // Soft delete files in folder
        $folder->files()->delete();

        // Recursively soft delete subfolders
        foreach ($folder->children as $subFolder) {
            $this->cascadeSoftDelete($subFolder);
        }

        $folder->delete();
    }

    public function cascadeRestore(Folder $folder): void
    {
        $folder->restore();
        $folder->files()->withTrashed()->restore();

        foreach ($folder->children()->withTrashed()->get() as $subFolder) {
            $this->cascadeRestore($subFolder);
        }
    }
}
