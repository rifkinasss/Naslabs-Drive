<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File as FileModel;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:All,Images,Documents,Videos,Folders'],
            'favorite' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'string', 'in:name,updated_at,size'],
            'min_size' => ['nullable', 'integer', 'min:0'],
            'max_size' => ['nullable', 'integer', 'min:0'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $user = $request->user();
        $query = strtolower($request->query('q', ''));
        $type = $request->query('type', 'All');
        $sort = $request->query('sort', 'name');

        $folders = collect();
        if ($type === 'All' || $type === 'Folders') {
            $foldersQuery = Folder::where('user_id', $user->id);
            if ($query) {
                $foldersQuery->whereRaw('LOWER(name) LIKE ?', ["%{$query}%"]);
            }
            if ($request->boolean('favorite')) $foldersQuery->where('is_favorite', true);
            if ($request->filled('from')) $foldersQuery->whereDate('created_at', '>=', $request->query('from'));
            if ($request->filled('to')) $foldersQuery->whereDate('created_at', '<=', $request->query('to'));
            $folders = $foldersQuery->orderBy($sort === 'updated_at' ? 'updated_at' : 'name', $sort === 'updated_at' ? 'desc' : 'asc')->get();
        }

        $files = collect();
        if ($type !== 'Folders') {
            $filesQuery = FileModel::where('user_id', $user->id);
            if ($query) {
                $filesQuery->whereRaw('LOWER(name) LIKE ?', ["%{$query}%"]);
            }
            if ($request->boolean('favorite')) $filesQuery->where('is_favorite', true);
            if ($request->filled('min_size')) $filesQuery->where('size', '>=', $request->query('min_size'));
            if ($request->filled('max_size')) $filesQuery->where('size', '<=', $request->query('max_size'));
            if ($request->filled('from')) $filesQuery->whereDate('created_at', '>=', $request->query('from'));
            if ($request->filled('to')) $filesQuery->whereDate('created_at', '<=', $request->query('to'));

            if ($type === 'Images') {
                $filesQuery->where('mime_type', 'LIKE', 'image/%');
            } elseif ($type === 'Videos') {
                $filesQuery->where('mime_type', 'LIKE', 'video/%');
            } elseif ($type === 'Documents') {
                $filesQuery->where(function ($q) {
                    $q->where('mime_type', 'application/pdf')
                        ->orWhere('mime_type', 'LIKE', '%document%')
                        ->orWhere('mime_type', 'LIKE', '%word%')
                        ->orWhere('mime_type', 'LIKE', '%spreadsheet%')
                        ->orWhere('mime_type', 'LIKE', '%excel%')
                        ->orWhere('mime_type', 'LIKE', 'text/%');
                });
            }

            $files = $filesQuery->orderBy($sort === 'size' ? 'size' : ($sort === 'updated_at' ? 'updated_at' : 'name'), $sort === 'name' ? 'asc' : 'desc')->get();
        }

        return response()->json([
            'query' => $query,
            'type' => $type,
            'filters' => ['favorite' => $request->boolean('favorite'), 'sort' => $sort],
            'folders' => $folders,
            'files' => $files,
        ]);
    }
}
