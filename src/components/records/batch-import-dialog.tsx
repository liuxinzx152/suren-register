'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/auth-context';
import { ORDER_STATUSES, type OrderStatus, type BuyerRecord } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Layers,
} from 'lucide-react';

// ===== 模糊列名匹配 =====

// 标准字段 -> 可能的列名（小写匹配）
const FUZZY_FIELD_MAP: Record<string, string[]> = {
  creatorName: ['开发人', '创建人', '登记人', '负责人', '对接人', '归属'],
  createdAt: ['登记时间', '日期', '创建时间', '登记日期', '检查时间', '时间'],
  country: ['国家', '地区', '国家/地区'],
  buyerType: ['买手类型', '买手种类', '素人类型'],
  name: ['名字', '姓名', '名称', '素人名字', '素人姓名', '买手名字'],
  platformType: ['平台类型', '平台', '电商平台', '来源平台'],
  whatsapp: ['whatsapp号码', 'whatsapp', 'wa号码', 'wa', 'whatsapp号'],
  paypal: ['paypal账号', 'paypal', 'pay pal', 'payPal账号'],
  amazonProfile: ['amazon profile', 'amazon', '亚马逊listing reviewer link', '亚马逊listing', 'amazon链接', '亚马逊profile'],
  sellerHomeResult: ['卖家之家结果', '卖家之家', '初步评估', '评估结果'],
  orderNumber: ['订单号', '订单编号', '单号'],
  orderStatus: ['订单状态', '状态', '账号状态'],
  remarks: ['其他备注', '备注', '说明', '其他说明'],
};

// 额外联系字段 -> 标签（用于合并到备注）
const EXTRA_CONTACT_FIELDS: Record<string, string> = {
  '微信': '微信',
  '微信账号': '微信',
  'wechat': '微信',
  'facebook链接': 'Facebook',
  'facebook': 'Facebook',
  '邮箱': '邮箱',
  'email': '邮箱',
  'telegram': 'Telegram',
  'tg': 'Telegram',
  '其他联系方式': '其他联系方式',
  '主要联系方式': '主要联系方式',
  '退单记录': '退单记录',
  '来源': '来源',
  '下单数量': '下单数量',
  '性别': '性别',
  '亚马逊listing': '亚马逊Listing',
};

interface SheetInfo {
  name: string;
  matchCount: number; // 匹配到的标准字段数
  headers: string[]; // 原始表头
  rowCount: number;
}

interface ParsedRow {
  rowIndex: number;
  creatorName: string;
  createdAt: number | null;
  country: string;
  buyerType: string;
  name: string;
  platformType: string;
  whatsapp: string;
  paypal: string;
  amazonProfile: string;
  sellerHomeResult: string;
  orderNumber: string;
  orderStatus: string;
  remarks: string;
  warnings: string[];
  isDuplicate?: boolean;
  duplicateFields?: string[];
}

interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type ImportStep = 'upload' | 'selectSheet' | 'preview' | 'result';

// 模糊匹配：判断一个表头是否对应某个标准字段
function matchField(header: string): string | null {
  // 去除所有空白字符（包括换行、制表符等），统一小写
  const normalized = header.toLowerCase().replace(/\s+/g, '').trim();
  for (const [field, aliases] of Object.entries(FUZZY_FIELD_MAP)) {
    for (const alias of aliases) {
      const aliasNorm = alias.toLowerCase().replace(/\s+/g, '');
      if (normalized === aliasNorm || normalized.includes(aliasNorm)) {
        return field;
      }
    }
  }
  return null;
}

// 判断一个表头是否是额外联系字段
function matchExtraField(header: string): string | null {
  const normalized = header.toLowerCase().replace(/\s+/g, '').trim();
  for (const [alias, label] of Object.entries(EXTRA_CONTACT_FIELDS)) {
    const aliasNorm = alias.toLowerCase().replace(/\s+/g, '');
    if (normalized === aliasNorm || normalized.includes(aliasNorm)) {
      return label;
    }
  }
  return null;
}

// 分析一个 Sheet 的匹配度
function analyzeSheet(sheet: XLSX.WorkSheet): { matchCount: number; headers: string[]; rowCount: number } {
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', range: 0 });
  if (jsonData.length === 0) return { matchCount: 0, headers: [], rowCount: 0 };

  const headers = Object.keys(jsonData[0] as Record<string, unknown>);
  let matchCount = 0;
  for (const h of headers) {
    if (matchField(h)) matchCount++;
  }
  return { matchCount, headers, rowCount: jsonData.length };
}

export function BatchImportDialog({
  open,
  onOpenChange,
  onImported,
}: BatchImportDialogProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, skipped: 0, failed: 0 });
  const [parseError, setParseError] = useState('');
  const [duplicateCount, setDuplicateCount] = useState(0);

  // 多 Sheet 相关
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [sheetList, setSheetList] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');

  const reset = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setFileName('');
    setImporting(false);
    setImportResult({ success: 0, skipped: 0, failed: 0 });
    setParseError('');
    setWorkbookRef(null);
    setSheetList([]);
    setSelectedSheet('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset]
  );

  // Step 1: 上传文件 -> 读取所有 Sheet
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setParseError('');
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });

          if (wb.SheetNames.length === 0) {
            setParseError('Excel 文件中没有工作表');
            return;
          }

          // 分析每个 Sheet 的匹配度
          const sheets: SheetInfo[] = wb.SheetNames.map((name) => {
            const info = analyzeSheet(wb.Sheets[name]);
            return { name, ...info };
          });

          setWorkbookRef(wb);
          setSheetList(sheets);

          // 如果只有一个 Sheet 且匹配度够，直接解析
          const matchedSheets = sheets.filter((s) => s.matchCount >= 2);
          if (matchedSheets.length === 1) {
            setSelectedSheet(matchedSheets[0].name);
            parseSheet(wb, matchedSheets[0].name);
          } else if (matchedSheets.length > 1) {
            // 多个 Sheet 匹配，让用户选择
            setStep('selectSheet');
          } else if (sheets.length === 1) {
            // 只有一个 Sheet 但匹配度低，仍然让用户看
            setSelectedSheet(sheets[0].name);
            parseSheet(wb, sheets[0].name);
          } else {
            // 多个 Sheet 但都没有匹配
            setStep('selectSheet');
          }
        } catch (err) {
          setParseError(
            `解析 Excel 文件失败: ${err instanceof Error ? err.message : '未知错误'}`
          );
        }
      };
      reader.onerror = () => setParseError('文件读取失败');
      reader.readAsArrayBuffer(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 解析指定 Sheet
  const parseSheet = useCallback(
    async (wb: XLSX.WorkBook, sheetName: string) => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) {
        setParseError(`找不到工作表: ${sheetName}`);
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
      });

      if (jsonData.length === 0) {
        setParseError(`工作表 "${sheetName}" 中没有数据行`);
        return;
      }

      const headers = Object.keys(jsonData[0] as Record<string, unknown>);

      // 建立列映射：原始表头 -> 标准字段名
      const fieldMapping: Record<string, string> = {};
      const extraFieldMapping: Record<string, string> = {}; // 额外字段 -> 标签

      for (const header of headers) {
        const field = matchField(header);
        if (field) {
          fieldMapping[header] = field;
        } else {
          const extraLabel = matchExtraField(header);
          if (extraLabel) {
            extraFieldMapping[header] = extraLabel;
          }
        }
      }

      // 如果匹配字段太少（<2），提示用户
      if (Object.keys(fieldMapping).length < 2) {
        setParseError(
          `工作表 "${sheetName}" 的列头与系统字段匹配度过低（仅匹配 ${Object.keys(fieldMapping).length} 个字段），可能不是素人数据表。请检查是否选对了工作表。`
        );
        return;
      }

      // 找到时间字段的原始表头
      const timeHeader = headers.find((h) => fieldMapping[h] === 'createdAt');

      // 解析每一行
      const rows: ParsedRow[] = jsonData.map((rawRow, idx) => {
        const row = rawRow as Record<string, unknown>;
        const warnings: string[] = [];
        const mapped: Record<string, string> = {};

        // 映射标准字段
        for (const [header, field] of Object.entries(fieldMapping)) {
          const val = row[header];
          mapped[field] = val != null ? String(val).trim() : '';
        }

        // 收集额外字段到备注
        const extraParts: string[] = [];
        for (const [header, label] of Object.entries(extraFieldMapping)) {
          const val = row[header];
          if (val != null && String(val).trim()) {
            extraParts.push(`${label}: ${String(val).trim()}`);
          }
        }

        // 处理登记时间
        let createdAt: number | null = null;
        if (timeHeader) {
          const timeRaw = row[timeHeader];
          if (timeRaw instanceof Date) {
            createdAt = timeRaw.getTime();
          } else if (typeof timeRaw === 'number' && timeRaw > 1) {
            // Excel 日期序列号（1 = 1900-01-01, 45992 = 2025-12-01）
            if (timeRaw < 200000) {
              // Excel serial number (range: ~1 to ~200000, covers up to year ~2445)
              const excelEpoch = new Date(1899, 11, 30);
              createdAt = excelEpoch.getTime() + timeRaw * 86400000;
            } else {
              // 可能是毫秒级时间戳
              createdAt = timeRaw;
            }
          } else if (typeof timeRaw === 'string' && timeRaw.trim()) {
            const parsed = Date.parse(timeRaw);
            if (!isNaN(parsed)) {
              createdAt = parsed;
            } else {
              warnings.push(`登记时间格式无法解析: "${timeRaw}"`);
            }
          }
        }

        // 校验订单状态
        const status = mapped.orderStatus || '';
        if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
          warnings.push(`订单状态"${status}"不在预设中，将原样保存`);
        }

        // 校验必填字段
        if (!mapped.name && !mapped.whatsapp && !mapped.orderNumber) {
          warnings.push('名字、WhatsApp、订单号均为空，可能为无效数据');
        }

        // 合并备注
        const baseRemarks = mapped.remarks || '';
        const allRemarks = [baseRemarks, ...extraParts].filter(Boolean).join('；');

        // 清理字段值：数字"0"视为空（常见于WhatsApp列表示无数据）
        const cleanValue = (val: string): string => {
          const trimmed = val.trim();
          if (trimmed === '0' || trimmed === '0.0') return '';
          return trimmed;
        };

        return {
          rowIndex: idx + 2,
          creatorName: cleanValue(mapped.creatorName || ''),
          createdAt,
          country: cleanValue(mapped.country || ''),
          buyerType: cleanValue(mapped.buyerType || ''),
          name: cleanValue(mapped.name || ''),
          platformType: cleanValue(mapped.platformType || ''),
          whatsapp: cleanValue(mapped.whatsapp || ''),
          paypal: cleanValue(mapped.paypal || ''),
          amazonProfile: cleanValue(mapped.amazonProfile || ''),
          sellerHomeResult: cleanValue(mapped.sellerHomeResult || ''),
          orderNumber: cleanValue(mapped.orderNumber || ''),
          orderStatus: cleanValue(mapped.orderStatus || ''),
          remarks: allRemarks,
          warnings,
        };
      });

      // 检查与数据库中已有记录的重复
      const existingRecords = await db.records.toArray();
      const existingPaypalSet = new Set(
        existingRecords
          .filter((r) => r.paypal)
          .map((r) => r.paypal.toLowerCase().trim())
      );
      const existingAmazonSet = new Set(
        existingRecords
          .filter((r) => r.amazonProfile)
          .map((r) => r.amazonProfile.toLowerCase().trim())
      );

      // 同时检查文件内部的重复
      const filePaypalCounts = new Map<string, number>();
      const fileAmazonCounts = new Map<string, number>();
      for (const row of rows) {
        if (row.paypal) {
          const key = row.paypal.toLowerCase().trim();
          filePaypalCounts.set(key, (filePaypalCounts.get(key) || 0) + 1);
        }
        if (row.amazonProfile) {
          const key = row.amazonProfile.toLowerCase().trim();
          fileAmazonCounts.set(key, (fileAmazonCounts.get(key) || 0) + 1);
        }
      }

      for (const row of rows) {
        const duplicateFields: string[] = [];
        if (row.paypal) {
          const key = row.paypal.toLowerCase().trim();
          if (existingPaypalSet.has(key) || (filePaypalCounts.get(key) || 0) > 1) {
            duplicateFields.push('PayPal账号');
          }
        }
        if (row.amazonProfile) {
          const key = row.amazonProfile.toLowerCase().trim();
          if (existingAmazonSet.has(key) || (fileAmazonCounts.get(key) || 0) > 1) {
            duplicateFields.push('Amazon Profile');
          }
        }
        if (duplicateFields.length > 0) {
          row.isDuplicate = true;
          row.duplicateFields = duplicateFields;
        }
      }

      setParsedRows(rows);
      setStep('preview');
    },
    []
  );

  // 用户在多 Sheet 界面选择并确认
  const handleSelectSheet = useCallback(async () => {
    if (!workbookRef || !selectedSheet) return;
    await parseSheet(workbookRef, selectedSheet);
  }, [workbookRef, selectedSheet, parseSheet]);

  // 执行导入
  const handleImport = useCallback(async () => {
    if (!session) return;
    setImporting(true);
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const row of parsedRows) {
      try {
        const now = Date.now();
        const record: BuyerRecord = {
          id: crypto.randomUUID(),
          creatorId: session.userId,
          creatorName: row.creatorName || session.displayName,
          createdAt: row.createdAt || now,
          updatedAt: now,
          country: row.country,
          buyerType: row.buyerType,
          name: row.name,
          platformType: row.platformType,
          whatsapp: row.whatsapp,
          paypal: row.paypal,
          amazonProfile: row.amazonProfile,
          sellerHomeResult: row.sellerHomeResult,
          orderNumber: row.orderNumber,
          orderStatus: (row.orderStatus || '') as OrderStatus,
          remarks: row.remarks,
        };

        try {
          await db.records.add(record);
          successCount++;
        } catch (err) {
          console.error('[批量导入] 记录添加失败:', err);
          failCount++;
        }
      } catch (err) {
        console.error('[批量导入] 记录处理失败:', err);
        failCount++;
      }
    }

    setImportResult({ success: successCount, skipped: skipCount, failed: failCount });
    setImporting(false);
    setStep('result');
    onImported();
  }, [session, parsedRows, onImported]);

  const validRows = parsedRows.filter((r) => r.warnings.length === 0);
  const warningRows = parsedRows.filter((r) => r.warnings.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>批量导入素人记录</DialogTitle>
          <DialogDescription>
            {step === 'upload' && '上传 Excel 文件（.xlsx / .xls），系统将自动识别工作表和字段'}
            {step === 'selectSheet' && `文件 "${fileName}" 包含多个工作表，请选择要导入的素人数据表`}
            {step === 'preview' && `已解析 "${selectedSheet}"，共 ${parsedRows.length} 条数据，请确认后导入`}
            {step === 'result' && '导入完成'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: 上传文件 */}
        {step === 'upload' && (
          <div className="py-8">
            <div
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                点击或拖拽文件到此处上传
              </p>
              <p className="text-xs text-muted-foreground">
                支持 .xlsx、.xls 格式，支持多工作表文件
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {parseError && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {parseError}
              </div>
            )}
            <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
              <p className="font-medium mb-1">系统自动识别以下字段（支持模糊匹配）：</p>
              <p>开发人、登记时间/日期、国家、买手类型、名字、平台类型、WhatsApp号码、PayPal账号、Amazon Profile/亚马逊Listing、卖家之家结果、订单号、订单状态、其他备注</p>
              <p className="mt-1">额外字段（微信、邮箱、Telegram等）将自动合并到备注中</p>
            </div>
          </div>
        )}

        {/* Step 1.5: 选择工作表 */}
        {step === 'selectSheet' && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-medium">
                文件 &quot;{fileName}&quot; 包含 {sheetList.length} 个工作表
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {sheetList.map((sheet) => {
                const isMatched = sheet.matchCount >= 2;
                return (
                  <label
                    key={sheet.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSheet === sheet.name
                        ? 'border-primary bg-primary/5'
                        : isMatched
                        ? 'border-border hover:border-primary/30'
                        : 'border-border opacity-60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sheet"
                      value={sheet.name}
                      checked={selectedSheet === sheet.name}
                      onChange={() => setSelectedSheet(sheet.name)}
                      className="accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {sheet.name}
                        </span>
                        {isMatched ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            匹配 {sheet.matchCount} 个字段
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            匹配 {sheet.matchCount} 个字段
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sheet.rowCount} 行数据
                        {sheet.headers.length > 0 && (
                          <> · 列: {sheet.headers.slice(0, 5).join(', ')}{sheet.headers.length > 5 ? '...' : ''}</>
                        )}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {parseError && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {parseError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('upload');
                  setSheetList([]);
                  setWorkbookRef(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                重新选择文件
              </Button>
              <Button
                size="sm"
                onClick={handleSelectSheet}
                disabled={!selectedSheet}
              >
                解析选中的工作表
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 预览数据 */}
        {step === 'preview' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                工作表: {selectedSheet}
              </span>
              <span className="text-muted-foreground">
                共 {parsedRows.length} 条
              </span>
              {duplicateCount > 0 && (
                <span className="text-orange-600 font-medium">
                  重复 {duplicateCount} 条
                </span>
              )}
              {warningRows.length > 0 && (
                <span className="text-amber-600">
                  有警告 {warningRows.length} 条
                </span>
              )}
            </div>

            {duplicateCount > 0 && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  发现 {duplicateCount} 条重复记录（PayPal/Amazon Profile 已存在），导入后将在列表中以红色标记
                </span>
              </div>
            )}

            <div className="flex-1 overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium w-10">行</th>
                    <th className="px-2 py-2 text-left font-medium">名字</th>
                    <th className="px-2 py-2 text-left font-medium">国家</th>
                    <th className="px-2 py-2 text-left font-medium">平台</th>
                    <th className="px-2 py-2 text-left font-medium">WhatsApp</th>
                    <th className="px-2 py-2 text-left font-medium">订单号</th>
                    <th className="px-2 py-2 text-left font-medium">状态</th>
                    <th className="px-2 py-2 text-left font-medium">开发人</th>
                    <th className="px-2 py-2 text-left font-medium w-40">校验</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-t ${row.isDuplicate ? 'bg-orange-50' : row.warnings.length > 0 ? 'bg-amber-50' : ''}`}
                    >
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {row.rowIndex}
                      </td>
                      <td className="px-2 py-1.5 font-medium">
                        {row.name || '-'}
                      </td>
                      <td className="px-2 py-1.5">{row.country || '-'}</td>
                      <td className="px-2 py-1.5">{row.platformType || '-'}</td>
                      <td className="px-2 py-1.5">{row.whatsapp || '-'}</td>
                      <td className="px-2 py-1.5">{row.orderNumber || '-'}</td>
                      <td className="px-2 py-1.5">{row.orderStatus || '-'}</td>
                      <td className="px-2 py-1.5">
                        {row.creatorName || session?.displayName || '-'}
                      </td>
                      <td className="px-2 py-1.5">
                        {row.isDuplicate ? (
                          <div className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="text-xs truncate">
                              {row.duplicateFields?.includes('paypal') && row.duplicateFields?.includes('amazonProfile')
                                ? 'PayPal+Amazon重复'
                                : row.duplicateFields?.includes('paypal')
                                  ? 'PayPal已存在'
                                  : 'Amazon已存在'}
                            </span>
                          </div>
                        ) : row.warnings.length > 0 ? (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span className="text-xs truncate">
                              {row.warnings[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-green-600 text-xs">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sheetList.filter((s) => s.matchCount >= 2).length > 1) {
                    setStep('selectSheet');
                  } else {
                    setStep('upload');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                  setParsedRows([]);
                  setParseError('');
                }}
              >
                重新选择
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || parsedRows.length === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    导入中...
                  </>
                ) : duplicateCount > 0 ? (
                  `确认导入 (${parsedRows.length} 条，${duplicateCount} 条重复将标红)`
                ) : (
                  `确认导入 (${parsedRows.length} 条)`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 导入结果 */}
        {step === 'result' && (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium mb-2">导入完成</p>
            <div className="flex justify-center gap-6 text-sm mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {importResult.success}
                </p>
                <p className="text-muted-foreground">成功导入</p>
              </div>
              {importResult.failed > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {importResult.failed}
                  </p>
                  <p className="text-muted-foreground">导入失败</p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              关闭
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
