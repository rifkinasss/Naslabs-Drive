<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductivityController extends Controller
{
    public function toggleFavorite(Request $request, string $type, string $uuid): JsonResponse
    {
        $user = $request->user();
        $model = $type === 'folder' ? Folder::class : FileModel::class;
        $item = $model::where('user_id', $user->id)->where('uuid', $uuid)->firstOrFail();
        $item->update(['is_favorite' => ! $item->is_favorite]);

        return response()->json(['item' => $item->fresh(), 'is_favorite' => $item->is_favorite]);
    }

    public function insights(Request $request): JsonResponse
    {
        $user = $request->user();
        $files = FileModel::where('user_id', $user->id)->get();
        $folders = Folder::where('user_id', $user->id)->get();

        $types = $files->groupBy(fn (FileModel $file) => $file->extension ?: 'other')
            ->map(fn ($items, $extension) => ['type' => strtoupper($extension), 'count' => $items->count(), 'size' => $items->sum('size')])
            ->values();
        $duplicates = $files->filter(fn (FileModel $file) => $file->checksum)
            ->groupBy('checksum')->filter(fn ($items) => $items->count() > 1)
            ->map(fn ($items) => ['checksum' => $items->first()->checksum, 'files' => $items->map(fn ($file) => ['uuid' => $file->uuid, 'name' => $file->name, 'size' => $file->size])->values()])
            ->values();

        return response()->json([
            'favorites' => [
                'files' => $files->where('is_favorite', true)->sortBy('name')->values(),
                'folders' => $folders->where('is_favorite', true)->sortBy('name')->values(),
            ],
            'recent' => [
                'files' => $files->sortByDesc('updated_at')->take(8)->values(),
                'folders' => $folders->sortByDesc('updated_at')->take(8)->values(),
            ],
            'analytics' => [
                'total_files' => $files->count(),
                'total_folders' => $folders->count(),
                'largest_files' => $files->sortByDesc('size')->take(5)->values(),
                'by_type' => $types,
                'duplicates' => $duplicates,
            ],
        ]);
    }
}
