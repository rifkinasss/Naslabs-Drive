'use client'

import { useState, useEffect } from 'react'
import {
  X, Download, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCw, Maximize2, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DriveFile } from '@/types/drive'
import { getMimeCategory, getMimeIcon, formatBytes, formatDate } from '@/lib/helpers'
import { getFilePreviewUrl, getFileDownloadUrl } from '@/services/drive-api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Sample URLs for demo (Fast Unsplash CDN) ──────────────────────────────
const SAMPLE_URLS: Record<string, string> = {
  jpg:  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  jpeg: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
  png:  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  webp: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
  gif:  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
  pdf:  'https://www.w3.org/WAI/WCAG21/Techniques/pdf/R.pdf',
  mp4:  'https://www.w3.org/2010/05/video/mediaevents.html',
  mp3:  '',
}

// Dummy text content for text files
const DUMMY_TEXT_CONTENT: Record<string, string> = {
  md: `# NasLabs Drive

## Overview
NasLabs Drive is an internal cloud storage solution built on top of Laravel and Next.js.

## Features
- ✅ File Upload & Download
- ✅ Folder Management
- ✅ Storage Quota
- ✅ Activity Logging
- 🔄 File Sharing (Phase 3)

## Tech Stack
- **Frontend**: Next.js 16 + TypeScript + shadcn/ui
- **Backend**: Laravel 12
- **Database**: PostgreSQL
`,
  txt: `Meeting Notes - Q1 2026 Planning

Date: January 15, 2026
Attendees: Rifki, Budi, Siti, Ahmad

Agenda:
1. Review Q4 2025 performance
2. Set Q1 2026 goals
3. Discuss new features

Action Items:
- Rifki: Finalize cloud module architecture
- Budi: Prepare budget spreadsheet
- Siti: User research for new UI

Next meeting: February 1, 2026
`,
  json: `{
  "project": "NasLabs Drive",
  "version": "1.0.0",
  "description": "Internal cloud storage module",
  "tech_stack": {
    "frontend": "Next.js 16",
    "backend": "Laravel 12",
    "database": "PostgreSQL",
    "storage": "Laravel Filesystem"
  },
  "phases": [
    { "id": 1, "name": "MVP", "status": "in_progress" },
    { "id": 2, "name": "Preview", "status": "planned" },
    { "id": 3, "name": "Sharing", "status": "planned" }
  ]
}`,
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface FilePreviewModalProps {
  file: DriveFile | null
  allFiles?: DriveFile[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function FilePreviewModal({ file, allFiles = [], open, onOpenChange }: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Reset zoom/rotation when file changes
  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setImgLoaded(false)
  }, [file?.uuid])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, file])

  if (!open || !file) return null

  const category = getMimeCategory(file.mime_type)
  const { Icon, color } = getMimeIcon(file.mime_type)
  const canPreview = ['image', 'video', 'audio', 'pdf', 'document', 'code'].includes(category)

  // Navigation between files
  const currentIndex = allFiles.findIndex(f => f.uuid === file.uuid)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allFiles.length - 1

  const goToPrev = () => {
    if (hasPrev) {
      // handled by parent
    }
  }

  const goToNext = () => {
    if (hasNext) {
      // handled by parent
    }
  }

  const handleDownload = () => {
    const url = getFileDownloadUrl(file.uuid)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success(`Downloading ${file.name}...`)
  }

  // Get preview URL: for mock files use sample CDN, for real uploaded files use backend stream
  const isMockFile = file.uuid.startsWith('a1000001-') || file.uuid.startsWith('trash-') || file.uuid.startsWith('new-')
  const sampleUrl = SAMPLE_URLS[file.extension.toLowerCase()] ?? ''
  const realUrl = getFilePreviewUrl(file.uuid)
  const [currentImgUrl, setCurrentImgUrl] = useState(isMockFile ? (sampleUrl || realUrl) : realUrl)

  useEffect(() => {
    setCurrentImgUrl(isMockFile ? (sampleUrl || realUrl) : realUrl)
  }, [file.uuid, isMockFile, realUrl, sampleUrl])

  const textContent = DUMMY_TEXT_CONTENT[file.extension.toLowerCase()]
  const fileSizeDisplay = file.size_human || formatBytes(file.size)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 flex flex-col w-full max-w-5xl max-h-[92vh] mx-4 bg-card border border-border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
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

          {/* Image controls */}
          {category === 'image' && (
            <div className="flex items-center gap-1 mr-2">
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
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Reset"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <Button size="sm" variant="default" onClick={handleDownload} className="gap-1.5 shrink-0">
            <Download className="w-3.5 h-3.5" /> Download
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
          {category === 'image' && (
            <div className="flex items-center justify-center min-h-[50vh] p-4 overflow-auto">
              <div className="relative">
                {!imgLoaded && (
                  <div className="w-64 h-64 rounded-xl bg-secondary animate-pulse flex items-center justify-center">
                    <Icon className={cn('w-12 h-12', color, 'opacity-30')} />
                  </div>
                )}
                <img
                  src={currentImgUrl}
                  alt={file.name}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => {
                    if (sampleUrl && currentImgUrl !== sampleUrl) {
                      setCurrentImgUrl(sampleUrl)
                    } else {
                      setImgLoaded(true)
                    }
                  }}
                  className={cn(
                    'rounded-xl object-contain transition-all duration-200 cursor-zoom-in max-w-none',
                    imgLoaded ? 'opacity-100' : 'opacity-0 absolute'
                  )}
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
          {category === 'pdf' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
                <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  Preview menggunakan sample PDF untuk demo. File asli akan ditampilkan saat terhubung ke backend.
                </p>
              </div>
              <iframe
                src={previewUrl}
                className="flex-1 w-full border-0"
                style={{ minHeight: '60vh' }}
                title={file.name}
              />
            </div>
          )}

          {/* VIDEO */}
          {category === 'video' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 gap-4">
              <div className="rounded-2xl overflow-hidden border border-border bg-black w-full max-w-2xl shadow-xl">
                {previewUrl ? (
                  <video controls className="w-full" poster="https://picsum.photos/seed/video/1280/720">
                    <source src={previewUrl} type={file.mime_type} />
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <VideoPlaceholder file={file} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Video preview — {file.size_human}
              </p>
            </div>
          )}

          {/* AUDIO */}
          {category === 'audio' && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 gap-6">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center">
                <Icon className={cn('w-14 h-14', color)} />
              </div>
              <div className="text-center">
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{file.size_human}</p>
              </div>
              <audio controls className="w-full max-w-md">
                {previewUrl && <source src={previewUrl} />}
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {/* TEXT / MARKDOWN / CODE */}
          {(category === 'document' || category === 'code') && textContent && (
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
            <NoPreview file={file} Icon={Icon} color={color} />
          )}

          {/* OTHER — Cannot preview */}
          {category === 'other' && (
            <NoPreview file={file} Icon={Icon} color={color} />
          )}

          {/* No preview URL for supported type */}
          {canPreview && !previewUrl && !textContent &&
            category !== 'spreadsheet' && category !== 'presentation' && category !== 'other' && (
            <NoPreview file={file} Icon={Icon} color={color} />
          )}
        </div>

        {/* ── Footer / File Info ── */}
        <div className="flex items-center gap-6 px-5 py-3 border-t border-border bg-card/60 text-xs text-muted-foreground shrink-0">
          <span>Type: <span className="text-foreground font-medium">{file.mime_type}</span></span>
          <span>Size: <span className="text-foreground font-medium">{fileSizeDisplay}</span></span>
          <span>Modified: <span className="text-foreground font-medium">{formatDate(file.updated_at)}</span></span>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VideoPlaceholder({ file }: { file: DriveFile }) {
  return (
    <div
      className="w-full aspect-video bg-gradient-to-br from-purple-900/40 to-black flex flex-col items-center justify-center gap-3 cursor-not-allowed"
    >
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
        <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-l-[20px] border-transparent border-l-white/80 ml-1" />
      </div>
      <p className="text-sm text-white/50">Video preview not available in demo</p>
    </div>
  )
}

interface NoPreviewProps {
  file: DriveFile
  Icon: React.ElementType
  color: string
}

function NoPreview({ file, Icon, color }: NoPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] py-16 px-8 text-center gap-4">
      <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center">
        <Icon className={cn('w-12 h-12', color)} />
      </div>
      <div>
        <p className="font-semibold text-base">Preview not available</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
          This file type ({file.extension.toUpperCase()}) cannot be previewed in the browser. Download it to view.
        </p>
      </div>
      <Button
        variant="outline"
        className="gap-2 mt-2"
        onClick={() => toast.success(`Downloading ${file.name}...`)}
      >
        <Download className="w-4 h-4" /> Download File
      </Button>
    </div>
  )
}
