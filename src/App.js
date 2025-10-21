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
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  // Auth/UI states
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  const today = isoDateString();

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      return;
    }

    const dailyTasks = createDailyTasksFromTemplates(uid, dateStr);
    const { error: insErr } = await supabase.from('tasks').insert(dailyTasks);
    if (insErr) {
      console.error('insert daily tasks error', insErr);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setTasksLoading(true);
    
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
    } else {
      setTasks(data || []);
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
    
    if (authMode !== 'forgot' && !password) {
      errors.password = 'Password is required';
    } else if (authMode !== 'forgot' && password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (authMode === 'signup' && !name.trim()) {
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
      if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('✅ Password reset link sent to your email!');
        setTimeout(() => setAuthMode('login'), 3000);
      } else if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: email.trim(), 
          password 
        });
        if (error) throw error;
        setUser(data.user);
        setMessage('✅ জাযাকাল্লাহ! Access Granted!');
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password, 
          options: { data: { full_name: name.trim() } } 
        });
        
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw error;
        }
        
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
          Taqaddum (تقدّم) - All rights reserved. © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );

  // HACKER-STYLE AUTH SCREEN
  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{
        background: '#000',
      }}>
        <style>{`
          @keyframes matrixFall {
            0% { top: -100%; }
            100% { top: 100%; }
          }
          @keyframes floatDiagonal {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
            50% { opacity: 0.5; }
          }
          @keyframes glow {
            0%, 100% { text-shadow: 0 0 10px #0f0, 0 0 20px #0f0; }
            50% { text-shadow: 0 0 20px #0f0, 0 0 30px #0f0, 0 0 40px #0f0; }
          }
          @keyframes scan {
            0% { top: -100%; }
            100% { top: 100%; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .matrix-rain {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 1;
            opacity: 0.15;
          }
          .matrix-column {
            position: absolute;
            top: -100%;
            font-size: 18px;
            color: #0f0;
            text-shadow: 0 0 8px #0f0;
            white-space: nowrap;
            animation: matrixFall linear infinite;
            font-family: 'Courier New', monospace;
          }
          .grid-square {
            position: fixed;
            width: 40px;
            height: 40px;
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid rgba(0, 255, 0, 0.3);
            animation: floatDiagonal 8s ease-in-out infinite;
            z-index: 2;
            pointer-events: none;
          }
          .hacker-form {
            position: relative;
            z-index: 10;
            width: 400px;
            max-width: 90%;
            background: rgba(0, 20, 0, 0.95);
            border: 2px solid #0f0;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1);
            backdrop-filter: blur(10px);
            animation: fadeIn 1s ease-out;
          }
          .hacker-form::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(transparent 0%, rgba(0, 255, 0, 0.1) 50%, transparent 100%);
            animation: scan 4s linear infinite;
            pointer-events: none;
          }
          .hacker-title {
            color: #0f0;
            font-size: 2em;
            text-align: center;
            margin-bottom: 30px;
            text-shadow: 0 0 10px #0f0;
            letter-spacing: 2px;
            animation: glow 2s ease-in-out infinite;
            font-family: 'Courier New', monospace;
          }
          .hacker-input {
            width: 100%;
            padding: 12px 15px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #0f0;
            border-radius: 4px;
            color: #0f0;
            font-size: 16px;
            outline: none;
            transition: all 0.3s;
            font-family: 'Courier New', monospace;
          }
          .hacker-input::placeholder {
            color: rgba(0, 255, 0, 0.5);
          }
          .hacker-input:focus {
            background: rgba(0, 20, 0, 0.8);
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
          }
          .hacker-btn {
            width: 100%;
            background: #0f0;
            color: #000;
            font-weight: bold;
            cursor: pointer;
            border: none;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 12px;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s;
            font-family: 'Courier New', monospace;
          }
          .hacker-btn:hover {
            box-shadow: 0 0 20px #0f0;
          }
          .hacker-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .hacker-link {
            color: #0f0;
            text-decoration: none;
            font-size: 14px;
            transition: all 0.3s;
            position: relative;
            font-family: 'Courier New', monospace;
          }
          .hacker-link:hover {
            text-shadow: 0 0 10px #0f0;
          }
          .blink {
            animation: blink 1s step-end infinite;
          }
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}</style>

        {/* Matrix Rain Background */}
        <div className="matrix-rain">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="matrix-column"
              style={{
                left: `${i * 2}%`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              {[...Array(20)].map((_, j) => (
                <div key={j}>
                  {String.fromCharCode(Math.random() * 94 + 33)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Floating Grid Squares */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="grid-square"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 5}s`,
            }}
          />
        ))}

        <div className="flex-1 flex items-center justify-center p-4 relative z-10" style={{ minHeight: '100vh' }}>
          <div className="hacker-form">
            <div>
              <h1 className="hacker-title">
                SIGN {authMode === 'forgot' ? 'RESET' : authMode === 'signup' ? 'UP' : 'IN'}
                <span className="blink">_</span>
              </h1>

              {/* Error Message */}
              {authError && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                  fontFamily: 'Courier New, monospace',
                }}>
                  <AlertCircle style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                  {authError}
                </div>
              )}

              {/* Success Message */}
              {message && !authError && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  color: '#6ee7b7',
                  fontSize: '0.875rem',
                  fontFamily: 'Courier New, monospace',
                }}>
                  {message}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {authMode === 'signup' && (
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className="hacker-input"
                      placeholder="USERNAME"
                      disabled={loading}
                      style={{
                        border: fieldErrors.name ? '1px solid #ef4444' : '1px solid #0f0',
                      }}
                    />
                    {fieldErrors.name && (
                      <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'Courier New, monospace' }}>
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.toLowerCase());
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                    }}
                    className="hacker-input"
                    placeholder="EMAIL ADDRESS"
                    disabled={loading}
                    style={{
                      border: fieldErrors.email ? '1px solid #ef4444' : '1px solid #0f0',
                    }}
                  />
                  {fieldErrors.email && (
                    <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'Courier New, monospace' }}>
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {authMode !== 'forgot' && (
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                      }}
                      className="hacker-input"
                      placeholder="PASSWORD"
                      disabled={loading}
                      style={{
                        border: fieldErrors.password ? '1px solid #ef4444' : '1px solid #0f0',
                        paddingRight: '45px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#0f0',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                    </button>
                    {fieldErrors.password && (
                      <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'Courier New, monospace' }}>
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>
                )}

                {authMode === 'login' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button
                      onClick={() => {
                        setAuthMode('forgot');
                        setAuthError('');
                        setFieldErrors({});
                        setMessage(null);
                      }}
                      className="hacker-link"
                      disabled={loading}
                    >
                      FORGOT PASSWORD?
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError('');
                        setFieldErrors({});
                        setMessage(null);
                      }}
                      className="hacker-link"
                      disabled={loading}
                    >
                      SIGNUP
                    </button>
                  </div>
                )}

                <button
                  onClick={handleAuth}
                  disabled={loading}
                  className="hacker-btn"
                  style={{ marginTop: '10px' }}
                >
                  {loading ? (
                    <span>
                      {authMode === 'forgot' ? 'SENDING...' : authMode === 'login' ? 'AUTHENTICATING...' : 'CREATING...'}
                    </span>
                  ) : (
                    authMode === 'forgot' ? '🔐 SEND RESET LINK' : authMode === 'login' ? '⚡ ACCESS SYSTEM' : '📝 CREATE ACCOUNT'
                  )}
                </button>

                {authMode !== 'login' && (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setFieldErrors({});
                        setMessage(null);
                      }}
                      className="hacker-link"
                      disabled={loading}
                    >
                      ← BACK TO LOGIN
                    </button>
                  </div>
                )}
              </div>

              {authMode === 'login' && (
                <div style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(0, 255, 0, 0.05)',
                  border: '1px solid rgba(0, 255, 0, 0.2)',
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#0f0', marginBottom: '0.5rem', fontFamily: 'Courier New, monospace' }}>
                    🌟 Taqaddum (تقدّم) = Progress
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(0, 255, 0, 0.7)', fontFamily: 'Courier New, monospace' }}>
                    <div>• Track daily Salah</div>
                    <div>• Academic & IT progress</div>
                    <div>• Team collaboration</div>
                  </div>
                </div>
              )}
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
