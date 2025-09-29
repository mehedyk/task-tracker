import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { User, CheckCircle, Circle, BarChart3, Users, LogOut, Calendar, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const TaskTracker = () => {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [allUsersProgress, setAllUsersProgress] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const session = supabase.auth.getSession();
    session.then(({ data }) => {
      if (data.session) setUser(data.session.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadTasks();
      loadAllUsersProgress();
      loadWeeklyProgress();
    }
  }, [user, currentPage]);

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today);

    if (error) {
      console.error(error);
      return;
    }

    if (data.length === 0) {
      const defaultTasks = [
        'Drink Water (8 glasses)',
        'Exercise (30 min)',
        'Study/Learn (1 hour)',
        'Eat Healthy Meals',
        'Sleep 8 hours',
        'Meditate (10 min)',
      ];

      const inserts = defaultTasks.map((task) => ({
        user_id: user.id,
        task_name: task,
        date: today,
        completed: false,
      }));

      const { data: newTasks, error: insertError } = await supabase
        .from('tasks')
        .insert(inserts)
        .select('*');

      if (insertError) {
        console.error(insertError);
        return;
      }
      setTasks(newTasks);
    } else {
      setTasks(data);
    }
  };

  const loadAllUsersProgress = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('user_id, task_name, completed, date');

    if (error) {
      console.error(error);
      return;
    }

    const grouped = {};
    data.forEach((task) => {
      if (task.date !== today) return;
      if (!grouped[task.user_id]) grouped[task.user_id] = [];
      grouped[task.user_id].push(task);
    });

    const userProgress = await Promise.all(
      Object.keys(grouped).map(async (uid) => {
        const profile = await supabase.auth.admin.getUserById(uid);
        const name = profile?.data?.user?.email?.split('@')[0] || 'User';
        const tasks = grouped[uid];
        const completed = tasks.filter((t) => t.completed).length;
        const total = tasks.length;
        return {
          user: { id: uid, name },
          tasks,
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
    );

    setAllUsersProgress(userProgress);
  };

  const loadWeeklyProgress = async () => {
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr);

      if (error) continue;

      const completed = data.filter((t) => t.completed).length;
      const total = data.length || 6;
      weekData.push({
        date: date.toLocaleDateString('en', { weekday: 'short' }),
        percentage: Math.round((completed / total) * 100),
        completed,
        total,
      });
    }
    setWeeklyData(weekData);
  };

  const handleAuth = async () => {
    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) console.error(error);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) console.error(error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const toggleTask = async (taskId, completed) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !completed })
      .eq('id', taskId);

    if (error) {
      console.error(error);
      return;
    }
    loadTasks();
    loadAllUsersProgress();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Tracker Taqaddum (تقدّم)</h1>
            <p className="text-gray-600">Track progress with your team(But when there is no team, isn't being a lone wolf the only choice?)</p>
          </div>

          <div className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleAuth}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completedToday = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

  const pieData = [
    { name: 'Completed', value: completedToday, color: '#10B981' },
    { name: 'Remaining', value: totalTasks - completedToday, color: '#E5E7EB' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Task Tracker Taqaddum (تقدّم)</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.email}!</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation */}
        <nav className="flex space-x-1 mb-8">
          {[
            { id: 'dashboard', label: 'My Tasks', icon: CheckCircle },
            { id: 'group', label: 'Team Progress', icon: Users },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Dashboard */}
        {currentPage === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Today's Tasks</h2>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date().toLocaleDateString('en', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <button
                        onClick={() => toggleTask(task.id, task.completed)}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400 hover:text-green-500 transition-colors" />
                        )}
                      </button>
                      <span
                        className={`font-medium ${
                          task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {task.task_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Progress</h3>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-indigo-600 mb-1">{completionRate}%</div>
                  <div className="text-sm text-gray-600">
                    {completedToday} of {totalTasks} completed
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>

                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={50}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group View */}
        {currentPage === 'group' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Team Progress - Today</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allUsersProgress.map((userProgress) => (
                <div key={userProgress.user.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{userProgress.user.name}</h3>
                      <p className="text-sm text-gray-600">{userProgress.percentage}% complete</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${userProgress.percentage}%` }}
                    ></div>
                  </div>

                  <div className="space-y-2">
                    {userProgress.tasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-2 text-sm">
                        {task.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={task.completed ? 'text-gray-500' : 'text-gray-700'}>
                          {task.task_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports */}
        {currentPage === 'reports' && (
          <div className="space-y-6">
            {/* Weekly Progress Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Progress</h2>
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

            {/* Team Comparison */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Team Comparison - Today</h2>
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

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-2xl font-bold text-indigo-600 mb-1">{completionRate}%</div>
                <div className="text-gray-600">Your Today's Rate</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {Math.round(
                    allUsersProgress.reduce((acc, user) => acc + user.percentage, 0) /
                      (allUsersProgress.length || 1)
                  )}
                  %
                </div>
                <div className="text-gray-600">Team Average</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {weeklyData.reduce((acc, day) => acc + day.completed, 0)}
                </div>
                <div className="text-gray-600">Tasks This Week</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskTracker;
