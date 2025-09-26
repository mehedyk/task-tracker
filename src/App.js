// src/App.js - FIXED with standard Tailwind classes only
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { taskTemplates } from './config/taskTemplates';
import EnhancedTaskList from './components/EnhancedTaskList';
import EnhancedReports from './components/EnhancedReports';
import {
  User,
  CheckCircle,
  Circle,
  BarChart3,
  Users,
  LogOut,
  Calendar,
  Target,
  AlertCircle,
  Eye,
  EyeOff,
  Award
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

function isoDateString(d = new Date()) {
  return d.toISOString().split('T')[0];
}

// Create daily tasks from templates
const createDailyTasksFromTemplates = (userId, date) => {
  const tasks = [];
  
  taskTemplates.forEach(template => {
    if (template.type === 'simple') {
      tasks.push({
        user_id: userId,
        task_id: template.id,
        task_name: template.name,
        task_type: 'simple',
        date: date,
        completed: false,
        icon: template.icon
      });
    } else {
      // Create main task
      tasks.push({
        user_id: userId,
        task_id: template.id,
        task_name: template.name,
        task_type: template.type,
        date: date,
        completed: false,
        icon: template.icon,
        is_parent: true
      });
      
      // Create subtasks
      template.subtasks.forEach(subtask => {
        tasks.push({
          user_id: userId,
          task_id: `${template.id}_${subtask.id}`,
          task_name: subtask.name,
          task_type: 'subtask',
          parent_id: template.id,
          date: date,
          completed: false,
          link: subtask.link || null
        });
      });
    }
  });
  
  return tasks;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [allUsersProgress, setAllUsersProgress] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);

  // Auth/UI states with animations
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const today = isoDateString();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data?.session?.user) {
        setUser(data.session.user);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTasks();
    loadAllUsersProgress();
    loadWeeklyProgress();
  }, [user, currentPage]);

  const ensureDailyTasks = useCallback(async (uid, dateStr) => {
    console.log('Ensuring daily tasks for:', uid, dateStr);
    
    const { data: existing, error: exErr } = await supabase
      .from('tasks')
      .select('id, task_id')
      .eq('user_id', uid)
      .eq('date', dateStr);

    if (exErr) {
      console.error('check tasks error', exErr);
      return;
    }

    // Check if we already have all the main task templates
    const existingTaskIds = new Set(existing?.map(t => t.task_id) || []);
    const needsCreation = taskTemplates.some(template => !existingTaskIds.has(template.id));

    if (!needsCreation && existing && existing.length > 0) {
      console.log('Tasks already exist');
      return;
    }

    // Create tasks from templates
    const dailyTasks = createDailyTasksFromTemplates(uid, dateStr);
    console.log('Creating tasks:', dailyTasks);
    
    const { error: insErr } = await supabase.from('tasks').insert(dailyTasks);
    if (insErr) {
      console.error('insert daily tasks error', insErr);
    } else {
      console.log('Tasks created successfully');
    }
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setTasksLoading(true);
    
    console.log('Loading tasks for user:', user.id);
    
    // Ensure profile exists
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User' 
      });
    
    if (profileErr) console.warn('Profile upsert warning:', profileErr);
    
    // Ensure daily tasks exist
    await ensureDailyTasks(user.id, today);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('load tasks error', error);
      setTasks([]);
      setMessage('⚠️ Could not load tasks. Check console for details.');
    } else {
      console.log('Loaded tasks:', data);
      setTasks(data || []);
      if (!data || data.length === 0) {
        setMessage('🔄 Creating your daily tasks...');
        // Force task creation
        setTimeout(() => {
          ensureDailyTasks(user.id, today).then(() => {
            loadTasks();
          });
        }, 1000);
      }
    }
    setTasksLoading(false);
  }, [user, today, ensureDailyTasks]);

  const loadAllUsersProgress = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .order('name', { ascending: true });
    
    const { data: tasksToday, error: tErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', today);

    if (tErr) {
      console.error('tasks fetch error', tErr);
      setAllUsersProgress([]);
      return;
    }

    let progress = [];
    if (profiles && profiles.length > 0) {
      progress = profiles.map((p) => {
        const userTasks = (tasksToday || []).filter((t) => t.user_id === p.id);
        
        // Calculate completion based on main tasks only
        const mainTasks = userTasks.filter(t => t.is_parent || t.task_type === 'simple');
        const completedMainTasks = mainTasks.filter(t => {
          if (t.task_type === 'simple') return t.completed;
          
          // For expandable tasks, check if all subtasks are completed
          const subtasks = userTasks.filter(st => st.parent_id === t.task_id);
          return subtasks.length > 0 && subtasks.every(st => st.completed);
        });
        
        const total = Math.max(mainTasks.length, taskTemplates.length);
        const completed = completedMainTasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return { 
          user: { id: p.id, name: p.name || p.id }, 
          tasks: userTasks, 
          completed, 
          total, 
          percentage,
          mainTasks,
          subtasks: userTasks.filter(t => t.task_type === 'subtask')
        };
      });
    }

    setAllUsersProgress(progress);
  }, [today]);

  const loadWeeklyProgress = useCallback(async () => {
    if (!user) return;
    const week = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const { data: tasksOnDay } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr);
        
      const mainTasks = (tasksOnDay || []).filter(t => t.is_parent || t.task_type === 'simple');
      const completedMainTasks = mainTasks.filter(t => {
        if (t.task_type === 'simple') return t.completed;
        
        const subtasks = (tasksOnDay || []).filter(st => st.parent_id === t.task_id);
        return subtasks.length > 0 && subtasks.every(st => st.completed);
      });
      
      const completed = completedMainTasks.length;
      const total = Math.max(mainTasks.length, taskTemplates.length);
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      week.push({ 
        date: d.toLocaleDateString('en', { weekday: 'short' }),
        fullDate: dateStr,
        percentage, 
        completed, 
        total 
      });
    }
    setWeeklyData(week);
  }, [user]);

  // Enhanced auth with validation and animations
  const validateForm = () => {
    const errors = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!isLogin && !name.trim()) {
      errors.name = 'Name is required';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuth = async () => {
    setAuthError('');
    setMessage(null);
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: email.trim(), 
          password 
        });
        if (error) throw error;
        setUser(data.user);
        setMessage('✅ Welcome back!');
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password, 
          options: { data: { full_name: name.trim() } } 
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          setMessage('✅ Account created! Please check your email to verify your account.');
        } else {
          setMessage('✅ Account created successfully!');
          if (data.user) {
            await supabase.from('profiles').upsert({ 
              id: data.user.id, 
              name: name.trim() 
            });
          }
        }
      }
      
      // Clear form
      setEmail('');
      setPassword('');
      setName('');
      setFieldErrors({});
      
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Authentication failed');
      
      // Add shake animation to form
      const form = document.querySelector('.auth-form');
      if (form) {
        form.classList.add('animate-shake');
        setTimeout(() => form.classList.remove('animate-shake'), 500);
      }
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('dashboard');
    setTasks([]);
    setMessage('👋 See you later!');
  };

  const handleToggleTask = async (taskId, newCompleted) => {
    // Optimistic update
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: newCompleted } : task
    ));

    const { error } = await supabase
      .from('tasks')
      .update({ completed: newCompleted, updated_at: new Date() })
      .eq('id', taskId);
      
    if (error) {
      console.error('Update task error:', error);
      // Revert on error
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed: !newCompleted } : task
      ));
      setMessage('⚠️ Could not update task');
      return;
    }
    
    // Reload progress data
    loadAllUsersProgress();
  };

  const handleToggleSubtask = async (subtaskId, newCompleted) => {
    await handleToggleTask(subtaskId, newCompleted);
  };

  // Auth screen with enhanced animations
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="auth-form bg-white bg-opacity-90 rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-3xl">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Task Tracker
            </h1>
            <p className="text-gray-600">Track your Islamic lifestyle & progress</p>
          </div>

          {/* Error Message with Animation */}
          {authError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slideIn">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                <p className="text-red-700 text-sm font-medium">{authError}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {message && !authError && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-slideIn">
              <p className="text-green-700 text-sm font-medium">{message}</p>
            </div>
          )}

          <div className="space-y-6">
            {!isLogin && (
              <div className="transform transition-all duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 focus:ring-2 focus:outline-none ${
                    fieldErrors.name 
                      ? 'border-red-500 bg-red-50 focus:ring-red-200 animate-shake' 
                      : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                  }`}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
                {fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1 animate-slideIn">{fieldErrors.name}</p>
                )}
              </div>
            )}

            <div className="transform transition-all duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value.toLowerCase());
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 focus:ring-2 focus:outline-none ${
                  fieldErrors.email 
                    ? 'border-red-500 bg-red-50 focus:ring-red-200 animate-shake' 
                    : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                }`}
                placeholder="your@email.com"
                disabled={loading}
              />
              {fieldErrors.email && (
                <p className="text-red-500 text-xs mt-1 animate-slideIn">{fieldErrors.email}</p>
              )}
            </div>

            <div className="transform transition-all duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors(prev => ({ ...prev, password: '' }));
                    }
                  }}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg transition-all duration-300 focus:ring-2 focus:outline-none ${
                    fieldErrors.password 
                      ? 'border-red-500 bg-red-50 focus:ring-red-200 animate-shake' 
                      : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                  }`}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-500 text-xs mt-1 animate-slideIn">{fieldErrors.password}</p>
              )}
            </div>

            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError('');
                setFieldErrors({});
                setMessage(null);
              }} 
              className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors transform hover:scale-105"
              disabled={loading}
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2 font-medium">🌟 Islamic Life Tracker</p>
            <div className="text-xs space-y-1 text-gray-500">
              <div>• Track daily Salah & Islamic practices</div>
              <div>• Code & fitness progress monitoring</div>
              <div>• Team collaboration & motivation</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress for dashboard
  const mainTasks = tasks.filter(t => t.is_parent || t.task_type === 'simple');
  const completedMainTasks = mainTasks.filter(t => {
    if (t.task_type === 'simple') return t.completed;
    
    // For expandable tasks, check if all subtasks are completed
    const subtasks = tasks.filter(st => st.parent_id === t.task_id);
    return subtasks.length > 0 && subtasks.every(st => st.completed);
  });

  const completedToday = completedMainTasks.length;
  const totalTasks = Math.max(mainTasks.length, taskTemplates.length);
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;
  
  const pieData = [
    { name: 'Completed', value: completedToday, color: '#10B981' },
    { name: 'Remaining', value: totalTasks - completedToday, color: '#E5E7EB' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50 bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg animate-pulse">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Task Tracker</h1>
                <p className="text-sm text-gray-600">
                  Salaam, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Brother/Sister'}! 🌟
                </p>
              </div>
            </div>
            <button 
              onClick={handleSignOut} 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-all duration-200 hover:scale-105 px-3 py-2 rounded-lg hover:bg-gray-100"
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
            { id: 'reports', label: 'Reports', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button 
              key={id} 
              onClick={() => setCurrentPage(id)} 
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                currentPage === id 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Success/Error Messages */}
        {message && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg animate-slideIn">
            <p className="text-blue-700 font-medium">{message}</p>
          </div>
        )}

        {/* Dashboard */}
        {currentPage === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <EnhancedTaskList 
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                loading={tasksLoading}
              />
            </div>

            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Target className="h-5 w-5 text-indigo-500 mr-2" />
                  Today's Progress
                </h3>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold gradient-text mb-1">
                    {completionRate}%
                  </div>
                  <div className="text-sm text-gray-600">{completedToday} of {totalTasks} completed</div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${completionRate}%` }}
                  />
                </div>

                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={50} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Motivational Message */}
                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <p className="text-sm text-center font-medium">
                    {completionRate === 100 ? '🎉 Alhamdulillah! Perfect day!' :
                     completionRate >= 75 ? '💪 Great progress! Keep it up!' :
                     completionRate >= 50 ? '🌱 Good start! Push forward!' :
                     completionRate > 0 ? '⭐ Every step counts! Continue!' :
                     '🤲 Bismillah! Let\'s begin today!'}
                  </p>
                </div>
              </div>

              {/* Quick Task Categories Overview */}
              <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Award className="h-5 w-5 text-yellow-500 mr-2" />
                  Categories
                </h3>
                <div className="space-y-3">
                  {taskTemplates.map(template => {
                    const templateTasks = tasks.filter(t => t.task_id === template.id || t.parent_id === template.id);
                    const mainTask = templateTasks.find(t => t.task_id === template.id);
                    
                    let isCompleted = false;
                    let progress = 0;
                    
                    if (template.type === 'simple') {
                      isCompleted = mainTask?.completed || false;
                      progress = isCompleted ? 100 : 0;
                    } else {
                      const subtasks = templateTasks.filter(t => t.parent_id === template.id);
                      if (subtasks.length > 0) {
                        const completedSubtasks = subtasks.filter(st => st.completed);
                        isCompleted = completedSubtasks.length === subtasks.length;
                        progress = Math.round((completedSubtasks.length / subtasks.length) * 100);
                      }
                    }

                    return (
                      <div 
                        key={template.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 cursor-pointer transform hover:scale-105"
                        onClick={() => {
                          // Scroll to task in the main list
                          const taskElement = document.querySelector(`[data-task-id="${template.id}"]`);
                          taskElement?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg animate-bounce">{template.icon}</span>
                          <div>
                            <span className={`text-sm font-medium transition-colors ${
                              isCompleted ? 'text-green-600' : 'text-gray-700'
                            }`}>
                              {template.name}
                            </span>
                            {template.type !== 'simple' && (
                              <div className="text-xs text-gray-500">{progress}% complete</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {template.type !== 'simple' && (
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-center text-xs text-gray-500">
                    💡 Click categories to jump to tasks
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-sm p-6 card-hover">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{completedToday}</div>
                    <div className="text-xs text-green-700">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{totalTasks - completedToday}</div>
                    <div className="text-xs text-orange-700">Remaining</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group View - Enhanced */}
        {currentPage === 'group' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Users className="h-6 w-6 text-indigo-500 mr-2" />
                  Team Progress - Today
                </h2>
                <button 
                  onClick={loadAllUsersProgress}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Refresh
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allUsersProgress.map((u) => (
                  <div 
                    key={u.user.id} 
                    className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                      u.user.id === user.id ? 'ring-2 ring-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 flex items-center">
                          {u.user.name}
                          {u.user.id === user.id && <span className="ml-2 text-indigo-500">👤</span>}
                        </h3>
                        <p className="text-sm text-gray-600">{u.percentage}% complete</p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${u.percentage}%` }} 
                      />
                    </div>

                    <div className="space-y-2">
                      {taskTemplates.map(template => {
                        const userTemplateTasks = u.tasks.filter(t => t.task_id === template.id || t.parent_id === template.id);
                        const mainTask = userTemplateTasks.find(t => t.task_id === template.id);
                        
                        let isCompleted = false;
                        if (template.type === 'simple') {
                          isCompleted = mainTask?.completed || false;
                        } else {
                          const subtasks = userTemplateTasks.filter(t => t.parent_id === template.id);
                          isCompleted = subtasks.length > 0 && subtasks.every(st => st.completed);
                        }

                        return (
                          <div key={template.id} className="flex items-center space-x-2 text-sm">
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-500 animate-pulse" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className={`flex items-center space-x-2 ${isCompleted ? 'text-green-600 font-medium' : 'text-gray-700'}`}>
                              <span>{template.icon}</span>
                              <span className="truncate">{template.name}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Performance Badge */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {u.completed}/{u.total} tasks
                        </span>
                        {u.percentage === 100 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                            🏆 Perfect!
                          </span>
                        )}
                        {u.percentage >= 75 && u.percentage < 100 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🚀 Excellent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reports - Enhanced */}
        {currentPage === 'reports' && (
          <div className="animate-fadeIn">
            <EnhancedReports 
              user={user}
              weeklyData={weeklyData}
              allUsersProgress={allUsersProgress}
            />
          </div>
        )}
      </div>
    </div>
  );
}
