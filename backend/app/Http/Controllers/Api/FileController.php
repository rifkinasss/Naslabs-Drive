<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Models\Folder;
use App\Services\ActivityLogService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController extends Controller
{
    public function __construct(
        private StorageService $storageService,
        private ActivityLogService $logService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:524288'], // 512MB max per file
            'folder_uuid' => ['nullable', 'string', 'exists:folders,uuid'],
        ]);

        $user = $request->user();
        $folderId = null;

        if ($request->folder_uuid) {
            $folder = Folder::where('user_id', $user->id)
                ->where('uuid', $request->folder_uuid)
                ->firstOrFail();
            $folderId = $folder->id;
        }

        try {
            $fileRecord = $this->storageService->upload($request->file('file'), $user, $folderId);

            $this->logService->log($user, 'upload', 'file', $fileRecord->name, $fileRecord->id, $request);

            return response()->json([
                'message' => 'File uploaded successfully',
                'file' => $fileRecord,
            ], 201);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function download(Request $request, string $uuid): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        if (!$user && $request->has('token')) {
            $token = \Laravel\Sanctum\PersonalAccessToken::findToken($request->query('token'));
            if ($token) {
                $user = $token->tokenable;
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        if (!Storage::disk('local')->exists($file->storage_path)) {
            return response()->json(['message' => 'Physical file not found'], 404);
        }

        $this->logService->log($user, 'download', 'file', $file->name, $file->id, $request);

        return Storage::disk('local')->download($file->storage_path, $file->original_name);
    }

    public function preview(Request $request, string $uuid): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        // Support auth token via query string if not passed in header (for <img> and <iframe/> tags)
        if (!$user && $request->has('token')) {
            $token = \Laravel\Sanctum\PersonalAccessToken::findToken($request->query('token'));
            if ($token) {
                $user = $token->tokenable;
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        if (!Storage::disk('local')->exists($file->storage_path)) {
            return response()->json(['message' => 'Physical file not found'], 404);
        }

        return Storage::disk('local')->response($file->storage_path, $file->original_name, [
            'Content-Type' => $file->mime_type,
            'Content-Disposition' => 'inline; filename="' . $file->original_name . '"',
            'Cache-Control' => 'private, max-age=86400, immutable',
        ]);
    }

    public function rename(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $file->update(['name' => $request->name]);

        $this->logService->log($user, 'rename', 'file', $file->name, $file->id, $request);

        return response()->json([
            'message' => 'File renamed successfully',
            'file' => $file,
        ]);
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $user = $request->user();
        $file = FileModel::where('user_id', $user->id)
            ->where('uuid', $uuid)
            ->firstOrFail();

        $file->delete();

        $this->logService->log($user, 'delete', 'file', $file->name, $file->id, $request);

        return response()->json(['message' => 'File moved to Trash']);
    }
}
