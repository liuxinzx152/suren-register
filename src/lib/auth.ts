// 密码哈希工具 - 使用 Web Crypto API

// 将密码哈希（PBKDF2）
export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 验证密码
export async function verifyPassword(
  password: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}

// 会话管理
const SESSION_KEY = 'buyer_mgmt_session';

import type { UserRole } from './types';

export interface Session {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  loginTime: number;
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
