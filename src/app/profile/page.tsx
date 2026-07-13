'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ROLE_LABELS } from '@/lib/types';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { TopNav } from '@/components/layout/top-nav';
import { Spinner } from '@/components/ui/spinner';

export default function ProfilePage() {
  const { session, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [recordCount, setRecordCount] = useState(0);
  const [allCount, setAllCount] = useState(0);

  useEffect(() => {
    if (!session) {
      router.replace('/login');
      return;
    }
    db.records.count().then(setAllCount);
    db.records.count().then(setRecordCount);
  }, [session, router]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <TopNav />

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <h1 className="mb-6 text-lg font-semibold text-[oklch(0.2_0_0)]">
          个人中心
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 用户信息卡片 */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-[oklch(0.92_0_0)] bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.95_0.05_180)] text-xl font-semibold text-[oklch(0.45_0.10_180)]">
                  {session.displayName.charAt(0)}
                </div>
                <h2 className="mt-3 text-base font-semibold text-[oklch(0.2_0_0)]">
                  {session.displayName}
                </h2>
                <p className="text-sm text-[oklch(0.55_0_0)]">
                  @{session.username}
                </p>
                <span
                  className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${
                    isAdmin
                      ? 'bg-[oklch(0.92_0.05_180)] text-[oklch(0.45_0.10_180)]'
                      : 'bg-[oklch(0.95_0_0)] text-[oklch(0.55_0_0)]'
                  }`}
                >
                  {session?.role ? ROLE_LABELS[session.role] : '普通员工'}
                </span>
              </div>

              <div className="mt-6 border-t border-[oklch(0.92_0_0)] pt-4">
                <Button
                  variant="outline"
                  className="w-full text-[oklch(0.577_0.245_27.325)] border-[oklch(0.90_0.03_20)]"
                  onClick={() => {
                    logout();
                    router.replace('/login');
                  }}
                >
                  退出登录
                </Button>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[oklch(0.92_0_0)] bg-white p-5 shadow-sm">
                <p className="text-2xl font-semibold text-[oklch(0.55_0.15_180)]">
                  {recordCount}
                </p>
                <p className="mt-1 text-sm text-[oklch(0.55_0_0)]">
                  {isAdmin ? '总记录数' : '我的记录'}
                </p>
              </div>
              {isAdmin && (
                <div className="rounded-lg border border-[oklch(0.92_0_0)] bg-white p-5 shadow-sm">
                  <p className="text-2xl font-semibold text-[oklch(0.55_0.15_180)]">
                    {allCount}
                  </p>
                  <p className="mt-1 text-sm text-[oklch(0.55_0_0)]">
                    全部数据
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-[oklch(0.92_0_0)] bg-white p-5 shadow-sm">
                <p className="text-2xl font-semibold text-[oklch(0.55_0.15_180)]">
                  {isAdmin ? '全部' : '个人'}
                </p>
                <p className="mt-1 text-sm text-[oklch(0.55_0_0)]">
                  数据范围
                </p>
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="mt-6 rounded-lg border border-[oklch(0.92_0_0)] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-[oklch(0.2_0_0)]">
                快捷操作
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  查看记录列表
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin')}
                  >
                    用户管理
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
