'use client'

import { useEffect, useRef, useState } from 'react'
import { DriveFile } from '@/types/drive'
import { getMimeCategory, getMimeIcon } from '@/lib/helpers'
import { previewFile } from '@/services/drive-api'
import { cn } from '@/lib/utils'
import { renderAsync } from 'docx-preview'
import heic2any from 'heic2any'

export type PreviewLoader = (uuid: string) => Promise<Blob>

interface FileThumbnailProps {
  file: DriveFile
  variant?: 'card' | 'row'
  previewLoader?: PreviewLoader
  cacheKey?: string
}

const previewUrlCache = new Map<string, Promise<string>>()
const docxBlobCache = new Map<string, Promise<Blob>>()

/** Keep authenticated preview blobs available while the drive session is open. */
export function getCachedPreviewUrl(uuid: string, loader: PreviewLoader = previewFile, cacheKey = uuid, mimeType = ''): Promise<string> {
  const cached = previewUrlCache.get(cacheKey)
  if (cached) return cached

  const request = loader(uuid).then(async blob => {
    const isHeic = mimeType.toLowerCase().includes('heic') || ['image/heic', 'image/heif'].includes(blob.type.toLowerCase())
    if (!isHeic) return URL.createObjectURL(blob)
    const converted = await heic2any({ blob, toType: 'image/jpeg', quality: 0.88 })
    return URL.createObjectURL(Array.isArray(converted) ? converted[0] : converted)
  })
  previewUrlCache.set(cacheKey, request)
  request.catch(() => previewUrlCache.delete(cacheKey))
  return request
}

/** Authenticated media thumbnail used in the drive grid/list. */
export function FileThumbnail({ file, variant = 'card', previewLoader = previewFile, cacheKey }: FileThumbnailProps) {
  const { Icon, color } = getMimeIcon(file.mime_type)
  const category = getMimeCategory(file.mime_type)
  const isImage = category === 'image'
  const isPdf = category === 'pdf'
  const isVideo = category === 'video'
  const isDocx = file.extension.toLowerCase() === 'docx' || file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const isMediaPreview = isImage || isPdf || isVideo || isDocx
  const [src, setSrc] = useState<string | null>(null)
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null)
  const [failed, setFailed] = useState(false)
  const docxContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMediaPreview) return

    let active = true
    queueMicrotask(() => { if (active) { setSrc(null); setDocxBlob(null); setFailed(false) } })

    if (isDocx) {
      const key = cacheKey ? `${cacheKey}:${file.uuid}` : file.uuid
      const cached = docxBlobCache.get(key) ?? previewLoader(file.uuid)
      docxBlobCache.set(key, cached)
      cached.then(blob => { if (active) setDocxBlob(blob) }).catch(() => { if (active) setFailed(true) })
    } else {
      getCachedPreviewUrl(file.uuid, previewLoader, cacheKey ?? file.uuid, file.mime_type)
        .then(url => { if (active) setSrc(url) })
        .catch(() => {
          if (active) setFailed(true)
        })
    }

    return () => {
      active = false
    }
  }, [file.uuid, file.mime_type, isDocx, isMediaPreview, previewLoader, cacheKey])

  useEffect(() => {
    if (!isDocx || !docxBlob || !docxContainerRef.current) return
    let active = true
    const container = docxContainerRef.current
    container.replaceChildren()
    renderAsync(docxBlob, container, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: false,
    }).catch(() => {
      if (active) setFailed(true)
    })
    return () => {
      active = false
      container.replaceChildren()
    }
  }, [docxBlob, isDocx])

  if (variant === 'row') {
    return (
      <div className="size-8 shrink-0 overflow-hidden rounded-md bg-secondary">
        {isDocx && docxBlob && !failed ? (
          <div ref={docxContainerRef} className="h-full w-full overflow-hidden bg-white [&_.docx-wrapper]:!min-w-0 [&_.docx-wrapper]:!bg-white [&_.docx-wrapper]:!p-1 [&_.docx]:!m-0 [&_.docx]:!min-h-0 [&_.docx]:!w-full [&_.docx]:!p-1 [&_.docx]:!shadow-none" />
        ) : isImage && src && !failed ? (
          <img src={src} alt="" className="size-full object-cover" loading="lazy" onError={() => setFailed(true)} />
        ) : isVideo && src && !failed ? (
          <video src={src} className="size-full object-cover" muted playsInline preload="metadata" onError={() => setFailed(true)} />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Icon className={cn('size-4', color)} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary/80">
      {isDocx && docxBlob && !failed ? (
        <div ref={docxContainerRef} className="size-full overflow-hidden bg-white [&_.docx-wrapper]:!min-w-0 [&_.docx-wrapper]:!bg-white [&_.docx-wrapper]:!p-2 [&_.docx]:!m-0 [&_.docx]:!min-h-0 [&_.docx]:!w-full [&_.docx]:!p-2 [&_.docx]:!shadow-none" />
      ) : isImage && src && !failed ? (
        <img src={src} alt={file.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" onError={() => setFailed(true)} />
      ) : isVideo && src && !failed ? (
        <video src={src} className="size-full object-cover" muted playsInline preload="metadata" onError={() => setFailed(true)} />
      ) : isPdf && src && !failed ? (
        <iframe src={`${src}#toolbar=0&navpanes=0&scrollbar=0`} title={`${file.name} preview`} className="pointer-events-none size-full border-0 bg-white" onError={() => setFailed(true)} />
      ) : (
        <div className="flex size-full items-center justify-center">
          <Icon className={cn('size-10', color)} />
        </div>
      )}
      {isMediaPreview && !src && !docxBlob && !failed && <div className="absolute inset-0 animate-pulse bg-secondary" />}
    </div>
  )
}
