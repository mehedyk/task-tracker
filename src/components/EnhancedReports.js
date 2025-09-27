// src/components/EnhancedReports.js - COMPLETE AND FIXED
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Calendar, TrendingUp, Award, Target, Clock, Users, Zap, 
  Activity, BookOpen, Code, Heart, Moon 
} from 'lucide-react';
import { supabase } from '../supabase';
import { taskTemplates } from '../config/taskTemplates';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

const EnhancedReports = ({ user, weeklyData, allUsersProgress }) => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState([]);
  const [timeAnalytics, setTimeAnalytics] = useState({ hourly: [], daily: [] });
  const [streakData, setStreakData] = useState([]);
  const [loading, setLoading] = useState(false);

  const reports = [
    { id: 'overview', name: 'Overview Dashboard', icon: Target },
    { id: 'weekly', name: 'Weekly Trends', icon: TrendingUp },
    { id: 'category', name: 'Category Analysis', icon: Award },
    { id: 'team', name: 'Team Performance', icon: Users },
    { id: 'streaks', name: 'Streak Analysis', icon: Zap },
    { id: 'time', name: 'Time Analysis', icon: Clock },
    { id: 'habits', name: 'Habit Formation', icon: Activity }
  ];

  useEffect(() => {
    if (user) {
      loadExtendedAnalytics();
    }
  }, [user]);

  const loadExtendedAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMonthlyData(),
        loadCategoryAnalytics(),
        loadTimeAnalytics(),
        loadStreakData()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyData = async () => {
    const monthlyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr);
          
        const mainTasks = (tasks || []).filter(t => t.is_parent || t.task_type === 'simple');
        const completedMainTasks = mainTasks.filter(t => {
          if (t.task_type === 'simple') return t.completed;
          const subtasks = (tasks || []).filter(st => st.parent_id === t.task_id);
          return subtasks.length > 0 && subtasks.every(st => st.completed);
        });
        
        const completed = completedMainTasks.length;
        const total = Math.max(mainTasks.length, taskTemplates.length);
        
        monthlyData.push({
          date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          fullDate: dateStr,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          completed,
          total,
          dayOfWeek: date.getDay()
        });
      } catch (error) {
        console.error(`Error loading data for ${dateStr}:`, error);
        monthlyData.push({
          date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          fullDate: dateStr,
          percentage: 0,
          completed: 0,
          total: taskTemplates.length,
          dayOfWeek: date.getDay()
        });
      }
    }
    setMonthlyData(monthlyData);
  };

  const loadCategoryAnalytics = async () => {
    const categoryStats = [];
    
    for (const template of taskTemplates) {
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('task_id', template.id)
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        let completedDays = 0;
        if (tasks && tasks.length > 0) {
          for (const task of tasks) {
            if (template.type === 'simple') {
              if (task.completed) completedDays++;
            } else {
              // For expandable tasks, check subtasks
              const { data: subtasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('parent_id', template.id)
                .eq('date', task.date)
                .eq('user_id', user.id);
              
              if (subtasks && subtasks.length > 0 && subtasks.every(st => st.completed)) {
                completedDays++;
              }
            }
          }
        }

        const totalDays = tasks?.length || 0;
        const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

        categoryStats.push({
          name: template.name,
          icon: template.icon,
          completionRate,
          completedDays,
          totalDays,
          color: COLORS[taskTemplates.indexOf(template) % COLORS.length]
        });
      } catch (error) {
        console.error(`Error loading category stats for ${template.name}:`, error);
        categoryStats.push({
          name: template.name,
          icon: template.icon,
          completionRate: 0,
          completedDays: 0,
          totalDays: 0,
          color: COLORS[taskTemplates.indexOf(template) % COLORS.length]
        });
      }
    }

    setCategoryAnalytics(categoryStats);
  };

  const loadTimeAnalytics = async () => {
    try {
      // Analyze completion times by hour/day of week
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const timeStats = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        timeLabel: `${hour}:00`,
        completions: tasks?.filter(t => 
          new Date(t.updated_at).getHours() === hour
        ).length || 0
      }));

      const dayStats = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
        day,
        completions: monthlyData.filter(d => d.dayOfWeek === index).reduce((sum, d) => sum + d.completed, 0),
        avgPercentage: Math.round(
          monthlyData.filter(d => d.dayOfWeek === index).reduce((sum, d) => sum + d.percentage, 0) / 
          Math.max(monthlyData.filter(d => d.dayOfWeek === index).length, 1)
        )
      }));

      setTimeAnalytics({ hourly: timeStats, daily: dayStats });
    } catch (error) {
      console.error('Error loading time analytics:', error);
      setTimeAnalytics({ hourly: [], daily: [] });
    }
  };

  const loadStreakData = async () => {
    try {
      const streakData = [];
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      // Calculate streaks from monthly data
      for (let i = monthlyData.length - 1; i >= 0; i--) {
        const day = monthlyData[i];
        if (day.percentage >= 80) { // Consider 80%+ as successful day
          tempStreak++;
          if (i === monthlyData.length - 1) {
            currentStreak = tempStreak;
          }
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 0;
        }
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }

      streakData.push({
        type: 'Current Streak',
        value: currentStreak,
        unit: 'days',
        color: '#10B981'
      });

      streakData.push({
        type: 'Longest Streak',
        value: longestStreak,
        unit: 'days',
        color: '#F59E0B'
      });

      setStreakData(streakData);
    } catch (error) {
      console.error('Error loading streak data:', error);
      setStreakData([]);
    }
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate basic stats
  const completedToday = allUsersProgress.find(u => u.user.id === user?.id)?.completed || 0;
  const totalTasks = allUsersProgress.find(u => u.user.id === user?.id)?.total || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

  const avgTeamPerformance = Math.round(
    allUsersProgress.reduce((acc, user) => acc + user.percentage, 0) / 
    Math.max(allUsersProgress.length, 1)
  );

  const totalTasksThisWeek = weeklyData.reduce((sum, day) => sum + day.completed, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Report Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {reports.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedReport(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
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
              Overview Dashboard
            </h2>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 text-center card-hover">
                <div className="text-2xl font-bold text-green-600 mb-1">{completionRate}%</div>
                <div className="text-green-700 font-medium">Today's Progress</div>
                <div className="text-xs text-green-600">{completedToday} of {totalTasks} tasks</div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center card-hover">
                <div className="text-2xl font-bold text-indigo-600 mb-1">{avgTeamPerformance}%</div>
                <div className="text-indigo-700 font-medium">Team Average</div>
                <div className="text-xs text-indigo-600">across all members</div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 text-center card-hover">
                <div className="text-2xl font-bold text-purple-600 mb-1">{totalTasksThisWeek}</div>
                <div className="text-purple-700 font-medium">Tasks This Week</div>
                <div className="text-xs text-purple-600">completed successfully</div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 text-center card-hover">
                <div className="text-2xl font-bold text-orange-600 mb-1">{allUsersProgress.length}</div>
                <div className="text-orange-700 font-medium">Team Members</div>
                <div className="text-xs text-orange-600">active today</div>
              </div>
            </div>

            {/* Monthly Progress Chart */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 text-indigo-500 mr-2" />
                Monthly Progress Trend
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Completion Rate']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      stroke="#6366F1"
                      fill="url(#colorGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Trends */}
        {selectedReport === 'weekly' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="h-6 w-6 text-indigo-500 mr-2" />
              Weekly Trends
            </h2>
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
        )}

        {/* Category Analysis */}
        {selectedReport === 'category' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Award className="h-6 w-6 text-indigo-500 mr-2" />
              Category Performance
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryAnalytics}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="completionRate"
                      label={({name, completionRate}) => `${name.split(' ')[0]}: ${completionRate}%`}
                    >
                      {categoryAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                {categoryAnalytics.map((category, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium text-gray-900">{category.name}</span>
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
                    <div className="text-xs text-gray-600 mt-1">
                      {category.completedDays} of {category.totalDays} days completed
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
              Team Performance
            </h2>
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
        )}

        {/* Coming Soon for other reports */}
        {!['overview', 'weekly', 'category', 'team'].includes(selectedReport) && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Clock className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {reports.find(r => r.id === selectedReport)?.name} Coming Soon!
            </h3>
            <p className="text-gray-600">This report is under development and will be available soon.</p>
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">🌟 Stay tuned for more Islamic lifestyle insights!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedReports;
