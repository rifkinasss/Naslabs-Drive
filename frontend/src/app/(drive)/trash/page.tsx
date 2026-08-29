'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, RotateCcw, X, AlertTriangle, Loader2, Folder as FolderIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMimeIcon, formatBytes, formatDate } from '@/lib/helpers'
import { fetchTrash, restoreTrashItem, permanentDeleteTrashItem, emptyTrash } from '@/services/drive-api'
import { useAuth } from '@/providers/AuthProvider'
import { EmptyState } from '@/components/drive/EmptyState'
import { DeleteConfirmDialog } from '@/components/drive/DriveDialogs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ui/error-state'

export default function TrashPage() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trash'],
    queryFn: fetchTrash,
  })

  const trashFiles = data?.files ?? []
  const trashFolders = data?.folders ?? []
  const isEmpty = !isLoading && trashFiles.length === 0 && trashFolders.length === 0

  const restoreMutation = useMutation({
    mutationFn: ({ type, uuid }: { type: 'folder' | 'file'; uuid: string }) => restoreTrashItem(type, uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      queryClient.invalidateQueries({ queryKey: ['drive'] })
      refreshUser()
      toast.success('Item restored to Drive')
    },
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: ({ type, uuid }: { type: 'folder' | 'file'; uuid: string }) => permanentDeleteTrashItem(type, uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      refreshUser()
      toast.success('Item permanently deleted')
    },
  })

  const emptyTrashMutation = useMutation({
    mutationFn: emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      refreshUser()
      toast.success('Trash emptied')
    },
  })

  const allItems = [
    ...trashFolders.map(folder => ({ type: 'folder' as const, uuid: folder.uuid })),
    ...trashFiles.map(file => ({ type: 'file' as const, uuid: file.uuid })),
  ]
  const toggleItem = (key: string) => setSelectedItems(previous => {
    const next = new Set(previous)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const toggleAll = () => setSelectedItems(selectedItems.size === allItems.length ? new Set() : new Set(allItems.map(item => `${item.type}:${item.uuid}`)))
  const restoreSelected = async () => {
    await Promise.all([...selectedItems].map(key => {
      const [type, uuid] = key.split(':') as ['folder' | 'file', string]
      return restoreTrashItem(type, uuid)
    }))
    setSelectedItems(new Set())
    queryClient.invalidateQueries({ queryKey: ['trash'] })
    queryClient.invalidateQueries({ queryKey: ['drive'] })
    refreshUser()
    toast.success('Selected items restored')
  }
  const deleteSelected = async () => {
    await Promise.all([...selectedItems].map(key => {
      const [type, uuid] = key.split(':') as ['folder' | 'file', string]
      return permanentDeleteTrashItem(type, uuid)
    }))
    setSelectedItems(new Set())
    queryClient.invalidateQueries({ queryKey: ['trash'] })
    refreshUser()
    toast.success('Selected items permanently deleted')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Trash2 className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-base font-semibold">Trash</h1>
          <p className="text-xs text-muted-foreground">Items are permanently deleted after 30 days</p>
        </div>
        {!isEmpty && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedItems.size === allItems.length ? 'Clear selection' : 'Select all'}
            </Button>
            {selectedItems.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={restoreSelected} className="gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Restore {selectedItems.size}
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelected} className="gap-1.5">
                  <X className="w-4 h-4" /> Delete {selectedItems.size}
                </Button>
              </>
            )}
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setEmptyConfirmOpen(true)}>
              <X className="w-4 h-4" /> Empty Trash
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Trash...
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isEmpty ? (
          <EmptyState variant="trash" />
        ) : (
          <div className="w-full space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Files in Trash still count towards your storage quota until permanently deleted.
              </p>
            </div>

            {/* Folders */}
            {trashFolders.map(folder => (
              <div
                key={folder.uuid}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition-colors"
              >
                <input type="checkbox" checked={selectedItems.has(`folder:${folder.uuid}`)} onChange={() => toggleItem(`folder:${folder.uuid}`)} className="h-4 w-4 accent-primary" />
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FolderIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Deleted {formatDate(folder.deleted_at!)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => restoreMutation.mutate({ type: 'folder', uuid: folder.uuid })}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive"
                    onClick={() => permanentDeleteMutation.mutate({ type: 'folder', uuid: folder.uuid })}
                  >
                    <X className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}

            {/* Files */}
            {trashFiles.map(file => {
              const { Icon, color } = getMimeIcon(file.mime_type)
              return (
                <div
                  key={file.uuid}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-border/80 transition-colors"
                >
                  <input type="checkbox" checked={selectedItems.has(`file:${file.uuid}`)} onChange={() => toggleItem(`file:${file.uuid}`)} className="h-4 w-4 accent-primary" />
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.size_human || formatBytes(file.size)} • Deleted {formatDate(file.deleted_at!)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => restoreMutation.mutate({ type: 'file', uuid: file.uuid })}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive"
                      onClick={() => permanentDeleteMutation.mutate({ type: 'file', uuid: file.uuid })}
                    >
                      <X className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={emptyConfirmOpen}
        onOpenChange={setEmptyConfirmOpen}
        itemName="all items in Trash"
        isPermanent
        onConfirm={() => emptyTrashMutation.mutate()}
      />
    </div>
  )
}
