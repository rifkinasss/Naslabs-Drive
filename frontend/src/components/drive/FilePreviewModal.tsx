'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Download, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCw, Maximize2, ExternalLink, Maximize,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DriveFile } from '@/types/drive'
import { getMimeCategory, getMimeIcon, formatBytes, formatDate } from '@/lib/helpers'
import { downloadFile, previewFile } from '@/services/drive-api'
import { getCachedPreviewUrl, PreviewLoader } from '@/components/drive/FileThumbnail'
import { exportUserFileToGoogleDrive } from '@/services/auth-api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { renderAsync } from 'docx-preview'

// ─── Props ────────────────────────────────────────────────────────────────────
interface FilePreviewModalProps {
  file: DriveFile | null
  allFiles?: DriveFile[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileChange?: (file: DriveFile) => void
  previewFileLoader?: PreviewLoader
  downloadFileLoader?: PreviewLoader
  previewCacheKey?: string
  showGoogleButton?: boolean
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function FilePreviewModal({ file, allFiles = [], open, onOpenChange, onFileChange, previewFileLoader, downloadFileLoader, previewCacheKey, showGoogleButton = true }: FilePreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const docxContainerRef = useRef<HTMLDivElement>(null)
  const currentIndex = file ? allFiles.findIndex(item => item.uuid === file.uuid) : -1
  const canNavigate = currentIndex >= 0 && allFiles.length > 1
  const navigate = useCallback((direction: -1 | 1) => {
    if (!canNavigate || !onFileChange) return
    const nextIndex = (currentIndex + direction + allFiles.length) % allFiles.length
    onFileChange(allFiles[nextIndex])
  }, [allFiles, canNavigate, currentIndex, onFileChange])
  const category = file ? getMimeCategory(file.mime_type) : 'other'
  const isTextPreview = Boolean(file && (
    file.mime_type.startsWith('text/') ||
    file.mime_type.includes('json') ||
    file.mime_type.includes('javascript') ||
    file.mime_type.includes('typescript') ||
    file.mime_type === 'application/xml'
  ))

  useEffect(() => {
    queueMicrotask(() => {
      setZoom(1)
      setRotation(0)
      setImgLoaded(false)
      setPreviewUrl(null)
      setTextContent(null)
      setPreviewLoading(false)
      setPreviewError(false)
      setDocxBlob(null)
      setImageDimensions(null)
    })

    const isDocx = file?.extension.toLowerCase() === 'docx' || file?.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    if (!open || !file || !['image', 'video', 'audio', 'pdf'].includes(category) && !isTextPreview && !isDocx) return

    queueMicrotask(() => setPreviewLoading(true))
    const loader = previewFileLoader ?? previewFile
    const previewRequest = isTextPreview
      ? loader(file.uuid).then(blob => blob.text())
      : isDocx
        ? loader(file.uuid)
      : getCachedPreviewUrl(file.uuid, loader, previewCacheKey ? `${previewCacheKey}:${file.uuid}` : file.uuid, file.mime_type)

    previewRequest.then(result => {
      if (isTextPreview) {
        setTextContent(result as string)
        return
      }
      if (isDocx) {
        setDocxBlob(result as Blob)
        return
      }
      setPreviewUrl(result as string)
    }).catch(() => { setPreviewError(true); toast.error('Unable to load file preview') }).finally(() => setPreviewLoading(false))
  }, [open, file, category, isTextPreview, previewFileLoader, previewCacheKey])

  useEffect(() => {
    if (!docxBlob || !docxContainerRef.current) return
    let cancelled = false
    const container = docxContainerRef.current
    container.replaceChildren()
    setPreviewLoading(true)
    renderAsync(docxBlob, container, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
    }).then(() => {
      if (!cancelled) setPreviewLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setPreviewError(true)
        setPreviewLoading(false)
        toast.error('Unable to render DOCX preview')
      }
    })
    return () => { cancelled = true; container.replaceChildren() }
  }, [docxBlob])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange, navigate])

  if (!open || !file) return null

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await modalRef.current?.requestFullscreen()
  }

  const { Icon, color } = getMimeIcon(file.mime_type)
  const isDocxPreview = file.extension.toLowerCase() === 'docx' || file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const canPreview = ['image', 'video', 'audio', 'pdf'].includes(category) || isTextPreview || isDocxPreview

  const handleDownload = async () => {
    try {
      const blob = await (downloadFileLoader ?? downloadFile)(file.uuid)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloading ${file.name}...`)
    } catch {
      toast.error('Unable to download file')
    }
  }

  const handleOpenInGoogle = async () => {
    try {
      const result = await exportUserFileToGoogleDrive(file.uuid)
      if (!result.web_url) throw new Error('Google did not return an editor URL.')
      window.open(result.web_url, '_blank', 'noopener,noreferrer')
      toast.success('A copy was opened in your Google Drive')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connect your Google Drive from Profile first.')
    }
  }

  // Get preview URL: for mock files use sample CDN, for real uploaded files use backend stream
  const fileSizeDisplay = file.size_human || formatBytes(file.size)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div ref={modalRef} className="relative z-10 flex flex-col w-full max-w-5xl max-h-[95vh] mx-2 sm:mx-4 bg-card border border-border rounded-xl sm:rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3 px-3 sm:px-5 py-3 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{file.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] py-0 h-4">
                {file.extension.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">{fileSizeDisplay}</span>
              <span className="text-muted-foreground/30 text-xs">•</span>
              <span className="text-xs text-muted-foreground">{formatDate(file.updated_at)}</span>
            </div>
          </div>

          {canNavigate && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => navigate(-1)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Previous file" aria-label="Previous file"><ChevronLeft className="size-4" /></button>
              <span className="hidden text-[11px] text-muted-foreground sm:inline">{currentIndex + 1} / {allFiles.length}</span>
              <button onClick={() => navigate(1)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Next file" aria-label="Next file"><ChevronRight className="size-4" /></button>
            </div>
          )}

          {/* Image controls */}
          {category === 'image' && (
            <div className="order-3 flex w-full items-center justify-end gap-1 border-t border-border/60 pt-2 sm:order-none sm:mr-2 sm:w-auto sm:border-0 sm:pt-0">
              <button
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setZoom(1); setRotation(0) }}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Reset"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={toggleFullscreen} className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Fullscreen" aria-label="Fullscreen">
            <Maximize className="size-4" />
          </button>

          <Button size="sm" variant="default" onClick={handleDownload} className="gap-1.5 shrink-0 px-2 sm:px-3">
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Download</span>
          </Button>

          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ml-1 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Preview Area ── */}
        <div className="flex-1 overflow-auto bg-background/50">
          {/* IMAGE */}
          {category === 'image' && previewLoading && (
            <PreviewLoading Icon={Icon} color={color} />
          )}

          {category === 'image' && !previewLoading && !previewError && (
            <div className="flex items-center justify-center min-h-[35vh] sm:min-h-[50vh] p-3 sm:p-4 overflow-auto">
              <div className="relative">
                {!imgLoaded && (
                  <div className="w-64 h-64 rounded-xl bg-secondary animate-pulse flex items-center justify-center">
                    <Icon className={cn('w-12 h-12', color, 'opacity-30')} />
                  </div>
                )}
                <img
                  src={previewUrl ?? undefined}
                  alt={file.name}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => {
                    setImgLoaded(true)
                  }}
                  className={cn(
                    'rounded-xl object-contain transition-all duration-200 cursor-zoom-in max-w-none',
                    imgLoaded ? 'opacity-100' : 'opacity-0 absolute'
                  )}
                  onLoadCapture={event => setImageDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                  style={{
                    maxHeight: '65vh',
                    maxWidth: '100%',
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    cursor: zoom > 1 ? 'zoom-out' : 'zoom-in',
                  }}
                  onClick={() => setZoom(z => z > 1 ? 1 : 2)}
                />
              </div>
            </div>
          )}

          {/* PDF */}
          {category === 'pdf' && !previewLoading && !previewError && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
                <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  Preview file dimuat secara aman dari cloud.
                </p>
              </div>
              <iframe
                src={previewUrl ?? undefined}
                className="flex-1 w-full border-0"
                style={{ minHeight: '45vh' }}
                title={file.name}
              />
            </div>
          )}

          {/* VIDEO */}
          {category === 'video' && !previewLoading && !previewError && (
            <div className="flex flex-col items-center justify-center min-h-[45vh] sm:min-h-[60vh] p-4 sm:p-6 gap-4">
              <div className="rounded-2xl overflow-hidden border border-border bg-black w-full max-w-2xl shadow-xl">
                {previewUrl ? (
              <video controls className="w-full" preload="metadata">
                    <source src={previewUrl} type={file.mime_type} />
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <VideoPlaceholder />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Video preview — {fileSizeDisplay}
              </p>
            </div>
          )}

          {/* AUDIO */}
          {category === 'audio' && !previewLoading && !previewError && (
            <div className="flex flex-col items-center justify-center min-h-[35vh] sm:min-h-[40vh] p-5 sm:p-8 gap-6">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center">
                <Icon className={cn('w-14 h-14', color)} />
              </div>
              <div className="text-center">
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{fileSizeDisplay}</p>
              </div>
              <audio controls className="w-full max-w-md">
                {previewUrl && <source src={previewUrl} />}
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {/* DOCX */}
          {isDocxPreview && !previewError && (
            <div className="relative min-h-[45vh] overflow-auto bg-neutral-200 p-3 sm:p-8 [&_.docx-wrapper]:!bg-transparent [&_.docx]:!mb-6 [&_.docx]:!shadow-xl">
              <div ref={docxContainerRef} className="mx-auto max-w-[900px]" />
              {previewLoading && <div className="absolute inset-0 bg-background/80"><PreviewLoading Icon={Icon} color={color} /></div>}
            </div>
          )}

          {/* OFFICE DOCUMENTS — keep Preview separate from File info */}
          {category === 'document' && !isTextPreview && !isDocxPreview && (
            <NoPreview file={file} Icon={Icon} color={color} onDownload={handleDownload} onOpenGoogle={showGoogleButton ? handleOpenInGoogle : undefined} />
          )}

          {/* TEXT / MARKDOWN / CODE */}
          {(category === 'document' || category === 'code' || file.mime_type === 'text/csv') && !previewLoading && !previewError && textContent && (
            <div className="p-5">
              <div className="rounded-xl bg-secondary/50 border border-border overflow-auto">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/80">
                  <Icon className={cn('w-3.5 h-3.5', color)} />
                  <span className="text-xs text-muted-foreground font-mono">{file.name}</span>
                </div>
                <pre className={cn(
                  'p-5 text-sm leading-relaxed font-mono whitespace-pre-wrap break-words',
                  'text-foreground/90 overflow-auto max-h-[60vh]'
                )}>
                  {textContent}
                </pre>
              </div>
            </div>
          )}

          {/* SPREADSHEET / PRESENTATION — Cannot preview */}
          {(category === 'spreadsheet' || category === 'presentation') && (
            <NoPreview file={file} Icon={Icon} color={color} onDownload={handleDownload} onOpenGoogle={showGoogleButton ? handleOpenInGoogle : undefined} />
          )}

          {/* OTHER — Cannot preview */}
          {category === 'other' && (
            <NoPreview file={file} Icon={Icon} color={color} onDownload={handleDownload} onOpenGoogle={showGoogleButton ? handleOpenInGoogle : undefined} />
          )}

          {/* No preview URL for supported type */}
          {previewError && <NoPreview file={file} Icon={Icon} color={color} onDownload={handleDownload} onOpenGoogle={showGoogleButton ? handleOpenInGoogle : undefined} />}

          {canPreview && !previewLoading && !previewError && !previewUrl && !textContent &&
            !isDocxPreview && category !== 'spreadsheet' && category !== 'presentation' && category !== 'other' && (
            <NoPreview file={file} Icon={Icon} color={color} onDownload={handleDownload} onOpenGoogle={showGoogleButton ? handleOpenInGoogle : undefined} />
          )}
        </div>

        {/* ── Footer / File Info ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 sm:px-5 py-3 border-t border-border bg-card/60 text-xs text-muted-foreground shrink-0">
          <span>Type: <span className="text-foreground font-medium">{file.mime_type}</span></span>
          <span>Size: <span className="text-foreground font-medium">{fileSizeDisplay}</span></span>
          {imageDimensions && <span>Dimensions: <span className="text-foreground font-medium">{imageDimensions.width} × {imageDimensions.height}px</span></span>}
          <span>Uploaded: <span className="text-foreground font-medium">{formatDate(file.created_at)}</span></span>
          <span>Modified: <span className="text-foreground font-medium">{formatDate(file.updated_at)}</span></span>
        </div>
      </div>
    </div>
  )
}

function PreviewLoading({ Icon, color }: { Icon: React.ElementType; color: string }) {
  return <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center"><div className="flex size-20 items-center justify-center rounded-2xl bg-secondary animate-pulse"><Icon className={cn('size-10 opacity-50', color)} /></div><p className="text-sm text-muted-foreground">Loading preview…</p></div>
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VideoPlaceholder() {
  return (
    <div
      className="w-full aspect-video bg-gradient-to-br from-purple-900/40 to-black flex flex-col items-center justify-center gap-3 cursor-not-allowed"
    >
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
        <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-l-[20px] border-transparent border-l-white/80 ml-1" />
      </div>
      <p className="text-sm text-white/50">Video preview is not available</p>
    </div>
  )
}

interface NoPreviewProps {
  file: DriveFile
  Icon: React.ElementType
  color: string
  onDownload: () => void
  onOpenGoogle?: () => void
}

function NoPreview({ file, Icon, color, onDownload, onOpenGoogle }: NoPreviewProps) {
  const officeLabel = file.extension.toLowerCase() === 'docx' ? 'Microsoft Word' : file.extension.toLowerCase() === 'xlsx' ? 'Microsoft Excel' : file.extension.toLowerCase() === 'pptx' ? 'Microsoft PowerPoint' : null
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] py-16 px-8 text-center gap-4">
      <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center">
        <Icon className={cn('w-12 h-12', color)} />
      </div>
      <div>
        <p className="font-semibold text-base">Preview not available</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          {officeLabel ? `${officeLabel} files can be opened in Google after creating a private copy in your connected Drive.` : `This file type (${file.extension.toUpperCase()}) cannot be previewed in the browser.`} Download it to view.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{onOpenGoogle && <Button variant="default" className="gap-2" onClick={onOpenGoogle} disabled={!officeLabel}><ExternalLink className="w-4 h-4" /> Open in Google</Button>}<Button variant="outline" className="gap-2" onClick={onDownload}><Download className="w-4 h-4" /> Download File</Button></div>
    </div>
  )
}
