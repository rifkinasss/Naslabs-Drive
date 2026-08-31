'use client'

import { useParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List, FolderPlus, Loader2, Trash2, Download, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileCard } from '@/components/drive/FileCard'
import { FolderCard } from '@/components/drive/FolderCard'
import { FileRow, FolderRow } from '@/components/drive/FileRow'
import { DriveBreadcrumb } from '@/components/drive/DriveBreadcrumb'
import { UploadZone } from '@/components/drive/UploadZone'
import { EmptyState } from '@/components/drive/EmptyState'
import { UploadMenu } from '@/components/drive/UploadMenu'
import { CreateFolderDialog, RenameDialog, MoveDialog } from '@/components/drive/DriveDialogs'
import { FilePreviewModal } from '@/components/drive/FilePreviewModal'
import { ShareDialog } from '@/components/drive/ShareDialog'
import { FolderShareDialog } from '@/components/drive/FolderShareDialog'
import { VersionHistoryDialog } from '@/components/drive/VersionHistoryDialog'
import { DriveItemList } from '@/components/drive/DriveItemList'
import { SortMenu, DriveSort } from '@/components/drive/SortMenu'
import { DriveFilterMenu, DriveFilter } from '@/components/drive/DriveFilterMenu'
import {
  fetchDrive, createFolder, renameFolder, deleteFolder,
  uploadFile, renameFile, deleteFile, fetchAllFolders, moveFile, moveFolder, toggleFavorite, downloadFolderZip, downloadFilesZip
} from '@/services/drive-api'
import { useAuth } from '@/providers/AuthProvider'
import { DriveFile, DriveFolder } from '@/types/drive'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-client'

export default function FolderPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<DriveFile | DriveFolder | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set())
  const [moveTarget, setMoveTarget] = useState<DriveFile | DriveFolder | null>(null)
  const [shareTarget, setShareTarget] = useState<DriveFile | null>(null)
  const [folderShareTarget, setFolderShareTarget] = useState<DriveFolder | null>(null)
  const [versionTarget, setVersionTarget] = useState<DriveFile | null>(null)
  const [sortBy, setSortBy] = useState<DriveSort>('name')
  const [filter, setFilter] = useState<DriveFilter>('all')
  const [conflict, setConflict] = useState<'replace' | 'keep_both' | 'skip'>('replace')
  useEffect(() => {
    const saved = localStorage.getItem('drive_sort_by')
    if (saved === 'updated_at' || saved === 'size' || saved === 'type') {
      // localStorage is client-only; apply it after hydration is complete.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSortBy(saved)
    }
  }, [])

  // Fetch Folder Contents
  const { data, isLoading } = useQuery({
    queryKey: ['drive', uuid],
    queryFn: () => fetchDrive(uuid),
    enabled: !!uuid,
  })

  const folders = data?.folders ?? []
  const files = data?.files ?? []
  const breadcrumbs = data?.breadcrumbs ?? [{ id: null, uuid: null, name: 'My Drive' }]
  const { data: allFolders = [] } = useQuery({ queryKey: ['drive-folders-all'], queryFn: fetchAllFolders })
  const displayedFolders = [...folders].sort((a, b) => sortBy === 'updated_at' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : a.name.localeCompare(b.name))
  const displayedFiles = [...files].sort((a, b) => {
    if (sortBy === 'size') return b.size - a.size
    if (sortBy === 'updated_at') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    return a.name.localeCompare(b.name)
  })
  const handleSortChange = (next: DriveSort) => { setSortBy(next); localStorage.setItem('drive_sort_by', next) }

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createFolder(name, uuid, color),
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
      toast.success(`Folder "${newFolder.name}" created`)
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to create folder')),
  })

  const renameMutation = useMutation({
    mutationFn: async ({ isFile, targetUuid, newName, color }: { isFile: boolean; targetUuid: string; newName: string; color?: string }) => {
      return isFile ? renameFile(targetUuid, newName) : renameFolder(targetUuid, newName, color)
    },
    onSuccess: (updatedItem) => {
      if ('extension' in updatedItem) setPreviewFile(current => current?.uuid === updatedItem.uuid ? { ...current, name: updatedItem.name, updated_at: updatedItem.updated_at } : current)
      queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to rename')),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (targetUuid: string) => deleteFolder(targetUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
      toast.success('Folder moved to Trash')
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: (targetUuid: string) => deleteFile(targetUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
      refreshUser()
      toast.success('File moved to Trash')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => Promise.all([...selectedUuids].map(targetUuid => folders.some(folder => folder.uuid === targetUuid) ? deleteFolder(targetUuid) : deleteFile(targetUuid))),
    onSuccess: () => {
      setSelectedUuids(new Set())
      queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
      refreshUser()
      toast.success('Selected files moved to Trash')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to delete selected files')),
  })
  const bulkFavorite = async () => { try { await Promise.all([...selectedUuids].map(targetUuid => toggleFavorite(folders.some(folder => folder.uuid === targetUuid) ? 'folder' : 'file', targetUuid))); setSelectedUuids(new Set()); queryClient.invalidateQueries({ queryKey: ['drive'] }); toast.success('Selected items updated') } catch (error: unknown) { toast.error(getApiErrorMessage(error, 'Unable to update favorites')) } }
  const bulkDownload = async () => { try { const fileUuids = [...selectedUuids].filter(targetUuid => files.some(file => file.uuid === targetUuid)); if (!fileUuids.length) { toast.info('Select at least one file to download'); return } const blob = await downloadFilesZip(fileUuids); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'cloud-nl-files.zip'; anchor.click(); URL.revokeObjectURL(url); toast.success('Selected files downloaded') } catch (error: unknown) { toast.error(getApiErrorMessage(error, 'Unable to download selected files')) } }

  const moveMutation = useMutation<DriveFile | DriveFolder, Error, string | null>({
    mutationFn: (parentUuid: string | null) => {
      if (!moveTarget) throw new Error('No move target selected')
      return 'extension' in moveTarget ? moveFile(moveTarget.uuid, parentUuid) : moveFolder(moveTarget.uuid, parentUuid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive'] })
      queryClient.invalidateQueries({ queryKey: ['drive-folders-all'] })
      setMoveTarget(null)
      toast.success('Item moved successfully')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to move item')),
  })

  const dropMutation = useMutation<DriveFile | DriveFolder, Error, { targetFolderUuid: string; item: { kind: 'file' | 'folder'; uuid: string } }>({
    mutationFn: ({ targetFolderUuid, item }: { targetFolderUuid: string; item: { kind: 'file' | 'folder'; uuid: string } }) => item.kind === 'file' ? moveFile(item.uuid, targetFolderUuid) : moveFolder(item.uuid, targetFolderUuid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drive'] }); queryClient.invalidateQueries({ queryKey: ['drive-folders-all'] }); toast.success('Item moved into folder') },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Unable to move item into folder')),
  })

  const favoriteMutation = useMutation({
    mutationFn: ({ type, uuid }: { type: 'file' | 'folder'; uuid: string }) => toggleFavorite(type, uuid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drive'] }); queryClient.invalidateQueries({ queryKey: ['drive-insights'] }); toast.success('Favorites updated') },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Unable to update favorite')),
  })

  const handlePreview = (file: DriveFile) => {
    setPreviewFile(file)
    setPreviewOpen(true)
  }
  const handleDownloadFolder = async (folder: DriveFolder) => {
    try { const blob = await downloadFolderZip(folder.uuid); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${folder.name}.zip`; anchor.click(); URL.revokeObjectURL(url); toast.success('Folder archive downloaded') } catch (error: unknown) { toast.error(getApiErrorMessage(error, 'Unable to download folder')) }
  }

  const handleRename = (item: DriveFile | DriveFolder) => {
    setRenameTarget(item)
    setRenameOpen(true)
  }

  const handleRenameConfirm = (targetUuid: string, newName: string, color?: string) => {
    if (!renameTarget) return
    const isFile = 'extension' in renameTarget
    renameMutation.mutate({ isFile, targetUuid, newName, color })
  }

  const handleFilesAdded = async (fileList: File[], selectedConflict = conflict) => {
    if (fileList.length) window.dispatchEvent(new CustomEvent('cloud:queue-upload', { detail: fileList }))
  }

  const handleUploadFile = async (file: File, onProgress: (percentage: number) => void, selectedConflict = conflict, signal?: AbortSignal) => {
    await uploadFile(file, uuid, onProgress, selectedConflict, signal)
    void queryClient.invalidateQueries({ queryKey: ['drive', uuid] }).catch(() => undefined)
    void Promise.resolve(refreshUser()).catch(() => undefined)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length) {
      handleFilesAdded(selected)
      e.target.value = ''
    }
  }

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length) handleFilesAdded(selected)
    e.target.value = ''
  }

  const isEmpty = !isLoading && (displayedFolders.length === 0 && displayedFiles.length === 0 || filter === 'favorites' && !folders.some(folder => folder.is_favorite) && !files.some(file => file.is_favorite))

  return (
    <UploadZone conflict={conflict} onFilesAdded={files => handleFilesAdded(files)} onUploadFile={handleUploadFile}>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-card/90 px-3 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:px-6 sm:py-4 shrink-0">
          <div className="min-w-0"><DriveBreadcrumb items={breadcrumbs} /></div>
          <div className="ml-0 flex w-full flex-wrap items-center gap-2 pb-0.5 sm:ml-auto sm:w-auto sm:justify-end">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
            <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleFolderInput} {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} />
            {selectedUuids.size > 0 && (
              <><Button size="sm" variant="outline" onClick={bulkDownload} className="gap-1.5"><Download className="w-4 h-4" /> Download</Button><Button size="sm" variant="outline" onClick={bulkFavorite} className="gap-1.5"><Star className="w-4 h-4" /> Favorite</Button><Button size="sm" variant="destructive" onClick={() => bulkDeleteMutation.mutate()} className="gap-1.5"><Trash2 className="w-4 h-4" /> Delete {selectedUuids.size}</Button></>
            )}
            <UploadMenu fileInputRef={fileInputRef} folderInputRef={folderInputRef} conflict={conflict} onConflictChange={setConflict} onFilesDropped={files => handleFilesAdded(files)} />
            <Button size="sm" variant="outline" onClick={() => setCreateFolderOpen(true)} className="gap-1.5">
              <FolderPlus className="w-4 h-4" /> New Folder
            </Button>
            <SortMenu value={sortBy} onChange={handleSortChange} />
            <DriveFilterMenu value={filter} onChange={setFilter} />
            <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
            <div className="flex items-center rounded-md border border-border p-0.5">
              <button onClick={() => setView('grid')} className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading folder...
            </div>
          ) : isEmpty ? (
            <EmptyState variant="folder" />
          ) : (
            <>
              <DriveItemList filter={filter} folders={folders} files={files} view={view} sortBy={sortBy} selectedUuids={selectedUuids} onSelect={targetUuid => setSelectedUuids(prev => { const next = new Set(prev); next.has(targetUuid) ? next.delete(targetUuid) : next.add(targetUuid); return next })} onDeleteFile={u => deleteFileMutation.mutate(u)} onDeleteFolder={u => deleteFolderMutation.mutate(u)} onRename={handleRename} onMove={setMoveTarget} onPreview={handlePreview} onShare={setShareTarget} onShareFolder={setFolderShareTarget} onDownloadFolder={handleDownloadFolder} onVersions={setVersionTarget} onDropItem={(targetFolderUuid, item) => dropMutation.mutate({ targetFolderUuid, item })} onToggleFavorite={(type, uuid) => favoriteMutation.mutate({ type, uuid })} />
              {false && displayedFolders.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Folders</h2>
                  {view === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                      {displayedFolders.map(f => (
                        <FolderCard
                          key={f.uuid}
                          folder={f}
                          onDelete={u => deleteFolderMutation.mutate(u)}
                          onRename={handleRename}
                          onMove={setMoveTarget}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      {displayedFolders.map(f => (
                        <FolderRow
                          key={f.uuid}
                          folder={f}
                          onDelete={u => deleteFolderMutation.mutate(u)}
                          onRename={handleRename}
                          onMove={setMoveTarget}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
              {false && displayedFiles.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Files</h2>
                  {view === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                      {displayedFiles.map(f => (
                        <FileCard
                          key={f.uuid}
                          file={f}
                          selected={selectedUuids.has(f.uuid)}
                          onSelect={targetUuid => setSelectedUuids(prev => { const next = new Set(prev); next.has(targetUuid) ? next.delete(targetUuid) : next.add(targetUuid); return next })}
                          onDelete={u => deleteFileMutation.mutate(u)}
                          onRename={handleRename}
                          onMove={setMoveTarget}
                          onPreview={handlePreview}
                          onShare={setShareTarget}
                          onVersions={setVersionTarget}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      {displayedFiles.map(f => (
                        <FileRow
                          key={f.uuid}
                          file={f}
                          selected={selectedUuids.has(f.uuid)}
                          onSelect={targetUuid => setSelectedUuids(prev => { const next = new Set(prev); next.has(targetUuid) ? next.delete(targetUuid) : next.add(targetUuid); return next })}
                          onDelete={u => deleteFileMutation.mutate(u)}
                          onRename={handleRename}
                          onMove={setMoveTarget}
                          onPreview={handlePreview}
                          onShare={setShareTarget}
                          onVersions={setVersionTarget}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
      <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} onConfirm={(name, color) => createFolderMutation.mutate({ name, color })} />
      <RenameDialog key={renameTarget?.uuid ?? 'rename-dialog'} open={renameOpen} onOpenChange={setRenameOpen} item={renameTarget} onConfirm={handleRenameConfirm} />
      <FilePreviewModal file={previewFile} allFiles={files} open={previewOpen} onOpenChange={setPreviewOpen} onFileChange={setPreviewFile} />
      <ShareDialog file={shareTarget} open={shareTarget !== null} onOpenChange={open => { if (!open) setShareTarget(null) }} />
      <FolderShareDialog folder={folderShareTarget} open={folderShareTarget !== null} onOpenChange={open => { if (!open) setFolderShareTarget(null) }} />
      <VersionHistoryDialog file={versionTarget} open={versionTarget !== null} onOpenChange={open => { if (!open) setVersionTarget(null) }} onRestored={() => queryClient.invalidateQueries({ queryKey: ['drive', uuid] })} />
      <MoveDialog
        open={moveTarget !== null}
        onOpenChange={open => { if (!open) setMoveTarget(null) }}
        item={moveTarget}
        folders={allFolders}
        onConfirm={parentUuid => moveMutation.mutate(parentUuid)}
      />
    </UploadZone>
  )
}
