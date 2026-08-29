'use client'

import { useRef, useState } from 'react'
import { Camera, Check, ImagePlus, Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/providers/AuthProvider'
import { getApiErrorMessage } from '@/lib/api-client'
import { removeUserAvatar, uploadUserAvatar } from '@/services/drive-api'

export function ProfileAvatarEditor() {
  const { user, setUser } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [source, setSource] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const name = user?.name ?? 'User'
  const initials = name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)

  const handleChange = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > 2 * 1024 * 1024) return toast.error('Profile photo must be smaller than 2 MB')

    if (source) URL.revokeObjectURL(source)
    setSource(URL.createObjectURL(file))
    setZoom(1)
    setCropOpen(true)
    if (inputRef.current) inputRef.current.value = ''
  }

  const closeCrop = () => {
    setCropOpen(false)
    if (source) URL.revokeObjectURL(source)
    setSource(null)
    setZoom(1)
  }

  const saveCrop = async () => {
    if (!source) return
    setSaving(true)
    try {
      const image = new Image()
      image.src = source
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Unable to read image'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Unable to prepare image')

      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * zoom
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Unable to export cropped image')
      const updatedUser = await uploadUserAvatar(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }))
      setUser(updatedUser)
      localStorage.setItem('drive_user', JSON.stringify(updatedUser))
      toast.success('Profile photo updated')
      closeCrop()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update profile photo'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      const updatedUser = await removeUserAvatar()
      setUser(updatedUser)
      localStorage.setItem('drive_user', JSON.stringify(updatedUser))
      toast.success('Profile photo removed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to remove profile photo'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-card to-secondary/30 shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 size-40 rounded-full bg-sky-400/10 blur-2xl" />
      <div className="relative flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:items-center sm:gap-7 sm:p-8 sm:text-left">
        <div className="shrink-0">
          <div className="relative rounded-full bg-gradient-to-br from-primary via-sky-400 to-primary/40 p-1.5 shadow-xl shadow-primary/20">
            <Avatar className="size-36 border-4 border-card sm:size-40" size="lg">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={`${name} profile photo`} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={saving} aria-label="Change profile photo" className="absolute bottom-1 right-1 flex size-11 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:bg-primary/90 disabled:opacity-60">
              <Camera className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <p className="text-xl font-bold tracking-tight">Profile photo</p>
            <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">Personal</span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">Make your Cloud NL account feel like yours.</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-500" />JPG, PNG, or WebP · maximum 2 MB</div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => handleChange(event.target.files?.[0])} />
            <Button type="button" size="sm" disabled={saving} onClick={() => inputRef.current?.click()} className="gap-1.5 shadow-sm">
              {user?.avatar_url ? <Camera className="size-4" /> : <Upload className="size-4" />}
              {user?.avatar_url ? 'Change photo' : 'Upload photo'}
            </Button>
            {user?.avatar_url && <Button type="button" size="sm" variant="outline" disabled={saving} onClick={handleRemove} className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /> Remove</Button>}
          </div>
        </div>
      </div>

      <Dialog open={cropOpen} onOpenChange={open => open ? setCropOpen(true) : closeCrop()}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-lg"><ImagePlus className="size-5 text-primary" /> Edit profile photo</DialogTitle>
            <DialogDescription>Crop your photo into a square before saving it to Cloud NL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="mx-auto flex size-72 items-center justify-center overflow-hidden rounded-2xl bg-muted ring-1 ring-border sm:size-80">
              {source && <img src={source} alt="Profile photo crop preview" className="size-full object-cover" style={{ transform: `scale(${zoom})` }} />}
            </div>
            <div className="mx-auto flex max-w-sm items-center gap-3">
              <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
              <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} aria-label="Photo zoom" className="h-2 w-full cursor-pointer accent-primary" />
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </div>
          <DialogFooter className="px-6 py-4">
            <Button type="button" variant="outline" onClick={closeCrop} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={saveCrop} disabled={saving || !source} className="gap-1.5"><Check className="size-4" /> {saving ? 'Saving…' : 'Save photo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
