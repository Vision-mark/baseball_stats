'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NavBar from '@/components/NavBar';
import ThemeStyles from '@/components/ThemeStyles';

function ipToOuts(ip: number) {
  const whole = Math.floor(ip);
  const decimal = Math.round((ip - whole) * 10);
  return whole * 3 + decimal;
}

type FielderStatFields = {
  pa: string; ab: string; h: string; single: string; double: string; triple: string; hr: string;
  r: string; rbi: string; so: string; bb: string; sf: string; sb: string;
};

type LineupSub = { subOrder: number; playerId: string; stats: FielderStatFields };
type LineupRow = { battingOrder: number; subs: LineupSub[] };

type PitcherStatFields = {
  ip: string; bf: string; h: string; hr: string; so: string; bb: string; r: string; er: string;
  isWin: boolean; isLoss: boolean;
};
type PitcherEntry = { key: string; playerId: string; stats: PitcherStatFields };

const emptyFielderStats = (): FielderStatFields => ({
  pa: '', ab: '', h: '', single: '', double: '', triple: '', hr: '', r: '', rbi: '', so: '', bb: '', sf: '', sb: ''
});

const emptyPitcherStats = (): PitcherStatFields => ({
  ip: '', bf: '', h: '', hr: '', so: '', bb: '', r: '', er: '', isWin: false, isLoss: false
});

function buildInitialLineup(lineupEntries: any[], fielderStats: any[]): LineupRow[] {
  const rows: LineupRow[] = Array.from({ length: 9 }, (_, i) => ({ battingOrder: i + 1, subs: [] }));
  lineupEntries.forEach((e) => {
    const row = rows.find((r) => r.battingOrder === e.batting_order);
    if (!row) return;
    const existingStat = fielderStats.find((s) => String(s.player_id) === String(e.player_id));
    row.subs.push({
      subOrder: e.sub_order,
      playerId: e.player_id,
      stats: existingStat ? {
        pa: String(existingStat.pa ?? ''), ab: String(existingStat.ab ?? ''), h: String(existingStat.h ?? ''),
        single: String(existingStat.single ?? ''), double: String(existingStat.double ?? ''),
        triple: String(existingStat.triple ?? ''), hr: String(existingStat.hr ?? ''),
        r: String(existingStat.r ?? ''), rbi: String(existingStat.rbi ?? ''),
        so: String(existingStat.so ?? ''), bb: String(existingStat.bb ?? ''),
        sf: String(existingStat.sf ?? ''), sb: String(existingStat.sb ?? ''),
      } : emptyFielderStats(),
    });
  });
  rows.forEach((r) => {
    r.subs.sort((a, b) => a.subOrder - b.subOrder);
    if (r.subs.length === 0) r.subs.push({ subOrder: 0, playerId: '', stats: emptyFielderStats() });
  });
  return rows;
}

function buildInitialPitchers(pitcherStats: any[]): PitcherEntry[] {
  if (pitcherStats.length === 0) {
    return [{ key: 'p0', playerId: '', stats: emptyPitcherStats() }];
  }
  // 先發（gs=1）排最前面
  const sorted = [...pitcherStats].sort((a, b) => (b.gs || 0) - (a.gs || 0));
  return sorted.map((s, idx) => ({
    key: `p${idx}`,
    playerId: s.player_id,
    stats: {
      ip: String(s.ip ?? ''), bf: String(s.bf ?? ''), h: String(s.h ?? ''), hr: String(s.hr ?? ''),
      so: String(s.so ?? ''), bb: String(s.bb ?? ''), r: String(s.r ?? ''), er: String(s.er ?? ''),
      isWin: !!s.w, isLoss: !!s.l,
    },
  }));
}

const FIELDER_STAT_FIELDS: { key: keyof FielderStatFields; label: string }[] = [
  { key: 'pa', label: '打席' }, { key: 'ab', label: '打數' }, { key: 'h', label: '安打' }, { key: 'rbi', label: '打點' },
  { key: 'r', label: '得分' }, { key: 'so', label: '三振' }, { key: 'bb', label: '四死球' },
  { key: 'sb', label: '盜壘' }, { key: 'single', label: '一安' }, { key: 'double', label: '二安' },
  { key: 'triple', label: '三安' }, { key: 'hr', label: '全壘打' }, { key: 'sf', label: '犧飛' },
];

const PITCHER_STAT_FIELDS: { key: keyof PitcherStatFields; label: string }[] = [
  { key: 'ip', label: '局數' }, { key: 'bf', label: '打席' }, { key: 'h', label: '安打' },
  { key: 'hr', label: '全壘打' }, { key: 'so', label: '三振' }, { key: 'bb', label: '四死球' },
  { key: 'r', label: '失分' }, { key: 'er', label: '責失分' },
];

const INNINGS = Array.from({ length: 7 }, (_, i) => i + 1);

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

  const [homeLineup, setHomeLineup] = useState<LineupRow[]>(buildInitialLineup([], []));
  const [awayLineup, setAwayLineup] = useState<LineupRow[]>(buildInitialLineup([], []));
  const [homePitchers, setHomePitchers] = useState<PitcherEntry[]>(buildInitialPitchers([]));
  const [awayPitchers, setAwayPitchers] = useState<PitcherEntry[]>(buildInitialPitchers([]));

  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});
  const [hits, setHits] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
  };

  // ---- 資料讀取 ----
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/game-detail?id=${gameId}`);
      if (!res.ok) {
        throw new Error(`載入失敗（狀態碼 ${res.status}），請確認 app/api/game-detail/route.ts 這支檔案有正確部署`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const g = data.game || null;
      setGame(g);
      setTeams(data.teams || []);
      setPlayers(data.players || []);

      const gameFielderStats = data.fielderStats || [];
      const gamePitcherStats = data.pitcherStats || [];

      if (g) {
        const homeEntries = (data.lineups || []).filter((e: any) => e.team_id === g.home_team_id);
        const awayEntries = (data.lineups || []).filter((e: any) => e.team_id === g.away_team_id);
        setHomeLineup(buildInitialLineup(homeEntries, gameFielderStats));
        setAwayLineup(buildInitialLineup(awayEntries, gameFielderStats));

        const homePitcherStats = gamePitcherStats.filter((s: any) => {
          const p = (data.players || []).find((pl: any) => String(pl.id) === String(s.player_id));
          return p && p.team_id === g.home_team_id;
        });
        const awayPitcherStats = gamePitcherStats.filter((s: any) => {
          const p = (data.players || []).find((pl: any) => String(pl.id) === String(s.player_id));
          return p && p.team_id === g.away_team_id;
        });
        setHomePitchers(buildInitialPitchers(homePitcherStats));
        setAwayPitchers(buildInitialPitchers(awayPitcherStats));

        setHits({ [g.home_team_id]: g.home_hits || 0, [g.away_team_id]: g.away_hits || 0 });
      }

      const scoreMap: Record<string, Record<number, number>> = {};
      (data.scores || []).forEach((s: any) => {
        if (!scoreMap[s.team_id]) scoreMap[s.team_id] = {};
        scoreMap[s.team_id][s.inning] = s.runs;
      });
      setScores(scoreMap);
    } catch (err: any) {
      setLoadError(err.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [gameId]);

  const teamName = (id: string) => teams.find(t => t.id === id)?.team_name || '未知球隊';
  const teamPlayers = (id: string, positionType?: string) =>
    players.filter(p => p.team_id === id && (!positionType || p.position_type === positionType));
  const playerLabel = (id: string) => {
    const p = players.find(pl => pl.id === id);
    if (!p) return '（未填）';
    return p.jersey_number ? `${p.player_name} #${p.jersey_number}` : p.player_name;
  };

  const totalScore = (teamId: string) => {
    const rows = scores[teamId] || {};
    return Object.values(rows).reduce((sum, v) => sum + (Number(v) || 0), 0);
  };

  // ---- 簡表：野手棒次操作 ----
  const updateLineupPlayer = (side: 'home' | 'away', battingOrder: number, subOrder: number, playerId: string) => {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => prev.map(row => row.battingOrder !== battingOrder ? row : {
      ...row, subs: row.subs.map(s => s.subOrder === subOrder ? { ...s, playerId } : s)
    }));
  };

  const updateLineupStat = (side: 'home' | 'away', battingOrder: number, subOrder: number, field: keyof FielderStatFields, value: string) => {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => prev.map(row => row.battingOrder !== battingOrder ? row : {
      ...row, subs: row.subs.map(s => s.subOrder === subOrder ? { ...s, stats: { ...s.stats, [field]: value } } : s)
    }));
  };

  const addPinchHitter = (side: 'home' | 'away', battingOrder: number) => {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => prev.map(row => {
      if (row.battingOrder !== battingOrder) return row;
      const nextSubOrder = Math.max(...row.subs.map(s => s.subOrder)) + 1;
      return { ...row, subs: [...row.subs, { subOrder: nextSubOrder, playerId: '', stats: emptyFielderStats() }] };
    }));
  };

  const removeLastSub = (side: 'home' | 'away', battingOrder: number) => {
    const setter = side === 'home' ? setHomeLineup : setAwayLineup;
    setter(prev => prev.map(row => (row.battingOrder !== battingOrder || row.subs.length <= 1) ? row : {
      ...row, subs: row.subs.slice(0, -1)
    }));
  };

  // ---- 投手區塊操作 ----
  const updatePitcherPlayer = (side: 'home' | 'away', key: string, playerId: string) => {
    const setter = side === 'home' ? setHomePitchers : setAwayPitchers;
    setter(prev => prev.map(p => p.key === key ? { ...p, playerId } : p));
  };

  const updatePitcherStat = (side: 'home' | 'away', key: string, field: keyof PitcherStatFields, value: string | boolean) => {
    const setter = side === 'home' ? setHomePitchers : setAwayPitchers;
    setter(prev => prev.map(p => p.key === key ? { ...p, stats: { ...p.stats, [field]: value } } : p));
  };

  const addPitcher = (side: 'home' | 'away') => {
    const setter = side === 'home' ? setHomePitchers : setAwayPitchers;
    setter(prev => [...prev, { key: `p${Date.now()}`, playerId: '', stats: emptyPitcherStats() }]);
  };

  const removePitcher = (side: 'home' | 'away', key: string) => {
    const setter = side === 'home' ? setHomePitchers : setAwayPitchers;
    setter(prev => prev.length <= 1 ? prev : prev.filter(p => p.key !== key));
  };

  // ---- 儲存（簡表打線 + 野手數據 + 投手數據 一次送出）----
  const handleSaveTeam = async (side: 'home' | 'away') => {
    const teamId = side === 'home' ? game.home_team_id : game.away_team_id;
    const lineup = side === 'home' ? homeLineup : awayLineup;
    const pitchers = side === 'home' ? homePitchers : awayPitchers;
    const gameDate = game.game_date || new Date().toISOString();

    setSaving(side);
    try {
      // 1. 簡表打線
      const lineupEntries = lineup.flatMap(row =>
        row.subs.filter(s => s.playerId).map(s => ({ batting_order: row.battingOrder, sub_order: s.subOrder, player_id: s.playerId }))
      );
      const lineupRes = await fetch('/api/lineups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveLineup', gameId, teamId, entries: lineupEntries }),
      });
      const lineupData = await lineupRes.json();
      if (!lineupRes.ok) throw new Error(lineupData.error || '簡表儲存失敗');

      // 2. 野手數據
      const fielderStatsList = lineup.flatMap(row =>
        row.subs.filter(s => s.playerId).map(s => ({
          playerId: s.playerId, gameId, gameDate, type: 'fielder',
          pa: Number(s.stats.pa) || 0,
          ab: Number(s.stats.ab) || 0, h: Number(s.stats.h) || 0,
          single: Number(s.stats.single) || 0, double: Number(s.stats.double) || 0,
          triple: Number(s.stats.triple) || 0, hr: Number(s.stats.hr) || 0,
          r: Number(s.stats.r) || 0, rbi: Number(s.stats.rbi) || 0,
          so: Number(s.stats.so) || 0, bb: Number(s.stats.bb) || 0,
          sf: Number(s.stats.sf) || 0, sb: Number(s.stats.sb) || 0,
        }))
      );

      // 3. 投手數據（第一位視為先發；出賽視為只要有這筆資料就算 1 場）
      const pitcherStatsList = pitchers.filter(p => p.playerId).map((p, idx) => ({
        playerId: p.playerId, gameId, gameDate, type: 'pitcher',
        ip: Number(p.stats.ip) || 0, bf: Number(p.stats.bf) || 0,
        h: Number(p.stats.h) || 0, hr: Number(p.stats.hr) || 0,
        so: Number(p.stats.so) || 0, bb: Number(p.stats.bb) || 0,
        r: Number(p.stats.r) || 0, er: Number(p.stats.er) || 0,
        g: 1, gs: idx === 0 ? 1 : 0,
        w: p.stats.isWin ? 1 : 0, l: p.stats.isLoss ? 1 : 0,
      }));

      const statsList = [...fielderStatsList, ...pitcherStatsList];
      if (statsList.length > 0) {
        const statsRes = await fetch('/api/baseball', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addStatsBulk', statsList }),
        });
        const statsData = await statsRes.json();
        if (!statsRes.ok) throw new Error(statsData.error || '數據儲存失敗');
      }

      alert(`${teamName(teamId)} 的簡表與數據已更新`);
      fetchAll();
    } catch (err: any) {
      alert(err.message || '儲存失敗');
    } finally {
      setSaving(null);
    }
  };

  // ---- 記分板操作：本機先編輯，按「儲存記分板」才一次送出 ----
  const [savingScoreboard, setSavingScoreboard] = useState<string | null>(null);

  const handleInningChange = (teamId: string, inning: number, value: string) => {
    setScores(prev => {
      const teamScores = { ...(prev[teamId] || {}) };
      if (value === '') {
        delete teamScores[inning];
      } else {
        teamScores[inning] = Number(value);
      }
      return { ...prev, [teamId]: teamScores };
    });
  };

  const handleHitsChange = (teamId: string, value: string) => {
    setHits(prev => ({ ...prev, [teamId]: value === '' ? 0 : Number(value) }));
  };

  const handleSaveScoreboard = async (teamId: string) => {
    setSavingScoreboard(teamId);
    try {
      const teamScores = scores[teamId] || {};
      // 只送有填數字的那幾局；沒填的局次不會建立資料列，畫面上就會顯示「-」代表沒打
      const inningCalls = INNINGS.filter(inning => teamScores[inning] !== undefined).map(inning =>
        fetch('/api/scoreboard', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveInning', gameId, teamId, inning, runs: teamScores[inning] }),
        }).then(r => r.json())
      );

      const hitsCall = fetch('/api/scoreboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveHits', gameId, teamId, hits: hits[teamId] || 0 }),
      }).then(r => r.json());

      const results = await Promise.all([...inningCalls, hitsCall]);
      const firstError = results.find((r: any) => r?.error);
      if (firstError) throw new Error(firstError.error);

      alert(`${teamName(teamId)} 的記分板已儲存`);
      fetchAll();
    } catch (err: any) {
      alert(err.message || '儲存失敗');
    } finally {
      setSavingScoreboard(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center">載入中...</div>;
  if (loadError) return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[#E2897E]">{loadError}</p>
      <Link href="/schedule" className="text-sm text-[#4F86A6] hover:text-[#6FA0C0]">← 回賽程列表</Link>
    </div>
  );
  if (!game) return <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center">找不到這場比賽</div>;

  const renderFielderTable = (side: 'home' | 'away') => {
    const teamId = side === 'home' ? game.home_team_id : game.away_team_id;
    const lineup = side === 'home' ? homeLineup : awayLineup;
    const editable = canManageTeam(teamId);
    const roster = teamPlayers(teamId);

    return (
      <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-6 mb-6 ${editable ? 'overflow-x-auto' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-display tracking-wide ${editable ? 'text-2xl' : 'text-lg'}`}>{teamName(teamId)}（{side === 'home' ? '主隊' : '客隊'}）簡表 — 野手</h3>
          <span className="font-data text-2xl text-[#7FBF95]">{totalScore(teamId)}</span>
        </div>

        <table className={editable ? 'text-sm min-w-[1100px] w-full' : 'text-xs w-full table-fixed'}>
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border-default)]">
              <th className={`text-left py-2 px-2 ${editable ? 'w-10' : 'w-6'}`}>棒次</th>
              <th className={`text-left py-2 px-2 ${editable ? 'min-w-[160px]' : 'min-w-[64px]'}`}>球員</th>
              {FIELDER_STAT_FIELDS.map(f => (
                <th key={f.key} className={`px-0.5 py-2 text-center ${editable ? 'w-14' : 'w-8'}`}>{f.label}</th>
              ))}
              {editable && <th className="px-2 py-2 w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {lineup.map(row => row.subs.map((sub, idx) => (
              <tr key={`${row.battingOrder}-${sub.subOrder}`} className="border-b border-[var(--border-subtle)]">
                <td className="py-1.5 px-2 font-data text-[var(--text-muted)]">
                  {idx === 0 ? row.battingOrder : <span className="text-xs text-[#D98E3F]">代打</span>}
                </td>
                <td className="py-1.5 px-2">
                  {editable ? (
                    <select
                      value={sub.playerId}
                      onChange={(e) => updateLineupPlayer(side, row.battingOrder, sub.subOrder, e.target.value)}
                      className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">選擇球員</option>
                      {roster.map(p => (
                        <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ''}{p.player_name}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{playerLabel(sub.playerId)}</span>
                  )}
                </td>
                {FIELDER_STAT_FIELDS.map(f => (
                  <td key={f.key} className="px-1 py-1.5">
                    {editable ? (
                      <input
                        type="number"
                        value={sub.stats[f.key]}
                        onChange={(e) => updateLineupStat(side, row.battingOrder, sub.subOrder, f.key, e.target.value)}
                        className="w-12 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-1 py-1 text-center"
                      />
                    ) : (
                      <span className="block text-center">{sub.stats[f.key] || 0}</span>
                    )}
                  </td>
                ))}
                {editable && (
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {idx === row.subs.length - 1 && (
                      <button type="button" onClick={() => addPinchHitter(side, row.battingOrder)} className="text-xs text-[#4F86A6] hover:text-[#6FA0C0] mr-2">
                        +代打
                      </button>
                    )}
                    {row.subs.length > 1 && idx === row.subs.length - 1 && (
                      <button type="button" onClick={() => removeLastSub(side, row.battingOrder)} className="text-xs text-[#E2897E] hover:text-[#F2A89C]">
                        移除
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )))}
          </tbody>
        </table>

        {editable && (
          <button
            onClick={() => handleSaveTeam(side)}
            disabled={saving === side}
            className="mt-5 w-full py-3 bg-[#4F86A6] hover:bg-[#3E6F8C] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {saving === side ? '儲存中...' : `更新 ${teamName(teamId)} 簡表與數據`}
          </button>
        )}
      </div>
    );
  };

  const renderPitcherTable = (side: 'home' | 'away') => {
    const teamId = side === 'home' ? game.home_team_id : game.away_team_id;
    const pitchers = side === 'home' ? homePitchers : awayPitchers;
    const editable = canManageTeam(teamId);
    const roster = teamPlayers(teamId);

    return (
      <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-6 mb-6 ${editable ? 'overflow-x-auto' : ''}`}>
        <h3 className={`font-display tracking-wide mb-4 ${editable ? 'text-xl' : 'text-base'}`}>{teamName(teamId)}（{side === 'home' ? '主隊' : '客隊'}）簡表 — 投手</h3>

        <table className={editable ? 'text-sm min-w-[900px] w-full' : 'text-xs w-full table-fixed'}>
          <thead>
            <tr className="text-[var(--text-muted)] border-b border-[var(--border-default)]">
              <th className={`text-left py-2 px-2 ${editable ? 'min-w-[160px]' : 'min-w-[64px]'}`}>球員{editable && <span className="text-xs text-[var(--text-faint)]">（第一位 = 先發）</span>}</th>
              {PITCHER_STAT_FIELDS.map(f => (
                <th key={f.key} className={`px-0.5 py-2 text-center ${editable ? 'w-14' : 'w-8'}`}>{f.label}</th>
              ))}
              <th className={`px-0.5 py-2 text-center ${editable ? 'w-14' : 'w-8'}`}>ERA</th>
              <th className={`px-0.5 py-2 text-center ${editable ? 'w-14' : 'w-8'}`}>WHIP</th>
              <th className={`px-0.5 py-2 text-center ${editable ? 'w-10' : 'w-6'}`}>勝</th>
              <th className={`px-0.5 py-2 text-center ${editable ? 'w-10' : 'w-6'}`}>敗</th>
              {editable && <th className="px-2 py-2 w-14"></th>}
            </tr>
          </thead>
          <tbody>
            {pitchers.map((p, idx) => {
              const outs = ipToOuts(Number(p.stats.ip) || 0);
              const era = outs > 0 ? ((Number(p.stats.er) || 0) * 21 / outs).toFixed(2) : '-';
              const whip = outs > 0 ? (((Number(p.stats.bb) || 0) + (Number(p.stats.h) || 0)) * 3 / outs).toFixed(2) : '-';

              return (
                <tr key={p.key} className="border-b border-[var(--border-subtle)]">
                  <td className="py-1.5 px-2">
                    {editable ? (
                      <select
                        value={p.playerId}
                        onChange={(e) => updatePitcherPlayer(side, p.key, e.target.value)}
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-2 py-1.5 text-sm"
                      >
                        <option value="">選擇投手</option>
                        {roster.map(pl => (
                          <option key={pl.id} value={pl.id}>{pl.jersey_number ? `#${pl.jersey_number} ` : ''}{pl.player_name}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{playerLabel(p.playerId)}{idx === 0 ? '（先發）' : ''}</span>
                    )}
                  </td>
                  {PITCHER_STAT_FIELDS.map(f => (
                    <td key={f.key} className="px-1 py-1.5">
                      {editable ? (
                        <input
                          type="number"
                          value={p.stats[f.key] as string}
                          onChange={(e) => updatePitcherStat(side, p.key, f.key, e.target.value)}
                          className="w-12 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-1 py-1 text-center"
                        />
                      ) : (
                        <span className="block text-center">{(p.stats[f.key] as string) || 0}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-1 py-1.5 text-center font-data text-[#7FBF95]">{era}</td>
                  <td className="px-1 py-1.5 text-center font-data text-[#7FBF95]">{whip}</td>
                  <td className="px-1 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={p.stats.isWin}
                      disabled={!editable}
                      onChange={(e) => updatePitcherStat(side, p.key, 'isWin', e.target.checked)}
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={p.stats.isLoss}
                      disabled={!editable}
                      onChange={(e) => updatePitcherStat(side, p.key, 'isLoss', e.target.checked)}
                    />
                  </td>
                  {editable && (
                    <td className="px-2 py-1.5">
                      {pitchers.length > 1 && (
                        <button type="button" onClick={() => removePitcher(side, p.key)} className="text-xs text-[#E2897E] hover:text-[#F2A89C]">
                          移除
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {editable && (
          <button type="button" onClick={() => addPitcher(side)} className="mt-3 text-sm text-[#4F86A6] hover:text-[#6FA0C0]">
            + 新增投手
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-body">
      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <ThemeStyles />
        <NavBar />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link
            href="/schedule"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ← 回賽程列表
          </Link>
          {!user ? (
            <button onClick={handleGoogleLogin} className="text-sm text-[#4F86A6] hover:text-[#6FA0C0] hover:underline transition-colors">
              使用 Google 登入
            </button>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[var(--text-muted)] hidden sm:inline">{user.email}</span>
              <span className="text-[var(--border-default)]">|</span>
              <button
                onClick={handleLogout}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline transition-colors"
              >
                登出
              </button>
            </div>
          )}
        </div>

        {/* 比賽資訊 + 總比分 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mb-3">
            <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[#D98E3F] text-xs font-medium">{game.stage}</span>
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
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-6 mb-8 overflow-x-auto">
          <h2 className="font-display text-2xl tracking-wide mb-4">記分板</h2>
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border-default)]">
                <th className="text-left py-2 px-3">球隊</th>
                {INNINGS.map(i => <th key={i} className="px-3 py-2 text-center">{i}</th>)}
                <th className="px-3 py-2 text-center text-[#D98E3F]">R</th>
                <th className="px-3 py-2 text-center text-[#D98E3F]">H</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[game.away_team_id, game.home_team_id].map((teamId: string) => {
                const editable = canManageTeam(teamId);
                return (
                  <tr key={teamId} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 px-3 font-medium">{teamName(teamId)}</td>
                    {INNINGS.map(inning => (
                      <td key={inning} className="px-2 py-2 text-center">
                        {editable ? (
                          <input
                            type="number"
                            value={scores[teamId]?.[inning] ?? ''}
                            onChange={(e) => handleInningChange(teamId, inning, e.target.value)}
                            placeholder="-"
                            className="w-12 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-1 py-1 text-center"
                          />
                        ) : (
                          <span>{scores[teamId]?.[inning] ?? '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-data text-[#7FBF95] font-semibold">{totalScore(teamId)}</td>
                    <td className="px-3 py-2 text-center">
                      {editable ? (
                        <input
                          type="number"
                          value={hits[teamId] ?? ''}
                          onChange={(e) => handleHitsChange(teamId, e.target.value)}
                          className="w-12 bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-1 py-1 text-center"
                        />
                      ) : (
                        <span>{hits[teamId] ?? 0}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editable && (
                        <button
                          onClick={() => handleSaveScoreboard(teamId)}
                          disabled={savingScoreboard === teamId}
                          className="bg-[#4F86A6] hover:bg-[#3E6F8C] disabled:opacity-50 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
                        >
                          {savingScoreboard === teamId ? '儲存中...' : '儲存記分板'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-faint)] mt-3">留空代表該局還沒打，會顯示「-」；填 0 才代表該局有打但沒得分。</p>
        </div>

        {/* 簡表：有編輯權限時維持原本堆疊順序（主隊→客隊，各自野手→投手）方便輸入；
            純瀏覽（雙方都沒有編輯權限）時改成左右並排的精簡唯讀版面 */}
        {canManageTeam(game.home_team_id) || canManageTeam(game.away_team_id) ? (
          <>
            {renderFielderTable('home')}
            {renderPitcherTable('home')}
            {renderFielderTable('away')}
            {renderPitcherTable('away')}
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {renderFielderTable('home')}
              {renderPitcherTable('home')}
            </div>
            <div>
              {renderFielderTable('away')}
              {renderPitcherTable('away')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
