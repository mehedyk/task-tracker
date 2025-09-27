// src/components/EnhancedReports.js - WORKING VERSION (Fixes Loading Issues)
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  Calendar, TrendingUp, Award, Target, Clock, Users, Zap, 
  Activity
} from 'lucide-react';
import { supabase } from '../supabase';
import { taskTemplates } from '../config/taskTemplates';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

const EnhancedReports = ({ user, weeklyData, allUsersProgress }) => {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [basicStats, setBasicStats] = useState({
    monthlyAverage: 0,
    totalTasksWeek: 0,
    currentStreak: 0,
    bestStreak: 0
  });

  const reports = [
    { id: 'overview', name: 'Overview', icon: Target },
    { id: 'weekly', name: 'Weekly Trends', icon: TrendingUp },
    { id: 'category', name: 'Categories', icon: Award },
    { id: 'team', name: 'Team', icon: Users },
  ];

  // Calculate basic stats from existing data
  useEffect(() => {
    if (user && weeklyData.length > 0) {
      const monthlyAverage = Math.round(
        weeklyData.reduce((sum, day) => sum + day.percentage, 0) / weeklyData.length
      );
      
      const totalTasksWeek = weeklyData.reduce((sum, day) => sum + day.completed, 0);
      
      // Simple streak calculation
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
      
      setBasicStats({
        monthlyAverage,
        totalTasksWeek,
        currentStreak,
        bestStreak
      });
    }
  }, [user, weeklyData]);

  // Calculate current stats
  const currentUser = allUsersProgress.find(u => u.user.id === user?.id);
  const completedToday = currentUser?.completed || 0;
  const totalTasks = currentUser?.total || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

  const avgTeamPerformance = Math.round(
    allUsersProgress.reduce((acc, user) => acc + user.percentage, 0) / 
    Math.max(allUsersProgress.length, 1)
  );

  // Category data from task templates and current progress
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
        completionRate = Math.round((completed / subtasks.length) * 100);
      }
    }
    
    return {
      name: template.name.split(' ')[0], // Short name
      icon: template.icon,
      completionRate,
      color: COLORS[index % COLORS.length]
    };
  });

  return (
    <div className="space-y-6">
      {/* Report Navigation */}
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

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
                <div className="text-sm text-green-700">Today's Progress</div>
                <div className="text-xs text-green-600">{completedToday}/{totalTasks} tasks</div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{avgTeamPerformance}%</div>
                <div className="text-sm text-indigo-700">Team Average</div>
                <div className="text-xs text-indigo-600">all members</div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{basicStats.totalTasksWeek}</div>
                <div className="text-sm text-purple-700">Week Tasks</div>
                <div className="text-xs text-purple-600">completed</div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{basicStats.currentStreak}</div>
                <div className="text-sm text-orange-700">Current Streak</div>
                <div className="text-xs text-orange-600">days</div>
              </div>
            </div>

            {/* Islamic Motivation */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">🌟 Islamic Motivation</h3>
                <p className="text-gray-700 mb-3">
                  {completionRate >= 80 ? "🎉 Alhamdulillah! Excellent progress today!" :
                   completionRate >= 60 ? "💪 MashaAllah! Keep up the great work!" :
                   completionRate >= 40 ? "🌱 Good start! Allah rewards every effort!" :
                   "🤲 Bismillah! Begin with Allah's blessing!"}
                </p>
                <div className="flex justify-center space-x-4 text-sm">
                  <span>🕌 Current Streak: {basicStats.currentStreak} days</span>
                  <span>🏆 Best Streak: {basicStats.bestStreak} days</span>
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

            {/* Weekly Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-lg font-bold text-indigo-600">{basicStats.monthlyAverage}%</div>
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

        {/* Category Analysis */}
        {selectedReport === 'category' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Award className="h-6 w-6 text-indigo-500 mr-2" />
              📋 Category Performance
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
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

              {/* Category List */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Detailed Breakdown</h3>
                {categoryData.map((category, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{category.icon}</span>
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

            {/* Team Stats */}
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
