'use client';

import { useEffect, useState } from 'react';
import type { FilterParams } from '@/lib/types';
import {
  COUNTRIES,
  BUYER_TYPES,
  PLATFORM_TYPES,
  ORDER_STATUSES,
} from '@/lib/types';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface FilterPanelProps {
  filters: FilterParams;
  isAdmin: boolean;
  onChange: (filters: FilterParams) => void;
  onClose: () => void;
}

interface CreatorOption {
  id: string;
  name: string;
}

export function FilterPanel({
  filters,
  isAdmin,
  onChange,
  onClose,
}: FilterPanelProps) {
  const [creators, setCreators] = useState<CreatorOption[]>([]);

  useEffect(() => {
    if (isAdmin) {
      db.users
        .where('status')
        .equals('active')
        .toArray()
        .then((users) => {
          setCreators(
            users.map((u) => ({ id: u.id, name: u.displayName }))
          );
        });
    }
  }, [isAdmin]);

  function updateFilter(key: keyof FilterParams, value: string | undefined) {
    const newFilters = { ...filters };
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, unknown>)[key] = value;
    }
    onChange(newFilters);
  }

  function handleDateStart(val: string) {
    if (val) {
      updateFilter('startDate', new Date(val).getTime() as unknown as undefined);
    } else {
      updateFilter('startDate', undefined);
    }
  }

  function handleDateEnd(val: string) {
    if (val) {
      // 结束日期包含当天整天
      const end = new Date(val);
      end.setHours(23, 59, 59, 999);
      updateFilter('endDate', end.getTime() as unknown as undefined);
    } else {
      updateFilter('endDate', undefined);
    }
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="space-y-4">
      {/* 国家 */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">国家</Label>
        <Select
          value={filters.country || ''}
          onValueChange={(v) => updateFilter('country', v || undefined)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="全部国家" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部国家</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 买手类型 */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">买手类型</Label>
        <Select
          value={filters.buyerType || ''}
          onValueChange={(v) => updateFilter('buyerType', v || undefined)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部类型</SelectItem>
            {BUYER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 平台类型 */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">平台类型</Label>
        <Select
          value={filters.platformType || ''}
          onValueChange={(v) => updateFilter('platformType', v || undefined)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="全部平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部平台</SelectItem>
            {PLATFORM_TYPES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 订单状态 */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">订单状态</Label>
        <Select
          value={filters.orderStatus || ''}
          onValueChange={(v) => updateFilter('orderStatus', v || undefined)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部状态</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 开发人（仅管理员可见） */}
      {isAdmin && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">开发人</Label>
          <Select
            value={filters.creatorId || ''}
            onValueChange={(v) => updateFilter('creatorId', v || undefined)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="全部开发人" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部开发人</SelectItem>
              {creators.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 时间范围 */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">登记时间</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            className="h-9 flex-1 text-sm"
            onChange={(e) => handleDateStart(e.target.value)}
          />
          <span className="flex items-center text-xs text-[oklch(0.55_0_0)]">
            至
          </span>
          <Input
            type="date"
            className="h-9 flex-1 text-sm"
            onChange={(e) => handleDateEnd(e.target.value)}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-9 text-sm"
          onClick={clearAll}
        >
          清除筛选
        </Button>
        <Button
          className="flex-1 h-9 text-sm bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
          onClick={onClose}
        >
          确定
        </Button>
      </div>
    </div>
  );
}
