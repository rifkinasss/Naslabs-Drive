'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Pencil, Trash2, Check, X, AlertTriangle, Loader2, Shield, Lock, HardDrive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '@/services/drive-api'
import { UserWithStorage } from '@/types/user'
import { formatBytes } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithStorage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserWithStorage | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    storage_quota_gb: 5,
    is_drive_enabled: true,
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
  })

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
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user'),
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
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update user'),
  })

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDeleteTarget(null)
      toast.success('User deleted successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  })

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
            <p className="text-xs text-muted-foreground">{users.length} registered accounts</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreateModal} className="gap-1.5 font-semibold">
          <UserPlus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading users...
          </div>
        ) : (
          <div className="max-w-4xl space-y-3">
            {users.map(user => {
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
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', user.role === 'admin' ? 'bg-primary/15 text-primary font-medium' : '')}
                        >
                          {user.role === 'admin' ? '✦ Admin' : 'User'}
                        </Badge>
                        {!user.is_drive_enabled && (
                          <Badge variant="destructive" className="text-[10px]">
                            Disabled
                          </Badge>
                        )}
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
          </div>
        )}
      </div>

      {/* ─── Add / Edit User Modal ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user profile, role, and storage allocation.' : 'Create a new user account for NasLabs Drive.'}
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
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as any }))}
                  className="w-full h-9 rounded-md bg-secondary border border-border px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
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
