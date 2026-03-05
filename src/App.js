// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { taskTemplates } from './config/taskTemplates';
import EnhancedTaskList from './components/EnhancedTaskList';
import EnhancedReports from './components/EnhancedReports';
import CustomTasksManager from './components/CustomTasksManager';
import CustomTasksReports from './components/CustomTasksReports';
import CustomTasksTeamReports from './components/CustomTasksTeamReports';
import CursorTrail from './components/CursorTrail';
import {
  Activity,
  User,
  CheckCircle,
  Circle,
  BarChart3,
  Users,
  LogOut,
  Target,
  AlertCircle,
  Eye,
  EyeOff,
  Award,
  ExternalLink,
  Moon,
  Sun,
  X,
  PenLine
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

const createDailyTasksFromTemplates = (userId, date) => {
  const tasks = [];

  taskTemplates.forEach(template => {
    if (template.type === 'simple') {
      tasks.push({
        user_id: userId,
        task_id: template.id,
        task_name: template.name,
        task_type: 'simple',
        date,
        completed: false,
        icon: template.icon
      });
    } else {
      tasks.push({
        user_id: userId,
        task_id: template.id,
        task_name: template.name,
        task_type: template.type,
        date,
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
          date,
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

  // Pen cursor trail toggle
  const [penEnabled, setPenEnabled] = useState(() => {
    const saved = localStorage.getItem('penEnabled');
    return saved ? JSON.parse(saved) : false;
  });

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
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const today = isoDateString();

  // ── Side effects ─────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('penEnabled', JSON.stringify(penEnabled));
  }, [penEnabled]);

  // Apply pen cursor class to body
  useEffect(() => {
    if (penEnabled) {
      document.body.classList.add('pen-cursor');
    } else {
      document.body.classList.remove('pen-cursor');
    }
    return () => document.body.classList.remove('pen-cursor');
  }, [penEnabled]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data?.session?.user) setUser(data.session.user);
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
  }, [user, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data helpers ──────────────────────────────────────────────────────────

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

    const existingIds = new Set(existing?.map(t => t.task_id) || []);
    const needsCreation = taskTemplates.some(t => !existingIds.has(t.id));

    if (!needsCreation && existing && existing.length > 0) return;

    const dailyTasks = createDailyTasksFromTemplates(uid, dateStr);
    const { error: insErr } = await supabase.from('tasks').insert(dailyTasks);
    if (insErr) console.error('insert daily tasks error', insErr);
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
      setMessage('⚠️ Could not load tasks.');
    } else {
      setTasks(data || []);
      // Only show message, don't recurse — ensureDailyTasks already ran above
      if (!data || data.length === 0) {
        setMessage('🔄 Creating your daily tasks...');
      }
    }

    setTasksLoading(false);
  }, [user, today, ensureDailyTasks]);

  const loadAllUsersProgress = useCallback(async () => {
    // Intentionally fetches all profiles — team feature by design
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .order('name', { ascending: true });

    // Single query for today's tasks across all users (team view)
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
      progress = profiles.map(p => {
        const userTasks = (tasksToday || []).filter(t => t.user_id === p.id);
        const mainTasks = userTasks.filter(t => t.is_parent || t.task_type === 'simple');
        const completedMainTasks = mainTasks.filter(t => {
          if (t.task_type === 'simple') return t.completed;
          const subtasks = userTasks.filter(st => st.parent_id === t.task_id);
          if (t.task_id === 'coding') return subtasks.length > 0 && subtasks.some(st => st.completed);
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

  // Fixed: single range query instead of 7 sequential calls
  const loadWeeklyProgress = useCallback(async () => {
    if (!user) return;

    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const { data: allTasksInRange } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    const week = dates.map(dateStr => {
      const tasksOnDay = (allTasksInRange || []).filter(t => t.date === dateStr);
      const mainTasks = tasksOnDay.filter(t => t.is_parent || t.task_type === 'simple');
      const completedMainTasks = mainTasks.filter(t => {
        if (t.task_type === 'simple') return t.completed;
        const subtasks = tasksOnDay.filter(st => st.parent_id === t.task_id);
        if (t.task_id === 'coding') return subtasks.length > 0 && subtasks.some(st => st.completed);
        return subtasks.length > 0 && subtasks.every(st => st.completed);
      });

      const completed = completedMainTasks.length;
      const total = Math.max(mainTasks.length, taskTemplates.length);
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const d = new Date(dateStr + 'T00:00:00');

      return {
        date: d.toLocaleDateString('en', { weekday: 'short' }),
        fullDate: dateStr,
        percentage,
        completed,
        total
      };
    });

    setWeeklyData(week);
  }, [user]);

  // ── Auth ──────────────────────────────────────────────────────────────────

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
          setMessage('✅ Account created! Please check your email to verify.');
        } else {
          setMessage('✅ Account created successfully!');
          if (data.user) {
            await supabase.from('profiles').upsert({ id: data.user.id, name: name.trim() });
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
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t));

    const { error } = await supabase
      .from('tasks')
      .update({ completed: newCompleted, updated_at: new Date() })
      .eq('id', taskId);

    if (error) {
      console.error('Update task error:', error);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !newCompleted } : t));
      setMessage('⚠️ Could not update task');
      return;
    }

    loadAllUsersProgress();
  };

  const handleToggleSubtask = async (subtaskId, newCompleted) => {
    await handleToggleTask(subtaskId, newCompleted);
  };

  // ── Sub-components ────────────────────────────────────────────────────────

  const Footer = () => (
    <footer className={`border-t mt-12 py-6 ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'border-stone-200'
    }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-center items-center space-x-2 text-sm ${
          darkMode ? 'text-gray-400' : 'text-stone-500'
        }`}>
          <span>A</span>
          <a
            href="https://github.com/mehedyk"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center space-x-1 font-medium transition-colors duration-200 hover:underline ${
              darkMode ? 'text-sky-400 hover:text-sky-300' : 'text-teal-700 hover:text-teal-900'
            }`}
          >
            <span>mehedyk</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <span>PRODUCT</span>
        </div>
        <div className={`text-center text-xs mt-2 ${darkMode ? 'text-gray-600' : 'text-stone-400'}`}>
          Taqaddum (تقدّم) — All rights reserved © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );

  const NixieClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    const fmt = (n) => String(n).padStart(2, '0');
    const year    = String(time.getFullYear()).slice(-2);
    const month   = fmt(time.getMonth() + 1);
    const day     = fmt(time.getDate());
    const hours   = fmt(time.getHours());
    const minutes = fmt(time.getMinutes());
    const seconds = fmt(time.getSeconds());

    const TimeUnit = ({ digit1, digit2, label }) => (
      <div className="flex flex-col items-center">
        <div className="nixie-tube">
          <div className="tube-rails">
            <div className="tube-rail tube-rail-left" />
            <div className="tube-rail tube-rail-right" />
          </div>
          <div className="nixie-digit">{digit1}</div>
          <div className="nixie-digit">{digit2}</div>
        </div>
        <div className="tube-label">{label}</div>
      </div>
    );

    return (
      <div className="flex flex-col items-center justify-center w-full px-2">
        <style>{`
          @keyframes nixie-glow {
            0%, 100% { text-shadow: 0 0 8px rgba(255,140,60,1), 0 0 16px rgba(255,120,40,.8), 0 0 24px rgba(255,100,20,.6); }
            50%       { text-shadow: 0 0 12px rgba(255,140,60,1), 0 0 24px rgba(255,120,40,.9), 0 0 36px rgba(255,100,20,.7); }
          }
          .nixie-tube {
            position: relative; width: 80px; height: 140px;
            background: linear-gradient(180deg, rgba(40,25,15,.95) 0%, rgba(25,15,10,.98) 50%, rgba(20,10,5,1) 100%);
            border-radius: 35px;
            border: 2px solid; border-color: rgba(180,120,60,.4) rgba(120,80,40,.6) rgba(80,50,25,.8);
            box-shadow: inset 0 0 20px rgba(255,140,20,.1), inset 0 0 10px rgba(0,0,0,.8), 0 6px 20px rgba(0,0,0,.9), 0 0 40px rgba(255,120,20,.15);
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; overflow: hidden;
          }
          .nixie-tube::before {
            content: ''; position: absolute; inset: 4px;
            background: radial-gradient(ellipse at center, rgba(255,140,20,.03) 0%, transparent 60%);
            border-radius: 31px; pointer-events: none;
          }
          .tube-rails { position: absolute; inset: 0; pointer-events: none; }
          .tube-rail {
            position: absolute; width: 6px; height: 100%;
            background: linear-gradient(90deg, rgba(140,100,50,.6) 0%, rgba(100,70,35,.8) 50%, rgba(60,40,20,.6) 100%);
            box-shadow: inset 1px 0 2px rgba(0,0,0,.8), inset -1px 0 2px rgba(0,0,0,.6);
          }
          .tube-rail-left  { left: 8px;  border-radius: 3px 0 0 3px; }
          .tube-rail-right { right: 8px; border-radius: 0 3px 3px 0; }
          .nixie-digit {
            font-family: 'Courier New', 'Monaco', monospace;
            font-size: 36px; font-weight: 700; color: #FF8C3C;
            animation: nixie-glow 2s ease-in-out infinite;
            position: relative; z-index: 2; letter-spacing: -2px; text-align: center; width: 100%;
          }
          .tube-label {
            margin-top: 8px; font-size: 10px; font-weight: 600;
            text-transform: uppercase; color: rgba(255,140,60,.9); letter-spacing: 1px; text-align: center;
          }
          .time-separator {
            font-size: 28px; color: #FF8C3C;
            animation: nixie-glow 1.5s ease-in-out infinite;
            margin: 0 2px; padding-bottom: 20px;
          }
          @media (max-width: 640px) {
            .nixie-tube { width: 60px; height: 110px; border-radius: 28px; gap: 6px; }
            .nixie-digit { font-size: 28px; }
            .tube-label { font-size: 8px; margin-top: 6px; }
            .time-separator { font-size: 22px; }
            .tube-rail { width: 5px; }
          }
        `}</style>

        <div className="flex items-end justify-center flex-wrap gap-1">
          <TimeUnit digit1={year[0]} digit2={year[1]} label="Year" />
          <div className="time-separator">:</div>
          <TimeUnit digit1={month[0]} digit2={month[1]} label="Month" />
          <div className="time-separator">:</div>
          <TimeUnit digit1={day[0]} digit2={day[1]} label="Day" />
          <div className="time-separator">:</div>
          <TimeUnit digit1={hours[0]} digit2={hours[1]} label="Hour" />
          <div className="time-separator">:</div>
          <TimeUnit digit1={minutes[0]} digit2={minutes[1]} label="Min" />
          <div className="time-separator">:</div>
          <TimeUnit digit1={seconds[0]} digit2={seconds[1]} label="Sec" />
        </div>
      </div>
    );
  };

  const AboutModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full rounded-2xl relative max-h-[90vh] flex flex-col ${
        darkMode ? 'bg-gray-900 border border-gray-800' : 'border border-stone-200'
      }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
        <button onClick={() => setShowAbout(false)}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 dark:hover:text-white z-10">
          <X className="h-6 w-6" />
        </button>

        <div className="p-8 overflow-y-auto">
          <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            About Taqaddum (تقدّم)
          </h2>

          <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
            <p className="text-lg leading-relaxed">
              <strong className="text-teal-700 dark:text-teal-400">Taqaddum</strong> means{' '}
              <em>"Progress"</em> in Arabic. This project was born from a simple need: to track
              daily natural practices, academic goals, and personal development in one unified
              platform. In one word, being a better Muslim is the promise we made to our Creator.
            </p>

            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-amber-50 border border-amber-100'}`}>
              <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                🎯 Why We Created This
              </h3>
              <ul className="space-y-2 text-sm">
                <li>• Track 5 daily prayers (Salah) — even if Qaza</li>
                <li>• Monitor academic & coding progress</li>
                <li>• Stay accountable with fitness goals</li>
                <li>• Learn core Islamic principles daily</li>
                <li>• Fight addictions & maintain clean lifestyle</li>
                <li>• See team progress & stay motivated together</li>
                <li>• Visualize performance reports and charts</li>
              </ul>
            </div>

            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-teal-50 border border-teal-100'}`}>
              <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                💡 Core Philosophy
              </h3>
              <p className="text-sm italic">
                "The most beloved of deeds to Allah are the most consistent of them, even if they are small."
                <br />— Prophet Muhammad (PBUH) Bukhari-6464
              </p>
            </div>

            <p>
              Built with <span className="text-red-600">Personal Reasons</span> using React, Supabase, and Tailwind CSS.
              Open source to use and free for everyone.
            </p>

            <div className="flex justify-center pt-4">
              <a
                href="https://github.com/mehedyk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all duration-200"
              >
                <span>View on GitHub</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ContactModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`max-w-md w-full rounded-2xl p-8 relative ${
        darkMode ? 'bg-gray-900 border border-gray-800' : 'border border-stone-200'
      }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
        <button onClick={() => setShowContact(false)}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700">
          <X className="h-6 w-6" />
        </button>

        <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
          Contact
        </h2>

        <div className={`space-y-6 ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
          <p className="text-lg">
            Have questions, suggestions, or want to contribute? Feel free to reach out!
          </p>

          <div className={`p-6 rounded-xl text-center ${
            darkMode ? 'bg-gray-800' : 'bg-stone-50 border border-stone-200'
          }`}>
            <div className="mb-4">
              <div className="bg-stone-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👨‍💻</span>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                S. M. Mehedy Kawser
              </h3>
              <p className="text-sm">Software Engineering Student</p>
              <p className="text-xs mt-1">Daffodil International University</p>
            </div>

            <div className="space-y-3">
              <a
                href="https://github.com/mehedyk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">GitHub Profile</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className={`text-sm text-center ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
            <p>🌟 Open for collaboration and feedback!</p>
          </div>
        </div>
      </div>
    </div>
  );

  const ForgotPasswordModal = () => {
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState('');
    const [resetError, setResetError] = useState('');

    const handlePasswordReset = async () => {
      if (!resetEmail) { setResetError('Please enter your email'); return; }
      if (!/\S+@\S+\.\S+/.test(resetEmail)) { setResetError('Invalid email format'); return; }

      setResetLoading(true);
      setResetError('');
      setResetMessage('');

      try {
        // redirectTo points to the auth callback — handle token in Supabase dashboard or a dedicated page
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/?reset=true`
        });
        if (error) throw error;
        setResetMessage('✅ Password reset link sent to your email!');
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetEmail('');
          setResetMessage('');
        }, 3000);
      } catch (err) {
        setResetError(err.message || 'Failed to send reset email');
      } finally {
        setResetLoading(false);
      }
    };

    const close = () => {
      setShowForgotPassword(false);
      setResetEmail('');
      setResetMessage('');
      setResetError('');
    };

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className={`max-w-md w-full rounded-2xl p-8 relative ${
          darkMode ? 'bg-gray-900 border border-gray-800' : 'border border-stone-200'
        }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
          <button onClick={close} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700">
            <X className="h-6 w-6" />
          </button>

          <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            Reset Password
          </h2>

          <div className={`space-y-5 ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
            <p>Enter your email and we'll send you a reset link.</p>

            {resetError && (
              <div className="p-4 rounded-xl bg-red-50 border-l-4 border-red-500">
                <p className="text-sm font-medium text-red-700">{resetError}</p>
              </div>
            )}

            {resetMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border-l-4 border-emerald-500">
                <p className="text-sm font-medium text-emerald-700">{resetMessage}</p>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">📧</span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => { setResetEmail(e.target.value.toLowerCase()); setResetError(''); }}
                  className={`w-full pl-12 pr-4 py-3 border rounded-xl transition-all duration-200 ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white focus:border-sky-500'
                      : 'bg-stone-50 border-stone-300 focus:border-teal-600 focus:bg-white'
                  }`}
                  placeholder="your@email.com"
                  disabled={resetLoading}
                />
              </div>
            </div>

            <button
              onClick={handlePasswordReset}
              disabled={resetLoading}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-all duration-200 disabled:opacity-50"
            >
              {resetLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner h-5 w-5 mr-2" />
                  Sending...
                </div>
              ) : 'Send Reset Link'}
            </button>

            <button
              onClick={close}
              className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
              }`}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Auth screen ───────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col ${
        darkMode ? 'bg-gray-950' : ''
      }`} style={!darkMode ? { background: 'var(--bg-base)' } : {}}>
        {showAbout && <AboutModal />}
        {showContact && <ContactModal />}
        {showForgotPassword && <ForgotPasswordModal />}

        {/* Cursor trail on login page too */}
        <CursorTrail enabled={penEnabled} darkMode={darkMode} />

        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          {/* Pen toggle */}
          <button
            onClick={() => setPenEnabled(p => !p)}
            title={penEnabled ? 'Turn off pen cursor' : 'Turn on pen cursor'}
            className={`p-2.5 rounded-full transition-all duration-200 shadow-md text-xs font-semibold ${
              penEnabled
                ? 'bg-teal-700 text-white'
                : darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            <PenLine className="h-4 w-4" />
          </button>

          <button
            onClick={() => setDarkMode(d => !d)}
            className={`p-2.5 rounded-full transition-all duration-200 shadow-md ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-amber-300'
                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className={`flex flex-col lg:flex-row max-w-6xl w-full rounded-3xl overflow-hidden shadow-2xl ${
            darkMode ? 'bg-gray-900/95 border border-gray-800' : 'border border-stone-200'
          }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>

            {/* Left panel — Nixie clock */}
            <div className="flex flex-col items-center justify-center p-8 lg:p-12 lg:flex-1 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800 relative overflow-hidden">
              {/* Subtle warm texture overlay */}
              <div className="absolute inset-0 opacity-20"
                style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,140,60,0.15) 0%, transparent 70%)' }} />

              <div className="lg:absolute top-8 left-8 mb-4 lg:mb-0">
                <h2 className="text-white text-2xl lg:text-3xl font-bold tracking-tight text-center lg:text-left"
                  style={{ fontFamily: 'Georgia, serif' }}>
                  Taqaddum.
                </h2>
              </div>

              <div className="my-6 lg:my-0 relative z-10">
                <NixieClock />
              </div>

              <div className="lg:absolute bottom-12 left-8 text-center lg:text-left mt-4 lg:mt-0">
                <h1 className="text-white text-3xl lg:text-5xl font-bold mb-2"
                  style={{ fontFamily: 'Georgia, serif' }}>
                  {isLogin ? 'Welcome Back, Bhai!' : 'Welcome, Bhai!'}
                </h1>
                <p className="text-stone-400 text-base lg:text-lg">
                  {isLogin ? 'নামে নাকি কাজে!?' : 'Create your account'}
                </p>
              </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 p-8 lg:p-12">
              <div className="max-w-md mx-auto">
                <div className="flex justify-end items-center space-x-4 lg:space-x-6 mb-8 text-xs lg:text-sm font-medium tracking-wide">
                  <button
                    onClick={() => window.open('/', '_self')}
                    className={`${darkMode ? 'text-gray-500 hover:text-white' : 'text-stone-400 hover:text-stone-800'} hidden sm:inline transition-colors`}
                  >
                    HOME
                  </button>
                  <button
                    onClick={() => setShowAbout(true)}
                    className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'} transition-colors`}
                  >
                    ABOUT
                  </button>
                  <button
                    onClick={() => setShowContact(true)}
                    className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'} transition-colors`}
                  >
                    CONTACT
                  </button>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                    {isLogin ? 'LOG IN' : 'SIGN UP'}
                  </span>
                </div>

                <h2 className={`text-4xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-stone-900'}`}
                  style={{ fontFamily: 'Georgia, serif' }}>
                  {isLogin ? 'Log in' : 'Sign up'}
                </h2>

                {authError && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 border-l-4 border-red-500 animate-slideIn">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-3 text-red-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-red-700">{authError}</p>
                    </div>
                  </div>
                )}

                {message && !authError && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50 border-l-4 border-emerald-500 animate-slideIn">
                    <p className="text-sm font-medium text-emerald-700">{message}</p>
                  </div>
                )}

                <div className="space-y-5">
                  {!isLogin && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">👤</span>
                        <input
                          type="text"
                          value={name}
                          onChange={e => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: '' })); }}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl transition-all duration-200 ${
                            fieldErrors.name
                              ? 'border-red-500 bg-red-50'
                              : darkMode
                              ? 'bg-gray-800 border-gray-700 text-white focus:border-sky-500'
                              : 'bg-stone-50 border-stone-300 focus:border-teal-600 focus:bg-white'
                          }`}
                          placeholder="Your Full Name"
                          disabled={loading}
                        />
                      </div>
                      {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">📧</span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value.toLowerCase()); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' })); }}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl transition-all duration-200 ${
                          fieldErrors.email
                            ? 'border-red-500 bg-red-50'
                            : darkMode
                            ? 'bg-gray-800 border-gray-700 text-white focus:border-sky-500'
                            : 'bg-stone-50 border-stone-300 focus:border-teal-600 focus:bg-white'
                        }`}
                        placeholder="your@email.com"
                        disabled={loading}
                        onKeyDown={e => e.key === 'Enter' && handleAuth()}
                      />
                    </div>
                    {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔒</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' })); }}
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl transition-all duration-200 ${
                          fieldErrors.password
                            ? 'border-red-500 bg-red-50'
                            : darkMode
                            ? 'bg-gray-800 border-gray-700 text-white focus:border-sky-500'
                            : 'bg-stone-50 border-stone-300 focus:border-teal-600 focus:bg-white'
                        }`}
                        placeholder="••••••••"
                        disabled={loading}
                        onKeyDown={e => e.key === 'Enter' && handleAuth()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
                  </div>

                  {isLogin && (
                    <div className="flex items-center justify-end text-sm">
                      <button
                        onClick={() => setShowForgotPassword(true)}
                        className={`transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'}`}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleAuth}
                    disabled={loading}
                    className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner h-5 w-5 mr-2" />
                        {isLogin ? 'Signing In...' : 'Creating Account...'}
                      </div>
                    ) : (
                      isLogin ? 'Log in' : 'Create Account'
                    )}
                  </button>

                  <div className={`text-center text-sm ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>or</div>

                  <button
                    onClick={() => { setIsLogin(l => !l); setAuthError(''); setFieldErrors({}); setMessage(null); }}
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                      darkMode
                        ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                        : 'bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </div>

                <div className={`mt-8 p-4 rounded-xl text-sm ${
                  darkMode ? 'bg-gray-800' : 'bg-amber-50 border border-amber-100'
                }`}>
                  <p className={`mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>
                    🌟 Taqaddum (تقدّم) মানে Progress
                  </p>
                  <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-stone-600'}`}>
                    <div>• Track daily Salah &amp; Islamic lifestyle</div>
                    <div>• Monitor academic &amp; IT progress</div>
                    <div>• Team collaboration &amp; reports</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Main app ──────────────────────────────────────────────────────────────

  const mainTasks = tasks.filter(t => t.is_parent || t.task_type === 'simple');
  const completedMainTasks = mainTasks.filter(t => {
    if (t.task_type === 'simple') return t.completed;
    const subtasks = tasks.filter(st => st.parent_id === t.task_id);
    if (t.task_id === 'coding') return subtasks.length > 0 && subtasks.some(st => st.completed);
    return subtasks.length > 0 && subtasks.every(st => st.completed);
  });

  const completedToday = completedMainTasks.length;
  const totalTasks = Math.max(mainTasks.length, taskTemplates.length);
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

  const pieData = [
    { name: 'Completed', value: completedToday, color: '#059669' },
    { name: 'Remaining', value: totalTasks - completedToday, color: darkMode ? '#1C2330' : '#E7E3DC' }
  ];

  const accentColor   = darkMode ? '#0EA5E9' : '#0F766E';
  const tooltipBg     = darkMode ? '#161B22' : '#FDFAF5';
  const tooltipBorder = darkMode ? '#2D3748' : '#D6CFC3';

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950' : ''}`}
      style={!darkMode ? { background: 'var(--bg-base)' } : {}}>

      <CursorTrail enabled={penEnabled} darkMode={darkMode} />

      {/* ── Header ── */}
      <header className={`shadow-sm border-b sticky top-0 z-50 ${
        darkMode
          ? 'bg-gray-900/95 border-gray-800 backdrop-blur-sm'
          : 'border-stone-200 backdrop-blur-sm'
      }`} style={!darkMode ? { background: 'rgba(253,250,245,0.95)' } : {}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-sky-900/40' : 'bg-teal-50 border border-teal-200'}`}>
                <Target className={`h-6 w-6 ${darkMode ? 'text-sky-400' : 'text-teal-700'}`} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-stone-900'}`}
                  style={{ fontFamily: 'Georgia, serif' }}>
                  Taqaddum
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                  সালাম, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Brother/Sister'}। কি অবস্থা?
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Pen cursor toggle */}
              <button
                onClick={() => setPenEnabled(p => !p)}
                title={penEnabled ? 'Turn off pen cursor' : 'Turn on pen cursor'}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  penEnabled
                    ? 'bg-teal-700 text-white'
                    : darkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200'
                }`}
              >
                <PenLine className="h-4 w-4" />
              </button>

              <button
                onClick={() => setDarkMode(d => !d)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-amber-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                }`}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <button
                onClick={handleSignOut}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Nav */}
          <nav className="flex flex-wrap gap-2 mb-8">
            {[
              { id: 'dashboard',     label: 'My Tasks',             icon: CheckCircle },
              { id: 'custom',        label: 'Custom Tasks',          icon: Target },
              { id: 'group',         label: 'Team Progress',         icon: Users },
              { id: 'reports',       label: 'Reports',               icon: BarChart3 },
              { id: 'custom-reports',label: 'Custom Reports',        icon: Activity },
              { id: 'custom-team',   label: 'Custom Team Reports',   icon: Users }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentPage(id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  currentPage === id
                    ? darkMode
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30'
                      : 'bg-teal-700 text-white shadow-lg shadow-teal-900/20'
                    : darkMode
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-teal-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {message && (
            <div className={`mb-6 p-4 rounded-xl animate-slideIn ${
              darkMode
                ? 'bg-sky-900/30 border-l-4 border-sky-500'
                : 'bg-teal-50 border-l-4 border-teal-500'
            }`}>
              <p className={`font-medium ${darkMode ? 'text-sky-300' : 'text-teal-800'}`}>{message}</p>
            </div>
          )}

          {/* ── Dashboard ── */}
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
                {/* Progress card */}
                <div className={`rounded-xl p-6 card-hover border ${
                  darkMode ? 'bg-gray-900 border-gray-800' : 'border-stone-200'
                }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
                  <h3 className={`text-lg font-bold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-stone-900'}`}
                    style={{ fontFamily: 'Georgia, serif' }}>
                    <Target className={`h-5 w-5 mr-2 ${darkMode ? 'text-sky-400' : 'text-teal-700'}`} />
                    Today's Progress
                  </h3>

                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold gradient-text mb-1">{completionRate}%</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      {completedToday} of {totalTasks} completed
                    </div>
                  </div>

                  <div className={`w-full rounded-full h-2.5 mb-4 overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`}>
                    <div
                      className="progress-bar h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>

                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={48} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', color: darkMode ? '#E6EDF3' : '#1A1208' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={`mt-4 p-3 rounded-lg text-sm text-center font-medium ${
                    darkMode ? 'bg-gray-800 text-gray-300' : 'bg-amber-50 text-stone-700 border border-amber-100'
                  }`}>
                    {completionRate === 100 ? '🎉 Alhamdulillah! Perfect day!' :
                     completionRate >= 75  ? '💪 Great progress! Keep it up!' :
                     completionRate >= 50  ? '🌱 Good start! Push forward!' :
                     completionRate > 0    ? '⭐ Every step counts! Continue!' :
                     '🤲 Bismillah! Let\'s begin today!'}
                  </div>
                </div>

                {/* Stats card */}
                <div className={`rounded-xl p-6 border ${
                  darkMode ? 'bg-gray-900 border-gray-800' : 'border-stone-200'
                }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
                  <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-stone-900'}`}
                    style={{ fontFamily: 'Georgia, serif' }}>
                    Today's Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`text-center p-3 rounded-lg ${
                      darkMode ? 'bg-emerald-900/20 border border-emerald-900/30' : 'bg-emerald-50 border border-emerald-100'
                    }`}>
                      <div className="text-2xl font-bold text-emerald-600">{completedToday}</div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Completed</div>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${
                      darkMode ? 'bg-amber-900/20 border border-amber-900/30' : 'bg-amber-50 border border-amber-100'
                    }`}>
                      <div className="text-2xl font-bold text-amber-600">{totalTasks - completedToday}</div>
                      <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">Remaining</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Team Progress ── */}
          {currentPage === 'group' && (
            <div className="space-y-6">
              <div className={`rounded-xl p-6 border ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'border-stone-200'
              }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-bold flex items-center ${darkMode ? 'text-white' : 'text-stone-900'}`}
                    style={{ fontFamily: 'Georgia, serif' }}>
                    <Users className={`h-6 w-6 mr-2 ${darkMode ? 'text-sky-400' : 'text-teal-700'}`} />
                    Team Progress — Today
                  </h2>
                  <button
                    onClick={loadAllUsersProgress}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      darkMode
                        ? 'bg-sky-600 text-white hover:bg-sky-500'
                        : 'bg-teal-700 text-white hover:bg-teal-800'
                    }`}
                  >
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allUsersProgress.map(u => (
                    <div
                      key={u.user.id}
                      className={`rounded-xl p-5 border transition-all duration-200 hover:shadow-lg ${
                        u.user.id === user.id
                          ? darkMode
                            ? 'bg-sky-900/20 border-sky-700/50'
                            : 'bg-teal-50 border-teal-300'
                          : darkMode
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                          darkMode ? 'bg-gray-700' : 'bg-stone-200'
                        }`}>
                          <User className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-stone-600'}`} />
                        </div>
                        <div>
                          <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                            {u.user.name}
                            {u.user.id === user.id && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                darkMode ? 'bg-sky-900/40 text-sky-400' : 'bg-teal-100 text-teal-800'
                              }`}>you</span>
                            )}
                          </h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                            {u.percentage}% complete
                          </p>
                        </div>
                      </div>

                      <div className={`w-full rounded-full h-2 mb-4 ${darkMode ? 'bg-gray-700' : 'bg-stone-200'}`}>
                        <div
                          className="progress-bar h-2 rounded-full transition-all duration-700"
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
                            isCompleted = template.id === 'coding'
                              ? subtasks.length > 0 && subtasks.some(st => st.completed)
                              : subtasks.length > 0 && subtasks.every(st => st.completed);
                          }

                          return (
                            <div key={template.id} className="flex items-center space-x-2 text-sm">
                              {isCompleted
                                ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                : <Circle className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-stone-300'}`} />
                              }
                              <span className={`flex items-center gap-1 truncate ${
                                isCompleted
                                  ? 'text-emerald-600 font-medium'
                                  : darkMode ? 'text-gray-400' : 'text-stone-600'
                              }`}>
                                <span>{template.icon}</span>
                                <span className="truncate">{template.name}</span>
                                {template.category === 'business' && (
                                  <span className="business-badge ml-1 hidden sm:inline-flex">biz</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className={`mt-4 pt-3 border-t flex justify-between items-center ${
                        darkMode ? 'border-gray-700' : 'border-stone-200'
                      }`}>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                          {u.completed}/{u.total} tasks
                        </span>
                        {u.percentage === 100 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            🏆 Perfect!
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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

          {currentPage === 'custom' && (
            <div className="animate-fadeIn">
              <CustomTasksManager user={user} darkMode={darkMode} />
            </div>
          )}

          {currentPage === 'custom-reports' && (
            <div className="animate-fadeIn">
              <CustomTasksReports user={user} darkMode={darkMode} />
            </div>
          )}

          {currentPage === 'custom-team' && (
            <div className="animate-fadeIn">
              <CustomTasksTeamReports user={user} darkMode={darkMode} />
            </div>
          )}

        </div>
      </div>

      <Footer />
    </div>
  );
}