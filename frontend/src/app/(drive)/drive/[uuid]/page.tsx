'use client'

import { useParams } from 'next/navigation'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List, Upload, FolderPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileCard } from '@/components/drive/FileCard'
import { FolderCard } from '@/components/drive/FolderCard'
import { FileRow, FolderRow } from '@/components/drive/FileRow'
import { DriveBreadcrumb } from '@/components/drive/DriveBreadcrumb'
import { UploadZone } from '@/components/drive/UploadZone'
import { EmptyState } from '@/components/drive/EmptyState'
import { CreateFolderDialog, RenameDialog } from '@/components/drive/DriveDialogs'
import { FilePreviewModal } from '@/components/drive/FilePreviewModal'
import {
  fetchDrive, createFolder, renameFolder, deleteFolder,
  uploadFile, renameFile, deleteFile
} from '@/services/drive-api'
import { useAuth } from '@/providers/AuthProvider'
import { DriveFile, DriveFolder } from '@/types/drive'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function FolderPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<DriveFile | DriveFolder | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Fetch Folder Contents
  const { data, isLoading } = useQuery({
    queryKey: ['drive', uuid],
    queryFn: () => fetchDrive(uuid),
    enabled: !!uuid,
  })

  const folders = data?.folders ?? []
  const files = data?.files ?? []
  const breadcrumbs = data?.breadcrumbs ?? [{ id: null, uuid: null, name: 'My Drive' }]

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createFolder(name, uuid),
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
      toast.success(`Folder "${newFolder.name}" created`)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create folder'),
  })

  const renameMutation = useMutation({
    mutationFn: async ({ isFile, targetUuid, newName }: { isFile: boolean; targetUuid: string; newName: string }) => {
      return isFile ? renameFile(targetUuid, newName) : renameFolder(targetUuid, newName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to rename'),
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

  const handlePreview = (file: DriveFile) => {
    setPreviewFile(file)
    setPreviewOpen(true)
  }

  const handleRename = (item: DriveFile | DriveFolder) => {
    setRenameTarget(item)
    setRenameOpen(true)
  }

  const handleRenameConfirm = (targetUuid: string, newName: string) => {
    if (!renameTarget) return
    const isFile = 'extension' in renameTarget
    renameMutation.mutate({ isFile, targetUuid, newName })
  }

  const handleFilesAdded = async (fileList: File[]) => {
    for (const f of fileList) {
      try {
        await uploadFile(f, uuid)
        queryClient.invalidateQueries({ queryKey: ['drive', uuid] })
        refreshUser()
      } catch (err: any) {
        toast.error(err.response?.data?.message || `Failed to upload ${f.name}`)
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length) {
      handleFilesAdded(selected)
      e.target.value = ''
    }
  }

  const isEmpty = !isLoading && folders.length === 0 && files.length === 0

  return (
    <UploadZone onFilesAdded={handleFilesAdded}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border shrink-0">
          <DriveBreadcrumb items={breadcrumbs} />
          <div className="ml-auto flex items-center gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
              <Upload className="w-4 h-4" /> Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreateFolderOpen(true)} className="gap-1.5">
              <FolderPlus className="w-4 h-4" /> New Folder
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
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

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading folder...
            </div>
          ) : isEmpty ? (
            <EmptyState variant="folder" />
          ) : (
            <>
              {folders.length > 0 && (
                <section className="mb-6">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Folders</h2>
                  {view === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                      {folders.map(f => (
                        <FolderCard
                          key={f.uuid}
                          folder={f}
                          onDelete={u => deleteFolderMutation.mutate(u)}
                          onRename={handleRename}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      {folders.map(f => (
                        <FolderRow
                          key={f.uuid}
                          folder={f}
                          onDelete={u => deleteFolderMutation.mutate(u)}
                          onRename={handleRename}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
              {files.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Files</h2>
                  {view === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                      {files.map(f => (
                        <FileCard
                          key={f.uuid}
                          file={f}
                          onDelete={u => deleteFileMutation.mutate(u)}
                          onRename={handleRename}
                          onPreview={handlePreview}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      {files.map(f => (
                        <FileRow
                          key={f.uuid}
                          file={f}
                          onDelete={u => deleteFileMutation.mutate(u)}
                          onRename={handleRename}
                          onPreview={handlePreview}
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
      <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} onConfirm={name => createFolderMutation.mutate(name)} />
      <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} item={renameTarget} onConfirm={handleRenameConfirm} />
      <FilePreviewModal file={previewFile} allFiles={files} open={previewOpen} onOpenChange={setPreviewOpen} />
    </UploadZone>
  )
}
