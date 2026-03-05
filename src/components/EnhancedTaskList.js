// src/components/EnhancedTaskList.js
import React, { useState, useEffect } from 'react';
import {
  CheckCircle, Circle, Calendar, ChevronDown, ChevronRight,
  ExternalLink, Info
} from 'lucide-react';

const EnhancedTaskList = ({ tasks, onToggleTask, onToggleSubtask, loading, darkMode }) => {
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  const today = new Date().toLocaleDateString('en', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`rounded-xl p-4 sm:p-6 animate-fadeIn border ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'border-stone-200'
      }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className={`h-6 rounded w-36 ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`} />
            <div className={`h-4 rounded w-48 ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`} />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i}
                className={`flex items-center space-x-4 p-4 rounded-xl border ${
                  darkMode ? 'border-gray-800 bg-gray-800/50' : 'border-stone-200 bg-stone-50'
                }`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`h-6 w-6 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-stone-300'}`} />
                <div className={`h-4 rounded flex-1 ${darkMode ? 'bg-gray-700' : 'bg-stone-300'}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Group tasks ────────────────────────────────────────────────────────────
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
    const next = new Set(expandedTasks);
    if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); }
    setExpandedTasks(next);
  };

  const isTaskCompleted = (task) => {
    if (task.task_type === 'simple') return task.completed;
    if (task.subtasks && task.subtasks.length > 0) {
      if (task.task_id === 'coding') return task.subtasks.some(s => s.completed);
      return task.subtasks.every(s => s.completed);
    }
    return task.completed;
  };

  const getCompletionStats = (task) => {
    if (task.task_type === 'simple') return null;
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(s => s.completed).length;
    const total = task.subtasks.length;
    return {
      completed, total,
      isAnyOneTask: task.task_id === 'coding',
      requiresAll: task.task_id !== 'coding'
    };
  };

  const handleTaskToggle = async (taskId, currentCompleted) => {
    await onToggleTask(taskId, !currentCompleted);
  };

  const handleSubtaskToggle = async (subtaskId, currentCompleted, e) => {
    e.stopPropagation();
    await onToggleSubtask(subtaskId, !currentCompleted);
  };

  const handleTaskBoxClick = (task) => {
    if (task.subtasks && task.subtasks.length > 0) {
      toggleExpanded(task.task_id);
    } else {
      handleTaskToggle(task.id, task.completed);
    }
  };

  const isBusinessTask = (task) =>
    ['digital_marketing', 'freelance_work', 'startup_work', 'corporate_tasks'].includes(task.task_id);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`rounded-xl p-4 sm:p-6 animate-fadeIn border ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'border-stone-200'
    }`} style={!darkMode ? { background: 'var(--bg-card)' } : {}}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${
          darkMode ? 'text-white' : 'text-stone-900'
        }`} style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-xl">✦</span>
          <span className="hidden sm:inline">Today's Tasks</span>
          <span className="sm:hidden">Tasks</span>
        </h2>
        <div className="flex items-center space-x-2">
          <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`} />
          <span className={`text-xs hidden md:inline ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
            {today}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {mainTasks.length === 0 ? (
        <div className="text-center py-12 animate-fadeIn">
          <CheckCircle className={`h-14 w-14 mx-auto mb-4 ${darkMode ? 'text-gray-700' : 'text-stone-300'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            No tasks yet!
          </h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-500' : 'text-stone-500'}`}>
            Your daily tasks will be created automatically.
          </p>
          <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
            darkMode ? 'bg-sky-900/30 text-sky-400' : 'bg-teal-50 text-teal-800 border border-teal-200'
          }`}>
            Creating your tasks...
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {mainTasks.map((task, index) => {
            const isCompleted = isTaskCompleted(task);
            const stats = getCompletionStats(task);
            const isExpanded = expandedTasks.has(task.task_id);
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const isBusiness = isBusinessTask(task);

            return (
              <div
                key={task.task_id}
                data-task-id={task.task_id}
                className={`rounded-xl overflow-hidden transition-all duration-300 animate-fadeIn border ${
                  isCompleted
                    ? darkMode
                      ? 'task-completed border-emerald-800/60'
                      : 'task-completed border-emerald-200'
                    : darkMode
                    ? 'task-pending border-gray-800 hover:border-sky-700/60'
                    : 'task-pending border-stone-200 hover:border-teal-300'
                }`}
                style={{ animationDelay: `${index * 0.07}s` }}
              >
                {/* Main task row */}
                <div
                  className={`flex items-center space-x-3 sm:space-x-4 p-4 sm:p-5 cursor-pointer select-none`}
                  onClick={() => handleTaskBoxClick(task)}
                >
                  {/* Left icons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); if (!hasSubtasks) handleTaskToggle(task.id, isCompleted); }}
                      className="flex-shrink-0 transition-transform duration-200 hover:scale-110 focus-ring rounded-full"
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <Circle className={`h-6 w-6 ${
                          darkMode ? 'text-gray-600 hover:text-emerald-400' : 'text-stone-300 hover:text-emerald-500'
                        }`} />
                      )}
                    </button>

                    {hasSubtasks && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleExpanded(task.task_id); }}
                        className={`flex-shrink-0 transition-all duration-200 ${
                          darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-stone-400 hover:text-stone-700'
                        }`}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </button>
                    )}
                  </div>

                  {/* Task content */}
                  <div className="flex-1 min-w-0 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <span className={`text-2xl flex-shrink-0 category-icon ${isCompleted ? 'category-completed' : ''}`}>
                        {task.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm sm:text-base transition-all duration-200 ${
                            isCompleted
                              ? 'text-emerald-600 line-through task-text'
                              : darkMode
                              ? 'text-white'
                              : 'text-stone-900'
                          }`}>
                            {task.task_name}
                          </span>
                          {isBusiness && (
                            <span className="business-badge">biz</span>
                          )}
                        </div>

                        {task.task_id === 'coding' && (
                          <div className="flex items-center gap-1 mt-1">
                            <Info className={`h-3 w-3 flex-shrink-0 ${darkMode ? 'text-sky-400' : 'text-teal-600'}`} />
                            <span className={`text-xs font-medium ${darkMode ? 'text-sky-400' : 'text-teal-700'}`}>
                              Complete any ONE
                            </span>
                          </div>
                        )}

                        {stats && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                              {stats.isAnyOneTask
                                ? (stats.completed > 0 ? 'Done!' : 'Choose one')
                                : `${stats.completed}/${stats.total}`
                              }
                            </span>
                            {!stats.isAnyOneTask && (
                              <div className={`w-16 rounded-full h-1.5 ${darkMode ? 'bg-gray-700' : 'bg-stone-200'}`}>
                                <div
                                  className="progress-bar h-1.5 rounded-full transition-all duration-700"
                                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      {isCompleted && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium animate-inkDrop ${
                          darkMode
                            ? 'bg-emerald-900/40 text-emerald-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          ✓ Done
                        </span>
                      )}
                      {stats && !isCompleted && (
                        <span className={`text-sm font-bold ${darkMode ? 'text-sky-400' : 'text-teal-700'}`}>
                          {stats.isAnyOneTask
                            ? (stats.completed > 0 ? '✓' : '–')
                            : `${Math.round((stats.completed / stats.total) * 100)}%`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtasks panel */}
                {hasSubtasks && isExpanded && (
                  <div className={`border-t animate-slideIn ${
                    darkMode
                      ? 'bg-gray-800/60 border-gray-800'
                      : 'bg-stone-50 border-stone-200'
                  }`}>
                    <div className="p-4 sm:p-5 space-y-2.5">
                      {/* Divider label */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`h-px flex-1 ${darkMode ? 'bg-gray-700' : 'bg-stone-200'}`} />
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          darkMode
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-stone-200 text-stone-600'
                        }`}>
                          {task.task_id === 'coding' ? 'Choose One' : 'Activities'}
                        </span>
                        <div className={`h-px flex-1 ${darkMode ? 'bg-gray-700' : 'bg-stone-200'}`} />
                      </div>

                      {task.task_id === 'coding' && (
                        <div className={`mb-3 p-3 rounded-lg border-l-2 ${
                          darkMode
                            ? 'bg-sky-900/20 border-sky-700 text-sky-300'
                            : 'bg-teal-50 border-teal-500 text-teal-800'
                        }`}>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Info className="h-3.5 w-3.5 flex-shrink-0" />
                            Complete any ONE activity to mark as done
                          </div>
                        </div>
                      )}

                      {task.subtasks.map((subtask, subIndex) => (
                        <div
                          key={subtask.id}
                          data-subtask-id={subtask.id}
                          className={`flex items-center justify-between pl-5 sm:pl-7 pr-3 py-3 rounded-lg transition-all duration-200 animate-fadeIn cursor-pointer border ${
                            subtask.completed
                              ? darkMode
                                ? 'bg-emerald-900/20 border-emerald-800/50'
                                : 'bg-emerald-50 border-emerald-200'
                              : darkMode
                              ? 'bg-gray-900 border-gray-700 hover:border-sky-700/60'
                              : 'bg-white border-stone-200 hover:border-teal-300'
                          }`}
                          style={{ animationDelay: `${subIndex * 0.04}s` }}
                          onClick={e => handleSubtaskToggle(subtask.id, subtask.completed, e)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              onClick={e => handleSubtaskToggle(subtask.id, subtask.completed, e)}
                              className="flex-shrink-0 transition-transform duration-150 hover:scale-110 focus-ring rounded-full"
                            >
                              {subtask.completed ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Circle className={`h-4 w-4 ${
                                  darkMode ? 'text-gray-600 hover:text-emerald-400' : 'text-stone-300 hover:text-emerald-500'
                                }`} />
                              )}
                            </button>

                            <span className={`text-sm transition-all duration-200 ${
                              subtask.completed
                                ? 'text-emerald-600 line-through'
                                : darkMode ? 'text-gray-300' : 'text-stone-700'
                            }`}>
                              {subtask.task_name}
                            </span>
                          </div>

                          {subtask.link && (
                            <a
                              href={subtask.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all duration-150 flex-shrink-0 ml-2 ${
                                darkMode
                                  ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-900/30'
                                  : 'text-teal-600 hover:text-teal-800 hover:bg-teal-50'
                              }`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="hidden sm:inline font-medium">GitHub</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Overall progress footer */}
      {mainTasks.length > 0 && (
        <div className={`mt-6 pt-5 border-t animate-fadeIn ${
          darkMode ? 'border-gray-800' : 'border-stone-100'
        }`} style={{ animationDelay: '0.6s' }}>
          <div className={`flex justify-between items-center text-sm mb-2 ${
            darkMode ? 'text-gray-400' : 'text-stone-500'
          }`}>
            <span className="font-medium">Progress</span>
            <span className="font-bold text-base gradient-text">
              {Math.round((mainTasks.filter(t => isTaskCompleted(t)).length / mainTasks.length) * 100)}%
            </span>
          </div>

          <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`}>
            <div
              className="progress-bar h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(mainTasks.filter(t => isTaskCompleted(t)).length / mainTasks.length) * 100}%` }}
            />
          </div>

          <div className="mt-3 text-center">
            <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
              {mainTasks.filter(t => isTaskCompleted(t)).length === mainTasks.length
                ? '🎉 SubhanAllah! All done! 🤲'
                : mainTasks.filter(t => isTaskCompleted(t)).length > mainTasks.length / 2
                ? '💪 Great work! 🌟'
                : mainTasks.filter(t => isTaskCompleted(t)).length > 0
                ? '🌱 Keep going! 📿'
                : '🤲 Bismillah! ✨'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskList;
