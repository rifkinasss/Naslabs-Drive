<?php

use App\Http\Controllers\Api\Admin\LogController as AdminLogController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\FolderController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\TrashController;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->name('login');
});

// File streaming routes (custom auth handled inside controller via Bearer header or ?token= query param)
Route::get('files/{uuid}/download', [FileController::class, 'download']);
Route::get('files/{uuid}/preview', [FileController::class, 'preview']);

// Protected routes (Sanctum auth)
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::put('password', [AuthController::class, 'updatePassword']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    // Folders
    Route::get('folders', [FolderController::class, 'index']);
    Route::post('folders', [FolderController::class, 'store']);
    Route::patch('folders/{uuid}/rename', [FolderController::class, 'rename']);
    Route::delete('folders/{uuid}', [FolderController::class, 'destroy']);

    // Files
    Route::post('files/upload', [FileController::class, 'store']);
    Route::patch('files/{uuid}/rename', [FileController::class, 'rename']);
    Route::delete('files/{uuid}', [FileController::class, 'destroy']);

    // Trash
    Route::get('trash', [TrashController::class, 'index']);
    Route::post('trash/{type}/{uuid}/restore', [TrashController::class, 'restore']);
    Route::delete('trash/{type}/{uuid}/permanent', [TrashController::class, 'permanentDelete']);
    Route::delete('trash/empty', [TrashController::class, 'emptyTrash']);

    // Search
    Route::get('search', [SearchController::class, 'index']);

    // Admin
    Route::prefix('admin')->group(function () {
        Route::get('users', [AdminUserController::class, 'index']);
        Route::post('users', [AdminUserController::class, 'store']);
        Route::put('users/{id}', [AdminUserController::class, 'update']);
        Route::patch('users/{id}/quota', [AdminUserController::class, 'updateQuota']);
        Route::delete('users/{id}', [AdminUserController::class, 'destroy']);
        Route::get('logs', [AdminLogController::class, 'index']);
    });
});
