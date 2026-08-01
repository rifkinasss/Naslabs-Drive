<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'The provided credentials do not match our records.'
            ], 422);
        }

        if (!$user->is_drive_enabled) {
            return response()->json([
                'message' => 'Your drive access has been disabled by admin.'
            ], 403);
        }

        $token = $user->createToken('drive-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'drive' => [
                    'storage_quota' => $user->storage_quota,
                    'used_storage' => $user->used_storage,
                    'available_storage' => max(0, $user->storage_quota - $user->used_storage),
                    'quota_percentage' => round(($user->used_storage / max(1, $user->storage_quota)) * 100, 1),
                    'is_drive_enabled' => $user->is_drive_enabled,
                ],
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'drive' => [
                    'storage_quota' => $user->storage_quota,
                    'used_storage' => $user->used_storage,
                    'available_storage' => max(0, $user->storage_quota - $user->used_storage),
                    'quota_percentage' => round(($user->used_storage / max(1, $user->storage_quota)) * 100, 1),
                    'is_drive_enabled' => $user->is_drive_enabled,
                ],
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $user->update(['name' => $validated['name']]);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'drive' => [
                    'storage_quota' => $user->storage_quota,
                    'used_storage' => $user->used_storage,
                    'available_storage' => max(0, $user->storage_quota - $user->used_storage),
                    'quota_percentage' => round(($user->used_storage / max(1, $user->storage_quota)) * 100, 1),
                    'is_drive_enabled' => $user->is_drive_enabled,
                ],
            ],
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The provided current password does not match our records.'
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Successfully logged out']);
    }
}
