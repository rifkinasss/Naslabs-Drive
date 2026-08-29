<?php

namespace Tests\Feature;

use App\Models\File as FileModel;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriveFileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_file_download_requires_authentication(): void
    {
        $this->getJson('/api/files/' . Str::uuid() . '/download')
            ->assertUnauthorized();
    }

    public function test_user_can_upload_and_download_a_file(): void
    {
        $user = User::factory()->create([
            'storage_quota' => 1024 * 1024,
            'used_storage' => 0,
            'is_drive_enabled' => true,
        ]);
        Sanctum::actingAs($user);

        $response = $this->post('/api/files/upload', [
            'file' => UploadedFile::fake()->createWithContent('notes.txt', 'private notes'),
        ]);

        $response->assertCreated();
        $uuid = $response->json('file.uuid');
        $file = FileModel::where('uuid', $uuid)->firstOrFail();

        $this->assertSame(13, $file->size);
        $this->assertSame(13, $user->fresh()->used_storage);

        $this->get("/api/files/{$uuid}/download")
            ->assertOk()
            ->assertDownload('notes.txt');

        Storage::disk('local')->assertExists($file->storage_path);
    }

    public function test_user_cannot_download_another_users_file(): void
    {
        $owner = User::factory()->create(['storage_quota' => 1024 * 1024]);
        $otherUser = User::factory()->create(['storage_quota' => 1024 * 1024]);
        Sanctum::actingAs($owner);

        $this->post('/api/files/upload', [
            'file' => UploadedFile::fake()->createWithContent('private.txt', 'owner only'),
        ])->assertCreated();

        $file = FileModel::firstOrFail();
        Sanctum::actingAs($otherUser);

        $this->getJson("/api/files/{$file->uuid}/download")
            ->assertNotFound();
    }

    public function test_upload_rejects_restricted_extensions(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/files/upload', [
            'file' => UploadedFile::fake()->create('danger.php', 10, 'text/plain'),
        ])->assertStatus(422)
            ->assertJsonPath('message', 'File extension .php is restricted for security.');
    }

    public function test_upload_rejects_files_over_quota(): void
    {
        $user = User::factory()->create([
            'storage_quota' => 5,
            'used_storage' => 0,
        ]);
        Sanctum::actingAs($user);

        $this->post('/api/files/upload', [
            'file' => UploadedFile::fake()->createWithContent('large.txt', 'too large'),
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Storage quota exceeded. Available quota is insufficient for this file.');
    }

    public function test_user_can_move_file_between_owned_folders(): void
    {
        $user = User::factory()->create(['storage_quota' => 1024 * 1024]);
        $source = Folder::create(['user_id' => $user->id, 'name' => 'Source']);
        $target = Folder::create(['user_id' => $user->id, 'name' => 'Target']);
        Sanctum::actingAs($user);

        $fileResponse = $this->post('/api/files/upload', [
            'file' => UploadedFile::fake()->createWithContent('move.txt', 'move me'),
            'folder_uuid' => $source->uuid,
        ])->assertCreated();

        $this->patchJson('/api/files/' . $fileResponse->json('file.uuid') . '/move', [
            'parent_uuid' => $target->uuid,
        ])->assertOk()
            ->assertJsonPath('file.folder_id', $target->id);
    }

    public function test_folder_cannot_move_into_its_descendant(): void
    {
        $user = User::factory()->create();
        $parent = Folder::create(['user_id' => $user->id, 'name' => 'Parent']);
        $child = Folder::create(['user_id' => $user->id, 'parent_id' => $parent->id, 'name' => 'Child']);
        Sanctum::actingAs($user);

        $this->patchJson('/api/folders/' . $parent->uuid . '/move', [
            'parent_uuid' => $child->uuid,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'A folder cannot be moved into itself or one of its descendants.');
    }

    public function test_admin_can_view_system_health(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/system/health')
            ->assertOk()
            ->assertJsonPath('status', 'healthy')
            ->assertJsonPath('checks.database.status', 'healthy')
            ->assertJsonPath('checks.storage.status', 'healthy');
    }

    public function test_regular_user_cannot_view_system_health(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/system/health')
            ->assertForbidden();
    }

    public function test_owner_can_create_and_use_a_share_link(): void
    {
        $user = User::factory()->create(['storage_quota' => 1024 * 1024]);
        Sanctum::actingAs($user);
        $upload = $this->post('/api/files/upload', [
            'file' => UploadedFile::fake()->createWithContent('shared.txt', 'shared content'),
        ])->assertCreated();

        $share = $this->postJson('/api/files/' . $upload->json('file.uuid') . '/shares', [
            'password' => 'secret',
            'max_downloads' => 1,
        ])->assertCreated()->json('share');

        $this->getJson('/api/share/' . $share['token'])
            ->assertOk()
            ->assertJsonPath('requires_password', true);
        $this->postJson('/api/share/' . $share['token'] . '/download', ['password' => 'wrong'])
            ->assertForbidden();
        $this->post('/api/share/' . $share['token'] . '/download', ['password' => 'secret'])
            ->assertOk()
            ->assertDownload('shared.txt');
        $this->postJson('/api/share/' . $share['token'] . '/download', ['password' => 'secret'])
            ->assertStatus(410);
    }

    public function test_reuploading_same_name_creates_a_restorable_version(): void
    {
        $user = User::factory()->create(['storage_quota' => 1024 * 1024]);
        Sanctum::actingAs($user);
        $first = $this->post('/api/files/upload', [
            'file' => UploadedFile::fake()->createWithContent('notes.txt', 'old content'),
        ])->assertCreated();
        $uuid = $first->json('file.uuid');

        $this->post('/api/files/upload', [
            'file' => UploadedFile::fake()->createWithContent('notes.txt', 'new content'),
        ])->assertCreated();

        $this->getJson("/api/files/{$uuid}/versions")
            ->assertOk()
            ->assertJsonCount(1, 'versions');
        $this->postJson("/api/files/{$uuid}/versions/1/restore")
            ->assertOk()
            ->assertJsonPath('file.size', 11);
    }
}
