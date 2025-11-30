// src/components/CustomTasksTeamReports.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { 
  Users, Calendar, TrendingUp, CalendarDays, FileText, Trophy
} from 'lucide-react';
import { supabase } from '../supabase';

const CustomTasksTeamReports = ({ user, darkMode }) => {
  const [selectedView, setSelectedView] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [yearlyStats, setYearlyStats] = useState({});

  const views = [
    { id: 'monthly', name: 'Monthly Team View', icon: CalendarDays },
    { id: 'yearly', name: 'Yearly Team View', icon: Calendar },
    { id: 'stats', name: 'Yearly Stats', icon: FileText }
  ];

  const loadAllUsers = useCallback(async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name', { ascending: true });
      
      setAllUsers(profiles || []);
      return profiles || [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }, []);

  const loadMonthlyTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const users = await loadAllUsers();
      const data = [];
      
      // Get last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = {
          date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          fullDate: dateStr
        };
        
        // Get data for each user
        for (const userProfile of users) {
          const { data: tasks } = await supabase
            .from('custom_tasks')
            .select('*')
            .eq('user_id', userProfile.id)
            .eq('date', dateStr);
          
          const completed = (tasks || []).filter(t => t.completed).length;
          const total = (tasks || []).length;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          
          dayData[userProfile.name] = percentage;
        }
        
        data.push(dayData);
      }
      
      setMonthlyData(data);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadAllUsers]);

  const loadYearlyTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const users = await loadAllUsers();
      const data = [];
      const stats = {};
      
      // Initialize stats for each user
      users.forEach(u => {
        stats[u.name] = {
          totalDays: 0,
          perfectDays: 0,
          goodDays: 0,
          averagePercentage: 0,
          totalPercentage: 0
        };
      });
      
      // Get last 365 days
      for (let i = 364; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = {
          date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          fullDate: dateStr,
          month: date.getMonth(),
          dayOfYear: i
        };
        
        // Get data for each user
        for (const userProfile of users) {
          const { data: tasks } = await supabase
            .from('custom_tasks')
            .select('*')
            .eq('user_id', userProfile.id)
            .eq('date', dateStr);
          
          const completed = (tasks || []).filter(t => t.completed).length;
          const total = (tasks || []).length;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          
          dayData[userProfile.name] = percentage;
          
          // Update stats
          if (total > 0) {
            stats[userProfile.name].totalDays++;
            stats[userProfile.name].totalPercentage += percentage;
            if (percentage === 100) stats[userProfile.name].perfectDays++;
            if (percentage >= 70) stats[userProfile.name].goodDays++;
          }
        }
        
        data.push(dayData);
      }
      
      // Calculate averages
      Object.keys(stats).forEach(userName => {
        if (stats[userName].totalDays > 0) {
          stats[userName].averagePercentage = Math.round(
            stats[userName].totalPercentage / stats[userName].totalDays
          );
        }
      });
      
      setYearlyData(data);
      setYearlyStats(stats);
    } catch (error) {
      console.error('Error loading yearly data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadAllUsers]);

  useEffect(() => {
    if (selectedView === 'monthly' && monthlyData.length === 0) {
      loadMonthlyTeamData();
    } else if ((selectedView === 'yearly' || selectedView === 'stats') && yearlyData.length === 0) {
      loadYearlyTeamData();
    }
  }, [selectedView, monthlyData.length, yearlyData.length, loadMonthlyTeamData, loadYearlyTeamData]);

  const getLineColor = (index) => {
    const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#EC4899'];
    return colors[index % colors.length];
  };

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
              {entry.name}: {entry.value}%
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
          <Users className="h-6 w-6 text-purple-500 mr-2" />
          Custom Tasks - Team Performance
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
              Loading team data... This may take a moment
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Monthly Team View */}
          {selectedView === 'monthly' && (
            <div className="space-y-6">
              <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Last 30 Days - Team Comparison
                </h3>
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  See how each team member performed on custom tasks over the last month
                </p>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis 
                        dataKey="date" 
                        stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                        style={{ fontSize: '10px' }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                        label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {allUsers.map((userProfile, index) => (
                        <Line
                          key={userProfile.id}
                          type="monotone"
                          dataKey={userProfile.name}
                          stroke={getLineColor(index)}
                          strokeWidth={2}
                          dot={{ fill: getLineColor(index), r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  {allUsers.map((userProfile, index) => (
                    <div key={userProfile.id} className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: getLineColor(index) }}
                      />
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {userProfile.name}
                        {userProfile.id === user.id && ' (You)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Yearly Team View */}
          {selectedView === 'yearly' && (
            <div className="space-y-6">
              <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Full Year - Team Performance
                </h3>
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Complete year view of how each team member performed on custom tasks
                </p>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis 
                        dataKey="date" 
                        stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                        style={{ fontSize: '8px' }}
                        interval={30}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                        label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {allUsers.map((userProfile, index) => (
                        <Area
                          key={userProfile.id}
                          type="monotone"
                          dataKey={userProfile.name}
                          stroke={getLineColor(index)}
                          fill={getLineColor(index)}
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  {allUsers.map((userProfile, index) => (
                    <div key={userProfile.id} className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: getLineColor(index) }}
                      />
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {userProfile.name}
                        {userProfile.id === user.id && ' (You)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Yearly Stats */}
          {selectedView === 'stats' && (
            <div className="space-y-6">
              <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Year Summary - Custom Tasks Performance
                </h3>

                <div className="space-y-4">
                  {allUsers.map((userProfile, index) => {
                    const stats = yearlyStats[userProfile.name] || {};
                    const isCurrentUser = userProfile.id === user.id;
                    
                    return (
                      <div
                        key={userProfile.id}
                        className={`p-6 rounded-xl border transition-all duration-300 ${
                          isCurrentUser
                            ? darkMode
                              ? 'bg-purple-900/20 border-purple-500 ring-2 ring-purple-500'
                              : 'bg-purple-50 border-purple-300 ring-2 ring-purple-500'
                            : darkMode
                            ? 'bg-gray-700 border-gray-600'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getLineColor(index) + '30' }}
                            >
                              <Users className="h-6 w-6" style={{ color: getLineColor(index) }} />
                            </div>
                            <div>
                              <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {userProfile.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-sm font-normal text-purple-500">
                                    (You)
                                  </span>
                                )}
                              </h4>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Custom Tasks - Full Year Performance
                              </p>
                            </div>
                          </div>
                          {stats.averagePercentage >= 80 && (
                            <Trophy className="h-8 w-8 text-yellow-500" />
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className={`p-3 rounded-lg text-center ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-50'
                          }`}>
                            <div className={`text-2xl font-bold ${
                              darkMode ? 'text-purple-400' : 'text-purple-600'
                            }`}>
                              {stats.averagePercentage || 0}%
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Average
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg text-center ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-50'
                          }`}>
                            <div className={`text-2xl font-bold ${
                              darkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              {stats.perfectDays || 0}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Perfect Days
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg text-center ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-50'
                          }`}>
                            <div className={`text-2xl font-bold ${
                              darkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              {stats.goodDays || 0}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Good Days (70%+)
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg text-center ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-50'
                          }`}>
                            <div className={`text-2xl font-bold ${
                              darkMode ? 'text-orange-400' : 'text-orange-600'
                            }`}>
                              {stats.totalDays || 0}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Active Days
                            </div>
                          </div>
                        </div>

                        {/* Text Summary */}
                        <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                          isCurrentUser
                            ? darkMode
                              ? 'bg-purple-900/10 border-purple-500'
                              : 'bg-purple-50 border-purple-500'
                            : darkMode
                            ? 'bg-gray-800 border-gray-600'
                            : 'bg-gray-50 border-gray-300'
                        }`}>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <strong>{userProfile.name}</strong> completed custom tasks on{' '}
                            <strong className="text-purple-600">{stats.totalDays || 0} days</strong> this year
                            {stats.totalDays > 0 && (
                              <>
                                , with an average completion rate of{' '}
                                <strong className="text-purple-600">{stats.averagePercentage || 0}%</strong>.
                                {stats.perfectDays > 0 && (
                                  <> Achieved <strong className="text-green-600">{stats.perfectDays} perfect days</strong> (100% completion).</>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomTasksTeamReports;