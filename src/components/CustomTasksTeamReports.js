// src/components/CustomTasksTeamReports.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell
} from 'recharts';
import {
  Users, CalendarDays, TrendingUp, Trophy, Star, Award,
  Activity, BarChart3, CheckCircle, Flame
} from 'lucide-react';
import { supabase } from '../supabase';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PAL = {
  light: { teal:'#0F766E', sky:'#0EA5E9', emerald:'#059669', amber:'#D97706', rose:'#E11D48', lime:'#65A30D', cyan:'#0891B2', indigo:'#3B82F6', orange:'#EA580C' },
  dark:  { teal:'#2DD4BF', sky:'#38BDF8', emerald:'#34D399', amber:'#FCD34D', rose:'#FB7185', lime:'#A3E635', cyan:'#22D3EE', indigo:'#60A5FA', orange:'#FB923C' },
};
const LINE_COLORS_LIGHT = ['#0F766E','#0EA5E9','#D97706','#E11D48','#65A30D','#0891B2','#EA580C','#059669'];
const LINE_COLORS_DARK  = ['#2DD4BF','#38BDF8','#FCD34D','#FB7185','#A3E635','#22D3EE','#FB923C','#34D399'];

const TT = (dm) => ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-xl border shadow-2xl text-sm ${dm ? 'bg-gray-900/95 border-gray-700 text-gray-100' : 'bg-white/95 border-stone-200 text-stone-900'}`}>
      <p className="font-bold text-xs opacity-50 mb-1 uppercase">{label}</p>
      {payload.map((e, i) => <p key={i} style={{ color: e.color }} className="font-semibold">{e.name}: {e.value}%</p>)}
    </div>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, color, darkMode }) => (
  <div className={`rounded-2xl p-4 border transition-all hover:shadow-lg hover:-translate-y-0.5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
    <div className="p-2 rounded-xl inline-block mb-2" style={{ background: color + '22' }}>
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
    <div className="text-2xl font-black" style={{ color, fontFamily: 'Georgia, serif' }}>{value}</div>
    <div className={`text-xs font-semibold mt-0.5 ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>{label}</div>
    {sub && <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>{sub}</div>}
  </div>
);

const Panel = ({ title, icon: Icon, color, darkMode, children }) => (
  <div className={`rounded-2xl border p-4 sm:p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
    {title && (
      <h3 className={`font-black flex items-center gap-2 mb-4 text-sm sm:text-base ${darkMode ? 'text-white' : 'text-stone-900'}`}
        style={{ fontFamily: 'Georgia, serif' }}>
        {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} />}
        {title}
      </h3>
    )}
    {children}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const CustomTasksTeamReports = ({ user, darkMode }) => {
  const [tab, setTab]               = useState('monthly');
  const [loading, setLoading]       = useState(false);
  const [allUsers, setAllUsers]     = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyStats, setYearlyStats] = useState({});
  const [yearlyLoaded, setYearlyLoaded] = useState(false);

  const col        = darkMode ? PAL.dark  : PAL.light;
  const lineColors = darkMode ? LINE_COLORS_DARK : LINE_COLORS_LIGHT;
  const grid       = darkMode ? '#1C2330' : '#E7E3DC';
  const axis       = darkMode ? '#374151' : '#C0B8AE';
  const Tooltip    = TT(darkMode);

  const tabs = [
    { id: 'monthly', label: 'Monthly Team',  icon: CalendarDays },
    { id: 'yearly',  label: 'Yearly Stats',  icon: Star         },
    { id: 'board',   label: 'Leaderboard',   icon: Trophy       },
  ];

  // ── Load all users ─────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    if (allUsers.length) return allUsers;
    const { data } = await supabase.from('profiles').select('id, name').order('name', { ascending: true });
    const users = data || [];
    setAllUsers(users);
    return users;
  }, [allUsers]);

  // ── Monthly team — single query per user (batch) ───────────────────────────
  // Original had N*30 queries. Now: N queries (one per user for date range).
  const loadMonthly = useCallback(async () => {
    if (monthlyData.length) return;
    setLoading(true);
    try {
      const users = await loadUsers();
      if (!users.length) { setLoading(false); return; }

      const today = new Date();
      const dates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });

      // Fetch all custom_tasks for all users in range — one query
      const { data: allRows } = await supabase
        .from('custom_tasks').select('user_id, date, completed')
        .in('user_id', users.map(u => u.id))
        .gte('date', dates[0]).lte('date', dates[29]);

      const rows = allRows || [];

      const built = dates.map(ds => {
        const d     = new Date(ds + 'T00:00:00');
        const point = { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), fullDate: ds };
        users.forEach(u => {
          const t    = rows.filter(r => r.user_id === u.id && r.date === ds);
          const done = t.filter(r => r.completed).length;
          point[u.name] = t.length > 0 ? Math.round((done / t.length) * 100) : 0;
        });
        return point;
      });

      setMonthlyData(built);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [monthlyData.length, loadUsers]);

  // ── Yearly stats — one query per user for full year ────────────────────────
  // Original had 365*N queries. Now: N queries.
  const loadYearly = useCallback(async () => {
    if (yearlyLoaded) return;
    setLoading(true);
    try {
      const users = await loadUsers();
      if (!users.length) { setLoading(false); return; }

      const today    = new Date();
      const yearAgo  = new Date(today); yearAgo.setDate(yearAgo.getDate() - 364);
      const startDate = yearAgo.toISOString().split('T')[0];

      // One query for entire team's year
      const { data: allRows } = await supabase
        .from('custom_tasks').select('user_id, date, completed')
        .in('user_id', users.map(u => u.id))
        .gte('date', startDate);

      const rows = allRows || [];
      const stats_ = {};

      users.forEach(u => {
        const userRows = rows.filter(r => r.user_id === u.id);
        const days     = [...new Set(userRows.map(r => r.date))];
        let totalPct = 0, perfectDays = 0, goodDays = 0;

        days.forEach(ds => {
          const t    = userRows.filter(r => r.date === ds);
          const done = t.filter(r => r.completed).length;
          const pct  = t.length > 0 ? Math.round((done / t.length) * 100) : 0;
          totalPct += pct;
          if (pct === 100) perfectDays++;
          if (pct >= 70)   goodDays++;
        });

        stats_[u.name] = {
          name:        u.name,
          isMe:        u.id === user?.id,
          totalDays:   days.length,
          perfectDays,
          goodDays,
          avgPct:      days.length > 0 ? Math.round(totalPct / days.length) : 0,
        };
      });

      setYearlyStats(stats_);
      setYearlyLoaded(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [yearlyLoaded, loadUsers, user]);

  useEffect(() => {
    if (tab === 'monthly' || tab === 'board') loadMonthly();
    if (tab === 'yearly') loadYearly();
  }, [tab]); // eslint-disable-line

  // ── Leaderboard — from today's monthly snapshot (last entry) ──────────────
  const todayEntry   = monthlyData[monthlyData.length - 1] || {};
  const leaderboard  = allUsers
    .map(u => ({ name: u.name, isMe: u.id === user?.id, pct: todayEntry[u.name] ?? 0 }))
    .sort((a, b) => b.pct - a.pct);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn">

      {/* ── Header + tabs ──────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-3 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
        <h2 className={`font-black text-base mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}
          style={{ fontFamily: 'Georgia, serif' }}>
          <Users className="h-5 w-5" style={{ color: col.sky }} />
          Custom Tasks — Team Reports
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                tab === id
                  ? darkMode ? 'bg-sky-500 text-white shadow-md' : 'bg-teal-700 text-white shadow-md'
                  : darkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-200' : 'text-stone-400 hover:bg-stone-100 hover:text-teal-800'
              }`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="loading-spinner h-8 w-8 mr-3" />
          <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>Loading team data…</span>
        </div>
      )}

      {/* ══ MONTHLY TEAM ════════════════════════════════════════════════════════ */}
      {tab === 'monthly' && !loading && (
        <div className="space-y-4">
          {!monthlyData.length ? (
            <div className="text-center py-16">
              <button onClick={loadMonthly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white' : 'bg-teal-700 text-white'}`}>Load Team Data</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <StatCard label="Members"     value={allUsers.length}                                           icon={Users}      color={col.sky}     darkMode={darkMode} />
                <StatCard label="Avg Today"   value={`${leaderboard.length ? Math.round(leaderboard.reduce((s,u)=>s+u.pct,0)/leaderboard.length) : 0}%`} icon={TrendingUp} color={col.teal} darkMode={darkMode} />
                <StatCard label="Top Scorer"  value={leaderboard[0] ? `${leaderboard[0].pct}%` : '–'} sub={leaderboard[0]?.name} icon={Trophy} color={col.amber} darkMode={darkMode} />
              </div>

              <Panel title="30-Day Team Comparison" icon={TrendingUp} color={col.sky} darkMode={darkMode}>
                <p className={`text-xs mb-3 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                  Each line = one team member's custom task completion %
                </p>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis dataKey="date" stroke={axis} style={{ fontSize: 10 }} interval={4} angle={-20} textAnchor="end" height={36} />
                      <YAxis domain={[0,100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <RTooltip content={<Tooltip />} />
                      {allUsers.map((u, i) => (
                        <Line key={u.id} type="monotone" dataKey={u.name} name={u.name}
                          stroke={lineColors[i % lineColors.length]} strokeWidth={u.id === user?.id ? 3 : 1.5}
                          dot={false} activeDot={{ r: 5 }}
                          strokeDasharray={u.id !== user?.id ? '4 2' : undefined} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {allUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: lineColors[i % lineColors.length] }} />
                      <span className={darkMode ? 'text-gray-400' : 'text-stone-500'}>
                        {u.name}{u.id === user?.id ? ' (you)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Area chart for comparison richness */}
              <Panel title="Team Cumulative View" icon={Activity} color={col.emerald} darkMode={darkMode}>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis dataKey="date" stroke={axis} style={{ fontSize: 10 }} interval={4} angle={-20} textAnchor="end" height={36} />
                      <YAxis domain={[0,100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <RTooltip content={<Tooltip />} />
                      {allUsers.map((u, i) => (
                        <Area key={u.id} type="monotone" dataKey={u.name} name={u.name}
                          stroke={lineColors[i % lineColors.length]}
                          fill={lineColors[i % lineColors.length]}
                          fillOpacity={0.08} strokeWidth={u.id === user?.id ? 2.5 : 1.5} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </>
          )}
        </div>
      )}

      {/* ══ YEARLY STATS ════════════════════════════════════════════════════════ */}
      {tab === 'yearly' && !loading && (
        <div className="space-y-4">
          {!yearlyLoaded ? (
            <div className="text-center py-16">
              <button onClick={loadYearly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white' : 'bg-teal-700 text-white'}`}>Load Yearly Stats</button>
            </div>
          ) : (
            <>
              <Panel title="Year Summary — Custom Tasks" icon={Star} color={col.amber} darkMode={darkMode}>
                <div className="space-y-4">
                  {Object.values(yearlyStats).sort((a, b) => b.avgPct - a.avgPct).map((s, i) => (
                    <div key={s.name} className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      s.isMe
                        ? darkMode ? 'border-sky-700/40 bg-sky-900/10' : 'border-teal-300 bg-teal-50'
                        : darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-stone-200 bg-stone-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm`}
                            style={{ background: lineColors[i % lineColors.length] + '33', color: lineColors[i % lineColors.length] }}>
                            {s.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className={`font-black text-sm ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                              {s.name}
                              {s.isMe && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${darkMode?'bg-sky-900/40 text-sky-400':'bg-teal-100 text-teal-800'}`}>you</span>}
                            </span>
                            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>Custom tasks · full year</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.avgPct >= 80 && <Trophy className="h-5 w-5 text-amber-400" />}
                          <span className="text-xl font-black" style={{ fontFamily: 'Georgia, serif', color: s.avgPct>=70?col.emerald:s.avgPct>=40?col.amber:col.rose }}>{s.avgPct}%</span>
                        </div>
                      </div>

                      {/* Mini stat row */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { l: 'Active Days', v: s.totalDays,   c: col.sky     },
                          { l: 'Perfect 💯',  v: s.perfectDays, c: col.lime    },
                          { l: 'Good ≥70%',   v: s.goodDays,    c: col.emerald },
                        ].map(({ l, v, c }) => (
                          <div key={l} className={`text-center p-2 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                            <div className="font-black text-base" style={{ color: c, fontFamily: 'Georgia, serif' }}>{v}</div>
                            <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>{l}</div>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`}>
                        <div className="h-2 rounded-full transition-all duration-700 progress-bar" style={{ width: `${s.avgPct}%` }} />
                      </div>

                      {/* Summary text */}
                      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                        {s.name} used custom tasks on <strong style={{ color: col.sky }}>{s.totalDays}</strong> days this year
                        {s.totalDays > 0 && <>, averaging <strong style={{ color: s.avgPct>=70?col.emerald:col.amber }}>{s.avgPct}%</strong></>}.
                        {s.perfectDays > 0 && <> Achieved <strong style={{ color: col.lime }}>{s.perfectDays} perfect days</strong>.</>}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Bar comparison */}
              <Panel title="Year Avg Comparison" icon={BarChart3} color={col.sky} darkMode={darkMode}>
                <div style={{ height: Math.max(200, Object.values(yearlyStats).length * 48) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.values(yearlyStats).sort((a,b)=>b.avgPct-a.avgPct)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis type="number" domain={[0,100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="name" stroke={axis} style={{ fontSize: 11 }} width={90} />
                      <RTooltip content={<Tooltip />} />
                      <Bar dataKey="avgPct" name="Year Avg %" radius={[0,6,6,0]}>
                        {Object.values(yearlyStats).sort((a,b)=>b.avgPct-a.avgPct).map((s, i) => (
                          <Cell key={i} fill={lineColors[i % lineColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </>
          )}
        </div>
      )}

      {/* ══ LEADERBOARD ═════════════════════════════════════════════════════════ */}
      {tab === 'board' && !loading && (
        <div className="space-y-4">
          {!monthlyData.length ? (
            <div className="text-center py-16">
              <button onClick={loadMonthly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white' : 'bg-teal-700 text-white'}`}>Load Data</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <StatCard label="Members"      value={allUsers.length}                                                                            icon={Users}   color={col.sky}     darkMode={darkMode} />
                <StatCard label="Top Performer" value={leaderboard[0]?.pct ? `${leaderboard[0].pct}%` : '–'} sub={leaderboard[0]?.name || '–'}  icon={Trophy}  color={col.amber}   darkMode={darkMode} />
                <StatCard label="Team Average"  value={`${leaderboard.length ? Math.round(leaderboard.reduce((s,u)=>s+u.pct,0)/leaderboard.length) : 0}%`} icon={Activity} color={col.teal} darkMode={darkMode} />
              </div>

              <Panel title="Today's Leaderboard" icon={Trophy} color={col.amber} darkMode={darkMode}>
                <div className="space-y-2">
                  {leaderboard.map((u, i) => {
                    const medals = ['🥇','🥈','🥉'];
                    return (
                      <div key={i} className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        u.isMe
                          ? darkMode ? 'border-sky-700/40 bg-sky-900/10' : 'border-teal-300 bg-teal-50'
                          : darkMode ? 'border-gray-800' : 'border-stone-200'
                      }`}>
                        <div className="text-lg w-8 text-center flex-shrink-0 font-black">
                          {i < 3 ? medals[i] : <span className={`text-xs ${darkMode?'text-gray-600':'text-stone-300'}`}>#{i+1}</span>}
                        </div>
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0`}
                          style={{ background: lineColors[i % lineColors.length] + '33', color: lineColors[i % lineColors.length] }}>
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm truncate mb-0.5 ${darkMode?'text-white':'text-stone-900'}`}>
                            {u.name}
                            {u.isMe && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${darkMode?'bg-sky-900/40 text-sky-400':'bg-teal-100 text-teal-800'}`}>you</span>}
                          </div>
                          <div className={`w-full h-1.5 rounded-full ${darkMode?'bg-gray-800':'bg-stone-200'}`}>
                            <div className="h-1.5 rounded-full progress-bar" style={{ width: `${u.pct}%` }} />
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-lg font-black" style={{ fontFamily: 'Georgia, serif', color: u.pct>=70?col.emerald:u.pct>=40?col.amber:col.rose }}>{u.pct}%</div>
                          <div className="text-[10px]">{u.pct===100?'🏆':u.pct>=70?'✅':u.pct>0?'🌱':'–'}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!leaderboard.length && <p className={`text-center py-8 text-sm ${darkMode?'text-gray-600':'text-stone-400'}`}>No data yet today</p>}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default CustomTasksTeamReports;