<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VersionController extends Controller
{
    public function __construct(private ActivityLogService $logService) {}

    public function index(Request $request, string $uuid): JsonResponse
    {
        $file = FileModel::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        return response()->json(['versions' => $file->versions()->latest('version')->get()]);
    }

    public function restore(Request $request, string $uuid, int $version): JsonResponse
    {
        $file = FileModel::where('user_id', $request->user()->id)->where('uuid', $uuid)->firstOrFail();
        $selected = $file->versions()->where('version', $version)->firstOrFail();
        $file->versions()->create([
            'created_by' => $request->user()->id,
            'version' => ((int) $file->versions()->max('version')) + 1,
            'name' => $file->name,
            'mime_type' => $file->mime_type,
            'extension' => $file->extension,
            'size' => $file->size,
            'storage_path' => $file->storage_path,
            'checksum' => $file->checksum,
        ]);
        $file->update($selected->only(['name', 'mime_type', 'extension', 'size', 'storage_path', 'checksum']));
        $this->logService->log($request->user(), 'restore_version', 'file', $file->name, $file->id, $request);
        return response()->json(['message' => 'File version restored successfully', 'file' => $file->fresh()]);
    }
}
