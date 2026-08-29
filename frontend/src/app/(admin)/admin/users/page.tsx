'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Pencil, Trash2, Check, X, AlertTriangle, Loader2, Shield, Lock, HardDrive, Mail, MailCheck, LogOut, Search, ChevronLeft, ChevronRight, Camera, Info, Download, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, resendAdminUserVerification, verifyAdminUserEmail, revokeAdminUserSessions, uploadAdminUserAvatar, removeAdminUserAvatar } from '@/services/drive-api'
import { UserWithStorage } from '@/types/user'
import { formatBytes } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-client'
import { ErrorState } from '@/components/ui/error-state'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithStorage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserWithStorage | null>(null)
  const [verificationLoading, setVerificationLoading] = useState<number | null>(null)
  const [detailUser, setDetailUser] = useState<UserWithStorage | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    storage_quota_gb: 5,
    is_drive_enabled: true,
  })

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
  })

  const filteredUsers = useMemo(() => users.filter(user => {
    const needle = search.trim().toLowerCase()
    const matchesSearch = !needle || user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'verified' ? Boolean(user.email_verified_at) : statusFilter === 'pending' ? !user.email_verified_at : statusFilter === 'disabled' ? !user.is_drive_enabled : user.quota_percentage >= 80)
    return matchesSearch && matchesRole && matchesStatus
  }), [users, search, roleFilter, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const visibleUsers = filteredUsers.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize)
  const selectedUsers = users.filter(user => selectedIds.has(user.id))

  const toggleSelected = (id: number) => setSelectedIds(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const togglePage = () => setSelectedIds(current => { const next = new Set(current); const allSelected = visibleUsers.every(user => next.has(user.id)); visibleUsers.forEach(user => allSelected ? next.delete(user.id) : next.add(user.id)); return next })
  const exportUsers = () => {
    const rows = [['Name', 'Email', 'Role', 'Status', 'Storage used', 'Storage quota'], ...filteredUsers.map(user => [user.name, user.email, user.role, user.is_drive_enabled ? 'Enabled' : 'Disabled', String(user.used_storage), String(user.storage_quota)])]
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'cloud-nl-users.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  const bulkAction = async (action: 'revoke' | 'disable' | 'enable') => {
    if (!selectedUsers.length) return
    try {
      await Promise.all(selectedUsers.map(user => action === 'revoke' ? revokeAdminUserSessions(user.id) : updateAdminUser(user.id, { name: user.name, email: user.email, role: user.role, storage_quota: user.storage_quota, is_drive_enabled: action === 'enable' })))
      setSelectedIds(new Set())
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(action === 'revoke' ? 'Sessions revoked' : action === 'enable' ? 'Selected users enabled' : 'Selected users disabled')
    } catch (err: unknown) { toast.error(getApiErrorMessage(err, 'Bulk action failed')) }
  }

  const handleAdminAvatar = async (file?: File) => {
    if (!detailUser || !file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { toast.error('Use JPG, PNG, or WebP up to 2 MB'); return }
    setAvatarLoading(true)
    try { await uploadAdminUserAvatar(detailUser.id, file); await queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setDetailUser(current => current ? { ...current, avatar_url: URL.createObjectURL(file) } : current); toast.success('Profile photo updated') } catch (err: unknown) { toast.error(getApiErrorMessage(err, 'Unable to update profile photo')) } finally { setAvatarLoading(false) }
  }
  const handleRemoveAdminAvatar = async () => {
    if (!detailUser) return
    setAvatarLoading(true)
    try { await removeAdminUserAvatar(detailUser.id); await queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setDetailUser(current => current ? { ...current, avatar_url: null } : current); toast.success('Profile photo removed') } catch (err: unknown) { toast.error(getApiErrorMessage(err, 'Unable to remove profile photo')) } finally { setAvatarLoading(false) }
  }

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: () => createAdminUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      storage_quota: formData.storage_quota_gb * 1024 * 1024 * 1024,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setModalOpen(false)
      toast.success('User created successfully')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to create user')),
  })

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: () => updateAdminUser(editingUser!.id, {
      name: formData.name,
      email: formData.email,
      password: formData.password || undefined,
      role: formData.role,
      storage_quota: formData.storage_quota_gb * 1024 * 1024 * 1024,
      is_drive_enabled: formData.is_drive_enabled,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setModalOpen(false)
      toast.success('User updated successfully')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to update user')),
  })

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDeleteTarget(null)
      toast.success('User deleted successfully')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to delete user')),
  })

  const handleVerification = async (user: UserWithStorage, action: 'resend' | 'verify') => {
    setVerificationLoading(user.id)
    try {
      if (action === 'resend') await resendAdminUserVerification(user.id)
      else await verifyAdminUserEmail(user.id)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(action === 'resend' ? 'Verification code sent' : 'Email verified manually')
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Unable to update email verification'))
    } finally {
      setVerificationLoading(null)
    }
  }

  const handleRevokeSessions = async (user: UserWithStorage) => {
    setVerificationLoading(user.id)
    try {
      await revokeAdminUserSessions(user.id)
      toast.success(`All sessions revoked for ${user.name}`)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Unable to revoke user sessions'))
    } finally {
      setVerificationLoading(null)
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      storage_quota_gb: 5,
      is_drive_enabled: true,
    })
    setModalOpen(true)
  }

  const openEditModal = (user: UserWithStorage) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      storage_quota_gb: Math.round(user.storage_quota / (1024 * 1024 * 1024)),
      is_drive_enabled: user.is_drive_enabled ?? true,
    })
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold">User Management</h1>
            <p className="text-xs text-muted-foreground">{users.length} registered accounts · {filteredUsers.length} shown</p>
          </div>
        </div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={exportUsers} className="gap-1.5"><Download className="size-4" /> <span className="hidden sm:inline">Export</span></Button><Button size="sm" onClick={openCreateModal} className="gap-1.5 font-semibold"><UserPlus className="w-4 h-4" /> Add User</Button></div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading users...
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <div className="w-full space-y-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search by name or email..." className="pl-9" /></div><select value={roleFilter} onChange={event => { setRoleFilter(event.target.value); setPage(1) }} className="h-9 rounded-md border border-border bg-secondary px-3 text-xs"><option value="all">All roles</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="user">User</option></select><select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }} className="h-9 rounded-md border border-border bg-secondary px-3 text-xs"><option value="all">All status</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="disabled">Disabled</option><option value="quota">Near quota</option></select></div>
            {selectedUsers.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3"><span className="mr-auto text-xs font-semibold text-primary">{selectedUsers.length} selected</span><Button size="sm" variant="outline" onClick={() => void bulkAction('enable')} className="gap-1.5 text-emerald-600"><UserCheck className="size-3.5" /> Enable</Button><Button size="sm" variant="outline" onClick={() => void bulkAction('disable')} className="gap-1.5 text-destructive"><Lock className="size-3.5" /> Disable</Button><Button size="sm" variant="outline" onClick={() => void bulkAction('revoke')} className="gap-1.5"><LogOut className="size-3.5" /> Revoke sessions</Button><Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button></div>}
            <div className="flex items-center gap-2 px-1"><input type="checkbox" checked={visibleUsers.length > 0 && visibleUsers.every(user => selectedIds.has(user.id))} onChange={togglePage} className="size-4 accent-primary" /><span className="text-xs text-muted-foreground">Select page</span><span className="ml-auto text-xs text-muted-foreground">Page {Math.min(page, totalPages)} of {totalPages}</span></div>
            {visibleUsers.length === 0 && <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">No users match the current filters.</div>}
            {visibleUsers.map(user => {
              const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              const isNearFull = user.quota_percentage >= 80

              return (
                <div
                  key={user.id}
                  className={cn(
                    'bg-card border rounded-2xl p-5 transition-all hover:border-border/80',
                    isNearFull ? 'border-amber-500/30' : 'border-border'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleSelected(user.id)} className="mt-3 size-4 shrink-0 accent-primary" aria-label={`Select ${user.name}`} />
                    <button type="button" onClick={() => setDetailUser(user)} title="View profile" className="shrink-0 rounded-full transition hover:ring-2 hover:ring-primary/40"><Avatar className="w-10 h-10">
                      {user.avatar_url && <AvatarImage src={user.avatar_url} alt={`${user.name} profile photo`} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar></button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button type="button" onClick={() => setDetailUser(user)} className="font-semibold text-left text-sm hover:text-primary">{user.name}</button>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', user.role === 'admin' ? 'bg-primary/15 text-primary font-medium' : '')}
                        >
                          {user.role === 'admin' ? '✦ Admin' : user.role === 'manager' ? 'Manager' : 'User'}
                        </Badge>
                        {!user.is_drive_enabled && (
                          <Badge variant="destructive" className="text-[10px]">
                            Disabled
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn('text-[10px]', user.email_verified_at ? 'border-emerald-500/30 text-emerald-600' : 'border-amber-500/40 text-amber-600')}>
                          {user.email_verified_at ? 'Email verified' : 'Pending verification'}
                        </Badge>
                        {isNearFull && (
                          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 gap-1">
                            <AlertTriangle className="w-3 h-3" /> Near limit
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>

                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(user.used_storage)} / {formatBytes(user.storage_quota)} ({user.quota_percentage}%)
                          </span>
                          <span className="text-xs text-muted-foreground">{user.file_count ?? 0} files</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', user.quota_percentage >= 80 ? 'bg-amber-500' : 'bg-primary')}
                            style={{ width: `${Math.min(user.quota_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Edit & Delete */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {!user.email_verified_at && <>
                        <button onClick={() => handleVerification(user, 'resend')} disabled={verificationLoading === user.id} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50" title="Send verification code"><Mail className="size-3.5" /> <span className="hidden xl:inline">Resend OTP</span></button>
                        <button onClick={() => handleVerification(user, 'verify')} disabled={verificationLoading === user.id} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:opacity-50" title="Verify email manually"><MailCheck className="size-3.5" /> <span className="hidden xl:inline">Verify</span></button>
                      </>}
                      <button
                        onClick={() => handleRevokeSessions(user)}
                        disabled={verificationLoading === user.id}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600 disabled:opacity-50"
                        title="Revoke all sessions"
                      >
                        <LogOut className="size-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {totalPages > 1 && <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft className="mr-1 size-4" />Previous</Button><span className="text-xs text-muted-foreground">{filteredUsers.length} users</span><Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Next<ChevronRight className="ml-1 size-4" /></Button></div>}
          </div>
        )}
      </div>

      <Dialog open={!!detailUser} onOpenChange={open => !open && setDetailUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="size-4 text-primary" /> User profile</DialogTitle><DialogDescription>Account overview and profile photo management.</DialogDescription></DialogHeader>
          {detailUser && <div className="space-y-5 py-2"><div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4"><Avatar className="size-20"><AvatarImage src={detailUser.avatar_url ?? undefined} alt={`${detailUser.name} profile photo`} /><AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">{detailUser.name.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-lg font-semibold">{detailUser.name}</p><p className="truncate text-sm text-muted-foreground">{detailUser.email}</p><Badge className="mt-2" variant="secondary">{detailUser.role}</Badge></div></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">Storage used</p><p className="mt-1 font-semibold">{formatBytes(detailUser.used_storage)} / {formatBytes(detailUser.storage_quota)}</p></div><div className="rounded-xl bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">Files</p><p className="mt-1 font-semibold">{detailUser.file_count}</p></div><div className="rounded-xl bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">Account status</p><p className="mt-1 font-semibold">{detailUser.is_drive_enabled ? 'Enabled' : 'Disabled'}</p></div><div className="rounded-xl bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">Verification</p><p className="mt-1 font-semibold">{detailUser.email_verified_at ? 'Verified' : 'Pending'}</p></div></div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Camera className="size-3.5" />{avatarLoading ? 'Uploading...' : 'Change photo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={avatarLoading} onChange={event => { void handleAdminAvatar(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>{detailUser.avatar_url && <Button type="button" size="sm" variant="outline" disabled={avatarLoading} onClick={() => void handleRemoveAdminAvatar()} className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive">Remove photo</Button>}</div></div>}
        </DialogContent>
      </Dialog>

      {/* ─── Add / Edit User Modal ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user profile, role, and storage allocation.' : 'Create a new user account for Cloud NL.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <Input
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Ahmad Dahlan"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email Address</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="ahmad@naslabs.id"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Password {editingUser && '(Leave blank to keep unchanged)'}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder={editingUser ? '••••••••' : 'Minimum 8 characters'}
                required={!editingUser}
                minLength={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as 'admin' | 'manager' | 'user' }))}
                  className="w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Storage Quota (GB)</label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.storage_quota_gb}
                  onChange={e => setFormData(p => ({ ...p, storage_quota_gb: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
            </div>

            {editingUser && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-medium text-muted-foreground">Drive Access Status</span>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, is_drive_enabled: !p.is_drive_enabled }))}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    formData.is_drive_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'
                  )}
                >
                  {formData.is_drive_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Modal ────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete User Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? All associated files and folders will be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
