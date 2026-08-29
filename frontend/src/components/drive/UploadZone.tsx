'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, CheckCircle, Loader2, RotateCcw, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-client'

interface UploadItem { id: string; file: File; progress: number; status: 'uploading' | 'done' | 'error' | 'canceled'; error?: string }
interface UploadZoneProps {
  onFilesAdded?: (files: File[]) => void
  onUploadFile?: (file: File, onProgress: (percentage: number) => void, conflict?: 'replace' | 'keep_both' | 'skip', signal?: AbortSignal) => Promise<void>
  conflict?: 'replace' | 'keep_both' | 'skip'
  children: React.ReactNode
}

export function UploadZone({ onFilesAdded, onUploadFile, conflict = 'replace', children }: UploadZoneProps) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [visible, setVisible] = useState(false)
  const controllers = useRef(new Map<string, AbortController>())
  const update = (id: string, patch: Partial<UploadItem>) => setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  const startUpload = (item: UploadItem) => {
    if (!onUploadFile) return
    const controller = new AbortController()
    controllers.current.set(item.id, controller)
    update(item.id, { status: 'uploading', progress: item.status === 'error' || item.status === 'canceled' ? 0 : item.progress })
    onUploadFile(item.file, progress => update(item.id, { progress }), conflict, controller.signal).then(() => update(item.id, { status: 'done', progress: 100, error: undefined })).catch(error => { if (controller.signal.aborted) update(item.id, { status: 'canceled' }); else { const message = getApiErrorMessage(error, 'Upload failed'); update(item.id, { status: 'error', error: message }); toast.error(`${item.file.name}: ${message}`) } }).finally(() => controllers.current.delete(item.id))
  }
  const cancelUpload = (id: string) => { controllers.current.get(id)?.abort(); update(id, { status: 'canceled' }) }
  const addFiles = (files: File[]) => {
    const newItems = files.map(file => ({ id: crypto.randomUUID(), file, progress: 0, status: 'uploading' as const }))
    setItems(prev => [...prev, ...newItems]); setVisible(true)
    if (onUploadFile) newItems.forEach(startUpload); else onFilesAdded?.(files)
  }
  useEffect(() => {
    const handleQueuedFiles = (event: Event) => {
      const files = (event as CustomEvent<File[]>).detail
      if (Array.isArray(files) && files.length) addFiles(files)
    }
    window.addEventListener('cloud:queue-upload', handleQueuedFiles)
    return () => window.removeEventListener('cloud:queue-upload', handleQueuedFiles)
  }, [onUploadFile, conflict])
  const onDrop = useCallback((accepted: File[]) => { if (!accepted.length) return; addFiles(accepted); toast.success(`${accepted.length} file${accepted.length > 1 ? 's' : ''} queued for upload`) }, [onUploadFile, conflict])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true })
  const done = items.filter(item => item.status === 'done').length
  const canceled = items.filter(item => item.status === 'canceled').length
  const allDone = items.length > 0 && done + canceled === items.length

  return <div {...getRootProps()} className="relative h-full">
    <input {...getInputProps()} />
    {isDragActive && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm pointer-events-none"><Upload className="w-16 h-16 text-primary mb-4 animate-bounce" /><p className="text-xl font-semibold text-primary">Drop files to upload</p><p className="text-sm text-muted-foreground mt-1">Files will be uploaded to current folder</p></div>}
    {children}
    {visible && <div className="fixed bottom-24 left-3 right-3 z-40 w-auto overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:bottom-20 sm:left-auto sm:right-4 sm:w-80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border"><div className="flex items-center gap-2">{allDone ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Loader2 className="w-4 h-4 text-primary animate-spin" />}<span className="text-sm font-medium">{allDone ? `${done} uploaded${canceled ? ` · ${canceled} canceled` : ''}` : `Uploading ${items.length} file${items.length > 1 ? 's' : ''}...`}</span></div><button onClick={() => { controllers.current.forEach(controller => controller.abort()); setItems([]); setVisible(false) }} className="text-muted-foreground hover:text-foreground" title="Clear uploads"><X className="w-4 h-4" /></button></div>
      <div className="max-h-64 overflow-y-auto">{items.map(item => <div key={item.id} className="px-4 py-2.5 border-b border-border/50 last:border-0"><div className="flex items-center justify-between mb-1 gap-2"><span className="text-xs font-medium truncate">{item.file.name}</span>{item.status === 'done' ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" /> : item.status === 'error' || item.status === 'canceled' ? <button onClick={() => startUpload(item)} title="Retry" className="shrink-0 text-destructive"><RotateCcw className="w-3.5 h-3.5" /></button> : <button onClick={() => cancelUpload(item.id)} title="Cancel upload" className="shrink-0 text-muted-foreground hover:text-destructive"><Ban className="w-3.5 h-3.5" /></button>}</div>{item.error && <p className="mb-1 break-words text-[10px] leading-tight text-destructive">{item.error}</p>}<div className="flex items-center gap-2"><div className="w-full h-1 rounded-full bg-secondary overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-300', item.status === 'done' ? 'bg-emerald-500' : item.status === 'error' ? 'bg-destructive' : item.status === 'canceled' ? 'bg-muted-foreground' : 'bg-primary')} style={{ width: `${item.progress}%` }} /></div><span className="w-9 text-right text-[10px] text-muted-foreground">{item.status === 'canceled' ? 'Stop' : `${Math.round(item.progress)}%`}</span></div></div>)}</div>
    </div>}
  </div>
}
