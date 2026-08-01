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
        ]);

        $user = $request->user();
        $query = strtolower($request->query('q', ''));
        $type = $request->query('type', 'All');

        $folders = collect();
        if ($type === 'All' || $type === 'Folders') {
            $foldersQuery = Folder::where('user_id', $user->id);
            if ($query) {
                $foldersQuery->whereRaw('LOWER(name) LIKE ?', ["%{$query}%"]);
            }
            $folders = $foldersQuery->orderBy('name')->get();
        }

        $files = collect();
        if ($type !== 'Folders') {
            $filesQuery = FileModel::where('user_id', $user->id);
            if ($query) {
                $filesQuery->whereRaw('LOWER(name) LIKE ?', ["%{$query}%"]);
            }

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

            $files = $filesQuery->orderBy('name')->get();
        }

        return response()->json([
            'query' => $query,
            'type' => $type,
            'folders' => $folders,
            'files' => $files,
        ]);
    }
}
