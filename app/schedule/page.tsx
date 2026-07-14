'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';

const STAGES = ['初賽', '複賽', '決賽'];

export default function SchedulePage() {
  const supabaseClient = createClient();

  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [leagues, setLeagues] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newLeagueName, setNewLeagueName] = useState('');
  const [gameForm, setGameForm] = useState({
    stage: '初賽',
    groupName: '',
    gameNumber: '',
    gameDate: '',
    homeTeamId: '',
    awayTeamId: '',
  });

  // ---- 登入狀態 ----
  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setAuthLoading(false);
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      return;
    }
    fetch('/api/permissions')
      .then(res => res.json())
      .then(data => setIsSuperAdmin(!!data.isSuperAdmin))
      .catch(() => setIsSuperAdmin(false));
  }, [user]);

  const handleGoogleLogin = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/schedule` }
    });
  };

  // ---- 資料讀取 ----
  // 依年份排序；同一年的話冬聯排在夏聯前面（抓不到年份/季節的排最後，維持原順序）
  const sortLeagues = (list: any[]) => {
    const seasonRank = (name: string) => {
      if (name.includes('冬')) return 0;
      if (name.includes('夏')) return 1;
      return 2;
    };
    const yearOf = (name: string) => {
      const match = name.match(/\d{4}/);
      return match ? Number(match[0]) : 9999;
    };
    return [...list].sort((a, b) => {
      const yearDiff = yearOf(a.name) - yearOf(b.name);
      if (yearDiff !== 0) return yearDiff;
      return seasonRank(a.name) - seasonRank(b.name);
    });
  };

  const fetchLeagues = async () => {
    const res = await fetch('/api/schedule-init');
    const data = await res.json();
    const sorted = sortLeagues(data.leagues || []);
    setLeagues(sorted);
    setTeams(data.teams || []);
    if (!selectedLeagueId && sorted.length > 0) {
      setSelectedLeagueId(sorted[0].id);
    }
  };

  const fetchTeams = async () => {
    // 已經在 fetchLeagues 裡一起拿了，這裡保留是為了給「新增聯盟」後單獨刷新聯盟用
  };

  const fetchGames = async (leagueId: string) => {
    if (!leagueId) return setGames([]);
    const res = await fetch(`/api/games?league_id=${leagueId}`);
    const data = await res.json();
    setGames(data.games || []);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLeagues(), fetchTeams()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGames(selectedLeagueId);
  }, [selectedLeagueId]);

  const teamName = (id: string) => teams.find(t => t.id === id)?.team_name || '未知球隊';

  // ---- 操作 ----
  const handleAddLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;
    const res = await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addLeague', name: newLeagueName }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || '新增失敗');
    setNewLeagueName('');
    fetchLeagues();
  };

  const handleDeleteLeague = async (leagueId: string) => {
    if (!confirm('確定要刪除這個聯盟嗎？底下的比賽場次也會一併刪除。')) return;
    const res = await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteLeague', leagueId }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || '刪除失敗');
    fetchLeagues();
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeagueId) return alert('請先選擇聯盟');
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addGame',
        leagueId: selectedLeagueId,
        stage: gameForm.stage,
        groupName: gameForm.groupName,
        gameNumber: gameForm.gameNumber,
        gameDate: gameForm.gameDate,
        homeTeamId: gameForm.homeTeamId,
        awayTeamId: gameForm.awayTeamId,
      }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || '新增比賽失敗');
    setGameForm({ stage: '初賽', groupName: '', gameNumber: '', gameDate: '', homeTeamId: '', awayTeamId: '' });
    fetchGames(selectedLeagueId);
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('確定要刪除這場比賽嗎？相關簡表跟記分板也會一併刪除。')) return;
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteGame', gameId }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || '刪除失敗');
    fetchGames(selectedLeagueId);
  };

  return (
    <div className="min-h-screen bg-[#12181B] text-[#EDEAE2] font-body">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <NavBar />
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-wide">賽程管理</h1>
          </div>

          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2 bg-[#1A2124] px-4 py-2.5 rounded-lg border border-[#333E41] text-sm">
                <span className="text-[#9BA5A4]">{user.email}</span>
                <span className={isSuperAdmin ? 'text-[#7FBF95] font-semibold' : 'text-[#9BA5A4]'}>
                  {isSuperAdmin ? '（聯盟管理員）' : '（無排賽程權限）'}
                </span>
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
          <>
            {/* 聯盟選擇 / 新增 */}
            <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6 mb-8">
              <h2 className="font-display text-2xl tracking-wide mb-4">聯盟</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {leagues.map(l => (
                  <div key={l.id} className="flex items-center">
                    <button
                      onClick={() => setSelectedLeagueId(l.id)}
                      className={`px-4 py-2 rounded-l-lg text-sm border ${
                        selectedLeagueId === l.id
                          ? 'bg-[#4F86A6] border-[#4F86A6] text-white'
                          : 'bg-[#12181B] border-[#333E41] text-[#9BA5A4] hover:text-[#EDEAE2]'
                      }`}
                    >
                      {l.name}
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteLeague(l.id)}
                        className="px-3 py-2 rounded-r-lg text-sm border border-l-0 border-[#333E41] bg-[#12181B] text-[#E2897E] hover:text-[#F2A89C]"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {leagues.length === 0 && <p className="text-sm text-[#9BA5A4]">還沒有任何聯盟。</p>}
              </div>

              {isSuperAdmin && (
                <form onSubmit={handleAddLeague} className="flex gap-2">
                  <input
                    type="text"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    placeholder="新增聯盟名稱，例如：2026 夏季聯賽"
                    className="flex-1 bg-[#12181B] border border-[#333E41] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#D98E3F]"
                  />
                  <button type="submit" className="bg-[#4F86A6] hover:bg-[#3E6F8C] px-5 py-2.5 rounded-lg text-sm font-medium">
                    新增聯盟
                  </button>
                </form>
              )}
            </div>

            {/* 新增比賽場次 */}
            {isSuperAdmin && selectedLeagueId && (
              <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6 mb-8">
                <h2 className="font-display text-2xl tracking-wide mb-4">新增比賽場次</h2>
                <form onSubmit={handleAddGame} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={gameForm.stage}
                    onChange={(e) => setGameForm({ ...gameForm, stage: e.target.value })}
                    className="bg-[#12181B] border border-[#333E41] rounded-lg px-4 py-2.5 text-sm"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="text"
                    value={gameForm.groupName}
                    onChange={(e) => setGameForm({ ...gameForm, groupName: e.target.value })}
                    placeholder="組別（選填，例如 A組）"
                    className="bg-[#12181B] border border-[#333E41] rounded-lg px-4 py-2.5 text-sm"
                  />
                  <input
                    type="text"
                    value={gameForm.gameNumber}
                    onChange={(e) => setGameForm({ ...gameForm, gameNumber: e.target.value })}
                    placeholder="場次，例如 G3"
                    className="bg-[#12181B] border border-[#333E41] rounded-lg px-4 py-2.5 text-sm"
                  />
                  <input
                    type="date"
                    value={gameForm.gameDate}
                    onChange={(e) => setGameForm({ ...gameForm, gameDate: e.target.value })}
                    className="bg-[#12181B] border border-[#333E41] rounded-lg px-4 py-2.5 text-sm"
                  />
                  <select
                    value={gameForm.homeTeamId}
                    onChange={(e) => setGameForm({ ...gameForm, homeTeamId: e.target.value })}
                    className="bg-[#12181B] border border-[#333E41] rounded-lg px-4 py-2.5 text-sm"
                    required
                  >
                    <option value="">主隊</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                  <select
                    value={gameForm.awayTeamId}
                    onChange={(e) => setGameForm({ ...gameForm, awayTeamId: e.target.value })}
                    className="bg-[#12181B] border border-[#333E41] rounded-lg px-4 py-2.5 text-sm"
                    required
                  >
                    <option value="">客隊</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                  <button type="submit" className="bg-[#7C6FA6] hover:bg-[#665890] px-5 py-2.5 rounded-lg text-sm font-medium">
                    新增比賽
                  </button>
                </form>
              </div>
            )}

            {/* 比賽列表：依賽段分組，賽段內再依組別分排 */}
            <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6">
              <h2 className="font-display text-2xl tracking-wide mb-4">比賽列表</h2>
              {games.length === 0 ? (
                <p className="text-sm text-[#9BA5A4]">這個聯盟目前還沒有排定的比賽。</p>
              ) : (
                STAGES.filter(stage => games.some(g => g.stage === stage)).map(stage => {
                  const stageGames = games.filter(g => g.stage === stage);
                  const groupNames = Array.from(new Set(stageGames.map(g => g.group_name || '')));
                  // 沒有分組的排在前面（key 為空字串），有分組的依字母/中文排序
                  groupNames.sort((a, b) => a.localeCompare(b, 'zh-Hant'));

                  return (
                    <div key={stage} className="mb-8 last:mb-0">
                      <h3 className="text-sm font-semibold text-[#D98E3F] mb-3">{stage}</h3>
                      {groupNames.map(groupName => (
                        <div key={groupName || '__none__'} className="mb-4 last:mb-0">
                          {groupName && (
                            <p className="text-xs text-[#9BA5A4] mb-2">{groupName}</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {stageGames.filter(g => (g.group_name || '') === groupName).map(g => (
                              <Link
                                key={g.id}
                                href={`/games/${g.id}`}
                                className="block bg-[#12181B] border border-[#333E41] hover:border-[#4F86A6] rounded-lg px-4 py-3 transition-colors relative"
                              >
                                {isSuperAdmin && (
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteGame(g.id); }}
                                    className="absolute top-2 right-2 text-xs text-[#E2897E] hover:text-[#F2A89C]"
                                  >
                                    刪除
                                  </button>
                                )}
                                <div className="flex items-center gap-2 text-xs text-[#9BA5A4] mb-2">
                                  {g.game_number && <span>{g.game_number}</span>}
                                  {g.game_date && <span>{g.game_date}</span>}
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{teamName(g.away_team_id)}</span>
                                  <span className="font-data text-[#7FBF95] font-semibold">{g.away_score ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                  <span className="font-medium">{teamName(g.home_team_id)}</span>
                                  <span className="font-data text-[#7FBF95] font-semibold">{g.home_score ?? 0}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
