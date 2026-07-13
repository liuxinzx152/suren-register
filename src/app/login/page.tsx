'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function LoginPage() {
  const { login, session } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/dashboard');
    }
  }, [session, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    setError('');
    const err = await login(username.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      router.replace('/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.97_0_0)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.55_0.15_180)] text-white shadow-lg">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[oklch(0.2_0_0)]">
            素人登记小程序
          </h1>
          <p className="mt-1 text-sm text-[oklch(0.55_0_0)]">
            推广部买手信息管理平台
          </p>
        </div>

        {/* 登录表单 */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[oklch(0.92_0_0)] bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                用户名
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-[oklch(0.97_0.02_20)] p-3 text-sm text-[oklch(0.45_0.12_20)]">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="mt-6 h-10 w-full rounded-lg bg-[oklch(0.55_0.15_180)] text-white hover:bg-[oklch(0.50_0.15_180)] active:scale-[0.99]"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" /> 登录中...
              </span>
            ) : (
              '登 录'
            )}
          </Button>

          <p className="mt-4 text-center text-xs text-[oklch(0.60_0_0)]">
            默认管理员账号: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
