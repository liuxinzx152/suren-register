'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function TopNav() {
  const { session, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!session) return null;

  const navItems = [
    { label: '素人管理', path: '/dashboard', icon: 'table' },
    { label: '新增登记', path: '/records/new', icon: 'plus' },
  ];

  if (isAdmin) {
    navItems.push({ label: '用户管理', path: '/admin', icon: 'users' });
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[oklch(0.92_0_0)] bg-white shadow-sm">
      <div className="mx-auto flex h-14 items-center justify-between px-6">
        {/* 左侧：Logo + 导航 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[oklch(0.55_0.15_180)] text-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[oklch(0.2_0_0)]">
              素人登记小程序
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path === '/dashboard' && pathname === '/');
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-[oklch(0.96_0.01_180)] font-medium text-[oklch(0.45_0.12_180)]'
                      : 'text-[oklch(0.45_0_0)] hover:bg-[oklch(0.96_0_0)] hover:text-[oklch(0.2_0_0)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 右侧：用户信息 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[oklch(0.95_0.05_180)] text-xs font-medium text-[oklch(0.45_0.10_180)]">
              {session.displayName.charAt(0)}
            </div>
            <span className="text-sm text-[oklch(0.35_0_0)]">
              {session.displayName}
            </span>
            {isAdmin && (
              <span className="rounded bg-[oklch(0.92_0.05_180)] px-1.5 py-0.5 text-[10px] font-medium text-[oklch(0.45_0.10_180)]">
                管理员
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 text-xs text-[oklch(0.55_0_0)] hover:text-[oklch(0.577_0.245_27.325)]"
          >
            退出
          </Button>
        </div>
      </div>
    </header>
  );
}
