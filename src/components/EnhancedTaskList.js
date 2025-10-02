// src/components/EnhancedTaskList.js
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Calendar, ChevronDown, ChevronRight, ExternalLink, Sparkles, Info } from 'lucide-react';

const EnhancedTaskList = ({ tasks, onToggleTask, onToggleSubtask, loading, darkMode }) => {
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());

  const today = new Date().toLocaleDateString('en', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    const newCompleted = new Set();
    tasks.forEach(task => {
      if (task.completed) {
        newCompleted.add(task.id);
      }
    });
    setCompletedTaskIds(newCompleted);
  }, [tasks]);

  if (loading) {
    return (
      <div className={`rounded-xl shadow-sm p-6 animate-fadeIn ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className={`h-6 rounded w-32 ${
              darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-200 to-gray-300'
            }`}></div>
            <div className={`h-4 rounded w-48 ${
              darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-200 to-gray-300'
            }`}></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`flex items-center space-x-4 p-4 rounded-lg border animate-fadeIn ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`h-6 w-6 rounded-full loading-spinner ${
                  darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-200 to-gray-300'
                }`}></div>
                <div className={`h-4 rounded flex-1 ${
                  darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-200 to-gray-300'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Group tasks by parent/child relationship
  const groupedTasks = tasks.reduce((acc, task) => {
    if (task.is_parent || task.task_type === 'simple') {
      acc[task.task_id] = {
        ...task,
        subtasks: tasks.filter(t => t.parent_id === task.task_id)
      };
    }
    return acc;
  }, {});

  const mainTasks = Object.values(groupedTasks);

  const toggleExpanded = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const isTaskCompleted = (task) => {
    if (task.task_type === 'simple') {
      return task.completed;
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
      if (task.task_id === 'coding') {
        return task.subtasks.some(subtask => subtask.completed);
      }
      return task.subtasks.every(subtask => subtask.completed);
    }
    
    return task.completed;
  };

  const getCompletionStats = (task) => {
    if (task.task_type === 'simple') {
      return null;
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
      const completed = task.subtasks.filter(subtask => subtask.completed).length;
      const total = task.subtasks.length;
      
      if (task.task_id === 'coding') {
        return { 
          completed, 
          total, 
          isAnyOneTask: true,
          requiresAll: false
        };
      }
      
      return { 
        completed, 
        total, 
        isAnyOneTask: false,
        requiresAll: true
      };
    }
    
    return null;
  };

  const handleTaskToggle = async (taskId, currentCompleted) => {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.classList.add('animate-taskComplete');
      setTimeout(() => {
        taskElement.classList.remove('animate-taskComplete');
      }, 600);
    }

    await onToggleTask(taskId, !currentCompleted);
  };

  const handleSubtaskToggle = async (subtaskId, currentCompleted, e) => {
    e.stopPropagation();
    
    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskElement) {
      subtaskElement.classList.add('animate-taskComplete');
      setTimeout(() => {
        subtaskElement.classList.remove('animate-taskComplete');
      }, 600);
    }

    await onToggleSubtask(subtaskId, !currentCompleted);
  };

  // NEW: Handle task box click (whole area clickable)
  const handleTaskBoxClick = (task) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    
    if (hasSubtasks) {
      // If has subtasks, expand/collapse
      toggleExpanded(task.task_id);
    } else {
      // If no subtasks (simple task), toggle completion
      handleTaskToggle(task.id, task.completed);
    }
  };

  return (
    <div className={`rounded-xl shadow-sm p-6 card-hover animate-fadeIn ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-bold flex items-center ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Sparkles className="h-6 w-6 text-yellow-500 mr-2 animate-pulse" />
          Today's Tasks
        </h2>
        <div className="flex items-center space-x-2">
          <Calendar className={`h-5 w-5 animate-bounce ${
            darkMode ? 'text-gray-400' : 'text-gray-400'
          }`} />
          <span className={`text-sm calligraphy-text ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>{today}</span>
        </div>
      </div>

      {mainTasks.length === 0 ? (
        <div className="text-center py-12 animate-fadeIn">
          <div className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
            <CheckCircle className="h-16 w-16 mx-auto animate-pulse mb-4" />
          </div>
          <h3 className={`text-lg font-medium mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>No tasks for today yet!</h3>
          <p className={darkMode ? 'text-gray-400 mb-4' : 'text-gray-600 mb-4'}>
            Your daily Islamic lifestyle tasks will be created automatically.
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg animate-glow">
            <span className="loading-dots">Creating your tasks</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {mainTasks.map((task, index) => {
            const isCompleted = isTaskCompleted(task);
            const stats = getCompletionStats(task);
            const isExpanded = expandedTasks.has(task.task_id);
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;

            return (
              <div 
                key={task.task_id} 
                data-task-id={task.task_id}
                className={`border rounded-xl overflow-hidden transform transition-all duration-500 animate-fadeIn ${
                  isCompleted 
                    ? darkMode
                      ? 'task-completed bg-gradient-to-r from-green-900 to-emerald-900 border-green-700 shadow-lg'
                      : 'task-completed bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg'
                    : darkMode
                    ? 'task-pending bg-gray-700 hover:shadow-lg border-gray-600 hover:border-indigo-500'
                    : 'task-pending bg-white hover:shadow-lg border-gray-200'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Main Task - ENTIRE BOX IS CLICKABLE */}
                <div 
                  className={`flex items-center space-x-4 p-6 transition-all duration-300 cursor-pointer ${
                    hasSubtasks ? 'hover:bg-opacity-80' : ''
                  }`}
                  onClick={() => handleTaskBoxClick(task)}
                >
                  
                  {/* Task Icon & Completion */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasSubtasks) {
                          handleTaskToggle(task.id, isCompleted);
                        }
                      }}
                      className="flex-shrink-0 transition-all duration-300 transform hover:scale-110 focus-ring rounded-full"
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-7 w-7 text-green-500 animate-pulse" />
                      ) : (
                        <Circle className={`h-7 w-7 transition-colors ${
                          darkMode ? 'text-gray-500 hover:text-green-400' : 'text-gray-400 hover:text-green-500'
                        }`} />
                      )}
                    </button>
                    
                    {hasSubtasks && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(task.task_id);
                        }}
                        className={`flex-shrink-0 transition-all duration-200 transform hover:scale-110 focus-ring rounded ${
                          darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`text-3xl category-icon ${isCompleted ? 'category-completed' : ''}`}>
                        {task.icon}
                      </span>
                      <div>
                        <span className={`font-semibold text-lg transition-all duration-300 ${
                          isCompleted
                            ? 'text-green-700 line-through task-text'
                            : darkMode 
                            ? 'text-white hover:text-indigo-400'
                            : 'text-gray-900 hover:text-indigo-600'
                        }`}>
                          {task.task_name}
                        </span>
                        
                        {task.task_id === 'coding' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Info className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-600 font-medium">
                              Complete any ONE activity
                            </span>
                          </div>
                        )}
                        
                        {stats && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {stats.isAnyOneTask ? 
                                (stats.completed > 0 ? 'Activity completed!' : 'Choose any one activity') :
                                `${stats.completed} of ${stats.total} completed`
                              }
                            </span>
                            {!stats.isAnyOneTask && (
                              <div className={`w-20 rounded-full h-2 ${
                                darkMode ? 'bg-gray-600' : 'bg-gray-200'
                              }`}>
                                <div
                                  className="progress-bar h-2 rounded-full transition-all duration-1000"
                                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Completion Status */}
                    <div className="flex items-center space-x-3">
                      {isCompleted && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium animate-fadeIn ${
                          darkMode ? 'bg-green-900 bg-opacity-50 text-green-300' : 'bg-green-100 text-green-800'
                        }`}>
                          ✨ Alhamdulillah!
                        </span>
                      )}
                      
                      {stats && !isCompleted && !stats.isAnyOneTask && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-indigo-600 streak-counter">
                            {Math.round((stats.completed / stats.total) * 100)}%
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Progress
                          </div>
                        </div>
                      )}
                      
                      {stats && !isCompleted && stats.isAnyOneTask && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600 streak-counter">
                            {stats.completed > 0 ? '✓' : '0/1'}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Any One
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtasks */}
                {hasSubtasks && isExpanded && (
                  <div className={`border-t animate-slideIn ${
                    darkMode 
                      ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600' 
                      : 'bg-gradient-to-r from-gray-50 to-blue-50'
                  }`}>
                    <div className="p-6 space-y-3">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className={`h-px flex-1 ${
                          darkMode ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-indigo-200 to-purple-200'
                        }`}></div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          darkMode ? 'bg-indigo-900 bg-opacity-50 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {task.task_name === 'Salah (At Least Qaza)' ? 'Prayer Times' : 
                           task.task_name === 'Academic/IT Stuff' ? 'Choose Any One Activity' : 
                           task.task_name === 'Fitness' ? 'Fitness Activities' : 'Activities'}
                        </span>
                        <div className={`h-px flex-1 ${
                          darkMode ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-purple-200 to-indigo-200'
                        }`}></div>
                      </div>

                      {task.task_id === 'coding' && (
                        <div className={`mb-4 p-3 rounded-lg border-l-4 border-blue-400 ${
                          darkMode ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span className={`text-sm font-medium ${
                              darkMode ? 'text-blue-300' : 'text-blue-800'
                            }`}>
                              Complete any ONE activity below to mark this task as done
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            You don't need to complete all - just pick one that fits your schedule!
                          </p>
                        </div>
                      )}

                      {task.subtasks.map((subtask, subIndex) => (
                        <div 
                          key={subtask.id} 
                          data-subtask-id={subtask.id}
                          className={`flex items-center justify-between pl-8 pr-4 py-3 rounded-lg transition-all duration-300 animate-fadeIn cursor-pointer ${
                            subtask.completed 
                              ? darkMode
                                ? 'bg-green-900 bg-opacity-30 border border-green-700'
                                : 'bg-green-50 border border-green-200'
                              : darkMode
                              ? 'bg-gray-800 border border-gray-600 hover:border-indigo-500 hover:bg-gray-700'
                              : 'bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50'
                          }`}
                          style={{ animationDelay: `${subIndex * 0.05}s` }}
                          onClick={(e) => handleSubtaskToggle(subtask.id, subtask.completed, e)}
                        >
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => handleSubtaskToggle(subtask.id, subtask.completed, e)}
                              className="flex-shrink-0 transition-all duration-200 transform hover:scale-110 focus-ring rounded-full"
                            >
                              {subtask.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
                              ) : (
                                <Circle className={`h-5 w-5 transition-colors ${
                                  darkMode ? 'text-gray-500 hover:text-green-400' : 'text-gray-400 hover:text-green-500'
                                }`} />
                              )}
                            </button>
                            
                            <div className="flex-1">
                              <span className={`text-sm font-medium transition-all duration-300 ${
                                subtask.completed 
                                  ? 'text-green-700 line-through' 
                                  : darkMode ? 'text-gray-300 hover:text-indigo-400' : 'text-gray-700 hover:text-indigo-600'
                              }`}>
                                {subtask.task_name}
                              </span>

                              {subtask.completed && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <span className="text-xs text-green-600 font-medium animate-fadeIn">
                                    ✓ Completed
                                  </span>
                                  {task.task_id === 'coding' && (
                                    <span className="text-xs text-green-600 font-medium">
                                      - Task Done!
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {subtask.link && (
                            <a
                              href={subtask.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`flex items-center space-x-1 text-xs transition-all duration-200 transform hover:scale-105 px-2 py-1 rounded-lg ${
                                darkMode 
                                  ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900 hover:bg-opacity-30' 
                                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                              }`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="font-medium">GitHub</span>
                            </a>
                          )}
                        </div>
                      ))}

                      {task.task_id === 'coding' && (
                        <div className={`mt-4 p-3 rounded-lg ${
                          darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900 bg-opacity-30' : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                        }`}>
                          <div className="text-center">
                            <span className={`text-sm font-medium ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {task.subtasks.filter(st => st.completed).length > 0 ? (
                                <span className="text-green-600">
                                  🎉 Great job! You've completed an activity today!
                                </span>
                              ) : (
                                <span className="text-blue-600">
                                  📚 Choose any one activity above to complete this task
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Overall Progress */}
      {mainTasks.length > 0 && (
        <div className={`mt-8 pt-6 border-t animate-fadeIn ${
          darkMode ? 'border-gray-700' : 'border-gray-100'
        }`} style={{ animationDelay: '0.8s' }}>
          <div className={`flex justify-between items-center text-sm mb-3 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Overall Progress</span>
            </span>
            <span className="font-bold text-lg gradient-text">
              {Math.round((mainTasks.filter(task => isTaskCompleted(task)).length / mainTasks.length) * 100)}% complete
            </span>
          </div>
          
          <div className={`w-full rounded-full h-3 overflow-hidden ${
            darkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div
              className="progress-bar h-3 rounded-full transition-all duration-1500 ease-out"
              style={{ 
                width: `${(mainTasks.filter(task => isTaskCompleted(task)).length / mainTasks.length) * 100}%` 
              }}
            />
          </div>

          {/* Motivational Message */}
          <div className="mt-4 text-center">
            <p className={`text-sm font-medium calligraphy-text ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {mainTasks.filter(task => isTaskCompleted(task)).length === mainTasks.length 
                ? "🎉 SubhanAllah! You've completed all tasks today! 🤲" 
                : mainTasks.filter(task => isTaskCompleted(task)).length > mainTasks.length / 2
                ? "💪 Excellent progress! Keep up the great work! 🌟"
                : mainTasks.filter(task => isTaskCompleted(task)).length > 0
                ? "🌱 Good start! Allah rewards every good deed! 📿"
                : "🤲 Bismillah! Let's begin with Allah's blessing! ✨"
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskList;
