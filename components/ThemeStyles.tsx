export default function ThemeStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      .font-display { font-family: 'Teko', 'Noto Sans TC', sans-serif; font-weight: 600; }
      .font-body { font-family: 'IBM Plex Sans', 'Noto Sans TC', sans-serif; }
      .font-data { font-family: 'IBM Plex Mono', 'Noto Sans TC', monospace; }
      .stat-scroll::-webkit-scrollbar { height: 8px; }
      .stat-scroll::-webkit-scrollbar-track { background: var(--bg-page); }
      .stat-scroll::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
    `}</style>
  );
}
