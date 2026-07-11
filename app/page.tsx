'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// 定義球員結構
interface BulkPlayer {
  name: string;
  position: 'fielder' | 'pitcher';
}

// 視覺主題：字體載入與設計 token（僅樣式，不影響任何功能邏輯）
function ThemeStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      .font-display { font-family: 'Teko', 'Noto Sans TC', sans-serif; font-weight: 600; }
      .font-body { font-family: 'IBM Plex Sans', 'Noto Sans TC', sans-serif; }
      .font-data { font-family: 'IBM Plex Mono', 'Noto Sans TC', monospace; }
      .stat-scroll::-webkit-scrollbar { height: 8px; }
      .stat-scroll::-webkit-scrollbar-track { background: #171D20; }
      .stat-scroll::-webkit-scrollbar-thumb { background: #333E41; border-radius: 4px; }
    `}</style>
  );
}

// 縫線分隔線：呼應棒球縫線意象的標誌性視覺元素
function SeamDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-3 w-full ${className}`} aria-hidden="true">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[#333E41]" />
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 12">
        {Array.from({ length: 40 }).map((_, i) => (
          <line
            key={i}
            x1={i * 10 + 3}
            y1={2}
            x2={i * 10 - 3}
            y2={10}
            stroke="#C1443A"
            strokeWidth="1.4"
            opacity={0.6}
          />
        ))}
      </svg>
    </div>
  );
}

// ==================== 排行榜組件 ====================

const RANK_STYLES = [
  { bg: '#E8A33D', fg: '#12181B', ring: '#F2C97A' }, // 1st — gold
  { bg: '#B7BFBC', fg: '#12181B', ring: '#DCE3DA' }, // 2nd — silver
  { bg: '#B8763F', fg: '#12181B', ring: '#D69A63' }, // 3rd — bronze
];

function LeaderboardList({ title, items, field, suffix = '' }: { 
  title: string; 
  items: any[]; 
  field: string; 
  suffix?: string;
}) {
  return (
    <div className="mb-2">
      <h3 className="font-display text-xl tracking-wide text-[#EDEAE2] mb-3 pb-2 border-b border-[#333E41] flex items-center gap-2">
        <span className="inline-block w-1.5 h-4 bg-[#D98E3F] rounded-sm" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-[#6C7574] py-4 text-sm italic">尚無符合資格的數據</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => {
            const medal = RANK_STYLES[idx];
            return (
              <div
                key={idx}
                className={`flex justify-between items-center py-2 px-2 text-sm rounded-md ${idx === 0 ? 'bg-[#232B2E]' : ''}`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono shrink-0"
                    style={
                      medal
                        ? { backgroundColor: medal.bg, color: medal.fg, boxShadow: `0 0 0 2px ${medal.ring}33` }
                        : { backgroundColor: '#232B2E', color: '#9BA5A4' }
                    }
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[#EDEAE2]">{item.player_name || '未知球員'}</span>
                </span>
                <span className="font-mono tabular-nums text-[#7FBF95] font-semibold">
                  {item[field]}{suffix}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeaderboardModal({ isOpen, onClose, data, type }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A2124] w-full max-w-3xl rounded-lg border border-[#333E41] max-h-[90vh] overflow-y-auto">
        <div
          className="flex justify-between items-center px-8 py-6 border-b"
          style={{ borderColor: type === 'fielder' ? '#4F86A6' : '#C1443A' }}
        >
          <div>
            <span className="text-xs tracking-[0.2em] uppercase text-[#9BA5A4]">Leaderboard</span>
            <h2 className="font-display text-3xl tracking-wide">
              {type === 'fielder' ? '野手排行榜' : '投手排行榜'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#9BA5A4] hover:text-[#F4F1E6] text-2xl leading-none">✕</button>
        </div>

        <div className="p-8">
          {type === 'fielder' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <LeaderboardList title="打擊率王 (AVG)" items={data.avg || []} field="avg" />
              <LeaderboardList title="安打王 (H)" items={data.h || []} field="h" />
              <LeaderboardList title="全壘打王 (HR)" items={data.hr || []} field="hr" />
              <LeaderboardList title="打點王 (RBI)" items={data.rbi || []} field="rbi" />
              <LeaderboardList title="盜壘王 (SB)" items={data.sb || []} field="sb" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <LeaderboardList title="防禦率王 (ERA)" items={data.era || []} field="era" />
              <LeaderboardList title="勝投王 (W)" items={data.w || []} field="w" />
              <LeaderboardList title="三振王 (SO)" items={data.so || []} field="so" />
              <LeaderboardList title="WHIP王" items={data.whip || []} field="whip" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ipToOuts(ip: number) {
    const whole = Math.floor(ip);
    const decimal = Math.round((ip - whole) * 10);

    return whole * 3 + decimal;
}

function outsToIp(outs: number) {
    const inning = Math.floor(outs / 3);
    const remain = outs % 3;

    return Number(`${inning}.${remain}`);
}

export default function Home() {

  const supabaseClient = createClient();

  // 登入 / 權限狀態
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [permittedTeamIds, setPermittedTeamIds] = useState<string[]>([]);

  // 是否為管理員：必須「已登入」且「至少對一支球隊擁有權限」
  const isAuthorized = !!user && permittedTeamIds.length > 0;

  const canManageTeam = (teamId: any) => permittedTeamIds.includes(String(teamId));

  // 資料狀態
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState<any[]>([]);
  const [displayStats, setDisplayStats] = useState<any[]>([]);

  // 篩選面板狀態
  const [inputTeamId, setInputTeamId] = useState('');
  const [inputStartDate, setInputStartDate] = useState('');
  const [inputEndDate, setInputEndDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // 彈出視窗狀態
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showManagePlayersModal, setShowManagePlayersModal] = useState(false);

  // 批量新增球員
  const [bulkTeamId, setBulkTeamId] = useState('');
  const [bulkPlayers, setBulkPlayers] = useState<BulkPlayer[]>([{ name: '', position: 'fielder' }]);

  // 批次錄入狀態
  const [activeRecordTeamId, setActiveRecordTeamId] = useState('');
  const [recordGameDate, setRecordGameDate] = useState('');
  const [batchRows, setBatchRows] = useState<Record<string, any>>({});

  const recordTeamPlayers = players.filter(p => p.team_id === activeRecordTeamId);

  // 取得前5名 + 同分處理
const getTop5 = (data: any[], field: string, descending = true, tieByGameCount = false) => {
  return [...data]
    .sort((a, b) => {
      let valA = field === 'avg' || field === 'era' || field === 'whip' 
        ? parseFloat(a[field] || 0) 
        : Number(a[field] || 0);
      
      let valB = field === 'avg' || field === 'era' || field === 'whip' 
        ? parseFloat(b[field] || 0) 
        : Number(b[field] || 0);

      if (valA === valB && tieByGameCount) {
        // 同分時，場次少的排前面
        return (a.game_count || 999) - (b.game_count || 999);
      }

      return descending ? valB - valA : valA - valB;
    })
    .slice(0, 5); // 最多取前5名
};
  
const aggregateForDisplay = (stats: any[], playerIds?: string[]) => {

  const map: Record<string, any> = {};

  const playerMap = Object.fromEntries(
    players.map(p => [String(p.id), p])
  );

  stats.forEach(s => {

    const playerId = String(
      s.player_id ||
      s.playerId ||
      ""
    );

    if (!playerId) return;

    if (playerIds && !playerIds.includes(playerId))
      return;

    const player = playerMap[playerId];

    if (!map[playerId]) {

      map[playerId] = {

        ...player,

        playerId,

        type:
          player?.position_type ||
          player?.position ||
          s.type,

        //--------------------
        // 野手
        //--------------------

        ab:0,
        h:0,
        tb:0,
        r:0,
        rbi:0,

        single:0,
        double:0,
        triple:0,
        hr:0,

        so:0,
        bb:0,
        sf:0,
        sb:0,

        //--------------------
        // 投手
        //--------------------

        w:0,
        l:0,
        g:0,
        gs:0,

        ip:0,

        h_allowed:0,

        r_pitch:0,

        er:0,

        bb_pitch:0,

        so_pitch:0,

        game_count:0

      };

    }

    const p = map[playerId];

    //---------------------------------
    // 投手
    //---------------------------------

    if (p.type === "pitcher") {

      p.w += Number(s.w || 0);

      p.l += Number(s.l || 0);

      p.g += Number(s.g || 0);

      p.gs += Number(s.gs || 0);
      
      p.outs =
      (p.outs || 0)
      +
      ipToOuts(Number(s.ip || 0));
      
      p.ip += Number(s.ip || 0);

      p.h_allowed += Number(
        s.h_allowed ??
        s.h ??
        0
      );

      p.r_pitch += Number(s.r || 0);

      p.er += Number(s.er || 0);

      p.bb_pitch += Number(s.bb || 0);

      p.so_pitch += Number(s.so || 0);

    }

    //---------------------------------
    // 野手
    //---------------------------------

    else {

      p.ab += Number(s.ab || 0);

      const hit =
        Number(s.h || 0) ||

        Number(s.single || 0) +

        Number(s.double || 0) +

        Number(s.triple || 0) +

        Number(s.hr || 0);

      p.h += hit;

      p.single += Number(s.single || 0);

      p.double += Number(s.double || 0);

      p.triple += Number(s.triple || 0);

      p.hr += Number(s.hr || 0);

      p.r += Number(s.r || 0);

      p.rbi += Number(s.rbi || 0);

      p.so += Number(s.so || 0);

      p.bb += Number(s.bb || 0);

      p.sf += Number(s.sf || 0);

      p.sb += Number(s.sb || 0);

      p.tb +=
        Number(s.single || 0) +
        Number(s.double || 0) * 2 +
        Number(s.triple || 0) * 3 +
        Number(s.hr || 0) * 4;

    }

    p.game_count++;

  });

  return Object.values(map).map((p:any)=>{

    //---------------------------------
    // 投手
    //---------------------------------

    if(p.type==="pitcher"){

      const inning =
          p.outs / 3;

      const era =
        inning > 0
            ? ((p.er * 7) / inning).toFixed(2)
            : "0.00";

      const whip =
      inning > 0
        ? (
            (p.h_allowed + p.bb_pitch)
            / inning
          ).toFixed(2)
        : "0.00";

      return{

        ...p,

        r:p.r_pitch,

        h:p.h_allowed,

        bb:p.bb_pitch,

        so:p.so_pitch,

        // 局數以3進制(出局數)換算回顯示用的 x.y 格式，避免小數直接相加造成的誤差
        ip: outsToIp(p.outs || 0),

        era,

        whip,

        game_date:"累計"

      };

    }

    //---------------------------------
    // 野手
    //---------------------------------

    const avg =
      p.ab>0
      ?p.h/p.ab
      :0;

    const slg =
      p.ab>0
      ?p.tb/p.ab
      :0;

    return{

      ...p,

      pa:p.ab+p.bb+p.sf,

      avg:avg.toFixed(3),

      slg:slg.toFixed(3),

      ops:(avg+slg).toFixed(3),

      game_date:"累計"

    };

  });

};

const handleSearch = () => {
  let result = [...historyStats];

  // 1. 球隊篩選
  if (inputTeamId) {
    result = result.filter(s => {
      const p = players.find(player => String(player.id) === String(s.player_id || s.playerId));
      return p && String(p.team_id) === String(inputTeamId);
    });
  }

  // 2. 日期篩選
  if (inputStartDate) {
    result = result.filter(s => {
      const d = (s.game_date || s.gameDate || '').substring(0, 10);
      return d >= inputStartDate;
    });
  }
  if (inputEndDate) {
    result = result.filter(s => {
      const d = (s.game_date || s.gameDate || '').substring(0, 10);
      return d <= inputEndDate;
    });
  }

  // 3. 判斷是否為單日（只有明確選同一天才顯示逐場資料）
  const isSingleDay = inputStartDate && 
                      inputEndDate && 
                      inputStartDate === inputEndDate;

  let displayData: any[] = [];

  if (isSingleDay) {
    // 單日 → 顯示逐場原始資料
    displayData = result;
  } else {
    // 其他情況（全部球隊無日期、多日範圍、只選球隊等）→ 顯示累計資料
    displayData = aggregateForDisplay(result);
  }

    setDisplayStats(displayData);
    setHasSearched(true);
};

const handleResetFilter = () => {
  setInputTeamId('');
  setInputStartDate('');
  setInputEndDate('');
  
  // 重置：直接清空顯示數據，並把搜尋標記設為 false
  setDisplayStats([]); 
  setHasSearched(false); 
};

// 初始化錄入表單欄位
useEffect(() => {
  const initialRows: any = {};
  recordTeamPlayers.forEach(p => {
    if (p.position_type === 'pitcher') {
      initialRows[p.id] = { w: '', l: '', g: '', gs: false, ip: '', h: '', r: '', er: '', bb: '', so: '' };
    } else {
      initialRows[p.id] = { pa: '', ab: '', h: '', tb: '', r: '', rbi: '', single: '', double: '', triple: '', hr: '', so: '', dp: '', bb: '', sf: '', sb: '' };
    }
  });
  setBatchRows(initialRows);
}, [activeRecordTeamId, players]);

  const handleBulkPlayerChange = (index: number, field: keyof BulkPlayer, value: string) => {
    const updated = [...bulkPlayers];
    updated[index] = { ...updated[index], [field]: value } as BulkPlayer;
    setBulkPlayers(updated);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ---- 登入狀態監聽 ----
  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setAuthLoading(false);
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ---- 使用者變動時，重新查詢這個 email 可以管理哪些球隊 ----
  useEffect(() => {
    if (!user) {
      setPermittedTeamIds([]);
      return;
    }
    fetch('/api/permissions')
      .then(res => res.json())
      .then(data => setPermittedTeamIds(data.teamIds || []))
      .catch(() => setPermittedTeamIds([]));
  }, [user]);

  const handleGoogleLogin = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
    setPermittedTeamIds([]);
  };

const handleBatchValueChange = (playerId: string, field: string, value: string | boolean) => {
    setBatchRows(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
  };

const fetchAllData = async () => {
  const res = await fetch('/api/baseball');
  if (res.ok) {
    const data = await res.json();
    setTeams(data.teams || []);
    setPlayers(data.players || []);
    setHistoryStats(data.stats || []);
    setDisplayStats([]); 
  }
};

  useEffect(() => { fetchAllData(); }, []);

const [showModal, setShowModal] = useState<'fielder' | 'pitcher' | null>(null);
const [rankedData, setRankedData] = useState<Record<string, any[]>>({});

// ==================== 最終加強版 ====================
const getTop5WithFilter = (
  data: any[],
  field: string,
  descending = true,
  tieByFewerGames = false
) => {

  const isPitchRate =
    field === "era" ||
    field === "whip";

  return data

    .filter(item => {

      const value = Number(item[field]);

      if (isNaN(value))
        return false;

      // ERA、WHIP
      if (isPitchRate) {
        return Number(item.ip) > 0;
      }

      // 其他數據
      return value > 0.001;

    })

    .sort((a, b) => {

      const A = Number(a[field]);
      const B = Number(b[field]);

      let result =
        descending
          ? B - A
          : A - B;

      if (Math.abs(result) < 0.00001) {

        const gA = Number(a.game_count);
        const gB = Number(b.game_count);

        return tieByFewerGames
          ? gA - gB
          : gB - gA;
      }

      return result;

    })

    .slice(0, 5)

    .map(item => ({
      ...item,
      player_name:
        item.player_name ||
        "未知球員"
    }));

};

// ==================== openLeaderboard ====================
const openLeaderboard = (type: "fielder" | "pitcher") => {

  const allPlayers = aggregateStats(historyStats);

  const data =
    allPlayers.filter(p => p.type === type);

  if (type === "fielder") {

    setRankedData({

      avg: getTop5WithFilter(data, "avg", true),

      h: getTop5WithFilter(data, "h", true),

      hr: getTop5WithFilter(data, "hr", true),

      rbi: getTop5WithFilter(data, "rbi", true),

      sb: getTop5WithFilter(data, "sb", true)

    });

  } else {

    setRankedData({

      era: getTop5WithFilter(
        data,
        "era",
        false,
        true
      ),

      w: getTop5WithFilter(
        data,
        "w",
        true,
        true
      ),

      so: getTop5WithFilter(
        data,
        "so",
        true,
        true
      ),

      whip: getTop5WithFilter(
        data,
        "whip",
        false,
        true
      )

    });

  }

  setShowModal(type);

};

const handleBatchSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const dateToSubmit = recordGameDate || new Date().toISOString().split('T')[0];

  const statsList = Object.entries(batchRows).map(([playerId, stats]) => {
    const player = recordTeamPlayers.find(p => p.id === playerId);

    // 先把表單資料轉成數字，gs（是否先發）是 checkbox，轉成 1 / 0
    const cleaned: Record<string, number> = Object.fromEntries(
      Object.entries(stats).map(([k, v]) => {
        if (k === 'gs') return [k, v === true ? 1 : 0];
        return [k, v === '' || v === undefined || v === null ? 0 : Number(v)];
      })
    );

    // 只要有日期，且局數（換算成出局數 / 3進制）大於等於 0.1 局（=1出局數）就算出賽
    const outs = ipToOuts(Number(cleaned.ip || 0));
    const hasGame = !!dateToSubmit && outs >= 1;
    cleaned.g = hasGame ? 1 : 0;

    // 自動計算野手安打數；投手的 h 是「被安打數」，直接使用手動輸入的值，不要覆蓋
    const isPitcher = player?.position_type === 'pitcher';

    if (isPitcher) {
        cleaned.g = hasGame ? 1 : 0;
    }
    const computedH = (cleaned.single || 0) +
              (cleaned.double || 0) +
              (cleaned.triple || 0) +
              (cleaned.hr || 0);
    const h = isPitcher ? (cleaned.h || 0) : computedH;

    return {
      ...cleaned,
      h,
      playerId: playerId,
      gameDate: dateToSubmit,
      type: player?.position_type
    };
  });

  const res = await fetch('/api/baseball', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addStatsBulk', statsList })
  });

  if (res.ok) {
    alert('成功寫入！');
    setBatchRows({}); // 清空表格
    fetchAllData();
  } else {
    const data = await res.json();
    alert(`寫入失敗: ${data.error}`);
  }
};

const aggregateStats = (allStats: any[]) => {
  const map: Record<string, any> = {};

  // 建立球員索引，避免一直 find()
  const playerMap = Object.fromEntries(
    players.map(p => [String(p.id), p])
  );

  allStats.forEach(s => {
    const playerId = String(s.player_id || s.playerId || "");

    if (!playerId) return;

    const player = playerMap[playerId];

    if (!map[playerId]) {
      map[playerId] = {
        playerId,
        player_name:
          player?.player_name ||
          player?.name ||
          "未知球員",

        type:
          player?.position_type ||
          player?.position ||
          s.position_type ||
          s.type ||
          "fielder",

        // 野手
        ab: 0,
        h: 0,
        hr: 0,
        rbi: 0,
        sb: 0,

        // 投手
        w: 0,
        l: 0,
        g: 0,
        gs: 0,
        ip: 0,
        outs: 0,
        er: 0,
        so: 0,
        bb: 0,
        h_allowed: 0,

        game_count: 0
      };
    }

    const p = map[playerId];

    //-----------------------------------
    // 野手
    //-----------------------------------
    if (p.type !== "pitcher") {

      p.ab += Number(s.ab || 0);

      const h =
        Number(s.h || 0) ||
        Number(s.single || 0) +
        Number(s.double || 0) +
        Number(s.triple || 0) +
        Number(s.hr || 0);

      p.h += h;

      p.hr += Number(s.hr || 0);
      p.rbi += Number(s.rbi || 0);
      p.sb += Number(s.sb || 0);
    }

    //-----------------------------------
    // 投手
    //-----------------------------------
    else {

      p.w += Number(s.w || 0);
      p.l += Number(s.l || 0);
      p.g += Number(s.g || 0);
      p.gs += Number(s.gs || 0);
      p.outs += ipToOuts(Number(s.ip || 0));
      p.ip += Number(s.ip || 0);
      p.er += Number(s.er || 0);
      p.so += Number(s.so || 0);
      p.bb += Number(s.bb || 0);

      p.h_allowed += Number(
        s.h_allowed ??
        s.h ??
        0
      );
    }

    p.game_count++;
  });

  return Object.values(map).map((p: any) => {

    const avg =
      p.ab > 0
        ? Number((p.h / p.ab).toFixed(3))
        : 0;

      const inning =
          p.outs / 3;

      const era =
          inning > 0
        ? ((p.er * 7) / inning).toFixed(2)
        : "0.00";

    const whip =
    inning > 0
        ? (
            (p.h_allowed + p.bb)
            / inning
          ).toFixed(2)
        : "0.00";

    return {
      ...p,
      avg,
      // 局數以3進制(出局數)換算回顯示用的 x.y 格式
      ip: outsToIp(p.outs || 0),
      era,
      whip
    };

  });
};

  const handleAddPlayersBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedList = bulkPlayers
      .filter(p => p.name.trim() !== '')
      .map(p => ({
        team_id: bulkTeamId,
        player_name: p.name,
        position_type: p.position
      }));

    if (formattedList.length === 0) return alert('請至少輸入一位球員');

    const res = await fetch('/api/baseball', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addPlayersBulk', playersList: formattedList })
    });

    if (res.ok) {
      fetchAllData();
      setBulkPlayers([{ name: '', position: 'fielder' }]);
      setShowPlayerModal(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (confirm('確定刪除此球員？')) {
      await fetch('/api/baseball', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePlayer', playerId })
      });
      fetchAllData();
    }
  };

  const handleDeleteStat = async (statId: string, type: string) => {
    if (confirm('確定刪除此數據？')) {
      await fetch('/api/baseball', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteStat', statId, type })
      });
      fetchAllData();
    }
  };

  return (
    <div className="min-h-screen bg-[#12181B] text-[#EDEAE2] font-body p-6">
      <ThemeStyles />
      <div className="max-w-7xl mx-auto">
        {/* 標題與權限切換 - 完全保留 */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-2 pb-6">
          <div>
            <span className="text-xs tracking-[0.3em] uppercase text-[#9BA5A4]">Team Stats Console</span>
            <h1 className="font-display text-5xl tracking-wide flex items-center gap-3 leading-none mt-1">
              <span className="text-[#D98E3F]">⚾</span> 棒球數據管理系統
            </h1>
            <p className="text-[#9BA5A4] mt-2">專業球隊數據記錄平台</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1A2124] px-4 py-2.5 rounded-lg border border-[#333E41]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isAuthorized ? '#7FBF95' : '#E8A33D' }}
              />
              <span className="text-sm text-[#9BA5A4]">目前模式：</span>
              <span className={`font-semibold text-sm ${isAuthorized ? 'text-[#7FBF95]' : 'text-[#E8A33D]'}`}>
                {authLoading
                  ? '登入狀態確認中...'
                  : !user
                  ? '未登入（僅查詢）'
                  : isAuthorized
                  ? '管理員（可編輯）'
                  : '已登入（無編輯權限）'}
              </span>
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
                  className="bg-[#4F86A6] hover:bg-[#3E6F8C] px-5 py-2.5 rounded-lg text-sm transition-colors font-medium flex items-center gap-2"
                >
                  使用 Google 登入
                </button>
              )
            )}
          </div>
        </div>

        <SeamDivider className="mb-8" />

        {/* 管理功能區 - 僅管理員可見 */}
        {isAuthorized && (
          <div className="mb-10 flex gap-3 flex-wrap">
            <button onClick={() => setShowPlayerModal(true)} className="bg-[#7C6FA6] hover:bg-[#665890] px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              + 批量新增球員
            </button>
            <button onClick={() => setShowManagePlayersModal(true)} className="bg-[#C1443A] hover:bg-[#A93A31] px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              ⚙️ 管理球員
            </button>
          </div>
        )}

        <div className="flex gap-3 mb-10 flex-wrap">
          <button
            onClick={() => openLeaderboard('fielder')}
            className="group bg-[#1A2124] hover:bg-[#4F86A6] border border-[#4F86A6]/40 hover:border-[#4F86A6] px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🥇</span> 野手排行榜
          </button>
          <button
            onClick={() => openLeaderboard('pitcher')}
            className="group bg-[#1A2124] hover:bg-[#C1443A] border border-[#C1443A]/40 hover:border-[#C1443A] px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🎯</span> 投手排行榜
          </button>
        </div>

          <LeaderboardModal 
            isOpen={!!showModal} 
            onClose={() => setShowModal(null)} 
            data={rankedData} 
            type={showModal} 
          />

        {isAuthorized && (
          <div className="bg-[#1A2124] border border-[#2A3336] border-t-2 border-t-[#D98E3F] rounded-lg p-6 mb-10">
            <h2 className="font-display text-2xl tracking-wide mb-5 flex items-center gap-2">📝 快速批次錄入比賽數據</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm text-[#9BA5A4] mb-1">選擇球隊</label>
                <select value={activeRecordTeamId} onChange={(e) => setActiveRecordTeamId(e.target.value)} className="w-full bg-[#12181B] border border-[#333E41] rounded-lg p-3 text-sm">
                  <option value="">選擇球隊...</option>
                  {teams.filter(t => canManageTeam(t.id)).map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#9BA5A4] mb-1">比賽日期</label>
                <input type="date" value={recordGameDate} onChange={(e) => setRecordGameDate(e.target.value)} className="w-full bg-[#12181B] border border-[#333E41] rounded-lg p-3 text-sm" />
              </div>
            </div>

            {activeRecordTeamId && recordTeamPlayers.length > 0 && (
              <form onSubmit={handleBatchSubmit}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#333E41] text-left">
                        <th className="py-3 px-4">球員</th>
                        <th className="py-3 px-4">位置</th>
                        <th className="py-3 px-4">數據欄位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* --- 投手區塊 --- */}
                      {recordTeamPlayers.filter(p => p.position_type === 'pitcher').length > 0 && (
                        <>
                          <tr className="bg-[#232B2E]/60">
                            <td colSpan={3} className="py-2 px-4 font-bold text-[#E2897E]">⚾ 投手數據錄入</td>
                          </tr>
                          {recordTeamPlayers.filter(p => p.position_type === 'pitcher').map(p => {
                            const pRow = batchRows[p.id] || {};
                            return (
                              <tr key={p.id} className="border-b border-[#2A3336] hover:bg-[#12181B]/60">
                                <td className="py-4 px-4 font-medium">{p.player_name}</td>
                                <td className="py-4 px-4 text-xs text-[#E2897E]">投手</td>
                                <td className="py-4 px-4">
                                  <label className="flex items-center gap-2 text-xs text-[#B7BFBC] mb-2 select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!pRow.gs}
                                      onChange={e => handleBatchValueChange(p.id, 'gs', e.target.checked)}
                                      className="w-4 h-4 accent-[#C1443A]"
                                    />
                                    是否先發
                                  </label>
                                  <div className="grid grid-cols-8 gap-2 text-xs">
                                    {['w', 'l', 'ip', 'h', 'r', 'er', 'bb', 'so'].map(key => (
                                      <div key={key} className="flex flex-col">
                                        <span className="text-[10px] text-[#6C7574] uppercase">{key}</span>
                                        <input 
                                          type="number" 
                                          step="0.1" 
                                          value={pRow[key] || ''} 
                                          onChange={e => handleBatchValueChange(p.id, key, e.target.value)} 
                                          className="bg-[#232B2E] border border-[#333E41] rounded px-2 py-1 w-full" 
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}

                      {/* --- 野手區塊 --- */}
                      {recordTeamPlayers.filter(p => p.position_type !== 'pitcher').length > 0 && (
                        <>
                          <tr className="bg-[#232B2E]/60">
                            <td colSpan={3} className="py-2 px-4 font-bold text-[#7FB4D6]">🧤 野手數據錄入</td>
                          </tr>
                          {recordTeamPlayers.filter(p => p.position_type !== 'pitcher').map(p => {
                            const pRow = batchRows[p.id] || {};
                            return (
                              <tr key={p.id} className="border-b border-[#2A3336] hover:bg-[#12181B]/60">
                                <td className="py-4 px-4 font-medium">{p.player_name}</td>
                                <td className="py-4 px-4 text-xs text-[#7FB4D6]">野手</td>
                                <td className="py-4 px-4">
                                  <div className="grid grid-cols-6 gap-2 text-xs">   {/* 已調整為6欄 */}
                                    {['ab', 'single', 'double', 'triple', 'hr', 'bb', 'sf', 'so', 'r', 'rbi', 'sb'].map(key => (
                                      <div key={key} className="flex flex-col">
                                        <span className="text-[10px] text-[#6C7574] uppercase">
                                          {key === 'sb' ? 'SB' : key}
                                        </span>
                                        <input 
                                          type="number" 
                                          value={pRow[key] || ''} 
                                          onChange={e => handleBatchValueChange(p.id, key, e.target.value)} 
                                          className="bg-[#232B2E] border border-[#333E41] rounded px-2 py-1 w-full" 
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
                <button type="submit" className="mt-6 bg-[#5C8F6D] hover:bg-[#4C7A5C] px-8 py-3 rounded-lg font-medium w-full transition-colors">
                  確認儲存本次比賽數據
                </button>
              </form>
            )}
          </div>
        )}

        {/* 查詢區 - 完全保留 */}
        <div className="bg-[#1A2124] border border-[#2A3336] rounded-lg p-6 mb-10">
          <h2 className="font-display text-2xl tracking-wide mb-5 flex items-center gap-2">🔍 查詢比賽數據</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-[#9BA5A4] mb-1">球隊</label>
              <select value={inputTeamId} onChange={(e) => setInputTeamId(e.target.value)} className="w-full bg-[#12181B] border border-[#333E41] rounded-lg p-3">
                <option value="">全部球隊</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#9BA5A4] mb-1">開始日期</label>
              <input type="date" value={inputStartDate} onChange={(e) => setInputStartDate(e.target.value)} className="w-full bg-[#12181B] border border-[#333E41] rounded-lg p-3" />
            </div>
            <div>
              <label className="block text-sm text-[#9BA5A4] mb-1">結束日期</label>
              <input type="date" value={inputEndDate} onChange={(e) => setInputEndDate(e.target.value)} className="w-full bg-[#12181B] border border-[#333E41] rounded-lg p-3" />
            </div>
            <div className="flex items-end gap-3">
              <button onClick={handleSearch} className="bg-[#D98E3F] text-[#12181B] hover:bg-[#C67A2E] px-8 py-3 rounded-lg font-semibold flex-1 transition-colors">查詢</button>
              <button onClick={handleResetFilter} className="bg-[#232B2E] hover:bg-[#333E41] px-6 py-3 rounded-lg border border-[#333E41] flex-1 transition-colors font-medium">重置</button>
            </div>
          </div>
        </div>

        {/* 數據表格區 - 已擴充欄位 */}
        <div className="space-y-10">
          {/* 野手數據 - 已擴充 */}
          {/* 野手表現 */}
          <div>
          <h3 className="font-display text-3xl tracking-wide mb-4 flex items-center gap-2">🥇 野手表現</h3>
          <div className="bg-[#1A2124] border border-[#2A3336] border-t-2 border-t-[#4F86A6] rounded-lg overflow-hidden">
          <div className="overflow-x-auto stat-scroll">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-[#12181B] border-b border-[#333E41]">
                  <th className="text-left py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold sticky left-0 bg-[#12181B] z-10">日期</th>
                  <th className="text-left py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold sticky left-0 bg-[#12181B] z-10">球員</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">打席</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">打數</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">安打</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">AVG</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">SLG</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">OPS</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">1B</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">2B</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">3B</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">HR</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">壘打</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">得分</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">打點</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">三振</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">四壞</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">犧飛</th>
                  <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">SB</th>
                  {isAuthorized && <th className="w-20 text-center sticky right-0 bg-[#12181B] z-10">操作</th>}
                </tr>
              </thead>
              <tbody>
                {displayStats.filter(s => (s.type === 'fielder' || s.position_type === 'fielder')).length > 0 ? displayStats.filter(s => (s.type === 'fielder' || s.position_type === 'fielder'))
                .map(stat => {
                const player = players.find(p => String(p.id) === String(stat.player_id || stat.playerId));
                const playerName = player?.player_name || player?.name || '未知球員';
                const isAggregate = stat.game_date === '累計' || !stat.game_date;

                // 在 map 裡面，return (<tr> 之前加入這段計算
                let displayAvg = '.000';
                let displaySlg = '.000';
                let displayOps = '.000';

                if (isAggregate) {
                  displayAvg = stat.avg || '.000';
                  displaySlg = stat.slg || '.000';
                  displayOps = stat.ops || '.000';
                } else {
                  const ab = Number(stat.ab || 0);
                  const h = Number(stat.h || 0);
                  const tb = Number(stat.tb || 0) || 
                            (Number(stat.single || 0) + Number(stat.double || 0)*2 + 
                              Number(stat.triple || 0)*3 + Number(stat.hr || 0)*4);
                  
                  if (ab > 0) {
                    displayAvg = (h / ab).toFixed(3);
                    displaySlg = (tb / ab).toFixed(3);
                    displayOps = (h / ab + tb / ab).toFixed(3);
                  }
                }

                return (
                  <tr key={stat.id || stat.playerId} className="border-b border-[#2A3336] hover:bg-[#12181B]/60">
                    <td className="py-3.5 px-6 text-[#9BA5A4] font-data sticky left-0 bg-[#1A2124] z-10">
                      {isAggregate ? '累計' : (stat.game_date || stat.gameDate || '').substring(0,10)}
                    </td>
                    <td className="py-3.5 px-6 font-medium sticky left-0 bg-[#1A2124] z-10">{playerName}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.pa || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.ab || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.h || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums font-semibold text-[#7FBF95]">{displayAvg}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums font-semibold text-[#7FBF95]">{displaySlg}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums font-semibold text-[#7FBF95]">{displayOps}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.single || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.double || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.triple || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.hr || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.tb || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.r || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.rbi || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.so || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.bb || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.sf || 0}</td>
                    <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.sb || 0}</td>
                    {isAuthorized && (
                      <td className="py-4 px-6 text-center sticky right-0 bg-[#1A2124] z-10">
                        {canManageTeam(player?.team_id) ? (
                          <button onClick={() => handleDeleteStat(stat.id, 'fielder')} className="text-[#E2897E] hover:text-[#F2A89C]">刪除</button>
                        ) : (
                          <span className="text-[#46524F] text-xs">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
                : (
                  <tr>
                    <td colSpan={20} className="text-center py-8 text-[#6C7574] italic">
                      目前無符合條件的野手數據
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
          </div>

          {/* 投手數據 - 已擴充 */}
          <div>
            <h3 className="font-display text-3xl tracking-wide mb-4 flex items-center gap-3">🎯 投手表現</h3>
            <div className="bg-[#1A2124] border border-[#2A3336] border-t-2 border-t-[#C1443A] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#12181B] border-b border-[#333E41]">
                    <th className="text-left py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">日期</th>
                    <th className="text-left py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">球員</th>
                    <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">勝</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">敗</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">ERA</th>
                    <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">出賽</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">先發</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">局數</th>
                    <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">安打</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">失分</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">責失</th>
                    <th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">四壞</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">三振</th><th className="text-center py-3.5 px-6 text-xs uppercase tracking-wider text-[#9BA5A4] font-semibold">WHIP</th>
                    {isAuthorized && <th className="w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {displayStats.filter(s => s.type === 'pitcher').length > 0 ? (
                    displayStats.filter(s => s.type === 'pitcher').map(stat => {
                      // 找到對應的球員物件
                      const player = players.find(p => String(p.id) === String(stat.player_id || stat.playerId));
                      // 自動相容 player_name 或 name 欄位
                      const playerName = player?.player_name || player?.name || '未知球員';

                      return (
                        <tr key={stat.id} className="border-b border-[#2A3336] hover:bg-[#12181B]/60">
                          <td className="py-3.5 px-6 text-[#9BA5A4] font-data">{(stat.game_date || stat.gameDate || '').substring(0, 10)}</td>
                          <td className="py-3.5 px-6 font-medium">{playerName}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.w || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.l || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums font-semibold text-[#7FBF95]">{stat.era || '-'}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.g || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.gs || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.ip || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.h || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.r || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.er || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.bb || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums">{stat.so || 0}</td>
                          <td className="py-3.5 px-6 text-center font-data tabular-nums font-semibold text-[#7FBF95]">{stat.whip || '-'}</td>
                          {isAuthorized && (
                            <td className="py-3.5 px-6 text-center font-data tabular-nums">
                              {canManageTeam(player?.team_id) ? (
                                <button onClick={() => handleDeleteStat(stat.id, 'pitcher')} className="text-[#E2897E] hover:text-[#F2A89C]">刪除</button>
                              ) : (
                                <span className="text-[#46524F] text-xs">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={15} className="text-center py-8 text-[#6C7574] italic">
                        目前無符合條件的投手數據
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1A2124] border border-[#333E41] rounded-lg w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-3xl tracking-wide mb-6">＋ 批量新增球員</h3>
            
            <select
              value={bulkTeamId}
              onChange={(e) => setBulkTeamId(e.target.value)}
              className="w-full bg-[#12181B] border border-[#333E41] rounded-lg p-4 mb-6"
            >
              <option value="">選擇所屬球隊</option>
              {teams.filter(t => canManageTeam(t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.team_name}</option>
              ))}
            </select>
            {teams.filter(t => canManageTeam(t.id)).length === 0 && (
              <p className="text-xs text-[#E2897E] -mt-4 mb-6">您目前沒有任何球隊的新增權限。</p>
            )}

            <div className="space-y-4 mb-8">
              {bulkPlayers.map((player, index) => (
                <div key={index} className="flex gap-3 items-center bg-[#12181B] border border-[#333E41] rounded-lg p-2">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => handleBulkPlayerChange(index, 'name', e.target.value)}
                    placeholder="球員姓名"
                    className="flex-1 bg-transparent border-0 focus:outline-none px-4 py-3"
                    required
                  />
                  <select
                    value={player.position}
                    onChange={(e) => handleBulkPlayerChange(index, 'position', e.target.value as 'fielder' | 'pitcher')}
                    className="bg-[#232B2E] border border-[#333E41] rounded-lg px-4 py-3"
                  >
                    <option value="fielder">野手</option>
                    <option value="pitcher">投手</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setBulkPlayers(bulkPlayers.filter((_, i) => i !== index))}
                    className="text-[#E2897E] hover:text-[#F2A89C] px-4 py-3"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setBulkPlayers([...bulkPlayers, { name: '', position: 'fielder' }])}
              className="w-full py-4 border border-dashed border-[#46524F] hover:border-[#6C7574] text-[#9BA5A4] hover:text-[#B7BFBC] rounded-lg mb-8 transition-colors"
            >
              ＋ 增加下一位球員
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPlayerModal(false)}
                className="flex-1 py-4 bg-[#232B2E] hover:bg-[#333E41] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddPlayersBulk}
                className="flex-1 py-4 bg-[#7C6FA6] hover:bg-[#665890] rounded-lg transition-colors font-medium"
              >
                確認建立名單
              </button>
            </div>
          </div>
        </div>
      )}

      {showManagePlayersModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1A2124] border border-[#333E41] rounded-lg w-full max-w-2xl p-8 max-h-[85vh] overflow-y-auto">
            <h3 className="font-display text-3xl tracking-wide mb-6">⚙️ 管理球員名單</h3>
            
            <p className="text-xs text-[#9BA5A4] mb-4">僅顯示您擁有刪除權限之球隊的球員</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players.filter(p => canManageTeam(p.team_id)).map(p => {
                const tName = teams.find(t => t.id === p.team_id)?.team_name || '未分類';
                const posName = p.position_type === 'pitcher' ? '投手' : '野手';
                return (
                  <div key={p.id} className="bg-[#12181B] border border-[#333E41] rounded-lg p-5 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{p.player_name}</div>
                      <div className="text-xs text-[#9BA5A4] mt-1">
                        {posName} • {tName}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePlayer(p.id)}
                      className="bg-[#2E1815] text-[#E2897E] hover:bg-[#3D211D] px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowManagePlayersModal(false)}
              className="mt-8 w-full py-4 bg-[#232B2E] hover:bg-[#333E41] rounded-lg transition-colors"
            >
              關閉視窗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}