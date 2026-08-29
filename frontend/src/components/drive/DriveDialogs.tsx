'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DriveFile, DriveFolder } from '@/types/drive'
import { FolderPlus, Move } from 'lucide-react'
import { toast } from 'sonner'

// ─── Create Folder Dialog ────────────────────────────────────────────────────
interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string, color: string) => void
}

export function CreateFolderDialog({ open, onOpenChange, onConfirm }: CreateFolderDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onConfirm(name.trim(), color)
    setName('')
    setColor('#3B82F6')
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
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Folder color</p>
            <div className="flex items-center gap-2">
              {colors.map(option => <button key={option} type="button" aria-label={`Use ${option} folder color`} onClick={() => setColor(option)} className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: option, borderColor: color === option ? 'var(--color-foreground)' : 'transparent' }} />)}
            </div>
          </div>
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
  onConfirm: (uuid: string, newName: string, color?: string) => void
}

export function RenameDialog({ open, onOpenChange, item, onConfirm }: RenameDialogProps) {
  const [name, setName] = useState(item?.name ?? '')
  const [color, setColor] = useState(!item || 'extension' in item ? '#3B82F6' : item.color ?? '#3B82F6')
  const isFolder = !!item && !('extension' in item)
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !item) return
    onConfirm(item.uuid, name.trim(), isFolder ? color : undefined)
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
          {isFolder && <div className="mt-4"><p className="text-xs font-medium text-muted-foreground mb-2">Folder color</p><div className="flex items-center gap-2">{colors.map(option => <button key={option} type="button" aria-label={`Use ${option} folder color`} onClick={() => setColor(option)} className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: option, borderColor: color === option ? 'var(--color-foreground)' : 'transparent' }} />)}</div></div>}
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

interface MoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: DriveFile | DriveFolder | null
  folders: DriveFolder[]
  onConfirm: (parentUuid: string | null) => void
}

export function MoveDialog({ open, onOpenChange, item, folders, onConfirm }: MoveDialogProps) {
  const [destination, setDestination] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDestination('')
    onOpenChange(nextOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return
    onConfirm(destination || null)
    onOpenChange(false)
  }

  const availableFolders = folders.filter(folder => folder.uuid !== item?.uuid)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-5 h-5 text-primary" /> Move to
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground truncate">{item?.name}</p>
        <form onSubmit={handleSubmit}>
          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            className="mt-2 w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm"
          >
            <option value="">My Drive</option>
            {availableFolders.map(folder => (
              <option key={folder.uuid} value={folder.uuid}>{folder.name}</option>
            ))}
          </select>
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!item}>Move here</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
