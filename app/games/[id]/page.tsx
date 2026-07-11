'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type LineupRow = {
  battingOrder: number;
  subs: { subOrder: number; playerId: string }[];
};

function buildInitialLineup(entries: any[]): LineupRow[] {
  const rows: LineupRow[] = Array.from({ length: 9 }, (_, i) => ({ battingOrder: i + 1, subs: [] }));
  entries.forEach((e) => {
    const row = rows.find((r) => r.battingOrder === e.batting_order);
    if (row) row.subs.push({ subOrder: e.sub_order, playerId: e.player_id });
  });
  rows.forEach((r) => {
    r.subs.sort((a, b) => a.subOrder - b.subOrder);
    if (r.subs.length === 0) r.subs.push({ subOrder: 0, playerId: '' });
  });
  return rows;
}

const INNINGS = Array.from({ length: 9 }, (_, i) => i + 1);

export default function GameDetailPage() {
  const params = useParams();
  const gameId = params.id as string;
  const supabaseClient = createClient();

  const [user, setUser] = useState<any>(null);
  const [permittedTeamIds, setPermittedTeamIds] = useState<string[]>([]);
  const canManageTeam = (teamId: any) => permittedTeamIds.includes(String(teamId));

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  const [homeLineup, setHomeLineup] = useState<LineupRow[]>(buildInitialLineup([]));
  const [awayLineup, setAwayLineup] = useState<LineupRow[]>(buildInitialLineup([]));

  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});

  // ---- 登入狀態 ----
  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return setPermittedTeamIds([]);
    fetch('/api/permissions').then(r => r.json()).then(d => setPermittedTeamIds(d.teamIds || []));
  }, [user]);

  const handleGoogleLogin = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/games/${gameId}` }
    });
  };

  // ---- 資料讀取 ----
  const fetchAll = async () => {
    const [gameRes, baseballRes, lineupRes, scoreRes] = await Promise.all([
      fetch(`/api/games?id=${gameId}`).then(r => r.json()),
      fetch('/api/baseball').then(r => r.json()),
      fetch(`/api/lineups?game_id=${gameId}`).then(r => r.json()),
      fetch(`/api/scoreboard?game_id=${gameId}`).then(r => r.json()),
    ]);

    const g = gameRes.games?.[0] || null;
    setGame(g);
    setTeams(baseballRes.teams || []);
    setPlayers(baseballRes.players || []);

    if (g) {
      const homeEntries = (lineupRes.lineups || []).filter((e: any) => e.team_id === g.home_team_id);
      const awayEntries = (lineupRes.lineups || []).filter((e: any) => e.team_id === g.away_team_id);
      setHomeLineup(buildInitialLineup(homeEntries));
      setAwayLineup(buildInitialLineup(awayEntries));
    }

    const scoreMap: Record<string, Record<number, number>> = {};
    (scoreRes.scores || []).forEach((s: any) => {
      if (!scoreMap[s.team_id]) scoreMap[s.team_id] = {};
      scoreMap[s.team_id][s.inning] = s.runs;
    });
    setScores(scoreMap);

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [gameId]);

  const teamName = (id: string) => teams.find(t => t.id === id)?.team_name || '未知球隊';
  const teamPlayers = (id: string) => players.filter(p => p.team_id === id);
  const playerLabel = (id: string) => {
    const p = players.find(pl => pl.id === id);
    if (!p) return '';
    return p.jersey_number ? `${p.player_name} #${p.jersey_number}` : p.player_name;
  };

  const totalScore = (teamId: string) => {
    const rows = scores[teamId] || {};
    return Object.values(rows).reduce((sum, v) => sum + (Number(v) || 0), 0);
  };

  // ---- 簡表操作 ----
  const updateLineup = (side: 'home' | 'away', battingOrder: number, subOrder: number, playerId: string) => {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => prev.map(row => {
      if (row.battingOrder !== battingOrder) return row;
      return { ...row, subs: row.subs.map(s => s.subOrder === subOrder ? { ...s, playerId } : s) };
    }));
  };

  const addPinchHitter = (side: 'home' | 'away', battingOrder: number) => {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => prev.map(row => {
      if (row.battingOrder !== battingOrder) return row;
      const nextSubOrder = Math.max(...row.subs.map(s => s.subOrder)) + 1;
      return { ...row, subs: [...row.subs, { subOrder: nextSubOrder, playerId: '' }] };
    }));
  };

  const removeLastSub = (side: 'home' | 'away', battingOrder: number) => {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => prev.map(row => {
      if (row.battingOrder !== battingOrder || row.subs.length <= 1) return row;
      return { ...row, subs: row.subs.slice(0, -1) };
    }));
  };

  const saveLineup = async (side: 'home' | 'away') => {
    const teamId = side === 'home' ? game.home_team_id : game.away_team_id;
    const lineup = side === 'home' ? homeLineup : awayLineup;

    const entries = lineup.flatMap(row =>
      row.subs
        .filter(s => s.playerId)
        .map(s => ({ batting_order: row.battingOrder, sub_order: s.subOrder, player_id: s.playerId }))
    );

    const res = await fetch('/api/lineups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveLineup', gameId, teamId, entries }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || '儲存失敗');
    alert('簡表已儲存');
  };

  // ---- 記分板操作 ----
  const handleInningChange = (teamId: string, inning: number, value: string) => {
    setScores(prev => ({
      ...prev,
      [teamId]: { ...(prev[teamId] || {}), [inning]: value === '' ? 0 : Number(value) },
    }));
  };

  const saveInning = async (teamId: string, inning: number) => {
    const runs = scores[teamId]?.[inning] ?? 0;
    const res = await fetch('/api/scoreboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveInning', gameId, teamId, inning, runs }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || '儲存失敗');
  };

  if (loading) {
    return <div className="min-h-screen bg-[#12181B] text-[#EDEAE2] flex items-center justify-center">載入中...</div>;
  }

  if (!game) {
    return <div className="min-h-screen bg-[#12181B] text-[#EDEAE2] flex items-center justify-center">找不到這場比賽</div>;
  }

  const renderLineupTable = (side: 'home' | 'away') => {
    const teamId = side === 'home' ? game.home_team_id : game.away_team_id;
    const lineup = side === 'home' ? homeLineup : awayLineup;
    const editable = canManageTeam(teamId);
    const roster = teamPlayers(teamId);

    return (
      <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl tracking-wide">{teamName(teamId)}（{side === 'home' ? '主隊' : '客隊'}）簡表</h3>
          <span className="font-data text-2xl text-[#7FBF95]">{totalScore(teamId)}</span>
        </div>

        <div className="space-y-2">
          {lineup.map(row => (
            <div key={row.battingOrder} className="flex items-start gap-3">
              <span className="w-8 pt-2 text-[#9BA5A4] font-data text-sm shrink-0">{row.battingOrder}</span>
              <div className="flex-1 space-y-1.5">
                {row.subs.map((sub, idx) => (
                  <div key={sub.subOrder} className="flex items-center gap-2">
                    {idx > 0 && <span className="text-xs text-[#D98E3F] shrink-0">代打</span>}
                    {editable ? (
                      <select
                        value={sub.playerId}
                        onChange={(e) => updateLineup(side, row.battingOrder, sub.subOrder, e.target.value)}
                        className="flex-1 bg-[#12181B] border border-[#333E41] rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">選擇球員</option>
                        {roster.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.player_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm py-2">{playerLabel(sub.playerId) || '（未填）'}</span>
                    )}
                  </div>
                ))}
              </div>
              {editable && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => addPinchHitter(side, row.battingOrder)}
                    className="text-xs text-[#4F86A6] hover:text-[#6FA0C0] whitespace-nowrap"
                  >
                    + 代打
                  </button>
                  {row.subs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLastSub(side, row.battingOrder)}
                      className="text-xs text-[#E2897E] hover:text-[#F2A89C] whitespace-nowrap"
                    >
                      移除
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {editable && (
          <button
            onClick={() => saveLineup(side)}
            className="mt-6 w-full py-3 bg-[#4F86A6] hover:bg-[#3E6F8C] rounded-lg text-sm font-medium transition-colors"
          >
            儲存 {teamName(teamId)} 簡表
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#12181B] text-[#EDEAE2] font-body">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <Link href="/schedule" className="text-sm text-[#9BA5A4] hover:text-[#EDEAE2]">← 回賽程列表</Link>
          </div>
          {!user && (
            <button
              onClick={handleGoogleLogin}
              className="bg-[#4F86A6] hover:bg-[#3E6F8C] px-5 py-2.5 rounded-lg text-sm transition-colors font-medium"
            >
              使用 Google 登入
            </button>
          )}
        </div>

        {/* 比賽資訊 + 總比分 */}
        <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 text-sm text-[#9BA5A4] mb-3">
            <span className="px-2 py-0.5 rounded bg-[#232B2E] text-[#D98E3F] text-xs font-medium">{game.stage}</span>
            {game.game_number && <span>{game.game_number}</span>}
            {game.game_date && <span>{game.game_date}</span>}
          </div>
          <div className="flex items-center justify-center gap-8 font-display text-4xl tracking-wide">
            <span>{teamName(game.away_team_id)}</span>
            <span className="font-data text-[#D98E3F]">{totalScore(game.away_team_id)} : {totalScore(game.home_team_id)}</span>
            <span>{teamName(game.home_team_id)}</span>
          </div>
        </div>

        {/* 記分板 */}
        <div className="bg-[#1A2124] border border-[#333E41] rounded-lg p-6 mb-8 overflow-x-auto">
          <h2 className="font-display text-2xl tracking-wide mb-4">記分板</h2>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-[#9BA5A4] border-b border-[#333E41]">
                <th className="text-left py-2 px-3">球隊</th>
                {INNINGS.map(i => <th key={i} className="px-3 py-2 text-center">{i}</th>)}
                <th className="px-3 py-2 text-center text-[#D98E3F]">總分</th>
              </tr>
            </thead>
            <tbody>
              {[game.away_team_id, game.home_team_id].map((teamId: string) => {
                const editable = canManageTeam(teamId);
                return (
                  <tr key={teamId} className="border-b border-[#2A3336]">
                    <td className="py-2 px-3 font-medium">{teamName(teamId)}</td>
                    {INNINGS.map(inning => (
                      <td key={inning} className="px-2 py-2 text-center">
                        {editable ? (
                          <input
                            type="number"
                            value={scores[teamId]?.[inning] ?? ''}
                            onChange={(e) => handleInningChange(teamId, inning, e.target.value)}
                            onBlur={() => saveInning(teamId, inning)}
                            className="w-12 bg-[#12181B] border border-[#333E41] rounded px-1 py-1 text-center"
                          />
                        ) : (
                          <span>{scores[teamId]?.[inning] ?? '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-data text-[#7FBF95] font-semibold">{totalScore(teamId)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 簡表（打線） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderLineupTable('away')}
          {renderLineupTable('home')}
        </div>
      </div>
    </div>
  );
}
