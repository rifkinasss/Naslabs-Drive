'use client'

import { DriveFile, DriveFolder } from '@/types/drive'
import { FileCard } from '@/components/drive/FileCard'
import { FolderCard } from '@/components/drive/FolderCard'
import { FileRow, FolderRow } from '@/components/drive/FileRow'
import { DriveSort } from '@/components/drive/SortMenu'
import { FileInfoDialog } from '@/components/drive/FileInfoDialog'
import { useState } from 'react'
import { DriveFilter } from '@/components/drive/DriveFilterMenu'
import { getMimeCategory } from '@/lib/helpers'

type DraggedItem = { kind: 'file' | 'folder'; uuid: string }

interface DriveItemListProps {
  folders: DriveFolder[]
  files: DriveFile[]
  view: 'grid' | 'list'
  sortBy: DriveSort
  selectedUuids: Set<string>
  onSelect: (uuid: string) => void
  onDeleteFile: (uuid: string) => void
  onDeleteFolder: (uuid: string) => void
  onRename: (item: DriveFile | DriveFolder) => void
  onMove: (item: DriveFile | DriveFolder) => void
  onPreview: (file: DriveFile) => void
  onShare: (file: DriveFile) => void
  onShareFolder?: (folder: DriveFolder) => void
  onDownloadFolder?: (folder: DriveFolder) => void
  onVersions: (file: DriveFile) => void
  onDropItem: (targetFolderUuid: string, item: DraggedItem) => void
  onToggleFavorite?: (type: 'file' | 'folder', uuid: string) => void
  filter?: DriveFilter
}

export function DriveItemList({ folders, files, view, sortBy, selectedUuids, onSelect, onDeleteFile, onDeleteFolder, onRename, onMove, onPreview, onShare, onShareFolder, onDownloadFolder, onVersions, onDropItem, onToggleFavorite, filter = 'all' }: DriveItemListProps) {
  const [infoFile, setInfoFile] = useState<DriveFile | null>(null)
  const matchesFilter = ({ kind, item }: { kind: 'folder' | 'file'; item: DriveFolder | DriveFile }) => {
    if (filter === 'all') return true
    if (filter === 'favorites') return item.is_favorite
    if (filter === 'folders') return kind === 'folder'
    if (filter === 'files') return kind === 'file'
    if (kind === 'folder') return false
    const category = getMimeCategory((item as DriveFile).mime_type)
    if (filter === 'images') return category === 'image'
    if (filter === 'videos') return category === 'video'
    if (filter === 'documents') return ['document', 'pdf', 'spreadsheet', 'presentation'].includes(category)
    return true
  }
  const items = [
    ...folders.map(item => ({ kind: 'folder' as const, item })),
    ...files.map(item => ({ kind: 'file' as const, item })),
  ].filter(matchesFilter)
  .sort((a, b) => {
    if (sortBy === 'type') return a.kind === b.kind ? a.item.name.localeCompare(b.item.name) : a.kind === 'folder' ? -1 : 1
    if (sortBy === 'updated_at') return new Date(b.item.updated_at ?? b.item.created_at).getTime() - new Date(a.item.updated_at ?? a.item.created_at).getTime()
    if (sortBy === 'size') return (b.kind === 'file' ? b.item.size : 0) - (a.kind === 'file' ? a.item.size : 0)
    return a.item.name.localeCompare(b.item.name)
  })

  if (view === 'grid') return <>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {items.map(({ kind, item }) => kind === 'folder' ? <FolderCard key={item.uuid} folder={item} selected={selectedUuids.has(item.uuid)} onSelect={onSelect} onDelete={onDeleteFolder} onRename={onRename} onMove={onMove} onShare={onShareFolder} onDownload={onDownloadFolder} onDropItem={dragged => onDropItem(item.uuid, dragged)} onToggleFavorite={() => onToggleFavorite?.('folder', item.uuid)} /> : <FileCard key={item.uuid} file={item} selected={selectedUuids.has(item.uuid)} onSelect={onSelect} onDelete={onDeleteFile} onRename={onRename} onMove={onMove} onPreview={onPreview} onShare={onShare} onVersions={onVersions} onInfo={setInfoFile} onToggleFavorite={() => onToggleFavorite?.('file', item.uuid)} />)}
    </div>
    <FileInfoDialog file={infoFile} open={infoFile !== null} onOpenChange={open => { if (!open) setInfoFile(null) }} />
  </>

  return <div className="rounded-xl border border-border overflow-hidden">
    <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 border-b border-border text-xs text-muted-foreground font-medium"><div className="w-8" /><span className="flex-1">Name</span><span className="w-16 text-right">Size</span><span className="w-24 text-right hidden sm:block">Modified</span><div className="w-8" /></div>
    {items.map(({ kind, item }) => kind === 'folder' ? <FolderRow key={item.uuid} folder={item} selected={selectedUuids.has(item.uuid)} onSelect={onSelect} onDelete={onDeleteFolder} onRename={onRename} onMove={onMove} onShare={onShareFolder} onDownload={onDownloadFolder} onDropItem={dragged => onDropItem(item.uuid, dragged)} onToggleFavorite={() => onToggleFavorite?.('folder', item.uuid)} /> : <FileRow key={item.uuid} file={item} selected={selectedUuids.has(item.uuid)} onSelect={onSelect} onDelete={onDeleteFile} onRename={onRename} onMove={onMove} onPreview={onPreview} onShare={onShare} onVersions={onVersions} onInfo={setInfoFile} onToggleFavorite={() => onToggleFavorite?.('file', item.uuid)} />)}
    <FileInfoDialog file={infoFile} open={infoFile !== null} onOpenChange={open => { if (!open) setInfoFile(null) }} />
  </div>
}
