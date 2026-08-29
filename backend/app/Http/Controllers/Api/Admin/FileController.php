<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Services\ActivityLogService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileController extends Controller
{
    public function __construct(private StorageService $storageService, private ActivityLogService $logService) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $query = FileModel::with('user:id,name,email')
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%' . $request->string('search') . '%'))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->boolean('include_trashed'), fn ($q) => $q->withTrashed())
            ->when($request->input('sort') === 'name', fn ($q) => $q->orderBy('name'))
            ->when($request->input('sort') === 'size', fn ($q) => $q->orderByDesc('size'))
            ->when(!in_array($request->input('sort'), ['name', 'size'], true), fn ($q) => $q->orderByDesc('created_at'));
        $paginator = $query->paginate(min(50, max(1, $request->integer('per_page', 20))))->withQueryString();
        $files = collect($paginator->items())
            ->map(fn ($file) => [
                'uuid' => $file->uuid, 'name' => $file->name, 'size' => $file->size,
                'mime_type' => $file->mime_type, 'created_at' => $file->created_at,
                'deleted_at' => $file->deleted_at, 'storage_exists' => Storage::disk('local')->exists($file->storage_path),
                'user' => ['id' => $file->user?->id, 'name' => $file->user?->name ?? 'Unknown', 'email' => $file->user?->email],
            ]);
        return response()->json(['files' => $files, 'meta' => ['current_page' => $paginator->currentPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total(), 'per_page' => $paginator->perPage()]]);
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $file = FileModel::where('uuid', $uuid)->firstOrFail();
        $name = $file->name;
        $this->storageService->deletePhysicalFile($file);
        $file->delete();
        $this->logService->log($request->user(), 'admin_delete', 'file', $name, $file->id, $request);
        return response()->json(['message' => 'File deleted by administrator.']);
    }
}
