// src/components/CustomTasksReports.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import {
  TrendingUp, Target, CalendarDays, Activity, CheckCircle,
  Flame, Star, Award, BarChart3, Zap, Clock
} from 'lucide-react';
import { supabase } from '../supabase';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PAL = {
  light: { teal:'#0F766E', sky:'#0EA5E9', emerald:'#059669', amber:'#D97706', rose:'#E11D48', lime:'#65A30D', cyan:'#0891B2' },
  dark:  { teal:'#2DD4BF', sky:'#38BDF8', emerald:'#34D399', amber:'#FCD34D', rose:'#FB7185', lime:'#A3E635', cyan:'#22D3EE' },
};

const TT = (dm) => ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-xl border text-sm shadow-2xl ${dm ? 'bg-gray-900/95 border-gray-700 text-gray-100' : 'bg-white/95 border-stone-200 text-stone-900'}`}>
      <p className="font-bold text-xs opacity-50 mb-1 uppercase">{label}</p>
      {payload.map((e, i) => <p key={i} style={{ color: e.color }} className="font-semibold">{e.name}: {e.value}</p>)}
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
const CustomTasksReports = ({ user, darkMode }) => {
  const [tab, setTab]               = useState('overview');
  const [loading, setLoading]       = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [stats, setStats] = useState({
    todayRate: 0, todayDone: 0, todayTotal: 0,
    weekAvg: 0, totalWeek: 0, curStreak: 0, bestStreak: 0, perfectDays: 0,
    monthAvg: 0, totalMonth: 0, excellentDays: 0,
  });

  const col  = darkMode ? PAL.dark  : PAL.light;
  const grid = darkMode ? '#1C2330' : '#E7E3DC';
  const axis = darkMode ? '#374151' : '#C0B8AE';
  const Tooltip = TT(darkMode);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target      },
    { id: 'weekly',   label: 'Weekly',   icon: TrendingUp  },
    { id: 'monthly',  label: 'Monthly',  icon: CalendarDays},
    { id: 'streaks',  label: 'Streaks',  icon: Flame       },
  ];

  const calcStreaks = (data) => {
    let cur = 0, best = 0, tmp = 0;
    data.forEach((d, i) => {
      if (d.percentage >= 70) { tmp++; if (i === data.length - 1) cur = tmp; }
      else { best = Math.max(best, tmp); tmp = 0; }
    });
    return { cur, best: Math.max(best, tmp) };
  };

  // ── single range query for weekly data ────────────────────────────────────
  const loadWeekly = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });
      const { data: rows } = await supabase.from('custom_tasks').select('*')
        .eq('user_id', user.id).gte('date', dates[0]).lte('date', dates[6]);

      const built = dates.map(ds => {
        const t   = (rows || []).filter(r => r.date === ds);
        const done = t.filter(r => r.completed).length;
        const pct  = t.length > 0 ? Math.round((done / t.length) * 100) : 0;
        return {
          date: new Date(ds + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
          fullDate: ds, percentage: pct, completed: done, total: t.length,
        };
      });

      setWeeklyData(built);
      const today_ = built[built.length - 1];
      const weekAvg  = Math.round(built.reduce((s, d) => s + d.percentage, 0) / built.length);
      const totalWeek = built.reduce((s, d) => s + d.completed, 0);
      const { cur, best } = calcStreaks(built);
      const perfectDays   = built.filter(d => d.percentage === 100).length;
      setStats(s => ({ ...s, todayRate: today_.percentage, todayDone: today_.completed, todayTotal: today_.total, weekAvg, totalWeek, curStreak: cur, bestStreak: best, perfectDays }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  // ── single range query for monthly data ───────────────────────────────────
  const loadMonthly = useCallback(async () => {
    if (!user || monthlyData.length) return;
    setLoading(true);
    try {
      const today = new Date();
      const dates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });
      const { data: rows } = await supabase.from('custom_tasks').select('*')
        .eq('user_id', user.id).gte('date', dates[0]).lte('date', dates[29]);

      const built = dates.map(ds => {
        const t    = (rows || []).filter(r => r.date === ds);
        const done = t.filter(r => r.completed).length;
        const pct  = t.length > 0 ? Math.round((done / t.length) * 100) : 0;
        const d    = new Date(ds + 'T00:00:00');
        return { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), fullDate: ds, percentage: pct, completed: done, total: t.length, dayOfWeek: d.getDay() };
      });

      setMonthlyData(built);
      const monthAvg      = Math.round(built.reduce((s, d) => s + d.percentage, 0) / built.length);
      const totalMonth    = built.reduce((s, d) => s + d.completed, 0);
      const excellentDays = built.filter(d => d.percentage >= 80).length;
      const { cur, best } = calcStreaks(built);
      setStats(s => ({ ...s, monthAvg, totalMonth, excellentDays, curStreak: cur, bestStreak: best }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, monthlyData.length]);

  useEffect(() => { loadWeekly(); }, [loadWeekly]);
  useEffect(() => { if (['monthly','streaks'].includes(tab)) loadMonthly(); }, [tab, loadMonthly]);

  const dowData = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, idx) => {
    const m = monthlyData.filter(d => d.dayOfWeek === idx);
    return { day, avg: m.length ? Math.round(m.reduce((s, d) => s + d.percentage, 0) / m.length) : 0 };
  });

  const pieData = [
    { name: 'Done',      value: stats.todayDone,                                   fill: col.emerald },
    { name: 'Remaining', value: Math.max(0, stats.todayTotal - stats.todayDone),   fill: darkMode ? '#1C2330' : '#E7E3DC' },
  ];

  if (loading && !weeklyData.length) {
    return <div className="flex items-center justify-center py-20"><div className="loading-spinner h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn">

      {/* ── Header + tabs ──────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-3 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200'}`}>
        <h2 className={`font-black text-base mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}
          style={{ fontFamily: 'Georgia, serif' }}>
          <Activity className="h-5 w-5" style={{ color: col.teal }} />
          Custom Tasks Analytics
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

      {/* ══ OVERVIEW ════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Today"        value={`${stats.todayRate}%`}    sub={`${stats.todayDone}/${stats.todayTotal}`} icon={CheckCircle} color={col.emerald} darkMode={darkMode} />
            <StatCard label="Week Avg"      value={`${stats.weekAvg}%`}      sub="last 7 days"   icon={TrendingUp} color={col.sky}     darkMode={darkMode} />
            <StatCard label="Streak"        value={`${stats.curStreak}d`}    sub="≥70% to count" icon={Flame}      color={col.amber}   darkMode={darkMode} />
            <StatCard label="Perfect Days"  value={stats.perfectDays}        sub="100%"          icon={Star}       color={col.lime}    darkMode={darkMode} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Panel title="Today's Progress" icon={Target} color={col.teal} darkMode={darkMode}>
              {stats.todayTotal > 0 ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <RTooltip content={<Tooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center">
                  <p className={`text-sm ${darkMode ? 'text-gray-600' : 'text-stone-300'}`}>No custom tasks today yet</p>
                </div>
              )}
              <div className="text-center mt-1">
                <span className="text-3xl font-black" style={{ fontFamily: 'Georgia, serif', color: col.teal }}>{stats.todayRate}%</span>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>{stats.todayDone} of {stats.todayTotal} done</p>
              </div>
            </Panel>

            <Panel title="7-Day Trend" icon={TrendingUp} color={col.sky} darkMode={darkMode}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="ctOvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={col.sky} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={col.sky} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                    <XAxis dataKey="date" stroke={axis} style={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                    <RTooltip content={<Tooltip />} />
                    <Area type="monotone" dataKey="percentage" name="Rate %" stroke={col.sky} fill="url(#ctOvGrad)" strokeWidth={2.5}
                      dot={{ r: 4, fill: col.sky, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ══ WEEKLY ══════════════════════════════════════════════════════════════ */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Avg"        value={`${stats.weekAvg}%`}                                        icon={TrendingUp}  color={col.sky}     darkMode={darkMode} />
            <StatCard label="Best Day"   value={weeklyData.length ? `${Math.max(...weeklyData.map(d=>d.percentage))}%` : '–'} icon={Star} color={col.emerald} darkMode={darkMode} />
            <StatCard label="Done"       value={stats.totalWeek}                                             icon={CheckCircle} color={col.teal}    darkMode={darkMode} />
            <StatCard label="Good Days"  value={weeklyData.filter(d=>d.percentage>=70).length} sub="≥70%"  icon={Award}       color={col.amber}   darkMode={darkMode} />
          </div>

          <Panel title="Rate + Tasks Combo" icon={BarChart3} color={col.teal} darkMode={darkMode}>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="date" stroke={axis} style={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0,100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                  <YAxis yAxisId="right" orientation="right" stroke={axis} style={{ fontSize: 11 }} />
                  <RTooltip content={<Tooltip />} />
                  <Bar yAxisId="right" dataKey="completed" name="Tasks Done" fill={col.emerald} opacity={0.4} radius={[4,4,0,0]} />
                  <Line yAxisId="left" type="monotone" dataKey="percentage" name="Rate %" stroke={col.teal} strokeWidth={2.5} dot={{ r: 4, fill: col.teal }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Day table */}
          <Panel title="Day Breakdown" icon={Clock} color={col.amber} darkMode={darkMode}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-stone-100'}`}>
                    {['Day','Rate','Done','Total','Status'].map(h => (
                      <th key={h} className={`pb-2 text-left text-xs font-semibold ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((d, i) => (
                    <tr key={i} className={`border-b ${darkMode ? 'border-gray-800/50' : 'border-stone-50'}`}>
                      <td className={`py-2 font-medium text-xs ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>{d.date}</td>
                      <td className="py-2 font-black text-sm" style={{ color: d.percentage>=80?col.emerald:d.percentage>=50?col.amber:col.rose }}>{d.percentage}%</td>
                      <td className={`py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{d.completed}</td>
                      <td className={`py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{d.total}</td>
                      <td className="py-2 text-sm">{d.total === 0 ? '–' : d.percentage === 100 ? '🏆' : d.percentage >= 70 ? '✅' : d.percentage >= 40 ? '🌱' : '⚠️'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ══ MONTHLY ═════════════════════════════════════════════════════════════ */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          {loading && !monthlyData.length ? (
            <div className="flex items-center justify-center py-16"><div className="loading-spinner h-8 w-8" /></div>
          ) : !monthlyData.length ? (
            <div className="text-center py-16">
              <button onClick={loadMonthly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white' : 'bg-teal-700 text-white'}`}>Load Monthly Data</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <StatCard label="30-Day Avg"     value={`${stats.monthAvg}%`}    icon={TrendingUp}  color={col.sky}     darkMode={darkMode} />
                <StatCard label="Total Done"      value={stats.totalMonth}         icon={CheckCircle} color={col.emerald} darkMode={darkMode} />
                <StatCard label="Excellent Days"  value={stats.excellentDays} sub="≥80%" icon={Award} color={col.teal} darkMode={darkMode} />
              </div>

              <Panel title="30-Day Trend" icon={TrendingUp} color={col.teal} darkMode={darkMode}>
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="moCtGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={col.teal} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={col.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis dataKey="date" stroke={axis} style={{ fontSize: 10 }} interval={4} angle={-20} textAnchor="end" height={36} />
                      <YAxis domain={[0,100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <RTooltip content={<Tooltip />} />
                      <Area type="monotone" dataKey="percentage" name="Rate %" stroke={col.teal} fill="url(#moCtGrad)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel title="Day-of-Week Pattern" icon={CalendarDays} color={col.amber} darkMode={darkMode}>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dowData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                        <XAxis dataKey="day" stroke={axis} style={{ fontSize: 11 }} />
                        <YAxis domain={[0,100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                        <RTooltip content={<Tooltip />} />
                        <Bar dataKey="avg" name="Avg %" radius={[6,6,0,0]}>
                          {dowData.map((d, i) => <Cell key={i} fill={d.avg>=80?col.lime:d.avg>=50?col.amber:col.rose} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel title="Score Distribution" icon={BarChart3} color={col.sky} darkMode={darkMode}>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { r:'100%',  v: monthlyData.filter(d=>d.percentage===100).length,                           c: col.lime    },
                        { r:'80–99', v: monthlyData.filter(d=>d.percentage>=80&&d.percentage<100).length,            c: col.emerald },
                        { r:'50–79', v: monthlyData.filter(d=>d.percentage>=50&&d.percentage<80).length,             c: col.sky     },
                        { r:'<50%',  v: monthlyData.filter(d=>d.percentage>0&&d.percentage<50).length,               c: col.amber   },
                        { r:'None',  v: monthlyData.filter(d=>d.percentage===0).length,                              c: darkMode?'#374151':'#E7E3DC' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                        <XAxis dataKey="r" stroke={axis} style={{ fontSize: 10 }} />
                        <YAxis stroke={axis} style={{ fontSize: 11 }} />
                        <RTooltip content={<Tooltip />} />
                        <Bar dataKey="v" name="Days" radius={[6,6,0,0]}>
                          {[col.lime,col.emerald,col.sky,col.amber,darkMode?'#374151':'#E7E3DC'].map((c,i)=><Cell key={i} fill={c}/>)}
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

      {/* ══ STREAKS ═════════════════════════════════════════════════════════════ */}
      {tab === 'streaks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Current Streak" value={`${stats.curStreak}d`}   sub="≥70%"     icon={Flame}    color={col.amber}  darkMode={darkMode} />
            <StatCard label="Best Streak"     value={`${stats.bestStreak}d`} sub="all time"  icon={Star}     color={col.orange||col.amber}  darkMode={darkMode} />
            <StatCard label="Perfect Days"    value={stats.perfectDays}       sub="100%"     icon={Award}    color={col.lime}   darkMode={darkMode} />
            <StatCard label="Excellent"        value={stats.excellentDays}    sub="≥80%"     icon={Zap}      color={col.teal}   darkMode={darkMode} />
          </div>

          {loading && !monthlyData.length ? (
            <div className="flex items-center justify-center py-16"><div className="loading-spinner h-8 w-8" /></div>
          ) : !monthlyData.length ? (
            <div className="text-center py-12">
              <button onClick={loadMonthly} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'bg-sky-600 text-white' : 'bg-teal-700 text-white'}`}>Load Data</button>
            </div>
          ) : (
            <>
              <Panel title="30-Day Score Bar" icon={Flame} color={col.amber} darkMode={darkMode}>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                      <XAxis dataKey="date" stroke={axis} style={{ fontSize: 9 }} interval={4} angle={-20} textAnchor="end" height={36} />
                      <YAxis domain={[0,100]} stroke={axis} style={{ fontSize: 11 }} unit="%" />
                      <RTooltip content={<Tooltip />} />
                      <Bar dataKey="percentage" name="Score" radius={[3,3,0,0]}>
                        {monthlyData.map((d, i) => <Cell key={i} fill={d.percentage===100?col.lime:d.percentage>=70?col.emerald:d.percentage>=40?col.amber:col.rose} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {/* Calendar-style streak tiles */}
              <Panel title="Monthly Streak Calendar" icon={CalendarDays} color={col.sky} darkMode={darkMode}>
                <div className="flex flex-wrap gap-1.5">
                  {monthlyData.map((d, i) => (
                    <div key={i} title={`${d.date}: ${d.percentage}%`}
                      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-black transition-transform hover:scale-110 cursor-default`}
                      style={{
                        background: d.percentage >= 70 ? (d.percentage === 100 ? col.lime : col.emerald) : d.percentage > 0 ? (darkMode ? '#1C2330' : '#F0EDE8') : (darkMode ? '#0D1117' : '#FAFAF9'),
                        color: d.percentage >= 70 ? '#fff' : d.percentage > 0 ? (darkMode ? '#4B5563' : '#C0B8AE') : (darkMode ? '#1C2330' : '#E7E3DC'),
                      }}>
                      {new Date(d.fullDate + 'T00:00:00').getDate()}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-3">
                  {[{l:'Perfect',c:col.lime},{l:'Good ≥70%',c:col.emerald}].map(({l,c})=>(
                    <div key={l} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{background:c}} />
                      <span className={darkMode?'text-gray-500':'text-stone-400'}>{l}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default CustomTasksReports;
