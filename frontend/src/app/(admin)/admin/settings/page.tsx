'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cloud, Image as ImageIcon, Loader2, RotateCcw, Save, Settings, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/ui/error-state'
import { toast } from 'sonner'
import {
  AdminSystemSettings,
  BrandingAsset,
  fetchAdminSettings,
  fetchBranding,
  removeBrandingAsset,
  updateAdminSettings,
  uploadBrandingAsset,
  getGoogleDriveConnectUrl,
  disconnectGoogleDrive,
} from '@/services/drive-api'

const defaults: AdminSystemSettings = {
  app_name: '',
  max_upload_mb: '512',
  share_expiry_days: '30',
  allowed_extensions: '',
  default_quota_gb: '100',
  quota_alert_percent: '80',
  share_require_password: '0',
  share_max_downloads: '0',
  trash_retention_days: '30',
  notify_on_share: '1',
  notify_on_upload_failure: '1',
  maintenance_mode: '0',
  maintenance_message: 'Cloud NL is temporarily under maintenance.',
  google_oauth_enabled: '0', google_drive_enabled: '0', google_client_id: '', google_client_secret: '', google_login_redirect_uri: '', google_drive_redirect_uri: '',
}

const extensionGroups = [
  { label: 'Images', values: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg'] },
  { label: 'Documents', values: ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'] },
  { label: 'Archives', values: ['zip', 'rar', '7z', 'tar', 'gz'] },
  { label: 'Media', values: ['mp4', 'webm', 'mov', 'mp3', 'wav'] },
]

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin-settings'], queryFn: fetchAdminSettings })
  const brandingQuery = useQuery({ queryKey: ['branding'], queryFn: fetchBranding, staleTime: 60_000 })
  const [form, setForm] = useState<AdminSystemSettings>(defaults)
  const [assetLoading, setAssetLoading] = useState<BrandingAsset | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (query.data) setForm({ ...defaults, ...query.data })
  }, [query.data])

  const save = useMutation({
    mutationFn: () => updateAdminSettings(form),
    onSuccess: data => {
      setForm({ ...defaults, ...data })
      queryClient.setQueryData(['admin-settings'], data)
      queryClient.invalidateQueries({ queryKey: ['branding'] })
      toast.success('System settings saved')
    },
    onError: () => toast.error('Unable to save system settings'),
  })

  const set = (key: keyof AdminSystemSettings, value: string) => setForm(current => ({ ...current, [key]: value }))
  const selectedExtensions = new Set(form.allowed_extensions.split(',').map(extension => extension.trim().toLowerCase()).filter(Boolean))
  const toggleExtension = (extension: string) => {
    const next = new Set(selectedExtensions)
    if (next.has(extension)) next.delete(extension)
    else next.add(extension)
    set('allowed_extensions', [...next].join(','))
  }
  const setGroupExtensions = (values: string[], enabled: boolean) => {
    const next = new Set(selectedExtensions)
    values.forEach(extension => enabled ? next.add(extension) : next.delete(extension))
    set('allowed_extensions', [...next].join(','))
  }
  const applyPreset = (values: string[]) => set('allowed_extensions', values.join(','))

  const handleAsset = async (asset: BrandingAsset, file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      toast.error('Use JPG, PNG, or WebP up to 4 MB')
      return
    }
    setAssetLoading(asset)
    try {
      const branding = await uploadBrandingAsset(asset, file)
      queryClient.setQueryData(['branding'], branding)
      toast.success('Branding asset updated')
    } catch {
      toast.error('Unable to update branding asset')
    } finally {
      setAssetLoading(null)
    }
  }

  const resetAsset = async (asset: BrandingAsset) => {
    setAssetLoading(asset)
    try {
      const branding = await removeBrandingAsset(asset)
      queryClient.setQueryData(['branding'], branding)
      toast.success('Branding asset reset')
    } catch {
      toast.error('Unable to reset branding asset')
    } finally {
      setAssetLoading(null)
    }
  }

  const connectGoogleDrive = async () => {
    setGoogleLoading(true)
    try { window.location.assign(await getGoogleDriveConnectUrl()) } catch { toast.error('Save Google OAuth settings first') } finally { setGoogleLoading(false) }
  }

  const assets: { key: BrandingAsset; label: string; hint: string; url?: string | null }[] = [
    { key: 'logo', label: 'Application logo', hint: 'Shown in the sidebar and app shell.', url: brandingQuery.data?.logo_url },
    { key: 'favicon', label: 'Browser favicon', hint: 'Shown in browser tabs.', url: brandingQuery.data?.favicon_url },
    { key: 'pwa_icon', label: 'PWA icon', hint: 'Used when installing the app.', url: brandingQuery.data?.pwa_icon_url },
  ]

  if (query.isLoading) return <Loading />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><Settings className="size-5 text-primary" /><div><h1 className="text-base font-semibold">System Settings</h1><p className="text-xs text-muted-foreground">Configure Cloud NL for your environment</p></div></div>
      </header>
      <main className="flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="w-full space-y-6">
          <Section title="Branding assets" description="Make the logo and app icons feel like your own Cloud.">
            <div className="grid gap-4 lg:grid-cols-3">{assets.map(asset => <div key={asset.key} className="rounded-xl border border-border/80 bg-muted/20 p-4"><div className="flex min-h-20 items-center justify-center rounded-lg bg-background p-3">{asset.url ? <img src={asset.url} alt={asset.label} className="max-h-16 max-w-full rounded-lg object-contain" /> : <ImageIcon className="size-9 text-muted-foreground/50" />}</div><p className="mt-3 text-sm font-semibold">{asset.label}</p><p className="mt-1 min-h-10 text-xs text-muted-foreground">{asset.hint} JPG, PNG, WebP · max 4 MB.</p><div className="mt-3 flex gap-2"><label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Upload className="size-3.5" />{assetLoading === asset.key ? 'Uploading...' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={assetLoading !== null} onChange={e => { void handleAsset(asset.key, e.target.files?.[0]); e.currentTarget.value = '' }} /></label>{asset.url && <Button type="button" variant="outline" size="icon" className="size-9" disabled={assetLoading !== null} onClick={() => void resetAsset(asset.key)} title="Reset to default"><RotateCcw className="size-3.5" /></Button>}</div></div>)}</div>
          </Section>

          <Section title="General" description="Branding and platform defaults.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Application name" value={form.app_name} onChange={value => set('app_name', value)} className="sm:col-span-2" /><Field label="Maximum upload (MB)" type="number" min="1" max="5120" value={form.max_upload_mb} onChange={value => set('max_upload_mb', value)} /><Field label="Share expiry (days)" type="number" min="1" max="3650" value={form.share_expiry_days} onChange={value => set('share_expiry_days', value)} /></div>
          </Section>

          <Section title="Google OAuth & Drive" description="Connect Google without exposing credentials to the browser. Secrets are encrypted in the database.">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2"><Toggle checked={form.google_oauth_enabled === '1'} onChange={value => set('google_oauth_enabled', value ? '1' : '0')} label="Allow Google sign-in for registered users" /><Toggle checked={form.google_drive_enabled === '1'} onChange={value => set('google_drive_enabled', value ? '1' : '0')} label="Enable Google Drive connection" /></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Google Client ID" value={form.google_client_id} onChange={value => set('google_client_id', value)} placeholder="...apps.googleusercontent.com" /><Field label="Client Secret" type="password" value={form.google_client_secret ?? ''} onChange={value => set('google_client_secret', value)} placeholder={form.google_client_secret_configured ? 'Saved · leave blank to keep' : 'Paste client secret'} /></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Login redirect URI" value={form.google_login_redirect_uri} onChange={value => set('google_login_redirect_uri', value)} placeholder="https://cloud.example.com/api/auth/google/callback" /><Field label="Drive redirect URI" value={form.google_drive_redirect_uri} onChange={value => set('google_drive_redirect_uri', value)} placeholder="https://cloud.example.com/api/auth/google/callback" /></div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 p-3"><Cloud className="size-4 text-primary" /><span className="text-xs text-muted-foreground">Drive status: <strong className="text-foreground">{form.google_drive_connected ? 'Connected' : 'Not connected'}</strong></span><div className="ml-auto flex gap-2">{form.google_drive_enabled === '1' && <Button type="button" size="sm" onClick={() => void connectGoogleDrive()} disabled={googleLoading || !form.google_client_id || !form.google_drive_redirect_uri}>{googleLoading ? 'Opening...' : 'Connect Google Drive'}</Button>}{form.google_drive_connected && <Button type="button" size="sm" variant="outline" onClick={() => void disconnectGoogleDrive().then(() => { queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); toast.success('Google Drive disconnected') })}>Disconnect</Button>}</div></div>
              <p className="text-xs leading-relaxed text-muted-foreground">Create a Web application OAuth client in Google Cloud Console and register both redirect URIs exactly. Google Drive access is read-only metadata until sync permissions are explicitly added later.</p>
            </div>
          </Section>

          <Section title="Storage & quota" description="Set the default storage limit and warning threshold for new accounts.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Default quota (GB)" type="number" min="1" max="1024" value={form.default_quota_gb} onChange={value => set('default_quota_gb', value)} /><Field label="Alert when quota reaches (%)" type="number" min="50" max="100" value={form.quota_alert_percent} onChange={value => set('quota_alert_percent', value)} /></div>
          </Section>

          <Section title="File policy" description="Select the file types users are allowed to upload.">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 p-3"><span className="mr-1 text-xs font-semibold text-muted-foreground">Presets:</span><Button type="button" variant="outline" size="sm" onClick={() => applyPreset(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'pdf', 'txt'])}>Basic</Button><Button type="button" variant="outline" size="sm" onClick={() => applyPreset(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg', 'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'])}>Office</Button><Button type="button" variant="outline" size="sm" onClick={() => applyPreset(extensionGroups.flatMap(group => group.values))}>All supported</Button><span className="ml-auto text-xs text-muted-foreground">{selectedExtensions.size} selected</span></div>
              {extensionGroups.map(group => <div key={group.label}><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p><div className="flex gap-1"><button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setGroupExtensions(group.values, true)}>Select all</button><span className="text-xs text-muted-foreground">·</span><button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline" onClick={() => setGroupExtensions(group.values, false)}>Clear</button></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{group.values.map(extension => <label key={extension} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm transition-colors hover:bg-muted/50"><input type="checkbox" checked={selectedExtensions.has(extension)} onChange={() => toggleExtension(extension)} className="size-4 accent-primary" /><span>.{extension}</span></label>)}</div></div>)}
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Upload rule:</span> {selectedExtensions.size ? `Users can upload ${selectedExtensions.size} selected file types.` : 'No file types are currently selected.'}<p className="mt-1">Existing custom extensions remain supported and are preserved when selecting or clearing categories.</p></div>
            </div>
          </Section>

          <Section title="Sharing policy" description="Control how public links can be used.">
            <div className="grid gap-4 sm:grid-cols-2"><Toggle checked={form.share_require_password === '1'} onChange={value => set('share_require_password', value ? '1' : '0')} label="Require password for shared links" /><Field label="Maximum downloads (0 = unlimited)" type="number" min="0" max="10000" value={form.share_max_downloads} onChange={value => set('share_max_downloads', value)} /></div>
          </Section>

          <Section title="Trash & notifications" description="Keep storage predictable and choose which events should notify administrators.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Trash retention (days)" type="number" min="1" max="3650" value={form.trash_retention_days} onChange={value => set('trash_retention_days', value)} /><div className="space-y-3"><Toggle checked={form.notify_on_share === '1'} onChange={value => set('notify_on_share', value ? '1' : '0')} label="Notify when a file is shared" /><Toggle checked={form.notify_on_upload_failure === '1'} onChange={value => set('notify_on_upload_failure', value ? '1' : '0')} label="Notify when an upload fails" /></div></div>
          </Section>

          <Section title="Maintenance mode" description="Show a maintenance notice while planned work is in progress.">
            <div className="space-y-4"><Toggle checked={form.maintenance_mode === '1'} onChange={value => set('maintenance_mode', value ? '1' : '0')} label="Enable maintenance mode" /><Field label="Maintenance message" value={form.maintenance_message} onChange={value => set('maintenance_message', value)} placeholder="Cloud NL is temporarily under maintenance." /></div>
          </Section>

          <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2"><Save className="size-4" />{save.isPending ? 'Saving...' : 'Save settings'}</Button></div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p><div className="mt-5">{children}</div></section>
}

function Field({ label, value, onChange, type = 'text', min, max, placeholder, className = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string; placeholder?: string; className?: string }) {
  return <label className={`block space-y-1.5 text-sm font-medium ${className}`}>{label}<Input type={type} min={min} max={max} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-sm"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="size-4 accent-primary" />{label}</label>
}

function Loading() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" />Loading settings...</div>
}
