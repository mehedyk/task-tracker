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
  Sun,
  X
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
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const today = isoDateString();

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
      setMessage('⚠️ Could not load tasks.');
    } else {
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
          Taqaddum (تقدّم) - All rights reserved © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );

  // REALISTIC NIXIE TUBE CLOCK COMPONENT
  const NixieClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    const formatTime = (num) => String(num).padStart(2, '0');
    const hours = formatTime(time.getHours());
    const minutes = formatTime(time.getMinutes());
    const seconds = formatTime(time.getSeconds());

    return (
      <div className="flex flex-col items-center justify-center">
        <style>{`
          @keyframes nixie-glow {
            0%, 100% { 
              text-shadow: 
                0 0 10px rgba(255, 140, 60, 1),
                0 0 20px rgba(255, 120, 40, 0.8),
                0 0 30px rgba(255, 100, 20, 0.6),
                0 0 40px rgba(255, 80, 10, 0.4);
            }
            50% { 
              text-shadow: 
                0 0 15px rgba(255, 140, 60, 1),
                0 0 30px rgba(255, 120, 40, 0.9),
                0 0 45px rgba(255, 100, 20, 0.7),
                0 0 60px rgba(255, 80, 10, 0.5);
            }
          }
          
          @keyframes base-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 140, 20, 0.6); }
            50% { box-shadow: 0 0 30px rgba(255, 140, 20, 0.9); }
          }

          .nixie-tube {
            position: relative;
            width: 180px;
            height: 320px;
            background: linear-gradient(180deg, 
              rgba(40, 25, 15, 0.95) 0%,
              rgba(25, 15, 10, 0.98) 50%,
              rgba(20, 10, 5, 1) 100%
            );
            border-radius: 80px;
            border: 4px solid;
            border-color: rgba(180, 120, 60, 0.4) rgba(120, 80, 40, 0.6) rgba(80, 50, 25, 0.8);
            box-shadow: 
              inset 0 0 40px rgba(255, 140, 20, 0.1),
              inset 0 0 20px rgba(0, 0, 0, 0.8),
              0 10px 40px rgba(0, 0, 0, 0.9),
              0 0 60px rgba(255, 120, 20, 0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            overflow: hidden;
          }

          .nixie-tube::before {
            content: '';
            position: absolute;
            inset: 8px;
            background: radial-gradient(
              ellipse at center,
              rgba(255, 140, 20, 0.03) 0%,
              transparent 60%
            );
            border-radius: 72px;
            pointer-events: none;
          }

          .nixie-tube::after {
            content: '';
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 30px;
            height: 30px;
            background: radial-gradient(circle, 
              rgba(120, 80, 40, 0.8) 0%,
              rgba(80, 50, 25, 0.6) 50%,
              transparent 100%
            );
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
          }

          .tube-rails {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .tube-rail {
            position: absolute;
            width: 12px;
            height: 100%;
            background: linear-gradient(90deg,
              rgba(140, 100, 50, 0.6) 0%,
              rgba(100, 70, 35, 0.8) 50%,
              rgba(60, 40, 20, 0.6) 100%
            );
            box-shadow: 
              inset 2px 0 4px rgba(0, 0, 0, 0.8),
              inset -2px 0 4px rgba(0, 0, 0, 0.6);
          }

          .tube-rail-left { left: 15px; border-radius: 6px 0 0 6px; }
          .tube-rail-right { right: 15px; border-radius: 0 6px 6px 0; }

          .nixie-digit {
            font-family: 'Courier New', 'Monaco', monospace;
            font-size: 80px;
            font-weight: 700;
            color: #FF8C3C;
            animation: nixie-glow 2s ease-in-out infinite;
            position: relative;
            z-index: 2;
            letter-spacing: -5px;
            text-align: center;
            width: 100%;
          }

          .tube-base {
            width: 200px;
            height: 50px;
            background: linear-gradient(180deg,
              rgba(140, 100, 50, 0.8) 0%,
              rgba(100, 70, 35, 0.9) 50%,
              rgba(60, 40, 20, 1) 100%
            );
            border-radius: 25px;
            position: relative;
            box-shadow: 
              0 10px 30px rgba(0, 0, 0, 0.8),
              inset 0 -3px 10px rgba(0, 0, 0, 0.6);
            animation: base-glow 2s ease-in-out infinite;
          }

          .tube-base::after {
            content: '';
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 40px;
            background: radial-gradient(circle,
              rgba(255, 140, 20, 0.6) 0%,
              rgba(255, 120, 20, 0.4) 30%,
              transparent 70%
            );
            border-radius: 50%;
            animation: base-glow 2s ease-in-out infinite;
          }

          .time-separator {
            font-size: 60px;
            color: #FF8C3C;
            animation: nixie-glow 1.5s ease-in-out infinite;
            margin: 0 10px;
          }
        `}</style>
        
        <div className="flex items-center space-x-4">
          {/* Hours */}
          <div className="nixie-tube">
            <div className="tube-rails">
              <div className="tube-rail tube-rail-left"></div>
              <div className="tube-rail tube-rail-right"></div>
            </div>
            <div className="nixie-digit">{hours[0]}</div>
            <div className="nixie-digit">{hours[1]}</div>
          </div>

          <div className="time-separator">:</div>

          {/* Minutes */}
          <div className="nixie-tube">
            <div className="tube-rails">
              <div className="tube-rail tube-rail-left"></div>
              <div className="tube-rail tube-rail-right"></div>
            </div>
            <div className="nixie-digit">{minutes[0]}</div>
            <div className="nixie-digit">{minutes[1]}</div>
          </div>

          <div className="time-separator">:</div>

          {/* Seconds */}
          <div className="nixie-tube">
            <div className="tube-rails">
              <div className="tube-rail tube-rail-left"></div>
              <div className="tube-rail tube-rail-right"></div>
            </div>
            <div className="nixie-digit">{seconds[0]}</div>
            <div className="nixie-digit">{seconds[1]}</div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-8">
          <div className="tube-base"></div>
          <div className="tube-base"></div>
          <div className="tube-base"></div>
        </div>
      </div>
    );
  };

  // ABOUT US MODAL
  const AboutModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-2xl w-full rounded-2xl p-8 relative ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <button
          onClick={() => setShowAbout(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
        
        <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          About Taqaddum (تقدّم)
        </h2>
        
        <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-lg leading-relaxed">
            <strong className="text-indigo-600">Taqaddum</strong> means <em>"Progress"</em> in Arabic. 
            This project was born from a simple need: to track daily Islamic practices, academic goals, 
            and personal development in one unified platform.
          </p>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-indigo-50'}`}>
            <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🎯 Why We Created This
            </h3>
            <ul className="space-y-2 text-sm">
              <li>• Track 5 daily prayers (Salah) - even if Qaza</li>
              <li>• Monitor academic & coding progress</li>
              <li>• Stay accountable with fitness goals</li>
              <li>• Learn core Islamic principles daily</li>
              <li>• Fight addictions & maintain clean lifestyle</li>
              <li>• See team progress & stay motivated together</li>
            </ul>
          </div>

          <p>
            As a Software Engineering student at <strong>Daffodil International University</strong>, 
            I wanted to combine my faith, studies, and wellness into one trackable system. 
            This isn't just another task app - it's a lifestyle tracker for modern Muslims 
            striving for balance and continuous improvement.
          </p>

          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
            <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              💡 Core Philosophy
            </h3>
            <p className="text-sm italic">
              "The best of deeds are those done consistently, even if they are small." 
              <br/>— Prophet Muhammad (PBUH)
            </p>
          </div>

          <p>
            Built with <span className="text-red-500">❤️</span> using React, Supabase, and Tailwind CSS. 
            Open source and free for everyone.
          </p>

          <div className="flex justify-center pt-4">
            <a
              href="https://github.com/mehedyk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <span>View on GitHub</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  // CONTACT MODAL
  const ContactModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-md w-full rounded-2xl p-8 relative ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <button
          onClick={() => setShowContact(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
        
        <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Contact
        </h2>
        
        <div className={`space-y-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-lg">
            Have questions, suggestions, or want to contribute? 
            Feel free to reach out!
          </p>

          <div className={`p-6 rounded-xl text-center ${
            darkMode ? 'bg-gray-700' : 'bg-gradient-to-br from-indigo-50 to-purple-50'
          }`}>
            <div className="mb-4">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👨‍💻</span>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">GitHub Profile</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>🌟 Open for collaboration and feedback!</p>
          </div>
        </div>
      </div>
    </div>
  );

  // AUTH SCREEN WITH ECLIPSE DESIGN
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100'
      }`}>
        {showAbout && <AboutModal />}
        {showContact && <ContactModal />}

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
          <div className={`flex max-w-6xl w-full rounded-3xl overflow-hidden shadow-2xl ${
            darkMode ? 'bg-gray-800 bg-opacity-95' : 'bg-white'
          }`}>
            {/* LEFT SIDE - CLOCK */}
            <div className={`hidden lg:flex flex-1 flex-col items-center justify-center p-12 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
                : 'bg-gradient-to-br from-gray-900 to-gray-800'
            } relative overflow-hidden`}>
              <div className="absolute top-8 left-8">
                <h2 className="text-white text-3xl font-bold tracking-tight">Taqaddum.</h2>
              </div>
              
              <NixieClock />
              
              <div className="absolute bottom-12 left-8">
                <h1 className="text-white text-5xl font-bold mb-2">
                  {isLogin ? 'Welcome Back!' : 'Welcome!'}
                </h1>
                <p className="text-gray-300 text-lg">
                  {isLogin ? 'Sign in to continue' : 'Create your account'}
                </p>
              </div>
            </div>

            {/* RIGHT SIDE - FORM */}
            <div className="flex-1 p-12">
              <div className="max-w-md mx-auto">
                <div className="flex justify-end items-center space-x-6 mb-8 text-sm font-medium">
                  <button 
                    onClick={() => window.open('/', '_self')}
                    className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                  >
                    HOME
                  </button>
                  <button 
                    onClick={() => setShowAbout(true)}
                    className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                  >
                    ABOUT US
                  </button>
                  <button 
                    onClick={() => setShowContact(true)}
                    className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                  >
                    CONTACT
                  </button>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                    {isLogin ? 'LOG IN' : 'SIGN UP'}
                  </span>
                </div>

                <h2 className={`text-4xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {isLogin ? 'Log in' : 'Sign up'}
                </h2>

                {authError && (
                  <div className="mb-6 p-4 rounded-lg bg-red-50 border-l-4 border-red-500 animate-slideIn">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-3 text-red-500" />
                      <p className="text-sm font-medium text-red-700">{authError}</p>
                    </div>
                  </div>
                )}

                {message && !authError && (
                  <div className="mb-6 p-4 rounded-lg bg-green-50 border-l-4 border-green-500 animate-slideIn">
                    <p className="text-sm font-medium text-green-700">{message}</p>
                  </div>
                )}

                <div className="space-y-5">
                  {!isLogin && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Full Name</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-lg">👤</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                          }}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl transition-all duration-300 ${
                            fieldErrors.name 
                              ? 'border-red-500 bg-red-50' 
                              : darkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500'
                              : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                          }`}
                          placeholder="Your Full Name"
                          disabled={loading}
                        />
                      </div>
                      {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Email Address</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-lg">📧</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value.toLowerCase());
                          if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                        }}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl transition-all duration-300 ${
                          fieldErrors.email 
                            ? 'border-red-500 bg-red-50' 
                            : darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500'
                            : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                        }`}
                        placeholder="your@email.com"
                        disabled={loading}
                      />
                    </div>
                    {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Password</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-lg">🔒</span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                        }}
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl transition-all duration-300 ${
                          fieldErrors.password 
                            ? 'border-red-500 bg-red-50' 
                            : darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500'
                            : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                        }`}
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
                  </div>

                  {isLogin && (
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Remember Me</span>
                      </label>
                      <button className={darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleAuth}
                    disabled={loading}
                    className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 transform hover:scale-105"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {isLogin ? 'Signing In...' : 'Creating Account...'}
                      </div>
                    ) : (
                      isLogin ? 'Log in' : 'Create Account'
                    )}
                  </button>

                  <div className="text-center text-sm">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>or</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setAuthError('');
                      setFieldErrors({});
                      setMessage(null);
                    }}
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                      darkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </div>

                <div className={`mt-8 p-4 rounded-xl ${
                  darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-green-50 to-blue-50'
                }`}>
                  <p className={`text-sm mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    🌟 Taqaddum (تقدّم) মানে Progress
                  </p>
                  <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div>• Track daily Salah & Islamic lifestyle</div>
                    <div>• Monitor academic & IT progress</div>
                    <div>• Team collaboration & reports</div>
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

  // MAIN APP (LOGGED IN STATE) - Rest of the dashboard code remains the same
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

          {message && (
            <div className={`mb-6 p-4 rounded-lg animate-slideIn ${
              darkMode 
                ? 'bg-blue-900 bg-opacity-50 border-l-4 border-blue-500' 
                : 'bg-blue-50 border-l-4 border-blue-500'
            }`}>
              <p className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{message}</p>
            </div>
          )}

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
                        </div>
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
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
