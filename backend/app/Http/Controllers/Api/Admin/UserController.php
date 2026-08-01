<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $users = User::withCount(['files', 'folders'])
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at,
                    'used_storage' => $user->used_storage,
                    'storage_quota' => $user->storage_quota,
                    'quota_percentage' => round(($user->used_storage / max(1, $user->storage_quota)) * 100, 1),
                    'file_count' => $user->files_count,
                    'is_drive_enabled' => $user->is_drive_enabled,
                ];
            });

        return response()->json(['users' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['admin', 'user'])],
            'storage_quota' => ['nullable', 'integer', 'min:104857600'], // default 5GB
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'storage_quota' => $validated['storage_quota'] ?? 5368709120, // 5GB default
            'used_storage' => 0,
            'is_drive_enabled' => true,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $targetUser = User::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($targetUser->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['admin', 'user'])],
            'storage_quota' => ['required', 'integer', 'min:104857600'],
            'is_drive_enabled' => ['required', 'boolean'],
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'storage_quota' => $validated['storage_quota'],
            'is_drive_enabled' => $validated['is_drive_enabled'],
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $targetUser->update($updateData);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $targetUser,
        ]);
    }

    public function updateQuota(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $request->validate([
            'storage_quota' => ['required', 'integer', 'min:104857600'], // min 100MB
            'is_drive_enabled' => ['nullable', 'boolean'],
        ]);

        $targetUser = User::findOrFail($id);

        $targetUser->update([
            'storage_quota' => $request->storage_quota,
            'is_drive_enabled' => $request->has('is_drive_enabled') ? $request->is_drive_enabled : $targetUser->is_drive_enabled,
        ]);

        return response()->json([
            'message' => 'User storage quota updated successfully',
            'user' => $targetUser,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        if ($request->user()->id === $id) {
            return response()->json(['message' => 'You cannot delete your own admin account.'], 422);
        }

        $targetUser = User::findOrFail($id);
        $targetUser->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
