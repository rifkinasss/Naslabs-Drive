<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\FileShare;
use App\Models\FolderShare;
use App\Services\EmailVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    public function __construct(private EmailVerificationService $emailVerificationService)
    {
    }

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

        // OTP is currently required for administrator accounts only.
        // Regular users can use the drive while user verification is deferred.
        if ($user->isAdmin() && !$user->email_verified_at) {
            $this->emailVerificationService->issueOtp($user);
            return response()->json([
                'message' => 'Verification code sent to your email.',
                'verification_required' => true,
                'email' => $user->email,
            ], 403);
        }

        return $this->authenticatedResponse($user, $request);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $status = Password::sendResetLink(['email' => strtolower($data['email'])]);

        // Avoid leaking whether an email exists, while still allowing the UI to guide the user.
        return response()->json([
            'message' => __($status === Password::RESET_LINK_SENT
                ? 'A password reset link has been sent to your email.'
                : 'If the account exists, a password reset link will be sent shortly.'),
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password): void {
            $user->forceFill(['password' => Hash::make($password)])->save();
            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json(['message' => 'Password reset successfully. You can sign in now.']);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $user = User::where('email', $validated['email'])->first();
        $code = $user?->loginOtpCodes()->whereNull('consumed_at')->latest()->first();

        if (!$user || !$code || $code->expires_at->isPast()) {
            return response()->json(['message' => 'This verification code is invalid or expired.'], 422);
        }

        if ($code->attempts >= 5) {
            $code->update(['consumed_at' => now()]);
            return response()->json(['message' => 'Too many attempts. Please request a new code.'], 422);
        }

        if (!Hash::check($validated['otp'], $code->code_hash)) {
            $code->increment('attempts');
            return response()->json(['message' => 'The verification code is incorrect.'], 422);
        }

        $code->update(['consumed_at' => now()]);
        $user->update(['email_verified_at' => now()]);

        return $this->authenticatedResponse($user->fresh(), $request);
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', $validated['email'])->first();

        if (!$user || $user->email_verified_at) {
            return response()->json(['message' => 'Unable to send a verification code for this account.'], 422);
        }

        $recent = $user->loginOtpCodes()->latest()->first();
        if ($recent && $recent->created_at->gt(now()->subSeconds(60))) {
            return response()->json(['message' => 'Please wait before requesting another code.'], 429);
        }

        $this->emailVerificationService->issueOtp($user);
        return response()->json(['message' => 'A new verification code was sent to your email.']);
    }

    private function authenticatedResponse(User $user, Request $request): JsonResponse
    {
        $token = $user->createToken('drive-token')->plainTextToken;
        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user, $request),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->userPayload($user, $request),
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
            'user' => $this->userPayload($user, $request),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $validated['avatar']->store('avatars', 'public');
        $user->update(['avatar_path' => $path]);

        return response()->json([
            'message' => 'Profile photo updated successfully',
            'user' => $this->userPayload($user->fresh(), $request),
        ]);
    }

    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return response()->json([
            'message' => 'Profile photo removed successfully',
            'user' => $this->userPayload($user->fresh(), $request),
        ]);
    }

    private function userPayload(User $user, Request $request): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar_path
                ? $request->getSchemeAndHttpHost() . '/storage/' . ltrim($user->avatar_path, '/')
                : null,
            'role' => $user->role,
            'created_at' => $user->created_at,
            'drive' => [
                'storage_quota' => $user->storage_quota,
                'used_storage' => $user->used_storage,
                'available_storage' => max(0, $user->storage_quota - $user->used_storage),
                'quota_percentage' => round(($user->used_storage / max(1, $user->storage_quota)) * 100, 1),
                'is_drive_enabled' => $user->is_drive_enabled,
            ],
        ];
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

    public function sessions(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;
        $sessions = $request->user()->tokens()->latest()->get()->map(fn (PersonalAccessToken $token) => [
            'id' => $token->id,
            'name' => $token->name,
            'created_at' => $token->created_at,
            'last_used_at' => $token->last_used_at,
            'is_current' => $token->id === $currentId,
        ]);
        return response()->json(['sessions' => $sessions]);
    }

    public function revokeSession(Request $request, int $id): JsonResponse
    {
        $deleted = $request->user()->tokens()->whereKey($id)->delete();
        if (!$deleted) return response()->json(['message' => 'Session not found.'], 404);
        return response()->json(['message' => 'Session revoked successfully.']);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'All sessions revoked successfully.']);
    }

    public function notifications(Request $request): JsonResponse
    {
        $user = $request->user();
        $notifications = collect();
        $quotaAlertPercent = (int) (SystemSetting::where('key', 'quota_alert_percent')->value('value') ?: 80);
        if ($user->storage_quota > 0 && ($user->used_storage / $user->storage_quota) >= ($quotaAlertPercent / 100)) {
            $notifications->push(['id' => 'quota', 'type' => 'warning', 'title' => 'Storage almost full', 'message' => "Your storage usage is above {$quotaAlertPercent}%."]);
        }
        $user->load('files.shares');
        FileShare::with(['file', 'creator'])->whereHas('recipients', fn ($q) => $q->where('user_id', $user->id))->latest()->limit(10)->get()->each(function ($share) use ($notifications) {
            $notifications->push(['id' => 'received-file-share-' . $share->id, 'type' => 'info', 'title' => 'A file was shared with you', 'message' => $share->creator->name . ' shared ' . $share->file->name . ' with you.']);
        });
        FolderShare::with(['folder', 'creator'])->whereHas('recipients', fn ($q) => $q->where('user_id', $user->id))->latest()->limit(10)->get()->each(function ($share) use ($notifications) {
            $notifications->push(['id' => 'received-folder-share-' . $share->id, 'type' => 'info', 'title' => 'A folder was shared with you', 'message' => $share->creator->name . ' shared ' . $share->folder->name . ' with you.']);
        });
        $user->files->flatMap->shares->filter(fn ($share) => $share->expires_at && $share->expires_at->isFuture() && now()->diffInDays($share->expires_at, false) <= 3)->each(function ($share) use ($notifications) {
            $notifications->push(['id' => 'share-' . $share->id, 'type' => 'info', 'title' => 'Shared link expiring soon', 'message' => $share->file->name . ' link expires ' . $share->expires_at->toDateString() . '.']);
        });
        $user->activityLogs()->latest()->limit(5)->get()->each(function ($activity) use ($notifications) {
            if (in_array($activity->action, ['upload', 'download', 'delete', 'restore'], true)) {
                $notifications->push(['id' => 'activity-' . $activity->id, 'type' => 'info', 'title' => ucfirst($activity->action) . ' completed', 'message' => $activity->subject_name . ' was processed successfully.']);
            }
        });

        $notifications = $notifications->unique('id')->take(20)->values();
        $readIds = $user->notificationReads()->whereIn('notification_id', $notifications->pluck('id'))->pluck('notification_id')->all();
        return response()->json(['notifications' => $notifications->map(fn ($notification) => [...$notification, 'read' => in_array($notification['id'], $readIds, true)])]);
    }

    public function markNotificationsRead(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:100'], 'ids.*' => ['string', 'max:120']]);
        $now = now();
        foreach (array_unique($data['ids']) as $notificationId) {
            $request->user()->notificationReads()->updateOrCreate(['notification_id' => $notificationId], ['read_at' => $now]);
        }
        return response()->json(['message' => 'Notifications marked as read.']);
    }

    public function activity(Request $request): JsonResponse
    {
        $activities = $request->user()->activityLogs()->latest()->limit(20)->get();
        return response()->json(['activities' => $activities]);
    }

    public function regenerateToken(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        $token = $request->user()->createToken('drive-token')->plainTextToken;
        return response()->json(['token' => $token]);
    }
}
