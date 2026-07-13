'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Spinner } from '@/components/ui/spinner';

export default function RootPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [session, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.97_0_0)]">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-6 w-6 text-[oklch(0.55_0.15_180)]" />
        <p className="text-sm text-[oklch(0.55_0_0)]">加载中...</p>
      </div>
    </div>
  );
}
