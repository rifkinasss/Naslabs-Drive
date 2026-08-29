<?php

use App\Http\Controllers\Api\Admin\LogController as AdminLogController;
use App\Http\Controllers\Api\Admin\SystemController as AdminSystemController;
use App\Http\Controllers\Api\Admin\BackupController as AdminBackupController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\FolderController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ShareController;
use App\Http\Controllers\Api\VersionController;
use App\Http\Controllers\Api\TrashController;
use App\Http\Controllers\Api\ProductivityController;
use App\Http\Controllers\Api\GoogleOAuthController;
use App\Http\Controllers\Api\Admin\FileController as AdminFileController;
use App\Http\Controllers\Api\Admin\SettingsController as AdminSettingsController;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login');
    Route::post('verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
    Route::post('resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:3,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    Route::get('google/redirect', [GoogleOAuthController::class, 'redirect']);
    Route::get('google/callback', [GoogleOAuthController::class, 'callback']);
    Route::post('google/exchange', [GoogleOAuthController::class, 'exchangeLoginTicket']);
});
Route::get('system/branding', [AdminSettingsController::class, 'branding'])->middleware('throttle:60,1');

// Protected routes (Sanctum auth)
// Uploads may generate several requests per file (especially resumable
// uploads). Keep a bounded API limit while allowing normal batch uploads to
// finish without competing with the general dashboard requests.
Route::middleware(['auth:sanctum', 'maintenance', 'throttle:300,1'])->group(function () {
    // Auth
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::post('avatar', [AuthController::class, 'uploadAvatar']);
        Route::delete('avatar', [AuthController::class, 'removeAvatar']);
        Route::put('password', [AuthController::class, 'updatePassword']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('sessions', [AuthController::class, 'sessions']);
        Route::delete('sessions/{id}', [AuthController::class, 'revokeSession']);
        Route::delete('sessions', [AuthController::class, 'logoutAll']);
        Route::get('notifications', [AuthController::class, 'notifications']);
        Route::post('notifications/read', [AuthController::class, 'markNotificationsRead']);
        Route::get('activity', [AuthController::class, 'activity']);
        Route::post('token/regenerate', [AuthController::class, 'regenerateToken']);
        Route::get('google-drive/status', [GoogleOAuthController::class, 'userDriveStatus']);
        Route::get('google-drive/redirect-url', [GoogleOAuthController::class, 'userDriveRedirectUrl']);
        Route::get('google-drive/redirect', fn (Request $request) => app(GoogleOAuthController::class)->redirect($request, 'user-drive'));
        Route::delete('google-drive', [GoogleOAuthController::class, 'disconnectUserDrive']);
        Route::post('google-drive/files/{uuid}/export', [GoogleOAuthController::class, 'exportUserFile']);
    });

    // Folders
    Route::get('folders', [FolderController::class, 'index']);
    Route::post('folders', [FolderController::class, 'store']);
    Route::patch('folders/{uuid}/rename', [FolderController::class, 'rename']);
    Route::patch('folders/{uuid}/move', [FolderController::class, 'move']);
    Route::delete('folders/{uuid}', [FolderController::class, 'destroy']);
    Route::get('folders/{uuid}/download-zip', [FolderController::class, 'downloadZip']);

    // Files
    Route::post('files/upload', [FileController::class, 'store'])->middleware('throttle:60,1');
    Route::post('files/upload/resumable/start', [FileController::class, 'resumableStart'])->middleware('throttle:60,1');
    Route::post('files/upload/resumable/{uploadId}/chunk', [FileController::class, 'resumableChunk'])->middleware('throttle:600,1');
    Route::delete('files/upload/resumable/{uploadId}', [FileController::class, 'resumableCancel']);
    Route::post('files/upload/resumable/{uploadId}/complete', [FileController::class, 'resumableComplete'])->middleware('throttle:60,1');
    Route::get('files/{uuid}/download', [FileController::class, 'download']);
    Route::post('files/download-zip', [FileController::class, 'downloadZip']);
    Route::get('files/{uuid}/preview', [FileController::class, 'preview']);
    Route::patch('files/{uuid}/rename', [FileController::class, 'rename']);
    Route::patch('files/{uuid}/tags', [FileController::class, 'updateTags']);
    Route::patch('files/{uuid}/move', [FileController::class, 'move']);
    Route::delete('files/{uuid}', [FileController::class, 'destroy']);
    Route::post('files/{uuid}/shares', [ShareController::class, 'store']);
    Route::get('shares', [ShareController::class, 'index']);
    Route::delete('shares/{token}', [ShareController::class, 'destroy']);
    Route::post('folders/{uuid}/shares', [ShareController::class, 'folderStore']);
    Route::get('folder-shares', [ShareController::class, 'folderIndex']);
    Route::delete('folder-shares/{token}', [ShareController::class, 'folderDestroy']);
    Route::get('folder-shares/activity', [ShareController::class, 'folderActivity']);
    Route::get('files/{uuid}/versions', [VersionController::class, 'index']);
    Route::post('files/{uuid}/versions/{version}/restore', [VersionController::class, 'restore']);

    // Trash
    Route::get('trash', [TrashController::class, 'index']);
    Route::post('trash/{type}/{uuid}/restore', [TrashController::class, 'restore']);
    Route::delete('trash/{type}/{uuid}/permanent', [TrashController::class, 'permanentDelete']);
    Route::delete('trash/empty', [TrashController::class, 'emptyTrash']);

    // Search
    Route::get('search', [SearchController::class, 'index']);
    Route::get('productivity/insights', [ProductivityController::class, 'insights']);
    Route::patch('productivity/{type}/{uuid}/favorite', [ProductivityController::class, 'toggleFavorite']);

    // Admin
    Route::prefix('admin')->group(function () {
        Route::get('users', [AdminUserController::class, 'index']);
        Route::post('users', [AdminUserController::class, 'store']);
        Route::put('users/{id}', [AdminUserController::class, 'update']);
        Route::patch('users/{id}/quota', [AdminUserController::class, 'updateQuota']);
        Route::post('users/{id}/resend-verification', [AdminUserController::class, 'resendVerification']);
        Route::post('users/{id}/verify-email', [AdminUserController::class, 'verifyEmail']);
        Route::post('users/{id}/revoke-sessions', [AdminUserController::class, 'revokeSessions']);
        Route::post('users/{id}/avatar', [AdminUserController::class, 'uploadAvatar']);
        Route::delete('users/{id}/avatar', [AdminUserController::class, 'removeAvatar']);
        Route::delete('users/{id}', [AdminUserController::class, 'destroy']);
        Route::get('logs', [AdminLogController::class, 'index']);
        Route::get('logs/export', [AdminLogController::class, 'export']);
        Route::get('system/health', [AdminSystemController::class, 'health']);
        Route::get('system/storage', [AdminSystemController::class, 'storage']);
        Route::post('system/storage/cleanup', [AdminSystemController::class, 'cleanupStorage']);
        Route::get('system/analytics', [AdminSystemController::class, 'analytics']);
        Route::get('google/drive/status', [GoogleOAuthController::class, 'driveStatus']);
        Route::get('google/drive/redirect-url', [GoogleOAuthController::class, 'driveRedirectUrl']);
        Route::get('google/drive/redirect', fn (Request $request) => app(GoogleOAuthController::class)->redirect($request, 'drive'));
        Route::delete('google/drive', [GoogleOAuthController::class, 'disconnectDrive']);
        Route::get('google/drive/files', [GoogleOAuthController::class, 'driveFiles']);
        Route::post('google/drive/files/{googleId}/import', [GoogleOAuthController::class, 'importDriveFile']);
        Route::post('google/drive/files/{uuid}/export', [GoogleOAuthController::class, 'exportFile']);
        Route::get('system/settings', [AdminSettingsController::class, 'index']);
        Route::put('system/settings', [AdminSettingsController::class, 'update']);
        Route::post('system/branding/{asset}', [AdminSettingsController::class, 'uploadAsset']);
        Route::delete('system/branding/{asset}', [AdminSettingsController::class, 'removeAsset']);
        Route::get('files', [AdminFileController::class, 'index']);
        Route::delete('files/{uuid}', [AdminFileController::class, 'destroy']);
        Route::get('backups', [AdminBackupController::class, 'index']);
        Route::post('backups/run', [AdminBackupController::class, 'run'])->middleware('throttle:2,1');
        Route::post('backups/{name}/restore', [AdminBackupController::class, 'restore'])->middleware('throttle:2,1');
        Route::delete('backups/{name}', [AdminBackupController::class, 'destroy']);
        Route::get('backups/{name}/preview', [AdminBackupController::class, 'preview']);
    });
});

Route::get('share/{token}', [ShareController::class, 'info'])->middleware('throttle:60,1');
Route::post('share/{token}/download', [ShareController::class, 'download'])->middleware('throttle:30,1');
Route::get('folder-share/{token}', [ShareController::class, 'folderInfo'])->middleware('throttle:60,1');
Route::post('folder-share/{token}/contents', [ShareController::class, 'folderContents'])->middleware('throttle:60,1');
Route::get('folder-share/{token}/files/{uuid}/download', [ShareController::class, 'folderDownloadFile'])->middleware('throttle:30,1');
Route::get('folder-share/{token}/files/{uuid}/preview', [ShareController::class, 'folderPreviewFile'])->middleware('throttle:30,1');
Route::post('folder-share/{token}/upload', [ShareController::class, 'folderUpload'])->middleware('throttle:20,1');
Route::post('folder-share/{token}/folders', [ShareController::class, 'folderCreate'])->middleware('throttle:30,1');
Route::patch('folder-share/{token}/files/{uuid}', [ShareController::class, 'folderRenameFile'])->middleware('throttle:60,1');
Route::delete('folder-share/{token}/files/{uuid}', [ShareController::class, 'folderDeleteFile'])->middleware('throttle:60,1');
