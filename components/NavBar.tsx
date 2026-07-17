'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '首頁' },
  { href: '/stats', label: '查詢數據' },
  { href: '/schedule', label: '聯賽' },
];

// 深色（預設）與淺色兩組色票，透過 CSS 變數切換，整站共用同一套變數名稱
const THEME_STYLE = `
  :root {
    --bg-page: #12181B;
    --bg-card: #1A2124;
    --bg-elevated: #232B2E;
    --border-default: #333E41;
    --border-subtle: #2A3336;
    --text-primary: #EDEAE2;
    --text-muted: #9BA5A4;
    --text-faint: #6C7574;
    --text-disabled: #46524F;
  }
  html.light {
    --bg-page: #F5F3EE;
    --bg-card: #FFFFFF;
    --bg-elevated: #ECE8DF;
    --border-default: #D8D2C4;
    --border-subtle: #E5E1D6;
    --text-primary: #1F2421;
    --text-muted: #5B6462;
    --text-faint: #8A928F;
    --text-disabled: #B7BFBC;
  }
`;

export default function NavBar() {
  const pathname = usePathname();
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const light = saved === 'light';
    setIsLight(light);
    document.documentElement.classList.toggle('light', light);
  }, []);

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.classList.toggle('light', next);
    localStorage.setItem('theme', next ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <style dangerouslySetInnerHTML={{ __html: THEME_STYLE }} />

      <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide shrink-0">
        <span className="text-[#D98E3F]">⚾</span> 棒球數據管理系統
      </Link>

      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            // /games/[id] 這種比賽詳情頁，導覽列上把「聯賽」標成目前分類
            const isActive =
              pathname === item.href ||
              (item.href === '/schedule' && pathname?.startsWith('/games'));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#4F86A6] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggleTheme}
          title={isLight ? '切換成深色模式' : '切換成淺色模式'}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-sm border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
        >
          {isLight ? '🌙' : '☀️'}
        </button>
      </div>
    </div>
  );
}
