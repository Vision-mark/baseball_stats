'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '首頁' },
  { href: '/stats', label: '查詢數據' },
  { href: '/schedule', label: '聯賽' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide shrink-0">
        <span className="text-[#D98E3F]">⚾</span> 棒球數據管理系統
      </Link>

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
                  : 'text-[#9BA5A4] hover:text-[#EDEAE2] hover:bg-[#1A2124]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
