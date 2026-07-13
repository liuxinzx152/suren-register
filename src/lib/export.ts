import * as XLSX from 'xlsx';
import type { BuyerRecord } from './types';

// 导出记录为 Excel
export function exportToExcel(records: BuyerRecord[], filename: string): void {
  const headers = [
    '开发人',
    '登记时间',
    '国家',
    '买手类型',
    '名字',
    '平台类型',
    'WhatsApp号码',
    'PayPal账号',
    'Amazon Profile',
    '卖家之家结果',
    '订单号',
    '订单状态',
    '其他备注',
  ];

  const data = records.map((r) => [
    r.creatorName,
    formatDateTime(r.createdAt),
    r.country,
    r.buyerType,
    r.name,
    r.platformType,
    r.whatsapp,
    r.paypal,
    r.amazonProfile,
    r.sellerHomeResult,
    r.orderNumber,
    r.orderStatus,
    r.remarks,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // 设置列宽
  ws['!cols'] = [
    { wch: 10 }, // 开发人
    { wch: 18 }, // 登记时间
    { wch: 8 }, // 国家
    { wch: 10 }, // 买手类型
    { wch: 12 }, // 名字
    { wch: 12 }, // 平台类型
    { wch: 18 }, // WhatsApp
    { wch: 22 }, // PayPal
    { wch: 30 }, // Amazon Profile
    { wch: 15 }, // 卖家之家结果
    { wch: 15 }, // 订单号
    { wch: 10 }, // 订单状态
    { wch: 30 }, // 其他备注
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '素人登记');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
