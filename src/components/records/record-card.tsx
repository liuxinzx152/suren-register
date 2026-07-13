'use client';

import type { BuyerRecord, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface RecordCardProps {
  record: BuyerRecord;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const statusColors: Record<OrderStatus, string> = {
  待处理: 'bg-[oklch(0.92_0.10_80)] text-[oklch(0.50_0.12_80)]',
  进行中: 'bg-[oklch(0.92_0.08_220)] text-[oklch(0.45_0.12_220)]',
  已完成: 'bg-[oklch(0.92_0.08_155)] text-[oklch(0.40_0.10_155)]',
  已取消: 'bg-[oklch(0.94_0.05_20)] text-[oklch(0.50_0.10_20)]',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function RecordCard({
  record,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: RecordCardProps) {
  return (
    <div
      className="rounded-xl border border-[oklch(0.92_0_0)] bg-white p-4 shadow-sm active:scale-[0.99] transition-transform"
      onClick={onView}
    >
      {/* 头部：名字 + 状态 */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[oklch(0.2_0_0)] truncate">
              {record.name || '未命名'}
            </h3>
            <span
              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[record.orderStatus] || 'bg-gray-100 text-gray-600'}`}
            >
              {record.orderStatus}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[oklch(0.55_0_0)]">
            {record.platformType} · {record.country} · {record.buyerType}
          </p>
        </div>
      </div>

      {/* 关键信息 */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {record.whatsapp && (
          <div className="flex items-center gap-1.5 text-[oklch(0.40_0_0)]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-[oklch(0.60_0_0)]"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="truncate">{record.whatsapp}</span>
          </div>
        )}
        {record.orderNumber && (
          <div className="flex items-center gap-1.5 text-[oklch(0.40_0_0)]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-[oklch(0.60_0_0)]"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate">{record.orderNumber}</span>
          </div>
        )}
      </div>

      {/* 底部：时间 + 操作 */}
      <div className="mt-3 flex items-center justify-between border-t border-[oklch(0.95_0_0)] pt-2.5">
        <span className="text-[11px] text-[oklch(0.60_0_0)]">
          {record.creatorName} · {formatDate(record.createdAt)}
        </span>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-[oklch(0.55_0.15_180)]"
            onClick={onEdit}
          >
            编辑
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-[oklch(0.577_0.245_27.325)]"
              onClick={onDelete}
            >
              删除
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
