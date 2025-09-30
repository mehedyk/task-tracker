// src/components/EnhancedReports.js - FIXED VERSION
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

const EnhancedReports = ({ user, weeklyData, allUsersProgress }) => {
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

  // Load monthly data when component mounts
  useEffect(() => {
    if (user && selectedReport === 'monthly' && monthlyData.length === 0) {
      loadMonthlyData();
    }
  }, [user, selectedReport]);

  // Calculate basic stats from weekly data
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
      
      // Update stats with monthly data
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

  // Calculate current stats
  const currentUser = allUsersProgress.find(u => u.user.id === user?.id);
  const completedToday = currentUser?.completed || 0;
  const totalTasks = currentUser?.total || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

  const avgTeamPerformance = Math.round(
    allUsersProgress.reduce((acc, user) => acc + user.percentage, 0) / 
    Math.max(allUsersProgress.length, 1)
  );

  // Category data from current progress
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
      color: COLORS[index % COLORS.length]
    };
  });

  // Day of week analysis
  const dayOfWeekData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
    const daysData = monthlyData.filter(d => d.dayOfWeek === index);
    return {
      day,
      avgPercentage: daysData.length > 0 ? 
        Math.round(daysData.reduce((sum, d) => sum + d.percentage, 0) / daysData.length) : 0,
      completions: daysData.reduce((sum, d) => sum + d.completed, 0)
    };
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {reports.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedReport(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                selectedReport === id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{name}</span>
            </button>
          ))}
        </div>

        {/* Overview Dashboard */}
        {selectedReport === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Target className="h-6 w-6 text-indigo-500 mr-2" />
              📊 Progress Overview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 text-center card-hover">
                <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
                <div className="text-sm text-green-700 font-medium">Today</div>
                <div className="text-xs text-green-600">{completedToday}/{totalTasks} tasks</div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-center card-hover">
                <div className="text-2xl font-bold text-indigo-600">{basicStats.monthlyAverage}%</div>
                <div className="text-sm text-indigo-700 font-medium">Weekly Avg</div>
                <div className="text-xs text-indigo-600">last 7 days</div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 text-center card-hover">
                <div className="text-2xl font-bold text-orange-600">{basicStats.currentStreak}</div>
                <div className="text-sm text-orange-700 font-medium">Streak</div>
                <div className="text-xs text-orange-600">days 🔥</div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 text-center card-hover">
                <div className="text-2xl font-bold text-yellow-600">{basicStats.perfectDays}</div>
                <div className="text-sm text-yellow-700 font-medium">Perfect Days</div>
                <div className="text-xs text-yellow-600">this week 🏆</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">🌟 Islamic Motivation</h3>
                <p className="text-gray-700 mb-3">
                  {completionRate >= 80 ? "🎉 Alhamdulillah! Excellent progress today!" :
                   completionRate >= 60 ? "💪 MashaAllah! Keep up the great work!" :
                   completionRate >= 40 ? "🌱 Good start! Allah rewards every effort!" :
                   "🤲 Bismillah! Begin with Allah's blessing!"}
                </p>
                <div className="flex justify-center flex-wrap gap-4 text-sm">
                  <span className="bg-white px-3 py-1 rounded-full">🔥 Streak: {basicStats.currentStreak} days</span>
                  <span className="bg-white px-3 py-1 rounded-full">🏆 Best: {basicStats.bestStreak} days</span>
                  <span className="bg-white px-3 py-1 rounded-full">✨ Perfect: {basicStats.perfectDays} days</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Trends */}
        {selectedReport === 'weekly' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="h-6 w-6 text-indigo-500 mr-2" />
              📈 Weekly Progress
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Completion Rate']}
                      labelFormatter={(label) => `Day: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#6366F1"
                      strokeWidth={3}
                      dot={{ fill: '#6366F1', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-lg font-bold text-indigo-600">
                  {Math.round(weeklyData.reduce((sum, d) => sum + d.percentage, 0) / weeklyData.length)}%
                </div>
                <div className="text-sm text-gray-600">Weekly Average</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-lg font-bold text-green-600">{Math.max(...weeklyData.map(d => d.percentage))}%</div>
                <div className="text-sm text-gray-600">Best Day</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-lg font-bold text-orange-600">{basicStats.totalTasksWeek}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-lg font-bold text-purple-600">{weeklyData.filter(d => d.percentage >= 70).length}</div>
                <div className="text-sm text-gray-600">Good Days</div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Tracker */}
        {selectedReport === 'monthly' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <CalendarDays className="h-6 w-6 text-indigo-500 mr-2" />
              📅 Monthly Tracker (Last 30 Days)
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading monthly data...</p>
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Loading monthly analytics...</p>
                <button
                  onClick={loadMonthlyData}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Load Data
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-indigo-600">{basicStats.monthlyAverage}%</div>
                    <div className="text-xs text-indigo-700">Monthly Average</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-green-600">{basicStats.totalTasksMonth}</div>
                    <div className="text-xs text-green-700">Tasks Completed</div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-yellow-600">{basicStats.perfectDays}</div>
                    <div className="text-xs text-yellow-700">Perfect Days</div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-orange-600">{basicStats.bestStreak}</div>
                    <div className="text-xs text-orange-700">Best Streak</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-purple-600">
                      {monthlyData.filter(d => d.percentage >= 80).length}
                    </div>
                    <div className="text-xs text-purple-700">Excellent Days</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">30-Day Trend</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          formatter={(value) => [`${value}%`, 'Completion']}
                        />
                        <Area
                          type="monotone"
                          dataKey="percentage"
                          stroke="#6366F1"
                          fill="#6366F1"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {dayOfWeekData.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">Performance by Day of Week</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Avg Completion']} />
                          <Bar dataKey="avgPercentage" fill="#8B5CF6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Category Analysis */}
        {selectedReport === 'category' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Award className="h-6 w-6 text-indigo-500 mr-2" />
              📋 Category Performance
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Today's Completion</h3>
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
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium">Detailed Breakdown</h3>
                {categoryData.map((category, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{category.icon}</span>
                        <span className="font-medium text-gray-900">{category.fullName}</span>
                      </div>
                      <span className="font-bold text-indigo-600">{category.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
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

        {/* Team Performance */}
        {selectedReport === 'team' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Users className="h-6 w-6 text-indigo-500 mr-2" />
              👥 Team Performance
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allUsersProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="user.name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
                    <Bar dataKey="percentage" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border text-center">
                <div className="text-xl font-bold text-green-600">{avgTeamPerformance}%</div>
                <div className="text-sm text-gray-600">Team Average</div>
              </div>
              <div className="bg-white p-4 rounded-lg border text-center">
                <div className="text-xl font-bold text-blue-600">{allUsersProgress.length}</div>
                <div className="text-sm text-gray-600">Active Members</div>
              </div>
              <div className="bg-white p-4 rounded-lg border text-center">
                <div className="text-xl font-bold text-purple-600">
                  {allUsersProgress.filter(u => u.percentage >= 80).length}
                </div>
                <div className="text-sm text-gray-600">Top Performers</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedReports;
