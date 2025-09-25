// src/components/EnhancedReports.js - 7 Different Report Types
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart, RadialBarChart, RadialBar,
  ComposedChart, Scatter, ScatterChart
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
  const [timeAnalytics, setTimeAnalytics] = useState([]);
  const [streakData, setStreakData] = useState([]);
  const [loading, setLoading] = useState(false);

  const reports = [
    { id: 'overview', name: 'Overview Dashboard', icon: Target },
    { id: 'weekly', name: 'Weekly Trends', icon: TrendingUp },
    { id: 'category', name: 'Category Analysis', icon: BarChart },
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
    await Promise.all([
      loadMonthlyData(),
      loadCategoryAnalytics(),
      loadTimeAnalytics(),
      loadStreakData()
    ]);
    setLoading(false);
  };

  const loadMonthlyData = async () => {
    const monthlyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
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
    }
    setMonthlyData(monthlyData);
  };

  const loadCategoryAnalytics = async () => {
    const categoryStats = await Promise.all(
      taskTemplates.map(async (template) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('task_id', template.id)
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        const completedDays = tasks?.filter(t => {
          if (template.type === 'simple') return t.completed;
          
          // For expandable tasks, need to check subtasks
          const { data: subtasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('parent_id', template.id)
            .eq('date', t.date);
          
          return subtasks && subtasks.every(st => st.completed);
        }).length || 0;

        const totalDays = tasks?.length || 0;
        const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

        return {
          name: template.name,
          icon: template.icon,
          completionRate,
          completedDays,
          totalDays,
          color: COLORS[taskTemplates.indexOf(template)]
        };
      })
    );

    setCategoryAnalytics(categoryStats);
  };

  const loadTimeAnalytics = async () => {
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
        monthlyData.filter(d => d.dayOfWeek === index).reduce((sum, d) => sum +
