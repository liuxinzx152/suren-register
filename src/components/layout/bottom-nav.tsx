'use client';

interface BottomNavProps {
  active: 'home' | 'add' | 'profile';
  onNavigate: (path: string) => void;
}

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[oklch(0.92_0_0)] bg-white">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around">
        <button
          onClick={() => onNavigate('/dashboard')}
          className={`flex flex-col items-center gap-0.5 px-4 py-2 ${
            active === 'home'
              ? 'text-[oklch(0.55_0.15_180)]'
              : 'text-[oklch(0.60_0_0)]'
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[11px]">首页</span>
        </button>

        <button
          onClick={() => onNavigate('/records/new')}
          className="flex flex-col items-center gap-0.5 px-4 py-2"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              active === 'add'
                ? 'bg-[oklch(0.55_0.15_180)] text-white'
                : 'bg-[oklch(0.55_0.15_180)] text-white'
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-[11px] text-[oklch(0.55_0.15_180)]">新增</span>
        </button>

        <button
          onClick={() => onNavigate('/profile')}
          className={`flex flex-col items-center gap-0.5 px-4 py-2 ${
            active === 'profile'
              ? 'text-[oklch(0.55_0.15_180)]'
              : 'text-[oklch(0.60_0_0)]'
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[11px]">我的</span>
        </button>
      </div>
    </nav>
  );
}
