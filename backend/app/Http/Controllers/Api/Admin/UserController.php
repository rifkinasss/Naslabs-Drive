<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailVerificationService;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Models\SystemSetting;

class UserController extends Controller
{
    public function __construct(
        private EmailVerificationService $emailVerificationService,
        private ActivityLogService $logService
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $users = User::withCount(['files', 'folders'])
            ->orderBy('name')
            ->get()
            ->map(function ($user) use ($request) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_path
                        ? $request->getSchemeAndHttpHost() . '/storage/' . ltrim($user->avatar_path, '/')
                        : null,
                    'role' => $user->role,
                    'created_at' => $user->created_at,
                    'email_verified_at' => $user->email_verified_at,
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
        if (!$request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['admin', 'manager', 'user'])],
            'storage_quota' => ['nullable', 'integer', 'min:104857600'], // minimum 100MB
        ]);

        if ($request->user()->isManager() && $validated['role'] === 'admin') {
            return response()->json(['message' => 'Managers cannot create admin accounts.'], 403);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'storage_quota' => $validated['storage_quota'] ?? ((int) (SystemSetting::where('key', 'default_quota_gb')->value('value') ?: 100) * 1024 * 1024 * 1024),
            'used_storage' => 0,
            'is_drive_enabled' => true,
            'email_verified_at' => null,
        ]);

        $this->emailVerificationService->issueOtp($user);
        $this->logService->log($request->user(), 'create_user', 'user', $user->name, $user->id, $request);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $targetUser = User::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($targetUser->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['admin', 'manager', 'user'])],
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

        if ($targetUser->email !== $validated['email']) {
            $updateData['email_verified_at'] = null;
        }

        $targetUser->update($updateData);
        $this->logService->log($request->user(), 'update_user', 'user', $targetUser->name, $targetUser->id, $request);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $targetUser,
        ]);
    }

    public function updateQuota(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
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

    public function resendVerification(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $targetUser = User::findOrFail($id);
        if ($targetUser->email_verified_at) {
            return response()->json(['message' => 'This email is already verified.'], 422);
        }

        $recent = $targetUser->loginOtpCodes()->latest()->first();
        if ($recent && $recent->created_at->gt(now()->subSeconds(60))) {
            return response()->json(['message' => 'Please wait before sending another verification code.'], 429);
        }

        $this->emailVerificationService->issueOtp($targetUser);
        return response()->json(['message' => 'Verification code sent successfully.']);
    }

    public function verifyEmail(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $targetUser = User::findOrFail($id);
        $targetUser->update(['email_verified_at' => $targetUser->email_verified_at ?? now()]);
        $targetUser->loginOtpCodes()->whereNull('consumed_at')->update(['consumed_at' => now()]);

        return response()->json(['message' => 'User email verified successfully.']);
    }

    public function revokeSessions(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
            return response()->json(['message' => 'Unauthorized admin access'], 403);
        }

        $targetUser = User::findOrFail($id);
        $count = $targetUser->tokens()->count();
        $targetUser->tokens()->delete();
        return response()->json(['message' => "{$count} session(s) revoked successfully."]);
    }

    public function uploadAvatar(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) return response()->json(['message' => 'Unauthorized admin access'], 403);
        $targetUser = User::findOrFail($id);
        $validated = $request->validate(['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);
        if ($targetUser->avatar_path) Storage::disk('public')->delete($targetUser->avatar_path);
        $targetUser->update(['avatar_path' => $validated['avatar']->store('avatars', 'public')]);
        return response()->json(['message' => 'User profile photo updated successfully.']);
    }

    public function removeAvatar(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) return response()->json(['message' => 'Unauthorized admin access'], 403);
        $targetUser = User::findOrFail($id);
        if ($targetUser->avatar_path) Storage::disk('public')->delete($targetUser->avatar_path);
        $targetUser->update(['avatar_path' => null]);
        return response()->json(['message' => 'User profile photo removed successfully.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->canManageUsers()) {
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
