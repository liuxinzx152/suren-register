'use client';

import type { BuyerRecord, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';

const statusColors: Record<OrderStatus, string> = {
  待处理: 'bg-[oklch(0.92_0.10_80)] text-[oklch(0.50_0.12_80)]',
  进行中: 'bg-[oklch(0.92_0.08_220)] text-[oklch(0.45_0.12_220)]',
  已完成: 'bg-[oklch(0.92_0.08_155)] text-[oklch(0.40_0.10_155)]',
  已取消: 'bg-[oklch(0.94_0.05_20)] text-[oklch(0.50_0.10_20)]',
};

function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface RecordDetailProps {
  record: BuyerRecord;
  onEdit: () => void;
  onDeleted: () => void;
  canDelete: boolean;
}

export function RecordDetail({
  record,
  onEdit,
  onDeleted,
  canDelete,
}: RecordDetailProps) {
  const fields = [
    { label: '开发人', value: record.creatorName },
    { label: '登记时间', value: formatFullDate(record.createdAt) },
    { label: '国家', value: record.country },
    { label: '买手类型', value: record.buyerType },
    { label: '名字', value: record.name },
    { label: '平台类型', value: record.platformType },
    { label: 'WhatsApp号码', value: record.whatsapp },
    { label: 'PayPal账号', value: record.paypal },
    { label: 'Amazon Profile', value: record.amazonProfile, isLink: true },
    { label: '卖家之家结果', value: record.sellerHomeResult },
    { label: '订单号', value: record.orderNumber },
    { label: '订单状态', value: record.orderStatus, isStatus: true },
    { label: '其他备注', value: record.remarks },
  ];

  async function handleDelete() {
    if (!confirm('确定删除该记录？此操作不可撤销。')) return;
    await db.records.delete(record.id);
    onDeleted();
  }

  return (
    <div>
      {/* 头部 */}
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-[oklch(0.98_0_0)] p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[oklch(0.95_0.05_180)] text-base font-semibold text-[oklch(0.45_0.10_180)]">
          {record.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[oklch(0.2_0_0)]">
            {record.name}
          </h3>
          <p className="text-xs text-[oklch(0.55_0_0)]">
            {record.platformType} · {record.country} · {record.buyerType}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[record.orderStatus]}`}
        >
          {record.orderStatus}
        </span>
      </div>

      {/* 详情列表 */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-0 rounded-lg border border-[oklch(0.92_0_0)]">
        {fields.map((field, idx) => {
          if (!field.value) return null;
          return (
            <div
              key={field.label}
              className={`flex items-start gap-3 px-4 py-3 ${
                idx % 2 === 0 ? 'border-r border-[oklch(0.96_0_0)]' : ''
              } ${idx > 1 ? 'border-t border-[oklch(0.96_0_0)]' : ''}`}
            >
              <span className="shrink-0 text-xs text-[oklch(0.55_0_0)] w-24">
                {field.label}
              </span>
              {field.isLink && field.value ? (
                <a
                  href={field.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[oklch(0.55_0.15_180)] underline break-all"
                >
                  {field.value}
                </a>
              ) : field.isStatus ? (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[field.value as OrderStatus]}`}
                >
                  {field.value}
                </span>
              ) : (
                <span className="text-xs text-[oklch(0.2_0_0)] break-all">
                  {field.value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {record.updatedAt !== record.createdAt && (
        <p className="mt-2 text-[11px] text-[oklch(0.60_0_0)]">
          最后更新于 {formatFullDate(record.updatedAt)}
        </p>
      )}

      {/* 操作按钮 */}
      <div className="mt-4 flex justify-end gap-2">
        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            className="text-[oklch(0.577_0.245_27.325)] border-[oklch(0.90_0.03_20)]"
            onClick={handleDelete}
          >
            删除
          </Button>
        )}
        <Button
          size="sm"
          className="bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
          onClick={onEdit}
        >
          编辑
        </Button>
      </div>
    </div>
  );
}
