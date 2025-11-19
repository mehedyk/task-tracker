// src/components/CustomTasksManager.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, X, Edit2, Trash2, CheckCircle, Circle, 
  Target, Sparkles, Save
} from 'lucide-react';
import { supabase } from '../supabase';

const CustomTasksManager = ({ user, darkMode }) => {
  const [customTasks, setCustomTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskIcon, setNewTaskIcon] = useState('📝');
  const [message, setMessage] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const iconOptions = [
    '📝', '📚', '💼', '🎯', '🏃', '🎨', '🎵', '🌱', 
    '💡', '⚡', '🔥', '✨', '🌟', '🚀', '💪', '🧘'
  ];

  const loadCustomTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCustomTasks(data || []);
    } catch (error) {
      console.error('Error loading custom tasks:', error);
      setMessage({ type: 'error', text: '⚠️ Could not load custom tasks' });
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    if (user) {
      loadCustomTasks();
    }
  }, [user, loadCustomTasks]);

  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      setMessage({ type: 'error', text: 'Task name cannot be empty' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_tasks')
        .insert([{
          user_id: user.id,
          task_name: newTaskName.trim(),
          icon: newTaskIcon,
          date: today,
          completed: false
        }])
        .select();

      if (error) throw error;

      setCustomTasks([...customTasks, data[0]]);
      setNewTaskName('');
      setNewTaskIcon('📝');
      setShowAddModal(false);
      setMessage({ type: 'success', text: '✅ Task added successfully!' });
    } catch (error) {
      console.error('Error adding task:', error);
      setMessage({ type: 'error', text: '⚠️ Could not add task' });
    }
  };

  const handleUpdateTask = async () => {
    if (!newTaskName.trim()) {
      setMessage({ type: 'error', text: 'Task name cannot be empty' });
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_tasks')
        .update({
          task_name: newTaskName.trim(),
          icon: newTaskIcon,
          updated_at: new Date()
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      setCustomTasks(customTasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, task_name: newTaskName.trim(), icon: newTaskIcon }
          : task
      ));
      
      setEditingTask(null);
      setNewTaskName('');
      setNewTaskIcon('📝');
      setMessage({ type: 'success', text: '✅ Task updated successfully!' });
    } catch (error) {
      console.error('Error updating task:', error);
      setMessage({ type: 'error', text: '⚠️ Could not update task' });
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation(); // Prevent triggering toggle
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('custom_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setCustomTasks(customTasks.filter(task => task.id !== taskId));
      setMessage({ type: 'success', text: '✅ Task deleted successfully!' });
    } catch (error) {
      console.error('Error deleting task:', error);
      setMessage({ type: 'error', text: '⚠️ Could not delete task' });
    }
  };

  const handleToggleComplete = async (taskId, currentCompleted) => {
    try {
      const { error } = await supabase
        .from('custom_tasks')
        .update({ 
          completed: !currentCompleted,
          updated_at: new Date()
        })
        .eq('id', taskId);

      if (error) throw error;

      setCustomTasks(customTasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !currentCompleted }
          : task
      ));
    } catch (error) {
      console.error('Error toggling task:', error);
      setMessage({ type: 'error', text: '⚠️ Could not update task' });
    }
  };

  const openEditModal = (task, e) => {
    e.stopPropagation(); // Prevent triggering toggle
    setEditingTask(task);
    setNewTaskName(task.task_name);
    setNewTaskIcon(task.icon);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTask(null);
    setNewTaskName('');
    setNewTaskIcon('📝');
  };

  const completedCount = customTasks.filter(t => t.completed).length;
  const totalCount = customTasks.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className={`text-2xl font-bold flex items-center ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Target className="h-6 w-6 text-purple-500 mr-2" />
              My Custom Tasks
            </h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Personal tasks that only you can see
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg text-center ${
            darkMode 
              ? 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-700/50'
              : 'bg-gradient-to-r from-purple-50 to-indigo-50'
          }`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
              {completionRate}%
            </div>
            <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
              Completion Rate
            </div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            darkMode 
              ? 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-700/50'
              : 'bg-gradient-to-r from-green-50 to-emerald-50'
          }`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              {completedCount}
            </div>
            <div className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              Completed
            </div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            darkMode 
              ? 'bg-gradient-to-br from-orange-900/50 to-red-900/50 border border-orange-700/50'
              : 'bg-gradient-to-r from-orange-50 to-red-50'
          }`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
              {totalCount - completedCount}
            </div>
            <div className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              Remaining
            </div>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="mt-6">
            <div className={`w-full rounded-full h-3 overflow-hidden ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg animate-slideIn ${
          message.type === 'success'
            ? darkMode 
              ? 'bg-green-900 bg-opacity-50 border-l-4 border-green-500'
              : 'bg-green-50 border-l-4 border-green-500'
            : darkMode
            ? 'bg-red-900 bg-opacity-50 border-l-4 border-red-500'
            : 'bg-red-50 border-l-4 border-red-500'
        }`}>
          <p className={`font-medium ${
            message.type === 'success'
              ? darkMode ? 'text-green-300' : 'text-green-700'
              : darkMode ? 'text-red-300' : 'text-red-700'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Tasks List */}
      <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {loading ? (
          <div className="text-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
              darkMode ? 'border-purple-400' : 'border-purple-600'
            }`}></div>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Loading your custom tasks...
            </p>
          </div>
        ) : customTasks.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className={`h-16 w-16 mx-auto mb-4 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              No custom tasks yet
            </h3>
            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Create your first custom task to get started!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              <span>Add Your First Task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {customTasks.map((task, index) => (
              <div
                key={task.id}
                onClick={() => handleToggleComplete(task.id, task.completed)}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 animate-fadeIn cursor-pointer ${
                  task.completed
                    ? darkMode
                      ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700'
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    : darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Left side - Checkbox, Icon, and Task Name */}
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {task.completed ? (
                      <CheckCircle className="h-6 w-6 text-green-500 animate-pulse" />
                    ) : (
                      <Circle className={`h-6 w-6 ${
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  
                  <span className="text-2xl sm:text-3xl flex-shrink-0">{task.icon}</span>
                  
                  {/* FIXED: Text wrapping with word-break */}
                  <span className={`font-medium flex-1 min-w-0 break-words ${
                    task.completed
                      ? 'text-green-700 line-through'
                      : darkMode
                      ? 'text-white'
                      : 'text-gray-900'
                  }`}
                    style={{ 
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {task.task_name}
                  </span>
                </div>

                {/* Right side - Action Buttons */}
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2 sm:ml-4">
                  <button
                    onClick={(e) => openEditModal(task, e)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      darkMode
                        ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    aria-label="Edit task"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      darkMode
                        ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30'
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    }`}
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 relative ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className={`text-2xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h3>

            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Task Name
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g., Read a book, Exercise..."
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                      : 'bg-gray-50 border-gray-300 focus:border-purple-500 focus:bg-white'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Choose an Icon
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewTaskIcon(icon)}
                      type="button"
                      className={`p-3 text-2xl rounded-lg transition-all duration-200 transform hover:scale-110 ${
                        newTaskIcon === icon
                          ? darkMode
                            ? 'bg-purple-900/50 ring-2 ring-purple-500'
                            : 'bg-purple-100 ring-2 ring-purple-500'
                          : darkMode
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeModal}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={editingTask ? handleUpdateTask : handleAddTask}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Save className="h-5 w-5" />
                  <span>{editingTask ? 'Update' : 'Add'} Task</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTasksManager;