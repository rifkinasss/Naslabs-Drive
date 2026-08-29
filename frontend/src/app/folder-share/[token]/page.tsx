'use client'

import { useParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { ChevronLeft, Download, FileText, Folder, Link2, Loader2, Lock, Pencil, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPublicFolder, deletePublicFolderFile, downloadPublicFolderFile, fetchPublicFolderContents, fetchPublicFolderInfo, PublicFolderContents, renamePublicFolderFile, uploadToPublicFolder } from '@/services/drive-api'
import { formatBytes, formatDate } from '@/lib/helpers'
import { getApiErrorMessage } from '@/lib/api-client'

export default function PublicFolderSharePage() {
  const { token } = useParams<{ token: string }>()
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [contents, setContents] = useState<PublicFolderContents | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [folderUuid, setFolderUuid] = useState<string>()
  const info = useQuery({ queryKey: ['public-folder-info', token], queryFn: () => fetchPublicFolderInfo(token), enabled: !!token })

  const loadFolder = async (uuid?: string) => {
    try { setError(''); const next = await fetchPublicFolderContents(token, password, uuid); setContents(next); setFolderUuid(next.current_folder_uuid) }
    catch (e: unknown) { setError(getApiErrorMessage(e, 'Unable to open this folder')) }
  }
  const load = () => loadFolder()
  const refresh = () => loadFolder(folderUuid)
  const upload = async (file: File) => { setBusy(true); try { await uploadToPublicFolder(token, file, password, folderUuid); await refresh() } catch (e: unknown) { setError(getApiErrorMessage(e, 'Unable to upload file')) } finally { setBusy(false) } }
  const createFolder = async () => { const name = window.prompt('New folder name')?.trim(); if (!name) return; setBusy(true); try { await createPublicFolder(token, name, password, folderUuid); await refresh() } catch (e: unknown) { setError(getApiErrorMessage(e, 'Unable to create folder')) } finally { setBusy(false) } }
  const rename = async (uuid: string, currentName: string) => { const name = window.prompt('New file name', currentName)?.trim(); if (!name || name === currentName) return; setBusy(true); try { await renamePublicFolderFile(token, uuid, name, password); await refresh() } catch (e: unknown) { setError(getApiErrorMessage(e, 'Unable to rename file')) } finally { setBusy(false) } }
  const remove = async (uuid: string) => { if (!window.confirm('Move this file to Trash?')) return; setBusy(true); try { await deletePublicFolderFile(token, uuid, password); await refresh() } catch (e: unknown) { setError(getApiErrorMessage(e, 'Unable to delete file')) } finally { setBusy(false) } }
  const download = async (uuid: string, name: string) => { try { const blob = await downloadPublicFolderFile(token, uuid, password); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url) } catch (e: unknown) { setError(getApiErrorMessage(e, 'Unable to download file')) } }

  if (info.isLoading) return <main className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></main>
  if (info.isError || !info.data?.available) return <main className="min-h-screen grid place-items-center p-6"><div className="text-center"><Link2 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" /><h1 className="text-xl font-semibold">This link is no longer available</h1><p className="text-sm text-muted-foreground mt-2">The folder share may have expired or been revoked.</p></div></main>
  if (!contents) return <main className="min-h-screen grid place-items-center bg-muted/30 p-6"><div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm"><div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Folder className="w-6 h-6" /></div><div><h1 className="font-semibold text-lg">{info.data.folder_name}</h1><p className="text-sm text-muted-foreground">Shared folder · {info.data.permission === 'editor' ? 'Editor' : 'Viewer'}</p></div></div>{info.data.requires_password && <div className="space-y-2 mb-4"><label className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> Password required</label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load() }} placeholder="Enter share password" /></div>}{error && <p className="text-sm text-destructive mb-4">{error}</p>}<Button className="w-full" onClick={load}>Open folder</Button></div></main>

  const isEditor = contents.permission === 'editor'
  return <main className="min-h-screen bg-muted/30 p-4 sm:p-8"><div className="max-w-5xl mx-auto"><header className="mb-6 flex flex-wrap items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Folder className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-bold">{contents.folder_name}</h1><p className="flex items-center gap-1 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Shared by Cloud NL · {isEditor ? 'Editor' : 'Viewer'}</p></div>{isEditor && <div className="flex gap-2"><input ref={inputRef} type="file" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = '' }} /><Button variant="outline" onClick={createFolder} disabled={busy} className="gap-2"><Plus className="h-4 w-4" /> New folder</Button><Button onClick={() => inputRef.current?.click()} disabled={busy} className="gap-2"><Upload className="h-4 w-4" /> Upload file</Button></div>}</header>{error && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<section className="overflow-hidden rounded-2xl border bg-card"><div className="flex items-center gap-2 border-b px-5 py-4 font-semibold">{contents.parent_uuid && <Button size="icon-sm" variant="ghost" onClick={() => loadFolder(contents.parent_uuid ?? undefined)}><ChevronLeft className="h-4 w-4" /></Button>}<span>Folder contents</span><span className="ml-auto text-xs font-normal text-muted-foreground">{contents.folders.length + contents.files.length} items</span></div>{contents.folders.length === 0 && contents.files.length === 0 ? <p className="p-10 text-center text-muted-foreground">This folder is empty.</p> : <div className="divide-y">{contents.folders.map(folder => <button type="button" key={folder.uuid} onClick={() => loadFolder(folder.uuid)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/50"><Folder className="h-5 w-5" style={{ color: folder.color ?? '#3B82F6' }} /><span className="flex-1 font-medium">{folder.name}</span><span className="text-xs text-muted-foreground">{formatDate(folder.created_at)}</span></button>)}{contents.files.map(file => <div key={file.uuid} className="flex items-center gap-3 px-5 py-3"><FileText className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{formatBytes(file.size)} · {formatDate(file.created_at)}</p></div><Button size="icon-sm" variant="ghost" onClick={() => download(file.uuid, file.original_name)} title="Download"><Download className="h-4 w-4" /></Button>{isEditor && <><Button size="icon-sm" variant="ghost" onClick={() => rename(file.uuid, file.name)} disabled={busy} title="Rename"><Pencil className="h-4 w-4" /></Button><Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => remove(file.uuid)} disabled={busy} title="Move to Trash"><Trash2 className="h-4 w-4" /></Button></>}</div>)}</div>}</section></div></main>
}
