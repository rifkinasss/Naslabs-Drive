'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatBytes } from '@/lib/helpers'

interface UploadFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
}

interface UploadZoneProps {
  onFilesAdded?: (files: File[]) => void
  children: React.ReactNode
}

export function UploadZone({ onFilesAdded, children }: UploadZoneProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [showProgress, setShowProgress] = useState(false)

  const simulateUpload = (files: File[]) => {
    const newUploads: UploadFile[] = files.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'uploading',
    }))

    setUploadFiles(prev => [...prev, ...newUploads])
    setShowProgress(true)

    newUploads.forEach((upload, i) => {
      const interval = setInterval(() => {
        setUploadFiles(prev =>
          prev.map(u => {
            if (u.id !== upload.id) return u
            const next = Math.min(u.progress + Math.random() * 25, 100)
            if (next >= 100) {
              clearInterval(interval)
              return { ...u, progress: 100, status: 'done' }
            }
            return { ...u, progress: next }
          })
        )
      }, 300 + i * 150)
    })

    onFilesAdded?.(files)
  }

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted.length) return
    simulateUpload(accepted)
    toast.success(`${accepted.length} file${accepted.length > 1 ? 's' : ''} queued for upload`)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  })

  const doneCount = uploadFiles.filter(f => f.status === 'done').length
  const allDone = uploadFiles.length > 0 && doneCount === uploadFiles.length

  const dismiss = () => {
    setUploadFiles([])
    setShowProgress(false)
  }

  return (
    <div {...getRootProps()} className="relative h-full">
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm pointer-events-none">
          <Upload className="w-16 h-16 text-primary mb-4 animate-bounce" />
          <p className="text-xl font-semibold text-primary">Drop files to upload</p>
          <p className="text-sm text-muted-foreground mt-1">Files will be uploaded to current folder</p>
        </div>
      )}

      {children}

      {/* Upload Progress Card */}
      {showProgress && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {allDone
                ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                : <Loader2 className="w-4 h-4 text-primary animate-spin" />
              }
              <span className="text-sm font-medium">
                {allDone
                  ? `${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''} uploaded`
                  : `Uploading ${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''}...`
                }
              </span>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {uploadFiles.map(f => (
              <div key={f.id} className="px-4 py-2.5 border-b border-border/50 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate max-w-[200px]">{f.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {f.status === 'done'
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      : `${Math.round(f.progress)}%`
                    }
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      f.status === 'done' ? 'bg-emerald-400' : 'bg-primary'
                    )}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
