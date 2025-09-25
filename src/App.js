// src/App.js - Fixed version with working task creation
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { taskTemplates } from './config/taskTemplates';
import EnhancedTaskList from './components/EnhancedTaskList';
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
  EyeOff
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
  Bar,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
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
        <div className="auth-form bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-3xl">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
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
