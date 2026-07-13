'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session } from '@/lib/auth';
import { getSession, saveSession, clearSession } from '@/lib/auth';
import { db, initDefaultAdmin } from '@/lib/db';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  isAdmin: boolean;
  isSubAdmin: boolean;
  canExport: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await initDefaultAdmin();
      const saved = getSession();
      if (saved) {
        // 验证用户是否仍然有效
        const user = await db.users.get(saved.userId);
        if (user && user.status === 'active') {
          setSession(saved);
        } else {
          clearSession();
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      const user = await db.users.where('username').equals(username).first();
      if (!user) return '用户名或密码错误';
      if (user.status !== 'active') return '账号已停用，请联系管理员';

      const { verifyPassword } = await import('@/lib/auth');
      const valid = await verifyPassword(password, user.salt, user.passwordHash);
      if (!valid) return '用户名或密码错误';

      const newSession: Session = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        loginTime: Date.now(),
      };
      saveSession(newSession);
      setSession(newSession);
      return null;
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        login,
        logout,
        isAdmin: session?.role === 'admin',
        isSubAdmin: session?.role === 'subAdmin',
        canExport: session?.role === 'admin' || session?.role === 'subAdmin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
