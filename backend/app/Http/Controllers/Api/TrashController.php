<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Models\Folder;
use App\Services\ActivityLogService;
use App\Services\FolderService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrashController extends Controller
{
    public function __construct(
        private StorageService $storageService,
        private FolderService $folderService,
        private ActivityLogService $logService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $folders = Folder::onlyTrashed()
            ->where('user_id', $user->id)
            ->orderByDesc('deleted_at')
            ->get();

        $files = FileModel::onlyTrashed()
            ->where('user_id', $user->id)
            ->orderByDesc('deleted_at')
            ->get();

        return response()->json([
            'folders' => $folders,
            'files' => $files,
        ]);
    }

    public function restore(Request $request, string $type, string $uuid): JsonResponse
    {
        $user = $request->user();

        if ($type === 'folder') {
            $folder = Folder::onlyTrashed()
                ->where('user_id', $user->id)
                ->where('uuid', $uuid)
                ->firstOrFail();

            $this->folderService->cascadeRestore($folder);
            $this->logService->log($user, 'restore', 'folder', $folder->name, $folder->id, $request);

            return response()->json(['message' => 'Folder restored successfully']);
        }

        $file = FileModel::onlyTrashed()
            ->where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $file->restore();
        $this->logService->log($user, 'restore', 'file', $file->name, $file->id, $request);

        return response()->json(['message' => 'File restored successfully']);
    }

    public function permanentDelete(Request $request, string $type, string $uuid): JsonResponse
    {
        $user = $request->user();

        if ($type === 'folder') {
            $folder = Folder::onlyTrashed()
                ->where('user_id', $user->id)
                ->where('uuid', $uuid)
                ->firstOrFail();

            $folderName = $folder->name;

            // Delete contained physical files
            $files = FileModel::onlyTrashed()->where('folder_id', $folder->id)->get();
            foreach ($files as $file) {
                $this->storageService->deletePhysicalFile($file);
                $file->forceDelete();
            }

            $folder->forceDelete();
            $this->logService->log($user, 'permanent_delete', 'folder', $folderName, null, $request);

            return response()->json(['message' => 'Folder permanently deleted']);
        }

        $file = FileModel::onlyTrashed()
            ->where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $fileName = $file->name;
        $this->storageService->deletePhysicalFile($file);
        $file->forceDelete();

        $this->logService->log($user, 'permanent_delete', 'file', $fileName, null, $request);

        return response()->json(['message' => 'File permanently deleted']);
    }

    public function emptyTrash(Request $request): JsonResponse
    {
        $user = $request->user();

        $files = FileModel::onlyTrashed()->where('user_id', $user->id)->get();
        foreach ($files as $file) {
            $this->storageService->deletePhysicalFile($file);
            $file->forceDelete();
        }

        Folder::onlyTrashed()->where('user_id', $user->id)->forceDelete();

        $this->logService->log($user, 'empty_trash', 'drive', 'Trash', null, $request);

        return response()->json(['message' => 'Trash emptied successfully']);
    }
}
