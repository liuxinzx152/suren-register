'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db, generateId } from '@/lib/db';
import type { User, UserRole, UserStatus } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';
import { hashPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { TopNav } from '@/components/layout/top-nav';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminPage() {
  const { session, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!isAdmin && session) {
      router.replace('/dashboard');
    }
  }, [session, isAdmin, router]);

  const loadUsers = useCallback(async () => {
    const all = await db.users.toArray();
    setUsers(all.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  const toggleStatus = useCallback(async (user: User) => {
    if (user.id === session?.userId) return;
    const newStatus: UserStatus =
      user.status === 'active' ? 'disabled' : 'active';
    const now = Date.now();
    await db.users.update(user.id, {
      status: newStatus,
      updatedAt: now,
    });
    loadUsers();
  }, [session?.userId, loadUsers]);

  const deleteUser = useCallback(async (user: User) => {
    if (user.id === session?.userId) return;
    if (!confirm(`确定删除用户 "${user.displayName}"？此操作不可撤销。`))
      return;
    await db.users.delete(user.id);
    loadUsers();
  }, [session?.userId, loadUsers]);

  const changeRole = useCallback(async (user: User, newRole: UserRole) => {
    if (user.id === session?.userId) return;
    const now = Date.now();
    await db.users.update(user.id, {
      role: newRole,
      updatedAt: now,
    });
    loadUsers();
  }, [session?.userId, loadUsers]);

  if (!isAdmin || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <TopNav />

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[oklch(0.2_0_0)]">
              用户管理
            </h1>
            <p className="text-xs text-[oklch(0.55_0_0)]">
              共 {users.length} 个账号
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
            onClick={() => setShowAdd(true)}
          >
            + 新增用户
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-[oklch(0.93_0_0)]"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[oklch(0.92_0_0)] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[oklch(0.92_0_0)] bg-[oklch(0.98_0_0)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    用户
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    用户名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    角色
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[oklch(0.50_0_0)]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[oklch(0.96_0_0)] transition-colors hover:bg-[oklch(0.985_0_0)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[oklch(0.95_0.05_180)] text-xs font-semibold text-[oklch(0.45_0.10_180)]">
                          {user.displayName.charAt(0)}
                        </div>
                        <span className="font-medium text-[oklch(0.2_0_0)]">
                          {user.displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[oklch(0.45_0_0)]">
                      @{user.username}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          user.role === 'admin'
                            ? 'bg-[oklch(0.92_0.05_180)] text-[oklch(0.45_0.10_180)]'
                            : user.role === 'subAdmin'
                            ? 'bg-[oklch(0.92_0.05_220)] text-[oklch(0.45_0.10_220)]'
                            : 'bg-[oklch(0.95_0_0)] text-[oklch(0.55_0_0)]'
                        }`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === 'active' ? (
                        <span className="rounded-full bg-[oklch(0.92_0.08_155)] px-2 py-0.5 text-[11px] font-medium text-[oklch(0.40_0.10_155)]">
                          正常
                        </span>
                      ) : (
                        <span className="rounded-full bg-[oklch(0.94_0.05_20)] px-2 py-0.5 text-[11px] font-medium text-[oklch(0.50_0.10_20)]">
                          已停用
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[oklch(0.55_0_0)]">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.id !== session.userId && (
                        <div className="flex items-center justify-end gap-1">
                          {user.role !== 'admin' && (
                            <Select
                              value={user.role}
                              onValueChange={(v) => changeRole(user, v as UserRole)}
                            >
                              <SelectTrigger className="h-7 w-24 px-2 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">员工</SelectItem>
                                <SelectItem value="subAdmin">子管理员</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => toggleStatus(user)}
                          >
                            {user.status === 'active' ? '停用' : '启用'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-[oklch(0.577_0.245_27.325)]"
                            onClick={() => deleteUser(user)}
                          >
                            删除
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <AddUserDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onAdded={() => {
          loadUsers();
          setShowAdd(false);
        }}
      />
    </div>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setUsername('');
    setDisplayName('');
    setPassword('');
    setRole('employee');
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !displayName.trim() || !password.trim()) {
      setError('请填写所有必填项');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const existing = await db.users
        .where('username')
        .equals(username.trim())
        .first();
      if (existing) {
        setError('用户名已存在');
        setSaving(false);
        return;
      }

      const salt = crypto.randomUUID();
      const passwordHash = await hashPassword(password, salt);
      const now = Date.now();

      await db.users.add({
        id: generateId(),
        username: username.trim(),
        displayName: displayName.trim(),
        passwordHash,
        salt,
        role,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      reset();
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增用户</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">用户名</Label>
            <Input
              placeholder="登录用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">显示名称</Label>
            <Input
              placeholder="员工姓名"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">密码</Label>
            <Input
              type="password"
              placeholder="至少6位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">角色</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">普通员工</SelectItem>
                <SelectItem value="subAdmin">子管理员</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-lg bg-[oklch(0.97_0.02_20)] p-2.5 text-xs text-[oklch(0.45_0.12_20)]">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9"
              onClick={() => { onOpenChange(false); reset(); }}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
              disabled={saving}
            >
              {saving ? '创建中...' : '创建用户'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
