'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DriveFile, DriveFolder } from '@/types/drive'
import { FolderPlus } from 'lucide-react'
import { toast } from 'sonner'

// ─── Create Folder Dialog ────────────────────────────────────────────────────
interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => void
}

export function CreateFolderDialog({ open, onOpenChange, onConfirm }: CreateFolderDialogProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onConfirm(name.trim())
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            New Folder
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Folder name"
            className="mt-2"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Rename Dialog ────────────────────────────────────────────────────────────
interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: DriveFile | DriveFolder | null
  onConfirm: (uuid: string, newName: string) => void
}

export function RenameDialog({ open, onOpenChange, item, onConfirm }: RenameDialogProps) {
  const [name, setName] = useState(item?.name ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !item) return
    onConfirm(item.uuid, name.trim())
    onOpenChange(false)
    toast.success(`Renamed to "${name.trim()}"`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="New name"
            className="mt-2"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  isPermanent?: boolean
  onConfirm: () => void
}

export function DeleteConfirmDialog({ open, onOpenChange, itemName, isPermanent, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isPermanent ? 'Delete Permanently' : 'Move to Trash'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-1">
          {isPermanent
            ? `"${itemName}" will be permanently deleted and cannot be recovered.`
            : `"${itemName}" will be moved to Trash.`
          }
        </p>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(); onOpenChange(false) }}
          >
            {isPermanent ? 'Delete Forever' : 'Move to Trash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
