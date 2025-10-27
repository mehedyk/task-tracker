// src/components/EnhancedReports.js
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Calendar, TrendingUp, Award, Target, Clock, Users, Zap, 
  Activity, CalendarDays, Flame
} from 'lucide-react';
import { supabase } from '../supabase';
import { taskTemplates } from '../config/taskTemplates';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

// Dark mode friendly colors
const DARK_COLORS = {
  primary: '#818CF8',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  purple: '#A78BFA',
  cyan: '#22D3EE',
  lime: '#A3E635'
};

const EnhancedReports = ({ user, weeklyData, allUsersProgress, darkMode }) => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [basicStats, setBasicStats] = useState({
    monthlyAverage: 0,
    totalTasksWeek: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectDays: 0,
    totalTasksMonth: 0
  });

  const reports = [
    { id: 'overview', name: 'Overview', icon: Target },
    { id: 'weekly', name: 'Weekly', icon: TrendingUp },
    { id: 'monthly', name: 'Monthly', icon: CalendarDays },
    { id: 'category', name: 'Categories', icon: Award },
    { id: 'team', name: 'Team', icon: Users },
  ];

  useEffect(() => {
    if (user && selectedReport === 'monthly' && monthlyData.length === 0) {
      loadMonthlyData();
    }
  }, [user, selectedReport]);

  useEffect(() => {
    if (weeklyData.length > 0) {
      const monthlyAverage = Math.round(
        weeklyData.reduce((sum, day) => sum + day.percentage, 0) / weeklyData.length
      );
      
      const totalTasksWeek = weeklyData.reduce((sum, day) => sum + day.completed, 0);
      
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      
      for (let i = weeklyData.length - 1; i >= 0; i--) {
        if (weeklyData[i].percentage >= 70) {
          tempStreak++;
          if (i === weeklyData.length - 1) currentStreak = tempStreak;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 0;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      
      const perfectDays = weeklyData.filter(d => d.percentage === 100).length;
      
      setBasicStats({
        monthlyAverage,
        totalTasksWeek,
        currentStreak,
        bestStreak,
        perfectDays,
        totalTasksMonth: totalTasksWeek
      });
    }
  }, [weeklyData]);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const data = [];
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr);
          
        const mainTasks = (tasks || []).filter(t => t.is_parent || t.task_type === 'simple');
        const completedMainTasks = mainTasks.filter(t => {
          if (t.task_type === 'simple') return t.completed;
          const subtasks = (tasks || []).filter(st => st.parent_id === t.task_id);
          if (t.task_id === 'coding') {
            return subtasks.length > 0 && subtasks.some(st => st.completed);
          }
          return subtasks.length > 0 && subtasks.every(st => st.completed);
        });
        
        const completed = completedMainTasks.length;
        const total = Math.max(mainTasks.length, taskTemplates.length);
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
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
      
      const monthlyAvg = Math.round(
        data.reduce((sum, day) => sum + day.percentage, 0) / data.length
      );
      const totalMonth = data.reduce((sum, day) => sum + day.completed, 0);
      const perfect = data.filter(d => d.percentage === 100).length;
      
      setBasicStats(prev => ({
        ...prev,
        monthlyAverage: monthlyAvg,
        totalTasksMonth: totalMonth,
        perfectDays: perfect
      }));
      
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentUser = allUsersProgress.find(u => u.user.id === user?.id);
  const completedToday = currentUser?.completed || 0;
  const totalTasks = currentUser?.total || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

  const avgTeamPerformance = Math.round(
    allUsersProgress.reduce((acc, user) => acc + user.percentage, 0) / 
    Math.max(allUsersProgress.length, 1)
  );

  const categoryData = taskTemplates.map((template, index) => {
    const userTasks = currentUser?.tasks?.filter(t => 
      t.task_id === template.id || t.parent_id === template.id
    ) || [];
    
    const mainTask = userTasks.find(t => t.task_id === template.id);
    let completionRate = 0;
    
    if (template.type === 'simple') {
      completionRate = mainTask?.completed ? 100 : 0;
    } else {
      const subtasks = userTasks.filter(t => t.parent_id === template.id);
      if (subtasks.length > 0) {
        const completed = subtasks.filter(st => st.completed).length;
        if (template.id === 'coding') {
          completionRate = completed > 0 ? 100 : 0;
        } else {
          completionRate = Math.round((completed / subtasks.length) * 100);
        }
      }
    }
    
    return {
      name: template.name.split(' ')[0],
      fullName: template.name,
      icon: template.icon,
      completionRate,
      color: darkMode ? Object.values(DARK_COLORS)[index % 7] : COLORS[index % COLORS.length]
    };
  });

  const dayOfWeekData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
    const daysData = monthlyData.filter(d => d.dayOfWeek === index);
    return {
      day,
      avgPercentage: daysData.length > 0 ? 
        Math.round(daysData.reduce((sum, d) => sum + d.percentage, 0) / daysData.length) : 0,
      completions: daysData.reduce((sum, d) => sum + d.completed, 0)
    };
  });

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
    <div className="space-y-6 animate-fadeIn">
      <div className={`rounded-xl shadow-sm p-4 sm:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-wrap gap-2 mb-6">
          {reports.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedReport(id)}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                selectedReport === id
                  ? darkMode
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{name}</span>
            </button>
          ))}
        </div>

        {selectedReport === 'overview' && (
          <div className="space-y-6">
            <h2 className={`text-xl sm:text-2xl font-bold mb-6 flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 mr-2" />
              📊 Progress Overview
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className={`rounded-lg p-4 text-center card-hover ${
                darkMode 
                  ? 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-700/50'
                  : 'bg-gradient-to-r from-green-50 to-emerald-50'
              }`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {completionRate}%
                </div>
                <div className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                  Today
                </div>
                <div className={`text-xs ${darkMode ? 'text-green-400/80' : 'text-green-600'}`}>
                  {completedToday}/{totalTasks} tasks
                </div>
              </div>

              <div className={`rounded-lg p-4 text-center card-hover ${
                darkMode 
                  ? 'bg-gradient-to-br from-blue-900/50 to-indigo-900/50 border border-indigo-700/50'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50'
              }`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {basicStats.monthlyAverage}%
                </div>
                <div className={`text-sm font-medium ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                  Weekly Avg
                </div>
                <div className={`text-xs ${darkMode ? 'text-indigo-400/80' : 'text-indigo-600'}`}>
                  last 7 days
                </div>
              </div>

              <div className={`rounded-lg p-4 text-center card-hover ${
                darkMode 
                  ? 'bg-gradient-to-br from-orange-900/50 to-red-900/50 border border-orange-700/50'
                  : 'bg-gradient-to-r from-orange-50 to-red-50'
              }`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  {basicStats.currentStreak}
                </div>
                <div className={`text-sm font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                  Streak
                </div>
                <div className={`text-xs ${darkMode ? 'text-orange-400/80' : 'text-orange-600'}`}>
                  days 🔥
                </div>
              </div>

              <div className={`rounded-lg p-4 text-center card-hover ${
                darkMode 
                  ? 'bg-gradient-to-br from-yellow-900/50 to-amber-900/50 border border-yellow-700/50'
                  : 'bg-gradient-to-r from-yellow-50 to-amber-50'
              }`}>
                <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {basicStats.perfectDays}
                </div>
                <div className={`text-sm font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  Perfect Days
                </div>
                <div className={`text-xs ${darkMode ? 'text-yellow-400/80' : 'text-yellow-600'}`}>
                  this week 🏆
                </div>
              </div>
            </div>

            <div className={`rounded-lg p-6 ${
              darkMode 
                ? 'bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700/30'
                : 'bg-gradient-to-r from-green-50 to-blue-50'
            }`}>
              <div className="text-center">
                <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🌟 Islamic Motivation
                </h3>
                <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {completionRate >= 80 ? "🎉 Alhamdulillah! Excellent progress today!" :
                   completionRate >= 60 ? "💪 MashaAllah! Keep up the great work!" :
                   completionRate >= 40 ? "🌱 Good start! Allah rewards every effort!" :
                   "🤲 Bismillah! Begin with Allah's blessing!"}
                </p>
                <div className="flex justify-center flex-wrap gap-2 sm:gap-4 text-sm">
                  <span className={`px-3 py-1 rounded-full ${
                    darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'
                  }`}>
                    🔥 Streak: {basicStats.currentStreak} days
                  </span>
                  <span className={`px-3 py-1 rounded-full ${
                    darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'
                  }`}>
                    🏆 Best: {basicStats.bestStreak} days
                  </span>
                  <span className={`px-3 py-1 rounded-full ${
                    darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'
                  }`}>
                    ✨ Perfect: {basicStats.perfectDays} days
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'weekly' && (
          <div className="space-y-6">
            <h2 className={`text-xl sm:text-2xl font-bold mb-6 flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 mr-2" />
              📈 Weekly Progress
            </h2>
            
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="date" 
                      stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke={darkMode ? DARK_COLORS.primary : '#6366F1'}
                      strokeWidth={3}
                      dot={{ fill: darkMode ? DARK_COLORS.primary : '#6366F1', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-lg font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {Math.round(weeklyData.reduce((sum, d) => sum + d.percentage, 0) / weeklyData.length)}%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Weekly Average
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {Math.max(...weeklyData.map(d => d.percentage))}%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Best Day
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  {basicStats.totalTasksWeek}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Tasks
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-lg font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {weeklyData.filter(d => d.percentage >= 70).length}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Good Days
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'monthly' && (
          <div className="space-y-6">
            <h2 className={`text-xl sm:text-2xl font-bold mb-6 flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 mr-2" />
              📅 Monthly Tracker
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
                  darkMode ? 'border-indigo-400' : 'border-indigo-600'
                }`}></div>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Loading monthly data...
                </p>
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className={`h-16 w-16 mx-auto mb-4 ${
                  darkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading monthly analytics...
                </p>
                <button
                  onClick={loadMonthlyData}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  Load Data
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                  <div className={`rounded-lg p-4 text-center ${
                    darkMode 
                      ? 'bg-indigo-900/30 border border-indigo-700/50'
                      : 'bg-indigo-50'
                  }`}>
                    <div className={`text-xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {basicStats.monthlyAverage}%
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-indigo-300/80' : 'text-indigo-700'}`}>
                      Monthly Average
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${
                    darkMode 
                      ? 'bg-green-900/30 border border-green-700/50'
                      : 'bg-green-50'
                  }`}>
                    <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {basicStats.totalTasksMonth}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-green-300/80' : 'text-green-700'}`}>
                      Tasks Completed
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${
                    darkMode 
                      ? 'bg-yellow-900/30 border border-yellow-700/50'
                      : 'bg-yellow-50'
                  }`}>
                    <div className={`text-xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      {basicStats.perfectDays}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-yellow-300/80' : 'text-yellow-700'}`}>
                      Perfect Days
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${
                    darkMode 
                      ? 'bg-orange-900/30 border border-orange-700/50'
                      : 'bg-orange-50'
                  }`}>
                    <div className={`text-xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {basicStats.bestStreak}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-orange-300/80' : 'text-orange-700'}`}>
                      Best Streak
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${
                    darkMode 
                      ? 'bg-purple-900/30 border border-purple-700/50'
                      : 'bg-purple-50'
                  }`}>
                    <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {monthlyData.filter(d => d.percentage >= 80).length}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-purple-300/80' : 'text-purple-700'}`}>
                      Excellent Days
                    </div>
                  </div>
                </div>

                <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    30-Day Trend
                  </h3>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis 
                          dataKey="date" 
                          stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                          style={{ fontSize: '10px' }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="percentage"
                          stroke={darkMode ? DARK_COLORS.primary : '#6366F1'}
                          fill={darkMode ? DARK_COLORS.primary : '#6366F1'}
                          fillOpacity={darkMode ? 0.3 : 0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {dayOfWeekData.length > 0 && (
                  <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Performance by Day
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                          <XAxis 
                            dataKey="day" 
                            stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                            style={{ fontSize: '12px' }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar 
                            dataKey="avgPercentage" 
                            fill={darkMode ? DARK_COLORS.purple : '#8B5CF6'} 
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {selectedReport === 'category' && (
          <div className="space-y-6">
            <h2 className={`text-xl sm:text-2xl font-bold mb-6 flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 mr-2" />
              📋 Category Performance
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Today's Completion
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="completionRate"
                        label={({name, completionRate}) => `${name}: ${completionRate}%`}
                        labelStyle={{ 
                          fill: darkMode ? '#E5E7EB' : '#1F2937',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Detailed Breakdown
                </h3>
                {categoryData.map((category, index) => (
                  <div key={index} className={`rounded-lg p-4 border ${
                    darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{category.icon}</span>
                        <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {category.fullName}
                        </span>
                      </div>
                      <span className={`font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {category.completionRate}%
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-2 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${category.completionRate}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'team' && (
          <div className="space-y-6">
            <h2 className={`text-xl sm:text-2xl font-bold mb-6 flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 mr-2" />
              👥 Team Performance
            </h2>
            
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allUsersProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="user.name" 
                      stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="percentage" 
                      fill={darkMode ? DARK_COLORS.success : '#10B981'}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border text-center ${
                darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {avgTeamPerformance}%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Team Average
                </div>
              </div>
              <div className={`p-4 rounded-lg border text-center ${
                darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {allUsersProgress.length}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Active Members
                </div>
              </div>
              <div className={`p-4 rounded-lg border text-center ${
                darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {allUsersProgress.filter(u => u.percentage >= 80).length}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Top Performers
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedReports;
