<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use App\Services\ActivityLogService;
use App\Services\FolderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function __construct(
        private FolderService $folderService,
        private ActivityLogService $logService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $folderUuid = $request->query('folder');

        $currentFolder = null;
        if ($folderUuid) {
            $currentFolder = Folder::where('user_id', $user->id)
                ->where('uuid', $folderUuid)
                ->firstOrFail();
        }

        $parentId = $currentFolder ? $currentFolder->id : null;

        $folders = Folder::where('user_id', $user->id)
            ->where('parent_id', $parentId)
            ->orderBy('name')
            ->get();

        $files = $user->files()
            ->where('folder_id', $parentId)
            ->orderBy('name')
            ->get();

        $breadcrumbs = $this->folderService->getBreadcrumbs($currentFolder);

        return response()->json([
            'current_folder' => $currentFolder,
            'breadcrumbs' => $breadcrumbs,
            'folders' => $folders,
            'files' => $files,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_uuid' => ['nullable', 'string', 'exists:folders,uuid'],
            'color' => ['nullable', 'string', 'max:7'],
        ]);

        $user = $request->user();
        $parentId = null;

        if ($request->parent_uuid) {
            $parent = Folder::where('user_id', $user->id)
                ->where('uuid', $request->parent_uuid)
                ->firstOrFail();
            $parentId = $parent->id;
        }

        $folder = Folder::create([
            'user_id' => $user->id,
            'parent_id' => $parentId,
            'name' => $request->name,
            'color' => $request->color,
        ]);

        $this->logService->log($user, 'create_folder', 'folder', $folder->name, $folder->id, $request);

        return response()->json([
            'message' => 'Folder created successfully',
            'folder' => $folder,
        ], 201);
    }

    public function rename(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $folder = Folder::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $oldName = $folder->name;
        $folder->update(['name' => $request->name]);

        $this->logService->log($user, 'rename', 'folder', $folder->name, $folder->id, $request);

        return response()->json([
            'message' => 'Folder renamed successfully',
            'folder' => $folder,
        ]);
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $user = $request->user();
        $folder = Folder::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $this->folderService->cascadeSoftDelete($folder);
        $this->logService->log($user, 'delete', 'folder', $folder->name, $folder->id, $request);

        return response()->json(['message' => 'Folder moved to Trash']);
    }
}
