'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

export default function HomePage() {
  const supabaseClient = createClient();

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [teams, setTeams] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- 登入狀態 ----
  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setAuthLoading(false);
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
  };

  // ---- 資料讀取 ----
  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/games').then(r => r.json()),
    ]).then(([teamsData, gamesData]) => {
      setTeams(teamsData.teams || []);
      setGames(gamesData.games || []);
      setLoading(false);
    });
  }, []);

  const teamName = (id: string) => teams.find(t => t.id === id)?.team_name || '未知球隊';

  const todayStr = new Date().toISOString().slice(0, 10);
  const recentGames = games
    .filter(g => g.game_date && g.game_date <= todayStr)
    .sort((a, b) => (b.game_date || '').localeCompare(a.game_date || ''))
    .slice(0, 8);
  const upcomingGames = games
    .filter(g => !g.game_date || g.game_date > todayStr)
    .sort((a, b) => (a.game_date || '9999-99-99').localeCompare(b.game_date || '9999-99-99'))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[#12181B] text-[#EDEAE2] font-body p-6">
      <div className="max-w-5xl mx-auto">
        <NavBar />

        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-8 pb-6 border-b border-[#333E41]">
          <div>
            <span className="text-xs tracking-[0.3em] uppercase text-[#9BA5A4]">Team Stats Console</span>
            <h1 className="font-display text-3xl tracking-wide mt-1">最新比賽動態</h1>
          </div>

          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9BA5A4] hidden sm:inline">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-[#232B2E] hover:bg-[#333E41] px-5 py-2.5 rounded-lg text-sm border border-[#333E41] transition-colors font-medium"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="bg-[#4F86A6] hover:bg-[#3E6F8C] px-5 py-2.5 rounded-lg text-sm transition-colors font-medium"
              >
                使用 Google 登入
              </button>
            )
          )}
        </div>

        {loading ? (
          <p className="text-[#9BA5A4]">載入中...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6">
              <h2 className="font-display text-xl tracking-wide mb-4 flex items-center gap-2">🏆 最近比賽結果</h2>
              {recentGames.length === 0 ? (
                <p className="text-sm text-[#6C7574]">還沒有已完成的比賽紀錄。</p>
              ) : (
                <div className="space-y-2">
                  {recentGames.map(g => (
                    <Link
                      key={g.id}
                      href={`/games/${g.id}`}
                      className="block bg-[#12181B] border border-[#333E41] hover:border-[#4F86A6] rounded-lg px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs text-[#9BA5A4] mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#232B2E] text-[#D98E3F] text-xs font-medium">{g.stage}</span>
                        {g.group_name && <span>{g.group_name}</span>}
                        <span>{g.game_date}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{teamName(g.away_team_id)}</span>
                        <span className="font-data font-semibold text-[#7FBF95]">{g.away_score ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="font-medium">{teamName(g.home_team_id)}</span>
                        <span className="font-data font-semibold text-[#7FBF95]">{g.home_score ?? 0}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6">
              <h2 className="font-display text-xl tracking-wide mb-4 flex items-center gap-2">📅 近期賽程</h2>
              {upcomingGames.length === 0 ? (
                <p className="text-sm text-[#6C7574]">目前沒有排定的比賽。</p>
              ) : (
                <div className="space-y-2">
                  {upcomingGames.map(g => (
                    <Link
                      key={g.id}
                      href={`/games/${g.id}`}
                      className="block bg-[#12181B] border border-[#333E41] hover:border-[#4F86A6] rounded-lg px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs text-[#9BA5A4] mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#232B2E] text-[#D98E3F] text-xs font-medium">{g.stage}</span>
                        {g.group_name && <span>{g.group_name}</span>}
                        {g.game_date ? <span>{g.game_date}</span> : <span>日期未定</span>}
                        {g.game_number && <span>{g.game_number}</span>}
                      </div>
                      <div className="text-sm font-medium">
                        {teamName(g.away_team_id)} <span className="text-[#9BA5A4]">@</span> {teamName(g.home_team_id)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
