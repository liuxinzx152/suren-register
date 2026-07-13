'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, restoreFromTrash, permanentDelete, emptyTrash, cleanExpiredTrash } from '@/lib/db';
import { useAuth } from '@/contexts/auth-context';
import type { TrashRecord } from '@/lib/types';
import { TopNav } from '@/components/layout/top-nav';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PAGE_SIZE = 20;

export default function TrashPage() {
  const { session, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [trashItems, setTrashItems] = useState<TrashRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTrash = useCallback(async () => {
    // Auto-clean expired trash
    await cleanExpiredTrash();

    const all = await db.trash.orderBy('deletedAt').reverse().toArray();
    setTotal(all.length);
    const start = (page - 1) * PAGE_SIZE;
    setTrashItems(all.slice(start, start + PAGE_SIZE));
  }, [page]);

  useEffect(() => {
    if (!loading && session) {
      loadTrash();
    }
  }, [loading, session, loadTrash]);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const currentPageIds = trashItems.map((t) => t.id);
    const allSelected = currentPageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleRestore() {
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await restoreFromTrash(ids);
      setSelectedIds(new Set());
      setRestoreConfirm(false);
      loadTrash();
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePermanentDelete() {
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await permanentDelete(ids);
      setSelectedIds(new Set());
      setDeleteConfirm(false);
      loadTrash();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearAll() {
    setActionLoading(true);
    try {
      await emptyTrash();
      setSelectedIds(new Set());
      setClearConfirm(false);
      loadTrash();
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function daysLeft(deletedAt: number) {
    const expire = deletedAt + 30 * 24 * 60 * 60 * 1000;
    const days = Math.ceil((expire - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[oklch(0.55_0_0)]">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.98_0_0)]">
      <TopNav />

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[oklch(0.2_0_0)]">回收站</h1>
            <p className="text-sm text-[oklch(0.55_0_0)] mt-1">
              已删除的记录保留30天，可恢复或永久删除。共 {total} 条记录。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRestoreConfirm(true)}
                  className="h-8"
                >
                  恢复选中 ({selectedIds.size})
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(true)}
                    className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    永久删除 ({selectedIds.size})
                  </Button>
                )}
              </>
            )}
            {isAdmin && total > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearConfirm(true)}
                className="h-8 border-red-200 text-red-600 hover:bg-red-50"
              >
                清空回收站
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {trashItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-[oklch(0.92_0_0)] p-12 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto text-[oklch(0.75_0_0)] mb-3"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <p className="text-[oklch(0.55_0_0)]">回收站为空</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[oklch(0.92_0_0)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[oklch(0.97_0_0)] border-b border-[oklch(0.92_0_0)]">
                    <th className="text-left py-3 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={trashItems.length > 0 && trashItems.every((t) => selectedIds.has(t.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-[oklch(0.8_0_0)]"
                      />
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">名字</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">国家</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">平台</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">WhatsApp</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">开发人</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">删除时间</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">删除人</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">剩余天数</th>
                    <th className="text-left py-3 px-3 font-medium text-[oklch(0.4_0_0)]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {trashItems.map((item) => {
                    const r = item.originalData;
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-[oklch(0.95_0_0)] hover:bg-[oklch(0.98_0_0)] ${isSelected ? 'bg-red-50/50' : ''}`}
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                            className="rounded border-[oklch(0.8_0_0)]"
                          />
                        </td>
                        <td className="py-3 px-3 font-medium text-[oklch(0.2_0_0)]">{r.name || '-'}</td>
                        <td className="py-3 px-3">{r.country || '-'}</td>
                        <td className="py-3 px-3">{r.platformType || '-'}</td>
                        <td className="py-3 px-3 font-mono text-xs">{r.whatsapp || '-'}</td>
                        <td className="py-3 px-3">{r.creatorName}</td>
                        <td className="py-3 px-3 text-[oklch(0.55_0_0)]">{formatDate(item.deletedAt)}</td>
                        <td className="py-3 px-3">{item.deletedByName}</td>
                        <td className="py-3 px-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${daysLeft(item.deletedAt) <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {daysLeft(item.deletedAt)} 天
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-[oklch(0.55_0.15_180)]"
                              onClick={async () => {
                                await restoreFromTrash([item.id]);
                                loadTrash();
                              }}
                            >
                              恢复
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-red-600"
                                onClick={async () => {
                                  if (confirm('确定永久删除该记录？此操作不可撤销。')) {
                                    await permanentDelete([item.id]);
                                    loadTrash();
                                  }
                                }}
                              >
                                永久删除
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[oklch(0.92_0_0)]">
                <p className="text-sm text-[oklch(0.55_0_0)]">
                  第 {page}/{totalPages} 页，共 {total} 条
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Restore Confirm */}
      <Dialog open={restoreConfirm} onOpenChange={setRestoreConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认恢复</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[oklch(0.35_0_0)]">
              确定要恢复选中的 <span className="font-semibold">{selectedIds.size}</span> 条记录吗？
            </p>
            <p className="mt-2 text-xs text-[oklch(0.55_0_0)]">
              恢复后记录将重新出现在素人列表中。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRestoreConfirm(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleRestore}
              disabled={actionLoading}
              className="bg-[oklch(0.55_0.15_180)] text-white"
            >
              {actionLoading ? '恢复中...' : '确认恢复'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirm */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[oklch(0.577_0.245_27.325)]">确认永久删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[oklch(0.35_0_0)]">
              确定要永久删除选中的 <span className="font-semibold text-red-600">{selectedIds.size}</span> 条记录吗？
            </p>
            <p className="mt-2 text-xs text-red-500">
              此操作不可撤销，数据将永久丢失！
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={handlePermanentDelete} disabled={actionLoading}>
              {actionLoading ? '删除中...' : '永久删除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirm */}
      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[oklch(0.577_0.245_27.325)]">确认清空回收站</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[oklch(0.35_0_0)]">
              确定要永久删除回收站中全部 <span className="font-semibold text-red-600">{total}</span> 条记录吗？
            </p>
            <p className="mt-2 text-xs text-red-500">
              此操作不可撤销，所有数据将永久丢失！
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setClearConfirm(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={actionLoading}>
              {actionLoading ? '清空中...' : '确认清空'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
