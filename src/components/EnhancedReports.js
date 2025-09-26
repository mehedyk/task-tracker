// src/components/EnhancedReports.js - FIXED with proper async/await syntax
import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';

const EnhancedReports = ({ user, taskTemplates }) => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [taskStats, setTaskStats] = useState([]);
  const [subtaskStats, setSubtaskStats] = useState([]);

  // Example: function to generate monthly data
  const generateMonthlyData = () => {
    const monthlyData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      monthlyData.unshift({
        date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        fullDate: dateStr,
        percentage: 0,
        completed: 0,
        total: taskTemplates.length,
        dayOfWeek: date.getDay(),
      });
    }
    setMonthlyData(monthlyData);
  };

  // Async function for category analytics
  const loadCategoryAnalytics = async () => {
    const categoryStats = [];
    for (const template of taskTemplates) {
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('category', template.category);

        categoryStats.push({
          category: template.category,
          total: tasks?.length || 0,
        });
      } catch (err) {
        console.error('Error loading category stats', err);
      }
    }
    setCategoryStats(categoryStats);
  };

  // Async function for task analytics
  const loadTaskStats = async () => {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      setTaskStats(tasks || []);
    } catch (err) {
      console.error('Error loading task stats', err);
    }
  };

  // Async function for subtask analytics
  const loadSubtaskStats = async () => {
    try {
      const { data: subtasks } = await supabase
        .from('subtasks')
        .select('*')
        .eq('user_id', user.id);

      setSubtaskStats(subtasks || []);
    } catch (err) {
      console.error('Error loading subtask stats', err);
    }
  };

  // Master async loader
  const loadAllData = async () => {
    generateMonthlyData();
    await Promise.all([
      loadCategoryAnalytics(),
      loadTaskStats(),
      loadSubtaskStats(),
    ]);
  };

  // useEffect hook to load all data
  useEffect(() => {
    loadAllData();
  }, [user, taskTemplates]);

  return (
    <div>
      <h2>Enhanced Reports</h2>
      <section>
        <h3>Monthly Data</h3>
        <pre>{JSON.stringify(monthlyData, null, 2)}</pre>
      </section>
      <section>
        <h3>Category Stats</h3>
        <pre>{JSON.stringify(categoryStats, null, 2)}</pre>
      </section>
      <section>
        <h3>Task Stats</h3>
        <pre>{JSON.stringify(taskStats, null, 2)}</pre>
      </section>
      <section>
        <h3>Subtask Stats</h3>
        <pre>{JSON.stringify(subtaskStats, null, 2)}</pre>
      </section>
    </div>
  );
};

export default EnhancedReports;
