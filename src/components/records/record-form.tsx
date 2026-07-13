'use client';

import { useState, type FormEvent } from 'react';
import type { BuyerRecord, OrderStatus } from '@/lib/types';
import {
  COUNTRIES,
  BUYER_TYPES,
  PLATFORM_TYPES,
  ORDER_STATUSES,
} from '@/lib/types';
import { db, generateId } from '@/lib/db';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

interface RecordFormProps {
  record?: BuyerRecord;
  mode: 'create' | 'edit';
  onSaved?: () => void;
  onCancel?: () => void;
}

export function RecordForm({ record, mode, onSaved, onCancel }: RecordFormProps) {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [pendingSave, setPendingSave] = useState(false);

  const [country, setCountry] = useState(record?.country || '');
  const [buyerType, setBuyerType] = useState(record?.buyerType || '');
  const [name, setName] = useState(record?.name || '');
  const [platformType, setPlatformType] = useState(record?.platformType || '');
  const [whatsapp, setWhatsapp] = useState(record?.whatsapp || '');
  const [paypal, setPaypal] = useState(record?.paypal || '');
  const [amazonProfile, setAmazonProfile] = useState(
    record?.amazonProfile || ''
  );
  const [sellerHomeResult, setSellerHomeResult] = useState(
    record?.sellerHomeResult || ''
  );
  const [orderNumber, setOrderNumber] = useState(record?.orderNumber || '');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    record?.orderStatus || '待处理'
  );
  const [remarks, setRemarks] = useState(record?.remarks || '');

  async function doSave() {
    if (!session) return;
    setSaving(true);
    setError('');

    try {
      const now = Date.now();
      if (mode === 'create') {
        const newRecord: BuyerRecord = {
          id: generateId(),
          creatorId: session.userId,
          creatorName: session.displayName,
          createdAt: now,
          updatedAt: now,
          country,
          buyerType,
          name: name.trim(),
          platformType,
          whatsapp: whatsapp.trim(),
          paypal: paypal.trim(),
          amazonProfile: amazonProfile.trim(),
          sellerHomeResult: sellerHomeResult.trim(),
          orderNumber: orderNumber.trim(),
          orderStatus,
          remarks: remarks.trim(),
        };
        await db.records.add(newRecord);
      } else if (record) {
        await db.records.update(record.id, {
          country,
          buyerType,
          name: name.trim(),
          platformType,
          whatsapp: whatsapp.trim(),
          paypal: paypal.trim(),
          amazonProfile: amazonProfile.trim(),
          sellerHomeResult: sellerHomeResult.trim(),
          orderNumber: orderNumber.trim(),
          orderStatus,
          remarks: remarks.trim(),
          updatedAt: now,
        });
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('请填写素人名字');
      return;
    }
    if (!session) return;

    // Check for duplicates
    const paypalVal = paypal.trim().toLowerCase();
    const amazonVal = amazonProfile.trim().toLowerCase();
    const warnings: string[] = [];

    if (paypalVal) {
      const existing = await db.records.where('paypal').equals(paypalVal).first();
      if (existing && existing.id !== record?.id) {
        warnings.push(`PayPal账号 "${paypal.trim()}" 已存在（属于: ${existing.name || '未知'}）`);
      }
    }

    if (amazonVal) {
      const existing = await db.records.where('amazonProfile').equals(amazonVal).first();
      if (existing && existing.id !== record?.id) {
        warnings.push(`Amazon Profile 已存在（属于: ${existing.name || '未知'}）`);
      }
    }

    if (warnings.length > 0 && !pendingSave) {
      setDuplicateWarning(warnings.join('\n'));
      return;
    }

    await doSave();
  }

  async function handleConfirmSave() {
    setDuplicateWarning('');
    setPendingSave(true);
    await doSave();
    setPendingSave(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 名字 */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          名字 <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="素人姓名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9"
        />
      </div>

      {/* 国家 + 买手类型 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">国家</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="选择国家" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">买手类型</Label>
          <Select value={buyerType} onValueChange={setBuyerType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              {BUYER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 平台类型 */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">平台类型</Label>
        <Select value={platformType} onValueChange={setPlatformType}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="选择平台" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_TYPES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* WhatsApp + PayPal */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">WhatsApp号码</Label>
          <Input
            placeholder="例: +1 234567890"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">PayPal账号</Label>
          <Input
            placeholder="PayPal 邮箱或账号"
            value={paypal}
            onChange={(e) => setPaypal(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Amazon Profile */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Amazon Profile</Label>
        <Input
          placeholder="Amazon 个人主页链接"
          value={amazonProfile}
          onChange={(e) => setAmazonProfile(e.target.value)}
          className="h-9"
          type="url"
        />
      </div>

      {/* 卖家之家结果 */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">卖家之家结果</Label>
        <Input
          placeholder="卖家之家查询结果"
          value={sellerHomeResult}
          onChange={(e) => setSellerHomeResult(e.target.value)}
          className="h-9"
        />
      </div>

      {/* 订单号 + 订单状态 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">订单号</Label>
          <Input
            placeholder="订单编号"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">订单状态</Label>
          <Select
            value={orderStatus}
            onValueChange={(v) => setOrderStatus(v as OrderStatus)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 备注 */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">其他备注</Label>
        <Textarea
          placeholder="补充说明..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg bg-[oklch(0.97_0.02_20)] p-2.5 text-sm text-[oklch(0.45_0.12_20)]">
          {error}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-9"
            onClick={onCancel}
          >
            取消
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 h-9 bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
          disabled={saving}
        >
          {saving ? '保存中...' : mode === 'create' ? '提交登记' : '保存修改'}
        </Button>
      </div>

      {/* 重复数据警告弹窗 */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-5 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-sm">数据重复提醒</h3>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-line mb-4">
              {duplicateWarning}
            </p>
            <p className="text-xs text-gray-500 mb-4">是否仍要继续添加？</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9"
                onClick={() => setDuplicateWarning('')}
              >
                取消
              </Button>
              <Button
                type="button"
                className="flex-1 h-9 bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)]"
                onClick={handleConfirmSave}
              >
                继续添加
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
