// src/components/CustomTasksReports.js
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Target, Calendar, Award, Flame, CalendarDays, Activity
} from 'lucide-react';
import { supabase } from '../supabase';

const COLORS = ['#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'];

const CustomTasksReports = ({ user, darkMode }) => {
  const [selectedView, setSelectedView] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [stats, setStats] = useState({
    todayCompleted: 0,
    todayTotal: 0,
    todayRate: 0,
    weekAverage: 0,
    monthAverage: 0,
    totalThisWeek: 0,
    totalThisMonth: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectDays: 0
  });

  const views = [
    { id: 'weekly', name: 'Weekly', icon: TrendingUp },
    { id: 'monthly', name: 'Monthly', icon: CalendarDays },
    { id: 'overview', name: 'Overview', icon: Target }
  ];

  useEffect(() => {
    if (user) {
      loadWeeklyData();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedView === 'monthly' && monthlyData.length === 0) {
      loadMonthlyData();
    }
  }, [user, selectedView]);

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      const data = [];
      let totalCompleted = 0;
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: tasks } = await supabase
          .from('custom_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr);
        
        const completed = (tasks || []).filter(t => t.completed).length;
        const total = (tasks || []).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        totalCompleted += completed;
        
        data.push({
          date: date.toLocaleDateString('en', { weekday: 'short' }),
          fullDate: dateStr,
          percentage,
          completed,
          total
        });
      }
      
      setWeeklyData(data);
      
      // Calculate stats
      const weekAvg = Math.round(
        data.reduce((sum, d) => sum + d.percentage, 0) / data.length
      );
      
      const today = data[data.length - 1];
      
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].percentage >= 70) {
          tempStreak++;
          if (i === data.length - 1) currentStreak = tempStreak;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 0;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      
      const perfectDays = data.filter(d => d.percentage === 100).length;
      
      setStats(prev => ({
        ...prev,
        todayCompleted: today.completed,
        todayTotal: today.total,
        todayRate: today.percentage,
        weekAverage: weekAvg,
        totalThisWeek: totalCompleted,
        currentStreak,
        bestStreak,
        perfectDays
      }));
      
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const data = [];
      let totalCompleted = 0;
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: tasks } = await supabase
          .from('custom_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr);
        
        const completed = (tasks || []).filter(t => t.completed).length;
        const total = (tasks || []).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        totalCompleted += completed;
        
        data.push({
          date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          fullDate: dateStr,
          percentage,
          completed,
          total,
          dayOfWeek: date.getDay()
        });
      }
      
      setMonthlyData(data);
      
      const monthAvg = Math.round(
        data.reduce((sum, d) => sum + d.percentage, 0) / data.length
      );
      
      setStats(prev => ({
        ...prev,
        monthAverage: monthAvg,
        totalThisMonth: totalCompleted
      }));
      
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dayOfWeekData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
    const daysData = monthlyData.filter(d => d.dayOfWeek === index);
    return {
      day,
      avgPercentage: daysData.length > 0 ? 
        Math.round(daysData.reduce((sum, d) => sum + d.percentage, 0) / daysData.length) : 0,
      completions: daysData.reduce((sum, d) => sum + d.completed, 0)
    };
  });

  const pieData = [
    { name: 'Completed', value: stats.todayCompleted, color: '#8B5CF6' },
    { name: 'Remaining', value: stats.todayTotal - stats.todayCompleted, color: darkMode ? '#374151' : '#E5E7EB' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          darkMode 
            ? 'bg-gray-800 border-gray-600 text-white' 
            : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name.includes('%') || entry.name.includes('Rate') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-2xl font-bold mb-6 flex items-center ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Activity className="h-6 w-6 text-purple-500 mr-2" />
          Custom Tasks Analytics
        </h2>

        <div className="flex flex-wrap gap-2">
          {views.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedView(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                selectedView === id
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-purple-600'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{name}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
              darkMode ? 'border-purple-400' : 'border-purple-600'
            }`}></div>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Loading analytics...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Overview View */}
          {selectedView === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={`rounded-lg p-4 text-center ${
                  darkMode 
                    ? 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-700/50'
                    : 'bg-gradient-to-r from-purple-50 to-indigo-50'
                }`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {stats.todayRate}%
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    Today
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-purple-400/80' : 'text-purple-600'}`}>
                    {stats.todayCompleted}/{stats.todayTotal}
                  </div>
                </div>

                <div className={`rounded-lg p-4 text-center ${
                  darkMode 
                    ? 'bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border border-blue-700/50'
                    : 'bg-gradient-to-r from-blue-50 to-cyan-50'
                }`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {stats.weekAverage}%
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Week Avg
                  </div>
                </div>

                <div className={`rounded-lg p-4 text-center ${
                  darkMode 
                    ? 'bg-gradient-to-br from-orange-900/50 to-red-900/50 border border-orange-700/50'
                    : 'bg-gradient-to-r from-orange-50 to-red-50'
                }`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    {stats.currentStreak}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                    Streak 🔥
                  </div>
                </div>

                <div className={`rounded-lg p-4 text-center ${
                  darkMode 
                    ? 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-700/50'
                    : 'bg-gradient-to-r from-green-50 to-emerald-50'
                }`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {stats.perfectDays}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    Perfect Days
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Today's Progress
                  </h3>
                  {stats.todayTotal > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <p className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                        No tasks for today yet
                      </p>
                    </div>
                  )}
                </div>

                <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Weekly Trend
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis dataKey="date" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                        <YAxis domain={[0, 100]} stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="percentage"
                          stroke="#8B5CF6"
                          strokeWidth={2}
                          dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weekly View */}
          {selectedView === 'weekly' && (
            <div className="space-y-6">
              <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  7-Day Performance
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="date" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                      <YAxis domain={[0, 100]} stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="percentage" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border text-center ${
                  darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {stats.weekAverage}%
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Average
                  </div>
                </div>
                <div className={`p-4 rounded-lg border text-center ${
                  darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {Math.max(...weeklyData.map(d => d.percentage))}%
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Best Day
                  </div>
                </div>
                <div className={`p-4 rounded-lg border text-center ${
                  darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    {stats.totalThisWeek}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Completed
                  </div>
                </div>
                <div className={`p-4 rounded-lg border text-center ${
                  darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {weeklyData.filter(d => d.percentage >= 70).length}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Good Days
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly View */}
          {selectedView === 'monthly' && (
            <div className="space-y-6">
              {monthlyData.length === 0 ? (
                <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="text-center py-12">
                    <Calendar className={`h-16 w-16 mx-auto mb-4 ${
                      darkMode ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <button
                      onClick={loadMonthlyData}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                    >
                      Load Monthly Data
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      30-Day Trend
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                          <XAxis dataKey="date" stroke={darkMode ? '#9CA3AF' : '#6B7280'} style={{ fontSize: '10px' }} />
                          <YAxis domain={[0, 100]} stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="percentage"
                            stroke="#8B5CF6"
                            fill="#8B5CF6"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Performance by Day of Week
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                          <XAxis dataKey="day" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                          <YAxis domain={[0, 100]} stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="avgPercentage" fill="#7C3AED" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomTasksReports;