'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewRecordPage() {
  const router = useRouter();

  useEffect(() => {
    // 桌面端使用 Sheet 弹窗，重定向到仪表板
    router.replace('/dashboard');
  }, [router]);

  return null;
}
