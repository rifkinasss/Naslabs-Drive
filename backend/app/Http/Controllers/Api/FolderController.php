<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use App\Services\ActivityLogService;
use App\Services\FolderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use ZipArchive;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FolderController extends Controller
{
    public function __construct(
        private FolderService $folderService,
        private ActivityLogService $logService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->boolean('all')) {
            return response()->json([
                'current_folder' => null,
                'breadcrumbs' => $this->folderService->getBreadcrumbs(null),
                'folders' => Folder::where('user_id', $user->id)->withCount('files')->withSum('files', 'size')->orderBy('name')->get(),
                'files' => [],
            ]);
        }

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
            ->withCount('files')
            ->withSum('files', 'size')
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
            'color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
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
        $folder->update(['name' => $request->name, 'color' => $request->input('color', $folder->color)]);

        $this->logService->log($user, 'rename', 'folder', $folder->name, $folder->id, $request);

        return response()->json([
            'message' => 'Folder renamed successfully',
            'folder' => $folder,
        ]);
    }

    public function move(Request $request, string $uuid): JsonResponse
    {
        $request->validate(['parent_uuid' => ['nullable', 'string']]);
        $user = $request->user();
        $folder = Folder::where('user_id', $user->id)->where('uuid', $uuid)->firstOrFail();
        $parentId = null;

        if ($request->filled('parent_uuid')) {
            $parent = Folder::where('user_id', $user->id)
                ->where('uuid', $request->parent_uuid)
                ->firstOrFail();

            if ($parent->id === $folder->id || $parent->isDescendantOf($folder)) {
                return response()->json(['message' => 'A folder cannot be moved into itself or one of its descendants.'], 422);
            }

            $parentId = $parent->id;
        }

        $folder->update(['parent_id' => $parentId]);
        $this->logService->log($user, 'move', 'folder', $folder->name, $folder->id, $request);

        return response()->json(['message' => 'Folder moved successfully', 'folder' => $folder]);
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

    public function downloadZip(Request $request, string $uuid): BinaryFileResponse|JsonResponse
    {
        $folder = Folder::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        $zipPath = storage_path('app/cloud-' . Str::uuid() . '.zip');
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return response()->json(['message' => 'Unable to create folder archive.'], 500);
        }

        $addFolder = function (Folder $current, string $prefix) use (&$addFolder, $zip): void {
            foreach ($current->files()->get() as $file) {
                if (\Storage::disk('local')->exists($file->storage_path)) {
                    $zip->addFile(\Storage::disk('local')->path($file->storage_path), $prefix . basename(str_replace('\\', '/', $file->original_name)));
                }
            }
            foreach ($current->children()->get() as $child) {
                $addFolder($child, $prefix . basename(str_replace('\\', '/', $child->name)) . '/');
            }
        };
        $addFolder($folder, $folder->name . '/');
        $zip->close();

        return response()->download($zipPath, Str::slug($folder->name) . '.zip')->deleteFileAfterSend(true);
    }
}
