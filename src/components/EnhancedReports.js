// src/components/EnhancedReports.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import {
  Target, TrendingUp, Award, Users, CalendarDays, Flame, Activity,
  CheckCircle, BarChart3, Star, Shield, RefreshCw, Heart,
  ArrowUp, ArrowDown, Minus, Zap, BookOpen, Clock, Trophy,
  Dumbbell, Briefcase
} from 'lucide-react';
import { supabase } from '../supabase';
import { taskTemplates } from '../config/taskTemplates';

// ─── Colour palette (no purple anywhere) ─────────────────────────────────────
const PAL = {
  light: {
    teal:    '#0F766E', sky:     '#0EA5E9', emerald: '#059669',
    amber:   '#D97706', rose:    '#E11D48', lime:    '#65A30D',
    cyan:    '#0891B2', orange:  '#EA580C', stone:   '#78716C',
    indigo:  '#3B82F6',
  },
  dark: {
    teal:    '#2DD4BF', sky:     '#38BDF8', emerald: '#34D399',
    amber:   '#FCD34D', rose:    '#FB7185', lime:    '#A3E635',
    cyan:    '#22D3EE', orange:  '#FB923C', stone:   '#A8A29E',
    indigo:  '#60A5FA',
  },
};

const PALETTE_ARR_LIGHT = Object.values(PAL.light);
const PALETTE_ARR_DARK  = Object.values(PAL.dark);

// ─── Shared helpers ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, darkMode }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-xl border text-sm shadow-2xl backdrop-blur-sm ${
      darkMode ? 'bg-gray-900/95 border-gray-700 text-gray-100' : 'bg-white/95 border-stone-200 text-stone-900'
    }`}>
      <p className="font-bold mb-1 text-xs tracking-wide uppercase opacity-60">{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }} className="text-sm font-semibold">
          {e.name}: {e.value}{e.name?.toLowerCase().includes('%') || e.name?.toLowerCase().includes('rate') ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

const mkTT = (dm) => (props) => <CustomTooltip {...props} darkMode={dm} />;

const StatCard = ({ label, value, sub, icon: Icon, color, darkMode, trend, wide }) => {
  const trendColor = trend > 0 ? '#059669' : trend < 0 ? '#E11D48' : '#78716C';
  const TIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus;
  return (
    <div className={`rounded-2xl p-4 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
      wide ? 'sm:col-span-2' : ''
    } ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: color + '22' }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: trendColor }}>
            <TIcon className="h-3 w-3" />{Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-black" style={{ color, fontFamily: 'Georgia, serif' }}>{value}</div>
      <div className={`text-xs font-semibold mt-1 ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>{label}</div>
      {sub && <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>{sub}</div>}
    </div>
  );
};

const Panel = ({ title, icon: Icon, color, darkMode, children, action, noPad }) => (
  <div className={`rounded-2xl border ${noPad ? '' : 'p-4 sm:p-6'} ${
    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'
  }`}>
    {(title || action) && (
      <div className={`flex items-center justify-between mb-5 ${noPad ? 'px-4 sm:px-6 pt-4 sm:pt-6' : ''}`}>
        <h3 className={`font-black flex items-center gap-2 text-sm sm:text-base ${darkMode ? 'text-white' : 'text-stone-900'}`}
          style={{ fontFamily: 'Georgia, serif' }}>
          {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} />}
          {title}
        </h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

const HeatCell = ({ value, darkMode, date }) => {
  const pct = value === null ? 0 : Math.min(value / 100, 1);
  const alpha = value === null ? 0 : 0.12 + pct * 0.88;
  const bg = value === null
    ? darkMode ? '#1C2330' : '#F0EDE8'
    : `rgba(15, 118, 110, ${alpha})`;
  return (
    <div title={date ? `${date}: ${value !== null ? value + '%' : 'no data'}` : ''}
      style={{ background: bg }}
      className="h-[14px] w-[14px] sm:h-[18px] sm:w-[18px] rounded-[3px] transition-transform duration-100 hover:scale-125 cursor-default"
    />
  );
};

const Spinner = ({ darkMode }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="loading-spinner h-8 w-8" />
    <p className={`text-xs ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>Loading data…</p>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const EnhancedReports = ({ user, weeklyData, allUsersProgress, darkMode }) => {
  const [tab, setTab]               = useState('overview');
  const [loading, setLoading]       = useState(false);
  const [monthlyData, setMonthlyData]   = useState([]);
  const [yearlyData, setYearlyData]     = useState([]);
  const [heatmapWeeks, setHeatmapWeeks] = useState([]);
  const [catHistory, setCatHistory]     = useState([]);

  const [stats, setStats] = useState({
    weekAvg: 0, monthAvg: 0, yearAvg: 0,
    curStreak: 0, bestStreak: 0,
    perfectDays: 0, excellentDays: 0,
    totalWeek: 0, totalMonth: 0,
    consistency: 0,
  });

  const col   = darkMode ? PAL.dark  : PAL.light;
  const grid  = darkMode ? '#1C2330' : '#E7E3DC';
  const axis  = darkMode ? '#374151' : '#A8A0930';
  const pArr  = darkMode ? PALETTE_ARR_DARK : PALETTE_ARR_LIGHT;
  const TT    = mkTT(darkMode);

  const tabs = [
    { id: 'overview',    label: 'Overview',     icon: Target    },
    { id: 'weekly',      label: 'Weekly',        icon: TrendingUp},
    { id: 'monthly',     label: 'Monthly',       icon: CalendarDays },
    { id: 'heatmap',     label: 'Heatmap',       icon: Activity  },
    { id: 'category',    label: 'Categories',    icon: Award     },
    { id: 'balance',     label: 'Balance',       icon: Shield    },
    { id: 'streaks',     label: 'Streaks',       icon: Flame     },
    { id: 'yearly',      label: 'Yearly',        icon: Star      },
    { id: 'team',        label: 'Team',          icon: Users     },
    { id: 'leaderboard', label: 'Leaderboard',   icon: Trophy    },
  ];

  // ── streak helper ──────────────────────────────────────────────────────────
  const calcStreaks = useCallback((data) => {
    const sorted = [...data].sort((a, b) => (a.fullDate > b.fullDate ? 1 : -1));
    let cur = 0, best = 0, tmp = 0;
    sorted.forEach((d, i) => {
      if (d.percentage >= 70) {
        tmp++;
        if (i === sorted.length - 1) cur = tmp;
      } else {
        best = Math.max(best, tmp);
        tmp = 0;
      }
    });
    return { cur, best: Math.max(best, tmp) };
  }, []);

  // ── stats from weeklyData prop ─────────────────────────────────────────────
  useEffect(() => {
    if (!weeklyData.length) return;
    const weekAvg  = Math.round(weeklyData.reduce((s, d) => s + d.percentage, 0) / weeklyData.length);
    const totalWeek = weeklyData.reduce((s, d) => s + d.completed, 0);
    const { cur, best } = calcStreaks(weeklyData);
    const perfectDays   = weeklyData.filter(d => d.percentage === 100).length;
    const activeDays    = weeklyData.filter(d => d.percentage > 0).length;
    const consistency   = Math.round((activeDays / weeklyData.length) * 100);
    setStats(s => ({ ...s, weekAvg, totalWeek, curStreak: cur, bestStreak: best, perfectDays, consistency }));
  }, [weeklyData, calcStreaks]);

  // ── monthly (single range query) ───────────────────────────────────────────
  const loadMonthly = useCallback(async () => {
    if (!user || monthlyData.length) return;
    setLoading(true);
    try {
      const today = new Date();
      const dates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });
      const { data: rows } = await supabase.from('tasks').select('*')
        .eq('user_id', user.id).gte('date', dates[0]).lte('date', dates[29]);

      const built = dates.map(ds => {
        const t = (rows || []).filter(r => r.date === ds);
        const main = t.filter(r => r.is_parent || r.task_type === 'simple');
        const done = main.filter(r => {
          if (r.task_type === 'simple') return r.completed;
          const s = t.filter(x => x.parent_id === r.task_id);
          return r.task_id === 'coding' ? s.some(x => x.completed) : s.every(x => x.completed);
        });
        const total = Math.max(main.length, taskTemplates.length);
        const pct   = total > 0 ? Math.round((done.length / total) * 100) : 0;
        const d     = new Date(ds + 'T00:00:00');
        return {
          date:      d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          fullDate:  ds,
          percentage: pct, completed: done.length, total,
          dayOfWeek: d.getDay(),
        };
      });

      setMonthlyData(built);
      const { cur, best } = calcStreaks(built);
      const monthAvg     = Math.round(built.reduce((s, d) => s + d.percentage, 0) / built.length);
      const totalMonth   = built.reduce((s, d) => s + d.completed, 0);
      const perfectDays  = built.filter(d => d.percentage === 100).length;
      const excellentDays= built.filter(d => d.percentage >= 80).length;
      setStats(s => ({ ...s, monthAvg, totalMonth, curStreak: cur, bestStreak: best, perfectDays, excellentDays }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, monthlyData.length, calcStreaks]);

  // ── yearly (12 months) ─────────────────────────────────────────────────────
  const loadYearly = useCallback(async () => {
    if (!user || yearlyData.length) return;
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0];
      const { data: rows } = await supabase.from('tasks').select('*')
        .eq('user_id', user.id).gte('date', start);

      const months = Array.from({ length: 12 }, (_, m) => {
        const d   = new Date(now.getFullYear(), now.getMonth() - (11 - m), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const t   = (rows || []).filter(r => r.date?.startsWith(key));
        const days = [...new Set(t.map(r => r.date))];
        const dayPcts = days.map(ds => {
          const dt   = t.filter(r => r.date === ds);
          const main = dt.filter(r => r.is_parent || r.task_type === 'simple');
          const done = main.filter(r => {
            if (r.task_type === 'simple') return r.completed;
            const s = dt.filter(x => x.parent_id === r.task_id);
            return r.task_id === 'coding' ? s.some(x => x.completed) : s.every(x => x.completed);
          });
          return main.length > 0 ? Math.round((done.length / Math.max(main.length, taskTemplates.length)) * 100) : 0;
        });
        const avg = dayPcts.length ? Math.round(dayPcts.reduce((a, b) => a + b, 0) / dayPcts.length) : 0;
        return { month: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), percentage: avg, activeDays: days.length };
      });

      setYearlyData(months);
      const yearAvg = Math.round(months.reduce((s, m) => s + m.percentage, 0) / months.length);
      setStats(s => ({ ...s, yearAvg }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, yearlyData.length]);

  // ── heatmap (16 weeks) ─────────────────────────────────────────────────────
  const loadHeatmap = useCallback(async () => {
    if (!user || heatmapWeeks.length) return;
    setLoading(true);
    try {
      const today = new Date();
      const dates = Array.from({ length: 112 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (111 - i));
        return d.toISOString().split('T')[0];
      });
      const { data: rows } = await supabase
        .from('tasks').select('date, completed, task_type, parent_id, task_id, is_parent')
        .eq('user_id', user.id).gte('date', dates[0]);

      const pctMap = {};
      dates.forEach(ds => {
        const t    = (rows || []).filter(r => r.date === ds);
        if (!t.length) { pctMap[ds] = null; return; }
        const main = t.filter(r => r.is_parent || r.task_type === 'simple');
        const done = main.filter(r => {
          if (r.task_type === 'simple') return r.completed;
          const s = t.filter(x => x.parent_id === r.task_id);
          return r.task_id === 'coding' ? s.some(x => x.completed) : s.every(x => x.completed);
        });
        pctMap[ds] = Math.max(main.length, taskTemplates.length) > 0
          ? Math.round((done.length / Math.max(main.length, taskTemplates.length)) * 100) : null;
      });

      // Build grid: columns = weeks, rows = Sun→Sat
      const weeks = [];
      let week = Array(7).fill(null);
      dates.forEach(ds => {
        const dow = new Date(ds + 'T00:00:00').getDay();
        week[dow] = { date: ds, value: pctMap[ds] };
        if (dow === 6) { weeks.push(week); week = Array(7).fill(null); }
      });
      if (week.some(x => x !== null)) weeks.push(week);
      setHeatmapWeeks(weeks);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, heatmapWeeks.length]);

  // ── category 7-day history ─────────────────────────────────────────────────
  const loadCatHistory = useCallback(async () => {
    if (!user || catHistory.length) return;
    try {
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });
      const { data: rows } = await supabase.from('tasks').select('*')
        .eq('user_id', user.id).gte('date', dates[0]);

      const built = dates.map(ds => {
        const t    = (rows || []).filter(r => r.date === ds);
        const point = { date: new Date(ds + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }) };
        taskTemplates.forEach(tmpl => {
          const rel  = t.filter(r => r.task_id === tmpl.id || r.parent_id === tmpl.id);
          const main = rel.find(r => r.task_id === tmpl.id);
          const key  = tmpl.name.split(' ')[0];
          if (tmpl.type === 'simple') {
            point[key] = main?.completed ? 100 : 0;
          } else {
            const subs = rel.filter(r => r.parent_id === tmpl.id);
            if (!subs.length) { point[key] = 0; return; }
            point[key] = tmpl.id === 'coding'
              ? (subs.some(s => s.completed) ? 100 : 0)
              : Math.round((subs.filter(s => s.completed).length / subs.length) * 100);
          }
        });
        return point;
      });
      setCatHistory(built);
    } catch (e) { console.error(e); }
  }, [user, catHistory.length]);

  useEffect(() => {
    if (['monthly', 'heatmap', 'streaks'].includes(tab)) loadMonthly();
    if (['yearly'].includes(tab)) loadYearly();
    if (tab === 'heatmap') loadHeatmap();
    if (tab === 'category') loadCatHistory();
  }, [tab]); // eslint-disable-line

  // ── derived ────────────────────────────────────────────────────────────────
  const curUser        = allUsersProgress.find(u => u.user.id === user?.id);
  const doneToday      = curUser?.completed || 0;
  const totalToday     = curUser?.total     || 0;
  const todayRate      = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
  const teamAvg        = Math.round(allUsersProgress.reduce((s, u) => s + u.percentage, 0) / Math.max(allUsersProgress.length, 1));
  const sortedTeam     = [...allUsersProgress].sort((a, b) => b.percentage - a.percentage);

  const categoryData = taskTemplates.map((tmpl, i) => {
    const rel  = curUser?.tasks?.filter(t => t.task_id === tmpl.id || t.parent_id === tmpl.id) || [];
    const main = rel.find(t => t.task_id === tmpl.id);
    let pct = 0;
    if (tmpl.type === 'simple') {
      pct = main?.completed ? 100 : 0;
    } else {
      const subs = rel.filter(t => t.parent_id === tmpl.id);
      if (subs.length) pct = tmpl.id === 'coding'
        ? (subs.some(s => s.completed) ? 100 : 0)
        : Math.round((subs.filter(s => s.completed).length / subs.length) * 100);
    }
    return { name: tmpl.name.split(' ')[0], fullName: tmpl.name, icon: tmpl.icon, pct, color: pArr[i % pArr.length] };
  });

  const radarData = taskTemplates.map(tmpl => {
    const c = categoryData.find(x => x.fullName === tmpl.name);
    return { subject: tmpl.name.split(' ')[0], value: c?.pct || 0, fullMark: 100 };
  });

  const dowData = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, idx) => {
    const m = monthlyData.filter(d => d.dayOfWeek === idx);
    return { day, avg: m.length ? Math.round(m.reduce((s, d) => s + d.percentage, 0) / m.length) : 0, count: m.length };
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn">

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-2.5 sm:p-3 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold tracking-wide transition-all duration-150 ${
                tab === id
                  ? darkMode ? 'bg-sky-500 text-white shadow-md' : 'bg-teal-700 text-white shadow-md'
                  : darkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-200' : 'text-stone-400 hover:bg-stone-100 hover:text-teal-800'
              }`}>
              <Icon className="h-3 w-3 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════ OVERVIEW ══════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <StatCard label="Today"         value={`${todayRate}%`}             sub={`${doneToday}/${totalToday}`}   icon={CheckCircle} color={col.emerald} darkMode={darkMode} />
            <StatCard label="Week Avg"       value={`${stats.weekAvg}%`}          sub="last 7 days"                    icon={TrendingUp}  color={col.sky}     darkMode={darkMode} />
            <StatCard label="Streak"         value={`${stats.curStreak}d`}         sub="≥70% days"                      icon={Flame}       color={col.amber}   darkMode={darkMode} />
            <StatCard label="Best Streak"    value={`${stats.bestStreak}d`}         sub="all time"                       icon={Star}        color={col.orange}  darkMode={darkMode} />
            <StatCard label="Perfect Days"   value={stats.perfectDays}               sub="100% this week"                 icon={Award}       color={col.lime}    darkMode={darkMode} />
            <StatCard label="Consistency"    value={`${stats.consistency}%`}          sub="active days"                   icon={Activity}    color={col.teal}    darkMode={darkMode} />
          </div>

          {/* Combo chart */}
          {weeklyData.length > 0 && (
            <Panel title="This Week — Tasks + Rate" icon={BarChart3} color={col.teal} darkMode={darkMode}>
              <div className="h-52 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                    <XAxis dataKey="date" stroke={axis} style={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                    <YAxis yAxisId="right" orientation="right" stroke={axis} style={{ fontSize: 11 }} />
                    <RTooltip content={<TT />} />
                    <Bar yAxisId="right" dataKey="completed" name="Tasks Done" fill={col.emerald} opacity={0.4} radius={[4,4,0,0]} />
                    <Line yAxisId="left" type="monotone" dataKey="percentage" name="Rate %" stroke={col.teal}
                      strokeWidth={2.5} dot={{ r: 4, fill: col.teal }} activeDot={{ r: 7 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {/* Team snapshot + Motivation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Team Snapshot Today" icon={Users} color={col.sky} darkMode={darkMode}>
              <div className="space-y-2">
                {sortedTeam.slice(0, 5).map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      darkMode ? 'bg-gray-800 text-gray-200' : 'bg-stone-100 text-stone-700'
                    }`}>{u.user.name[0]?.toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-0.5">
                        <span className={`text-xs font-semibold truncate ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                          {u.user.name}{u.user.id === user?.id && <span className={`ml-1 text-[10px] px-1 rounded ${darkMode ? 'bg-sky-900/40 text-sky-400' : 'bg-teal-100 text-teal-700'}`}>you</span>}
                        </span>
                        <span className="text-xs font-bold" style={{ color: u.percentage >= 80 ? col.emerald : u.percentage >= 50 ? col.amber : col.rose }}>{u.percentage}%</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-stone-100'}`}>
                        <div className="h-1.5 rounded-full progress-bar" style={{ width: `${u.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {!sortedTeam.length && <p className={`text-xs text-center py-4 ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>No team data yet</p>}
              </div>
            </Panel>

            <div className={`rounded-2xl border p-5 flex flex-col justify-center text-center ${
              darkMode ? 'bg-gray-900 border-gray-800' : 'bg-amber-50 border-amber-100'
            }`}>
              <p className={`text-2xl mb-2 ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                {todayRate === 100 ? '🏆' : todayRate >= 75 ? '🌟' : todayRate >= 50 ? '💪' : todayRate > 0 ? '🌱' : '🤲'}
              </p>
              <p className={`font-black text-base mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`} style={{ fontFamily: 'Georgia, serif' }}>
                {todayRate === 100 ? 'SubhanAllah — Perfect Day!' :
                 todayRate >= 75  ? 'Alhamdulillah — Excellent!' :
                 todayRate >= 50  ? 'MashaAllah — Keep going!' :
                 todayRate > 0    ? 'Good start — Allah rewards effort' :
                 'Bismillah — Begin with His blessing'}
              </p>
              <p className={`text-xs italic leading-relaxed ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                "The most beloved of deeds to Allah are the most consistent of them, even if small." — Bukhari 6464
              </p>
              <div className="flex justify-center gap-3 mt-4 flex-wrap">
                {[
                  { l: `🔥 ${stats.curStreak}d streak` },
                  { l: `🏆 Best: ${stats.bestStreak}d` },
                  { l: `✨ ${stats.perfectDays} perfect` },
                ].map(({ l }) => (
                  <span key={l} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-stone-600 shadow-sm border border-stone-100'}`}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ WEEKLY ════════════════════════════════ */}
      {tab === 'weekly' && weeklyData.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Avg" value={`${stats.weekAvg}%`} icon={TrendingUp} color={col.sky} darkMode={darkMode} />
            <StatCard label="Best Day" value={`${Math.max(...weeklyData.map(d => d.percentage))}%`} icon={Star} color={col.emerald} darkMode={darkMode} />
            <StatCard label="Tasks Done" value={stats.totalWeek} icon={CheckCircle} color={col.teal} darkMode={darkMode} />
            <StatCard label="Good Days" value={weeklyData.filter(d => d.percentage >= 70).length} sub="≥70%" icon={Award} color={col.amber} darkMode={darkMode} />
          </div>

          <Panel title="7-Day Completion Rate" icon={TrendingUp} color={col.sky} darkMode={darkMode}>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={col.sky} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={col.sky} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="date" stroke={axis} style={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                  <RTooltip content={<TT />} />
                  <Area type="monotone" dataKey="percentage" name="Rate %" stroke={col.sky} fill="url(#wkGrad)"
                    strokeWidth={2.5} dot={{ r: 5, fill: col.sky, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Tasks Completed Per Day" icon={BarChart3} color={col.emerald} darkMode={darkMode}>
            <div className="h-44 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="date" stroke={axis} style={{ fontSize: 11 }} />
                  <YAxis stroke={axis} style={{ fontSize: 11 }} />
                  <RTooltip content={<TT />} />
                  <Bar dataKey="completed" name="Done" radius={[6,6,0,0]}>
                    {weeklyData.map((d, i) => (
                      <Cell key={i} fill={d.percentage === 100 ? col.lime : d.percentage >= 70 ? col.emerald : col.sky} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Day-by-day table */}
          <Panel title="Day Detail" icon={CalendarDays} color={col.amber} darkMode={darkMode}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-stone-100'}`}>
                    {['Day', 'Rate', 'Done', 'Total', 'Status'].map(h => (
                      <th key={h} className={`pb-2 text-left font-semibold text-xs ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-gray-800">
                  {weeklyData.map((d, i) => (
                    <tr key={i} className={`py-1 ${darkMode ? 'divide-gray-800' : ''}`}>
                      <td className={`py-2 font-medium text-xs ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>{d.date}</td>
                      <td className="py-2 font-black text-sm" style={{ color: d.percentage >= 80 ? col.emerald : d.percentage >= 50 ? col.amber : col.rose }}>{d.percentage}%</td>
                      <td className={`py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{d.completed}</td>
                      <td className={`py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{d.total}</td>
                      <td className="py-2 text-sm">
                        {d.percentage === 100 ? '🏆' : d.percentage >= 70 ? '✅' : d.percentage >= 40 ? '🌱' : d.percentage > 0 ? '⚠️' : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ══════════════════════════════ MONTHLY ═══════════════════════════════ */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          {loading && !monthlyData.length ? <Spinner darkMode={darkMode} /> :
           !monthlyData.length ? (
            <div className="text-center py-16">
              <button onClick={loadMonthly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-teal-700 text-white hover:bg-teal-800'}`}>
                Load Monthly Data
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                <StatCard label="30-Day Avg"     value={`${stats.monthAvg}%`}    icon={TrendingUp}  color={col.sky}     darkMode={darkMode} />
                <StatCard label="Tasks Done"      value={stats.totalMonth}         icon={CheckCircle} color={col.emerald} darkMode={darkMode} />
                <StatCard label="Perfect Days"    value={stats.perfectDays}        icon={Star}        color={col.lime}    darkMode={darkMode} />
                <StatCard label="Best Streak"     value={`${stats.bestStreak}d`}   icon={Flame}       color={col.amber}   darkMode={darkMode} />
                <StatCard label="Excellent ≥80%"  value={stats.excellentDays}      icon={Award}       color={col.teal}    darkMode={darkMode} />
              </div>

              <Panel title="30-Day Trend" icon={TrendingUp} color={col.teal} darkMode={darkMode}>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="moGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={col.teal} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={col.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis dataKey="date" stroke={axis} style={{ fontSize: 10 }} interval={4} angle={-20} textAnchor="end" height={36} />
                      <YAxis domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <RTooltip content={<TT />} />
                      <Area type="monotone" dataKey="percentage" name="Rate %" stroke={col.teal} fill="url(#moGrad)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel title="Day-of-Week Pattern" icon={CalendarDays} color={col.amber} darkMode={darkMode}>
                  <div className="h-48 sm:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dowData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                        <XAxis dataKey="day" stroke={axis} style={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                        <RTooltip content={<TT />} />
                        <Bar dataKey="avg" name="Avg %" radius={[6,6,0,0]}>
                          {dowData.map((d, i) => (
                            <Cell key={i} fill={d.avg >= 80 ? col.lime : d.avg >= 50 ? col.amber : col.rose} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel title="Score Distribution" icon={BarChart3} color={col.sky} darkMode={darkMode}>
                  <div className="h-48 sm:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { range: '100%',   count: monthlyData.filter(d => d.percentage === 100).length,                                     fill: col.lime    },
                        { range: '80–99%', count: monthlyData.filter(d => d.percentage >= 80 && d.percentage < 100).length,                 fill: col.emerald },
                        { range: '60–79%', count: monthlyData.filter(d => d.percentage >= 60 && d.percentage < 80).length,                  fill: col.sky     },
                        { range: '40–59%', count: monthlyData.filter(d => d.percentage >= 40 && d.percentage < 60).length,                  fill: col.amber   },
                        { range: '<40%',   count: monthlyData.filter(d => d.percentage > 0  && d.percentage < 40).length,                   fill: col.rose    },
                        { range: 'None',   count: monthlyData.filter(d => d.percentage === 0).length,                                       fill: darkMode ? '#374151' : '#E7E3DC' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                        <XAxis dataKey="range" stroke={axis} style={{ fontSize: 10 }} />
                        <YAxis stroke={axis} style={{ fontSize: 11 }} />
                        <RTooltip content={<TT />} />
                        <Bar dataKey="count" name="Days" radius={[6,6,0,0]}>
                          {[col.lime, col.emerald, col.sky, col.amber, col.rose, darkMode ? '#374151' : '#E7E3DC'].map((c, i) => (
                            <Cell key={i} fill={c} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════ HEATMAP ═══════════════════════════════ */}
      {tab === 'heatmap' && (
        <div className="space-y-4">
          <Panel title="16-Week Activity Heatmap" icon={Activity} color={col.teal} darkMode={darkMode}
            action={
              <button onClick={() => { setHeatmapWeeks([]); setMonthlyData([]); setTimeout(() => { loadHeatmap(); loadMonthly(); }, 0); }}
                className={`p-1.5 rounded-lg ${darkMode ? 'text-gray-600 hover:text-gray-300' : 'text-stone-300 hover:text-stone-600'}`}>
                <RefreshCw className="h-4 w-4" />
              </button>
            }>
            {loading && !heatmapWeeks.length ? <Spinner darkMode={darkMode} /> : (
              <>
                <div className="flex gap-1 mb-2">
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className={`text-[10px] w-[14px] sm:w-[18px] text-center ${darkMode ? 'text-gray-700' : 'text-stone-300'}`}>{d}</div>
                  ))}
                </div>
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
                    {heatmapWeeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((cell, di) => cell
                          ? <HeatCell key={di} value={cell.value} date={cell.date} darkMode={darkMode} />
                          : <div key={di} className="h-[14px] w-[14px] sm:h-[18px] sm:w-[18px]" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-1.5 mt-4">
                  <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>Less</span>
                  {[0, 25, 50, 75, 100].map(v => (
                    <div key={v} className="h-[14px] w-[14px] rounded-[3px]"
                      style={{ background: `rgba(15,118,110,${0.12 + (v / 100) * 0.88})` }} />
                  ))}
                  <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>More</span>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}

      {/* ══════════════════════════════ CATEGORIES ════════════════════════════ */}
      {tab === 'category' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Today by Task" icon={Award} color={col.amber} darkMode={darkMode}>
              <div className="h-52 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData.filter(c => c.pct > 0)} cx="50%" cy="50%"
                      outerRadius={85} innerRadius={42} dataKey="pct" paddingAngle={2}>
                      {categoryData.filter(c => c.pct > 0).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RTooltip content={<TT />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Task Breakdown" icon={BarChart3} color={col.teal} darkMode={darkMode}>
              <div className="space-y-2.5">
                {categoryData.map((cat, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-medium flex items-center gap-1.5 truncate ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                        <span className="text-base">{cat.icon}</span>{cat.fullName}
                      </span>
                      <span className="text-xs font-black ml-2 flex-shrink-0" style={{ color: cat.color }}>{cat.pct}%</span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 ${darkMode ? 'bg-gray-800' : 'bg-stone-100'}`}>
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${cat.pct}%`, background: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {catHistory.length > 0 && (
            <Panel title="7-Day Task History" icon={TrendingUp} color={col.sky} darkMode={darkMode}>
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={catHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                    <XAxis dataKey="date" stroke={axis} style={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                    <RTooltip content={<TT />} />
                    {taskTemplates.map((tmpl, i) => (
                      <Line key={tmpl.id} type="monotone" dataKey={tmpl.name.split(' ')[0]}
                        stroke={pArr[i % pArr.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 mt-3">
                {taskTemplates.map((tmpl, i) => (
                  <span key={tmpl.id} className="flex items-center gap-1 text-[10px]">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: pArr[i % pArr.length] }} />
                    <span className={darkMode ? 'text-gray-500' : 'text-stone-400'}>{tmpl.icon} {tmpl.name.split(' ')[0]}</span>
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* ══════════════════════════════ BALANCE ═══════════════════════════════ */}
      {tab === 'balance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Life Balance Radar" icon={Shield} color={col.teal} darkMode={darkMode}>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke={grid} />
                    <PolarAngleAxis dataKey="subject" stroke={axis} style={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={axis} style={{ fontSize: 9 }} />
                    <Radar name="Today" dataKey="value" stroke={col.teal} fill={col.teal} fillOpacity={0.35} />
                    <RTooltip content={<TT />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Life Area Scores" icon={Heart} color={col.rose} darkMode={darkMode}>
              {[
                { label: 'Spiritual',    icon: '🕌', keys: ['salah','islam'],                                                       },
                { label: 'Physical',     icon: '💪', keys: ['fitness'],                                                              },
                { label: 'Academic/IT',  icon: '🎓', keys: ['coding'],                                                               },
                { label: 'Character',    icon: '🚫', keys: ['addictions'],                                                           },
                { label: 'Professional', icon: '💼', keys: ['digital_marketing','freelance_work','startup_work','corporate_tasks'],  },
              ].map(({ label, icon, keys }) => {
                const relevant = categoryData.filter(c =>
                  keys.some(k => taskTemplates.find(t => t.id === k)?.name === c.fullName)
                );
                const avg = relevant.length ? Math.round(relevant.reduce((s, c) => s + c.pct, 0) / relevant.length) : 0;
                const barColor = avg >= 70 ? col.emerald : avg >= 40 ? col.amber : col.rose;
                return (
                  <div key={label} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                        <span>{icon}</span>{label}
                      </span>
                      <span className="text-sm font-black" style={{ color: barColor }}>{avg}%</span>
                    </div>
                    <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-800' : 'bg-stone-100'}`}>
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${avg}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </Panel>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ STREAKS ═══════════════════════════════ */}
      {tab === 'streaks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Current Streak" value={`${stats.curStreak}d`}   sub="≥70% to count"     icon={Flame}   color={col.amber}  darkMode={darkMode} />
            <StatCard label="Best Streak"     value={`${stats.bestStreak}d`} sub="all time"           icon={Star}    color={col.orange} darkMode={darkMode} />
            <StatCard label="Perfect Days"    value={stats.perfectDays}       sub="100%"              icon={Award}   color={col.lime}   darkMode={darkMode} />
            <StatCard label="Consistency"     value={`${stats.consistency}%`} sub="days with tasks"   icon={Activity}color={col.teal}   darkMode={darkMode} />
          </div>

          {loading && !monthlyData.length ? <Spinner darkMode={darkMode} /> :
           !monthlyData.length ? (
            <div className="text-center py-12">
              <button onClick={loadMonthly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white' : 'bg-teal-700 text-white'}`}>Load Streak Data</button>
            </div>
          ) : (
            <>
              <Panel title="30-Day Daily Score" icon={Flame} color={col.amber} darkMode={darkMode}>
                <div className="h-52 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis dataKey="date" stroke={axis} style={{ fontSize: 9 }} interval={4} angle={-20} textAnchor="end" height={36} />
                      <YAxis domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <RTooltip content={<TT />} />
                      <Bar dataKey="percentage" name="Score %" radius={[3,3,0,0]}>
                        {monthlyData.map((d, i) => (
                          <Cell key={i} fill={d.percentage === 100 ? col.lime : d.percentage >= 70 ? col.emerald : d.percentage >= 40 ? col.amber : col.rose} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[{l:'Perfect 100%',c:col.lime},{l:'Good ≥70%',c:col.emerald},{l:'Fair ≥40%',c:col.amber},{l:'Low <40%',c:col.rose}].map(({l,c})=>(
                    <div key={l} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{background:c}} />
                      <span className={darkMode?'text-gray-500':'text-stone-400'}>{l}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Streak timeline — mark streak days */}
              <Panel title="Streak Days Timeline" icon={Zap} color={col.sky} darkMode={darkMode}>
                <div className="flex flex-wrap gap-1.5">
                  {monthlyData.map((d, i) => (
                    <div key={i} title={`${d.date}: ${d.percentage}%`}
                      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-black transition-transform hover:scale-110 cursor-default ${
                        d.percentage === 100 ? 'text-white shadow-md' :
                        d.percentage >= 70  ? 'text-white' :
                        d.percentage > 0    ? (darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-100 text-stone-400') :
                        (darkMode ? 'bg-gray-900 text-gray-700' : 'bg-stone-50 text-stone-200')
                      }`}
                      style={{ background: d.percentage >= 70 ? (d.percentage === 100 ? col.lime : col.emerald) : undefined }}
                    >
                      {new Date(d.fullDate + 'T00:00:00').getDate()}
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════ YEARLY ════════════════════════════════ */}
      {tab === 'yearly' && (
        <div className="space-y-4">
          {loading && !yearlyData.length ? <Spinner darkMode={darkMode} /> :
           !yearlyData.length ? (
            <div className="text-center py-16">
              <button onClick={loadYearly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white' : 'bg-teal-700 text-white'}`}>Load Year Data</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <StatCard label="Year Avg"     value={`${stats.yearAvg}%`}                                                       icon={TrendingUp} color={col.sky}     darkMode={darkMode} />
                <StatCard label="Best Month"   value={`${Math.max(...yearlyData.map(d => d.percentage))}%`}                      icon={Star}       color={col.lime}    darkMode={darkMode} />
                <StatCard label="Active Days"  value={yearlyData.reduce((s,d) => s + d.activeDays, 0)}                           icon={Activity}   color={col.teal}    darkMode={darkMode} />
                <StatCard label="Strong Months" value={yearlyData.filter(d => d.percentage >= 70).length}                       icon={Award}      color={col.amber}   darkMode={darkMode} />
              </div>

              <Panel title="12-Month Performance" icon={CalendarDays} color={col.sky} darkMode={darkMode}>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis dataKey="month" stroke={axis} style={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <YAxis yAxisId="right" orientation="right" stroke={axis} style={{ fontSize: 11 }} />
                      <RTooltip content={<TT />} />
                      <Bar yAxisId="right" dataKey="activeDays" name="Active Days" fill={col.sky} opacity={0.35} radius={[4,4,0,0]} />
                      <Line yAxisId="left" type="monotone" dataKey="percentage" name="Avg %" stroke={col.teal}
                        strokeWidth={2.5} dot={{ r: 4, fill: col.teal }} activeDot={{ r: 7 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* Month tiles */}
              <Panel title="Month-by-Month Tiles" icon={Award} color={col.amber} darkMode={darkMode}>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {yearlyData.map((m, i) => (
                    <div key={i} className={`rounded-xl p-3 text-center border ${
                      darkMode ? 'border-gray-800' : 'border-stone-100'
                    }`} style={{ background: m.percentage >= 70 ? col.teal + '22' : darkMode ? '#161B22' : '#FAF8F5' }}>
                      <div className="text-base font-black" style={{ color: m.percentage >= 80 ? col.emerald : m.percentage >= 50 ? col.amber : col.rose, fontFamily: 'Georgia, serif' }}>{m.percentage}%</div>
                      <div className={`text-[10px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>{m.month}</div>
                      <div className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-stone-300'}`}>{m.activeDays}d</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════ TEAM ══════════════════════════════════ */}
      {tab === 'team' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <StatCard label="Team Avg"        value={`${teamAvg}%`}                                          icon={Users}       color={col.sky}     darkMode={darkMode} />
            <StatCard label="Members"          value={allUsersProgress.length}                                 icon={Activity}    color={col.teal}    darkMode={darkMode} />
            <StatCard label="Top Performers"   value={allUsersProgress.filter(u => u.percentage >= 80).length} sub="≥80%" icon={Award} color={col.lime} darkMode={darkMode} />
          </div>

          <Panel title="Team Completion — Horizontal Bar" icon={Users} color={col.sky} darkMode={darkMode}>
            <div style={{ height: Math.max(200, allUsersProgress.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allUsersProgress} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis type="number" domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="user.name" stroke={axis} style={{ fontSize: 11 }} width={90} />
                  <RTooltip content={<TT />} />
                  <Bar dataKey="percentage" name="Completion %" radius={[0,6,6,0]}>
                    {allUsersProgress.map((u, i) => (
                      <Cell key={i} fill={u.percentage >= 80 ? col.emerald : u.percentage >= 50 ? col.sky : col.amber} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Per-Member Task Detail" icon={CheckCircle} color={col.emerald} darkMode={darkMode}>
            <div className="space-y-3">
              {allUsersProgress.map((u, i) => (
                <div key={i} className={`p-4 rounded-xl border ${
                  u.user.id === user?.id
                    ? darkMode ? 'border-sky-700/40 bg-sky-900/10' : 'border-teal-300 bg-teal-50'
                    : darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-stone-200 bg-stone-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-black ${darkMode?'bg-gray-700 text-gray-200':'bg-stone-200 text-stone-700'}`}>{u.user.name[0]?.toUpperCase()}</div>
                      <span className={`font-bold text-sm ${darkMode?'text-white':'text-stone-900'}`}>
                        {u.user.name}
                        {u.user.id === user?.id && <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded ${darkMode?'bg-sky-900/40 text-sky-400':'bg-teal-100 text-teal-800'}`}>you</span>}
                      </span>
                    </div>
                    <span className="font-black text-sm" style={{ color: u.percentage>=80?col.emerald:u.percentage>=50?col.amber:col.rose }}>{u.percentage}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full ${darkMode?'bg-gray-800':'bg-stone-200'}`}>
                    <div className="h-1.5 rounded-full progress-bar" style={{ width: `${u.percentage}%` }} />
                  </div>
                  <div className={`text-[10px] mt-1 ${darkMode?'text-gray-600':'text-stone-400'}`}>{u.completed}/{u.total} tasks completed</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* ══════════════════════════════ LEADERBOARD ═══════════════════════════ */}
      {tab === 'leaderboard' && (
        <div className="space-y-4">
          <Panel title="Today's Leaderboard" icon={Trophy} color={col.amber} darkMode={darkMode}>
            <div className="space-y-2">
              {sortedTeam.map((u, i) => {
                const medals = ['🥇','🥈','🥉'];
                const isMe = u.user.id === user?.id;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                    isMe
                      ? darkMode ? 'border-sky-700/40 bg-sky-900/10' : 'border-teal-300 bg-teal-50'
                      : darkMode ? 'border-gray-800' : 'border-stone-200'
                  }`}>
                    <div className="text-xl w-8 text-center flex-shrink-0 font-black">
                      {i < 3 ? medals[i] : <span className={`text-xs ${darkMode?'text-gray-600':'text-stone-300'}`}>#{i+1}</span>}
                    </div>
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${darkMode?'bg-gray-700 text-gray-200':'bg-stone-200 text-stone-700'}`}>
                      {u.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate mb-0.5 ${darkMode?'text-white':'text-stone-900'}`}>
                        {u.user.name}
                        {isMe && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${darkMode?'bg-sky-900/40 text-sky-400':'bg-teal-100 text-teal-800'}`}>you</span>}
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${darkMode?'bg-gray-800':'bg-stone-200'}`}>
                        <div className="h-1.5 rounded-full progress-bar" style={{ width: `${u.percentage}%` }} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-black" style={{ color: u.percentage>=80?col.emerald:u.percentage>=50?col.amber:col.rose }}>{u.percentage}%</div>
                      <div className={`text-[10px] ${darkMode?'text-gray-600':'text-stone-400'}`}>{u.completed}/{u.total}</div>
                    </div>
                  </div>
                );
              })}
              {!sortedTeam.length && <p className={`text-center py-8 text-sm ${darkMode?'text-gray-600':'text-stone-400'}`}>No data yet today</p>}
            </div>
          </Panel>

          {/* Team pie breakdown */}
          {allUsersProgress.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Panel title="Performance Tiers" icon={BarChart3} color={col.sky} darkMode={darkMode}>
                <div className="h-44 sm:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Excellent ≥80%', value: allUsersProgress.filter(u=>u.percentage>=80).length },
                        { name: 'Good 50–79%',    value: allUsersProgress.filter(u=>u.percentage>=50&&u.percentage<80).length },
                        { name: 'Low <50%',       value: allUsersProgress.filter(u=>u.percentage<50).length },
                      ]} cx="50%" cy="50%" outerRadius={70} innerRadius={30} dataKey="value" paddingAngle={3}>
                        <Cell fill={col.emerald} />
                        <Cell fill={col.amber} />
                        <Cell fill={col.rose} />
                      </Pie>
                      <RTooltip content={<TT />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Distribution" icon={Users} color={col.teal} darkMode={darkMode}>
                <div className="space-y-3 mt-2">
                  {[
                    { label: 'Excellent (≥80%)', count: allUsersProgress.filter(u=>u.percentage>=80).length,                        c: col.emerald },
                    { label: 'Good (50–79%)',     count: allUsersProgress.filter(u=>u.percentage>=50&&u.percentage<80).length,       c: col.amber   },
                    { label: 'Low (<50%)',        count: allUsersProgress.filter(u=>u.percentage<50).length,                         c: col.rose    },
                  ].map(({ label, count, c }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: c }} />
                      <span className={`text-sm flex-1 ${darkMode?'text-gray-300':'text-stone-700'}`}>{label}</span>
                      <span className="font-black text-sm" style={{ color: c }}>{count}</span>
                    </div>
                  ))}
                  <div className={`border-t pt-2 mt-2 ${darkMode?'border-gray-800':'border-stone-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-sky-400 flex-shrink-0" />
                      <span className={`text-sm flex-1 ${darkMode?'text-gray-300':'text-stone-700'}`}>Team Average</span>
                      <span className="font-black text-sm" style={{ color: col.sky }}>{teamAvg}%</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default EnhancedReports;