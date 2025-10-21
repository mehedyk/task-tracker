// src/App.js 
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
  Award,
  ExternalLink,
  Moon,
  Sun
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
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Auth/UI states
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

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

    const existingTaskIds = new Set(existing?.map(t => t.task_id) || []);
    const needsCreation = taskTemplates.some(template => !existingTaskIds.has(template.id));

    if (!needsCreation && existing && existing.length > 0) {
      console.log('Tasks already exist');
      return;
    }

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
    
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User' 
      });
    
    if (profileErr) console.warn('Profile upsert warning:', profileErr);
    
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
        
        const mainTasks = userTasks.filter(t => t.is_parent || t.task_type === 'simple');
        const completedMainTasks = mainTasks.filter(t => {
          if (t.task_type === 'simple') return t.completed;
          
          const subtasks = userTasks.filter(st => st.parent_id === t.task_id);
          
          if (t.task_id === 'coding') {
            return subtasks.length > 0 && subtasks.some(st => st.completed);
          }
          
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
        
        if (t.task_id === 'coding') {
          return subtasks.length > 0 && subtasks.some(st => st.completed);
        }
        
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
        setMessage('✅ জাযাকাল্লাহ!');
      } else {
        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password, 
          options: { data: { full_name: name.trim() } } 
        });
        
        if (error) {
          // Check if it's a "user already exists" error
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw error;
        }
        
        // Check if user was actually created (not just email confirmation sent)
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        
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
      
      setEmail('');
      setPassword('');
      setName('');
      setFieldErrors({});
      
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Authentication failed');
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
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: newCompleted } : task
    ));

    const { error } = await supabase
      .from('tasks')
      .update({ completed: newCompleted, updated_at: new Date() })
      .eq('id', taskId);
      
    if (error) {
      console.error('Update task error:', error);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed: !newCompleted } : task
      ));
      setMessage('⚠️ Could not update task');
      return;
    }
    
    loadAllUsersProgress();
  };

  const handleToggleSubtask = async (subtaskId, newCompleted) => {
    await handleToggleTask(subtaskId, newCompleted);
  };

  // Footer Component
  const Footer = () => (
    <footer className={`border-t mt-12 py-6 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-center items-center space-x-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span>A</span>
          <a 
            href="https://github.com/mehedyk" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center space-x-1 font-medium transition-colors duration-200 hover:underline ${
              darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
            }`}
          >
            <span>@mehedyk</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <span>PRODUCT</span>
        </div>
        <div className={`text-center text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Taqaddum (تقدّم)-All rights reserved. © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );

  // Auth screen
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        {/* Dark Mode Toggle */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-full transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300' 
                : 'bg-white hover:bg-gray-100 text-gray-700'
            } shadow-lg`}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className={`auth-form rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 ${
            darkMode ? 'bg-gray-800 bg-opacity-95' : 'bg-white bg-opacity-90'
          }`}>
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Task Tracker Taqaddum
              </h1>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                নামে নাকি কাজে?
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className={`mb-6 p-4 rounded-lg animate-slideIn ${
                darkMode ? 'bg-red-900 bg-opacity-50 border-l-4 border-red-500' : 'bg-red-50 border-l-4 border-red-500'
              }`}>
                <div className="flex items-center">
                  <AlertCircle className={`h-5 w-5 mr-3 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                  <p className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{authError}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {message && !authError && (
              <div className={`mb-6 p-4 rounded-lg animate-slideIn ${
                darkMode ? 'bg-green-900 bg-opacity-50 border-l-4 border-green-500' : 'bg-green-50 border-l-4 border-green-500'
              }`}>
                <p className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{message}</p>
              </div>
            )}

            <div className="space-y-6">
              {!isLogin && (
                <div className="transform transition-all duration-300">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Full Name
                  </label>
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
                        ? 'border-red-500 bg-red-50 focus:ring-red-200' 
                        : darkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500'
                        : 'bg-white border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                    }`}
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                  )}
                </div>
              )}

              <div className="transform transition-all duration-300">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
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
                      ? 'border-red-500 bg-red-50 focus:ring-red-200' 
                      : darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500'
                      : 'bg-white border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                  }`}
                  placeholder="your@email.com"
                  disabled={loading}
                />
                {fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div className="transform transition-all duration-300">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
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
                        ? 'border-red-500 bg-red-50 focus:ring-red-200' 
                        : darkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500'
                        : 'bg-white border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                    }`}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                      darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
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
                className={`font-medium transition-colors ${
                  darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                }`}
                disabled={loading}
              >
                {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>

            <div className={`mt-8 p-4 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-green-50 to-blue-50'
            }`}>
              <p className={`text-sm mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                🌟Taqaddum (تقدّم) মানে Progress; So,
              </p>
              <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div>• Track daily Salah</div>
                <div>• Academic & IT progress </div>
                <div>• Team collaboration & reports</div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate progress for dashboard
  const mainTasks = tasks.filter(t => t.is_parent || t.task_type === 'simple');
  const completedMainTasks = mainTasks.filter(t => {
    if (t.task_type === 'simple') return t.completed;
    
    const subtasks = tasks.filter(st => st.parent_id === t.task_id);
    
    if (t.task_id === 'coding') {
      return subtasks.length > 0 && subtasks.some(st => st.completed);
    }
    
    return subtasks.length > 0 && subtasks.every(st => st.completed);
  });

  const completedToday = completedMainTasks.length;
  const totalTasks = Math.max(mainTasks.length, taskTemplates.length);
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;
  
  const pieData = [
    { name: 'Completed', value: completedToday, color: '#10B981' },
    { name: 'Remaining', value: totalTasks - completedToday, color: darkMode ? '#374151' : '#E5E7EB' }
  ];

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-sm border-b sticky top-0 z-50 ${
        darkMode ? 'bg-gray-800 bg-opacity-95 border-gray-700' : 'bg-white bg-opacity-95 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg animate-pulse">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Task Tracker Taqaddum
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  সালাম, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Brother/Sister'}। কি অবস্থা?
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button 
                onClick={handleSignOut} 
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Navigation */}
          <nav className="flex flex-wrap gap-2 mb-8">
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
                    : darkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
            <div className={`mb-6 p-4 rounded-lg animate-slideIn ${
              darkMode 
                ? 'bg-blue-900 bg-opacity-50 border-l-4 border-blue-500' 
                : 'bg-blue-50 border-l-4 border-blue-500'
            }`}>
              <p className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{message}</p>
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
                  darkMode={darkMode}
                />
              </div>

              <div className="space-y-6">
                {/* Progress Summary */}
                <div className={`rounded-xl shadow-sm p-6 card-hover ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className={`text-lg font-bold mb-4 flex items-center ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    <Target className="h-5 w-5 text-indigo-500 mr-2" />
                    Today's Progress
                  </h3>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold gradient-text mb-1">
                      {completionRate}%
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {completedToday} of {totalTasks} completed
                    </div>
                  </div>

                  <div className={`w-full rounded-full h-3 mb-4 overflow-hidden ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
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
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                            border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                            color: darkMode ? '#ffffff' : '#000000'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Motivational Message */}
                  <div className={`mt-4 p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-green-50 to-blue-50'
                  }`}>
                    <p className={`text-sm text-center font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {completionRate === 100 ? '🎉 Alhamdulillah! Perfect day!' :
                       completionRate >= 75 ? '💪 Great progress! Keep it up!' :
                       completionRate >= 50 ? '🌱 Good start! Push forward!' :
                       completionRate > 0 ? '⭐ Every step counts! Continue!' :
                       '🤲 Bismillah! Let\'s begin today!'}
                    </p>
                  </div>
                </div>

                {/* Quick Task Categories Overview */}
                <div className={`rounded-xl shadow-sm p-6 card-hover ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className={`text-lg font-bold mb-4 flex items-center ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
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
                          
                          if (template.id === 'coding') {
                            isCompleted = completedSubtasks.length > 0;
                            progress = completedSubtasks.length > 0 ? 100 : 0;
                          } else {
                            isCompleted = completedSubtasks.length === subtasks.length;
                            progress = Math.round((completedSubtasks.length / subtasks.length) * 100);
                          }
                        }
                      }

                      return (
                        <div 
                          key={template.id} 
                          className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                            darkMode 
                              ? 'bg-gray-700 hover:bg-gray-600' 
                              : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50'
                          }`}
                          onClick={() => {
                            const taskElement = document.querySelector(`[data-task-id="${template.id}"]`);
                            taskElement?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg animate-bounce">{template.icon}</span>
                            <div>
                              <span className={`text-sm font-medium transition-colors ${
                                isCompleted 
                                  ? 'text-green-600' 
                                  : darkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {template.name}
                              </span>
                              {template.type !== 'simple' && (
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {template.id === 'coding' ? 
                                    (progress > 0 ? 'Completed!' : 'Not started') :
                                    `${progress}% complete`
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {template.type !== 'simple' && (
                              <div className={`w-12 rounded-full h-1.5 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                <div 
                                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
                            ) : (
                              <Circle className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`mt-4 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className={`text-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      💡 Click categories to jump to tasks
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className={`rounded-xl shadow-sm p-6 card-hover ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Today's Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`text-center p-3 rounded-lg ${
                      darkMode ? 'bg-green-900 bg-opacity-30' : 'bg-green-50'
                    }`}>
                      <div className="text-2xl font-bold text-green-600">{completedToday}</div>
                      <div className="text-xs text-green-700">Completed</div>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${
                      darkMode ? 'bg-orange-900 bg-opacity-30' : 'bg-orange-50'
                    }`}>
                      <div className="text-2xl font-bold text-orange-600">{totalTasks - completedToday}</div>
                      <div className="text-xs text-orange-700">Remaining</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Group View */}
          {currentPage === 'group' && (
            <div className="space-y-6">
              <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-bold flex items-center ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
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
                      className={`rounded-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                        u.user.id === user.id 
                          ? darkMode
                            ? 'bg-indigo-900 bg-opacity-50 ring-2 ring-indigo-500'
                            : 'bg-gradient-to-br from-indigo-50 to-purple-50 ring-2 ring-indigo-500'
                          : darkMode
                          ? 'bg-gray-700'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className={`font-bold flex items-center ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {u.user.name}
                            {u.user.id === user.id && <span className="ml-2 text-indigo-500">👤</span>}
                          </h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {u.percentage}% complete
                          </p>
                        </div>
                      </div>

                      <div className={`w-full rounded-full h-3 mb-4 overflow-hidden ${
                        darkMode ? 'bg-gray-600' : 'bg-gray-200'
                      }`}>
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
                            if (template.id === 'coding') {
                              isCompleted = subtasks.length > 0 && subtasks.some(st => st.completed);
                            } else {
                              isCompleted = subtasks.length > 0 && subtasks.every(st => st.completed);
                            }
                          }

                          return (
                            <div key={template.id} className="flex items-center space-x-2 text-sm">
                              {isCompleted ? (
                                <CheckCircle className="h-4 w-4 text-green-500 animate-pulse" />
                              ) : (
                                <Circle className={`h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                              )}
                              <span className={`flex items-center space-x-2 ${
                                isCompleted 
                                  ? 'text-green-600 font-medium' 
                                  : darkMode ? 'text-gray-400' : 'text-gray-700'
                              }`}>
                                <span>{template.icon}</span>
                                <span className="truncate">{template.name}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className={`mt-4 pt-3 border-t ${
                        darkMode ? 'border-gray-600' : 'border-gray-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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

          {/* Reports */}
          {currentPage === 'reports' && (
            <div className="animate-fadeIn">
              <EnhancedReports 
                user={user}
                weeklyData={weeklyData}
                allUsersProgress={allUsersProgress}
                darkMode={darkMode}
              />
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
