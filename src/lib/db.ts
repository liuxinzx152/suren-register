import Dexie, { type EntityTable } from 'dexie';
import type { User, BuyerRecord, TrashRecord } from './types';
import { hashPassword } from './auth';

class BuyerDatabase extends Dexie {
  users!: EntityTable<User, 'id'>;
  records!: EntityTable<BuyerRecord, 'id'>;
  trash!: EntityTable<TrashRecord, 'id'>;

  constructor() {
    super('buyer-management-db');

    this.version(1).stores({
      users: 'id, username, role, status',
      records:
        'id, creatorId, createdAt, country, buyerType, platformType, orderStatus, name, whatsapp, orderNumber',
    });

    this.version(2).stores({
      users: 'id, username, role, status',
      records:
        'id, creatorId, createdAt, country, buyerType, platformType, orderStatus, name, whatsapp, orderNumber',
      trash: 'id, deletedAt, deletedBy',
    });
  }
}

export const db = new BuyerDatabase();

// 初始化默认管理员账号
export async function initDefaultAdmin(): Promise<void> {
  const adminCount = await db.users.where('role').equals('admin').count();
  if (adminCount === 0) {
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword('admin123', salt);
    const now = Date.now();
    await db.users.add({
      id: crypto.randomUUID(),
      username: 'admin',
      displayName: '管理员',
      passwordHash,
      salt,
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }
}

// 生成唯一ID
export function generateId(): string {
  return crypto.randomUUID();
}

// 将记录移入回收站（软删除）
export async function moveToTrash(
  recordIds: string[],
  deletedBy: string,
  deletedByName: string
): Promise<number> {
  const records = await db.records.where('id').anyOf(recordIds).toArray();
  if (records.length === 0) return 0;

  const trashItems: TrashRecord[] = records.map((r) => ({
    id: r.id,
    originalData: { ...r },
    deletedAt: Date.now(),
    deletedBy,
    deletedByName,
  }));

  await db.transaction('rw', db.records, db.trash, async () => {
    await db.trash.bulkPut(trashItems);
    await db.records.bulkDelete(recordIds);
  });

  return records.length;
}

// 从回收站恢复记录
export async function restoreFromTrash(trashIds: string[]): Promise<number> {
  const trashItems = await db.trash.where('id').anyOf(trashIds).toArray();
  if (trashItems.length === 0) return 0;

  const records = trashItems.map((t) => t.originalData);

  await db.transaction('rw', db.records, db.trash, async () => {
    await db.records.bulkPut(records);
    await db.trash.bulkDelete(trashIds);
  });

  return trashItems.length;
}

// 永久删除回收站记录
export async function permanentDelete(trashIds: string[]): Promise<number> {
  const count = await db.trash.where('id').anyOf(trashIds).count();
  await db.trash.bulkDelete(trashIds);
  return count;
}

// 清空回收站
export async function emptyTrash(): Promise<number> {
  const count = await db.trash.count();
  await db.trash.clear();
  return count;
}

// 自动清理30天前的回收站记录
export async function cleanExpiredTrash(): Promise<number> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const expired = await db.trash.where('deletedAt').below(thirtyDaysAgo).toArray();
  if (expired.length === 0) return 0;
  await db.trash.bulkDelete(expired.map((t) => t.id));
  return expired.length;
}
