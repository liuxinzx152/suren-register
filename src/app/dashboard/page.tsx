'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db, moveToTrash } from '@/lib/db';
import { exportToExcel } from '@/lib/export';
import type { BuyerRecord, FilterParams, OrderStatus } from '@/lib/types';
import {
  COUNTRIES,
  BUYER_TYPES,
  PLATFORM_TYPES,
  ORDER_STATUSES,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { TopNav } from '@/components/layout/top-nav';
import { RecordForm } from '@/components/records/record-form';
import { RecordDetail } from '@/components/records/record-detail';
import { BatchImportDialog } from '@/components/records/batch-import-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PAGE_SIZE = 30;

const statusColors: Record<OrderStatus, string> = {
  待处理: 'bg-[oklch(0.92_0.10_80)] text-[oklch(0.50_0.12_80)]',
  进行中: 'bg-[oklch(0.92_0.08_220)] text-[oklch(0.45_0.12_220)]',
  已完成: 'bg-[oklch(0.92_0.08_155)] text-[oklch(0.40_0.10_155)]',
  已取消: 'bg-[oklch(0.94_0.05_20)] text-[oklch(0.50_0.10_20)]',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const { session, isAdmin, canExport, loading: authLoading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<BuyerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<FilterParams>({});

  // Sheet/Dialog 状态
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BuyerRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<BuyerRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // 批量选择状态（跨页保留）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // 重复数据标记
  const [duplicatePaypal, setDuplicatePaypal] = useState<Set<string>>(new Set());
  const [duplicateAmazon, setDuplicateAmazon] = useState<Set<string>>(new Set());

  // 重定向未登录用户
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  // 加载数据
  const loadRecords = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      // 所有登录用户均可查看全部记录
      const allRecords = await db.records.orderBy('createdAt').reverse().toArray();

      let filtered = allRecords;

      if (filters.creatorId) {
        filtered = filtered.filter((r) => r.creatorId === filters.creatorId);
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(kw) ||
            r.whatsapp.toLowerCase().includes(kw) ||
            r.orderNumber.toLowerCase().includes(kw) ||
            r.paypal.toLowerCase().includes(kw) ||
            r.country.toLowerCase().includes(kw) ||
            r.creatorName.toLowerCase().includes(kw)
        );
      }
      if (filters.country) {
        filtered = filtered.filter((r) => r.country === filters.country);
      }
      if (filters.buyerType) {
        filtered = filtered.filter((r) => r.buyerType === filters.buyerType);
      }
      if (filters.platformType) {
        filtered = filtered.filter(
          (r) => r.platformType === filters.platformType
        );
      }
      if (filters.orderStatus) {
        filtered = filtered.filter(
          (r) => r.orderStatus === filters.orderStatus
        );
      }
      if (filters.startDate) {
        filtered = filtered.filter((r) => r.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        filtered = filtered.filter((r) => r.createdAt <= filters.endDate!);
      }

      setTotal(filtered.length);
      const start = (page - 1) * PAGE_SIZE;
      setRecords(filtered.slice(start, start + PAGE_SIZE));

      // 计算重复的 PayPal 和 Amazon Profile（基于全部记录）
      const paypalCount = new Map<string, number>();
      const amazonCount = new Map<string, number>();
      for (const r of allRecords) {
        if (r.paypal) {
          const key = r.paypal.toLowerCase().trim();
          paypalCount.set(key, (paypalCount.get(key) || 0) + 1);
        }
        if (r.amazonProfile) {
          const key = r.amazonProfile.toLowerCase().trim();
          amazonCount.set(key, (amazonCount.get(key) || 0) + 1);
        }
      }
      setDuplicatePaypal(new Set([...paypalCount.entries()].filter(([, c]) => c > 1).map(([k]) => k)));
      setDuplicateAmazon(new Set([...amazonCount.entries()].filter(([, c]) => c > 1).map(([k]) => k)));
    } finally {
      setLoading(false);
    }
  }, [session, keyword, filters, page]);

  useEffect(() => {
    if (session) loadRecords();
  }, [loadRecords, session]);

  function handleSearch() {
    setPage(1);
    setKeyword(searchInput.trim());
  }

  function handleExport() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    exportToExcel(records, `素人登记_${dateStr}`);
  }

  async function handleDelete(id: string) {
    if (!session) return;
    if (!confirm('确定删除该记录？删除后可在回收站中恢复。')) return;
    await moveToTrash([id], session.userId, session.displayName);
    loadRecords();
  }

  function openCreate() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function openEdit(record: BuyerRecord) {
    setEditingRecord(record);
    setFormOpen(true);
  }

  function openView(record: BuyerRecord) {
    setViewRecord(record);
  }

  function handleFormSaved() {
    setFormOpen(false);
    setEditingRecord(null);
    loadRecords();
  }

  // 批量选择
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const currentPageIds = records.map((r) => r.id);
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

  async function handleBatchDelete() {
    if (!session) return;
    setBatchDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await moveToTrash(ids, session.userId, session.displayName);
      setSelectedIds(new Set());
      setBatchDeleteConfirm(false);
      loadRecords();
    } finally {
      setBatchDeleting(false);
    }
  }

  // 全部删除（仅管理员）
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  async function handleDeleteAll() {
    if (!session) return;
    setDeleteAllLoading(true);
    try {
      const allRecords = await db.records.toArray();
      const ids = allRecords.map((r) => r.id);
      await moveToTrash(ids, session.userId, session.displayName);
      setDeleteAllConfirm(false);
      setSelectedIds(new Set());
      loadRecords();
    } finally {
      setDeleteAllLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.country) count++;
    if (filters.buyerType) count++;
    if (filters.platformType) count++;
    if (filters.orderStatus) count++;
    if (filters.creatorId) count++;
    if (filters.startDate || filters.endDate) count++;
    return count;
  }, [filters]);

  function clearFilters() {
    setFilters({});
    setKeyword('');
    setSearchInput('');
    setPage(1);
  }

  if (authLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-[oklch(0.55_0.15_180)]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[oklch(0.97_0_0)]">
      <TopNav />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-[1600px] flex-1 flex flex-col overflow-hidden px-6 py-4">
        {/* 页面标题 + 操作（固定） */}
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[oklch(0.2_0_0)]">
              素人管理
            </h1>
            <p className="text-xs text-[oklch(0.55_0_0)]">
              共 {total} 条记录
              {keyword && <span> · 搜索: &quot;{keyword}&quot;</span>}
              {activeFilterCount > 0 && (
                <span> · {activeFilterCount} 个筛选条件</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canExport && (
            <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="h-8"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              批量导入
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出 Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/trash')}
              className="h-8"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              回收站
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllConfirm(true)}
              className="h-8 border-red-200 text-red-600 hover:bg-red-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="11" x2="9" y2="17" />
                <line x1="15" y1="11" x2="15" y2="17" />
              </svg>
              全部删除
            </Button>
            </>
            )}
            <Button
              size="sm"
              onClick={openCreate}
              className="h-8 bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增登记
            </Button>
            {isAdmin && selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBatchDeleteConfirm(true)}
                className="h-8"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1.5"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                批量删除 ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>

        {/* 搜索筛选栏（固定） */}
        <div className="mb-3 shrink-0 rounded-lg border border-[oklch(0.92_0_0)] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {/* 搜索框 */}
            <div className="relative min-w-[240px] flex-1">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[oklch(0.60_0_0)]"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <Input
                placeholder="搜索名字、WhatsApp、订单号、PayPal..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-8 pl-8 text-sm"
              />
            </div>

            {/* 筛选下拉 */}
            <Select
              value={filters.country || '__all__'}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, country: v === '__all__' ? undefined : v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="国家" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.buyerType || '__all__'}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, buyerType: v === '__all__' ? undefined : v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="买手类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                {BUYER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.platformType || '__all__'}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, platformType: v === '__all__' ? undefined : v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                {PLATFORM_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.orderStatus || '__all__'}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, orderStatus: v === '__all__' ? undefined : v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="订单状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              placeholder="开始日期"
              onChange={(e) => {
                const v = e.target.value;
                setFilters((f) => ({
                  ...f,
                  startDate: v ? new Date(v).getTime() : undefined,
                }));
                setPage(1);
              }}
            />
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              placeholder="结束日期"
              onChange={(e) => {
                const v = e.target.value;
                if (v) {
                  const end = new Date(v);
                  end.setHours(23, 59, 59, 999);
                  setFilters((f) => ({ ...f, endDate: end.getTime() }));
                } else {
                  setFilters((f) => {
                    const nf = { ...f };
                    delete nf.endDate;
                    return nf;
                  });
                }
                setPage(1);
              }}
            />

            <Button
              size="sm"
              onClick={handleSearch}
              className="h-8 bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
            >
              搜索
            </Button>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-[oklch(0.55_0_0)]"
              >
                清除
              </Button>
            )}
          </div>
        </div>

        {/* 数据表格（可滚动区域） */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[oklch(0.92_0_0)] bg-white shadow-sm">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[oklch(0.92_0_0)] bg-[oklch(0.98_0_0)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  {isAdmin && (
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[oklch(0.80_0_0)] accent-[oklch(0.55_0.15_180)]"
                        checked={records.length > 0 && records.every((r) => selectedIds.has(r.id))}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    名字
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    国家
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    买手类型
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    平台
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    WhatsApp
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    PayPal账号
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    Amazon Profile
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    卖家之家结果
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    订单号
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    状态
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    开发人
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-[oklch(0.50_0_0)]">
                    登记时间
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-medium text-[oklch(0.50_0_0)]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[oklch(0.96_0_0)]">
                      {Array.from({ length: isAdmin ? 11 : 10 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-4 w-16 animate-pulse rounded bg-[oklch(0.93_0_0)]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 11 : 10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="text-[oklch(0.75_0_0)]"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <p className="text-sm text-[oklch(0.55_0_0)]">
                          暂无记录
                        </p>
                        <Button
                          size="sm"
                          onClick={openCreate}
                          className="mt-2 bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
                        >
                          新增第一条记录
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    return (
                      <tr
                        key={record.id}
                        className={`border-b border-[oklch(0.96_0_0)] transition-colors hover:bg-[oklch(0.985_0_0)] ${selectedIds.has(record.id) ? 'bg-[oklch(0.96_0.03_180)]' : ''}`}
                      >
                        {isAdmin && (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-[oklch(0.80_0_0)] accent-[oklch(0.55_0.15_180)]"
                              checked={selectedIds.has(record.id)}
                              onChange={() => toggleSelect(record.id)}
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => openView(record)}
                            className="font-medium text-[oklch(0.2_0_0)] hover:text-[oklch(0.55_0.15_180)] hover:underline"
                          >
                            {record.name || '-'}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-[oklch(0.35_0_0)]">
                          {record.country || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-[oklch(0.35_0_0)]">
                          {record.buyerType || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-[oklch(0.35_0_0)]">
                          {record.platformType || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-[oklch(0.35_0_0)]">
                          {record.whatsapp || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-[oklch(0.35_0_0)]">
                          {record.paypal ? (
                            <span className={duplicatePaypal.has(record.paypal.toLowerCase().trim()) ? 'text-[oklch(0.577_0.245_27.325)] font-medium' : ''}>
                              {record.paypal}
                              {duplicatePaypal.has(record.paypal.toLowerCase().trim()) && (
                                <span className="ml-1 text-[10px] text-[oklch(0.577_0.245_27.325)]" title="此PayPal账号存在重复">重复</span>
                              )}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2.5 text-xs text-[oklch(0.35_0_0)]" title={record.amazonProfile || ''}>
                          {record.amazonProfile ? (
                            <span className={duplicateAmazon.has(record.amazonProfile.toLowerCase().trim()) ? 'text-[oklch(0.577_0.245_27.325)]' : ''}>
                              <a href={record.amazonProfile} target="_blank" rel="noopener noreferrer" className={duplicateAmazon.has(record.amazonProfile.toLowerCase().trim()) ? 'text-[oklch(0.577_0.245_27.325)] hover:underline' : 'text-[oklch(0.55_0.15_180)] hover:underline'}>
                                查看链接
                              </a>
                              {duplicateAmazon.has(record.amazonProfile.toLowerCase().trim()) && (
                                <span className="ml-1 text-[10px] text-[oklch(0.577_0.245_27.325)]" title="此Amazon Profile存在重复">重复</span>
                              )}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="max-w-[150px] truncate px-3 py-2.5 text-xs text-[oklch(0.35_0_0)]" title={record.sellerHomeResult || ''}>
                          {record.sellerHomeResult || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-[oklch(0.35_0_0)]">
                          {record.orderNumber || '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[record.orderStatus] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {record.orderStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[oklch(0.35_0_0)]">
                          {record.creatorName}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[oklch(0.55_0_0)]">
                          {formatDate(record.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-[oklch(0.55_0.15_180)]"
                              onClick={() => openView(record)}
                            >
                              查看
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEdit(record)}
                            >
                              编辑
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-[oklch(0.577_0.245_27.325)] hover:text-[oklch(0.577_0.245_27.325)]"
                                onClick={() => handleDelete(record.id)}
                              >
                                删除
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[oklch(0.92_0_0)] bg-[oklch(0.99_0_0)] px-4 py-2.5">
              <span className="text-xs text-[oklch(0.55_0_0)]">
                第 {page}/{totalPages} 页，共 {total} 条
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  首页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  末页
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 新增/编辑 Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-[520px] overflow-y-auto sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>
              {editingRecord ? '编辑记录' : '新增素人登记'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <RecordForm
              mode={editingRecord ? 'edit' : 'create'}
              record={editingRecord || undefined}
              onSaved={handleFormSaved}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 查看详情 Dialog */}
      <Dialog
        open={!!viewRecord}
        onOpenChange={(open) => { if (!open) setViewRecord(null); }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>记录详情</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <RecordDetail
              record={viewRecord}
              onEdit={() => {
                setViewRecord(null);
                openEdit(viewRecord);
              }}
              onDeleted={() => {
                setViewRecord(null);
                loadRecords();
              }}
              canDelete={isAdmin}
            />
          )}
        </DialogContent>
      </Dialog>

      <BatchImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={loadRecords}
      />

      {/* 批量删除确认弹窗 */}
      <Dialog open={batchDeleteConfirm} onOpenChange={setBatchDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[oklch(0.35_0_0)]">
              确定要删除选中的 <span className="font-semibold text-[oklch(0.577_0.245_27.325)]">{selectedIds.size}</span> 条记录吗？
            </p>
            <p className="mt-2 text-xs text-[oklch(0.55_0_0)]">
              删除后可在回收站中恢复（保留30天）。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchDeleteConfirm(false)}
              disabled={batchDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
            >
              {batchDeleting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 全部删除确认弹窗 */}
      <Dialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[oklch(0.577_0.245_27.325)]">确认全部删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[oklch(0.35_0_0)]">
              确定要删除<span className="font-semibold text-[oklch(0.577_0.245_27.325)]">全部 {total}</span> 条记录吗？
            </p>
            <p className="mt-2 text-xs text-[oklch(0.55_0_0)]">
              删除后记录将移入回收站，可在回收站中恢复（保留30天）。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllConfirm(false)}
              disabled={deleteAllLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAll}
              disabled={deleteAllLoading}
            >
              {deleteAllLoading ? '删除中...' : '确认全部删除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
