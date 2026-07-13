// 用户角色
export type UserRole = 'admin' | 'subAdmin' | 'employee';

// 角色显示名称
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  subAdmin: '子管理员',
  employee: '员工',
};

// 用户状态
export type UserStatus = 'active' | 'disabled';

// 用户表
export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
}

// 订单状态
export type OrderStatus = '待处理' | '进行中' | '已完成' | '已取消';

// 买手记录表
export interface BuyerRecord {
  id: string;
  creatorId: string;
  creatorName: string;
  createdAt: number;
  updatedAt: number;
  country: string;
  buyerType: string;
  name: string;
  platformType: string;
  whatsapp: string;
  paypal: string;
  amazonProfile: string;
  sellerHomeResult: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  remarks: string;
}

// 回收站记录
export interface TrashRecord {
  id: string; // 原记录ID
  originalData: BuyerRecord; // 原始数据
  deletedAt: number; // 删除时间
  deletedBy: string; // 删除人ID
  deletedByName: string; // 删除人名称
}

// 筛选条件
export interface FilterParams {
  keyword?: string;
  country?: string;
  buyerType?: string;
  platformType?: string;
  orderStatus?: string;
  creatorId?: string;
  startDate?: number;
  endDate?: number;
  page?: number;
  pageSize?: number;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 预设选项
export const BUYER_TYPES = [
  '素人买手',
  '专业买手',
  '评测买手',
  '视频买手',
  '直播买手',
];

export const PLATFORM_TYPES = [
  'Amazon',
  'eBay',
  'Walmart',
  'Shopify',
  'TikTok Shop',
  'Temu',
  'SHEIN',
  '其他',
];

export const ORDER_STATUSES: OrderStatus[] = [
  '待处理',
  '进行中',
  '已完成',
  '已取消',
];

export const COUNTRIES = [
  '美国',
  '英国',
  '德国',
  '法国',
  '意大利',
  '西班牙',
  '加拿大',
  '澳大利亚',
  '日本',
  '韩国',
  '巴西',
  '墨西哥',
  '印度',
  '其他',
];
