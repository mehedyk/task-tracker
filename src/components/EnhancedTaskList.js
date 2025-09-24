// src/components/EnhancedTaskList.js
import React, { useState } from 'react';
import { CheckCircle, Circle, Calendar, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

const EnhancedTaskList = ({ tasks, onToggleTask, onToggleSubtask, loading }) => {
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  const today = new Date().toLocaleDateString('en', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border">
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
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
    
    // For expandable tasks, check if all subtasks are completed
    if (task.subtasks && task.subtasks.length > 0) {
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
      return { completed, total };
    }
    
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Today's Tasks</h2>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">{today}</span>
        </div>
      </div>

      {mainTasks.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <CheckCircle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-600">No tasks for today yet!</p>
          <p className="text-sm text-gray-400 mt-1">Tasks will be created automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mainTasks.map((task) => {
            const isCompleted = isTaskCompleted(task);
            const stats = getCompletionStats(task);
            const isExpanded = expandedTasks.has(task.task_id);
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;

            return (
              <div key={task.task_id} className="border rounded-lg overflow-hidden">
                {/* Main Task */}
                <div className={`flex items-center space-x-4 p-4 hover:bg-gray-50 transition-colors ${hasSubtasks ? 'cursor-pointer' : ''}`}>
                  
                  {/* Task Icon & Completion */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => hasSubtasks ? toggleExpanded(task.task_id) : onToggleTask(task.id, !isCompleted)}
                      className="flex-shrink-0 transition-transform hover:scale-110"
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400 hover:text-green-500 transition-colors" />
                      )}
                    </button>
                    
                    {hasSubtasks && (
                      <button
                        onClick={() => toggleExpanded(task.task_id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
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
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{task.icon}</span>
                      <div>
                        <span className={`font-medium transition-all ${
                          isCompleted
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900 hover:text-indigo-600'
                        }`}>
                          {task.task_name}
                        </span>
                        
                        {stats && (
                          <div className="text-sm text-gray-500 mt-1">
                            {stats.completed} of {stats.total} completed
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Completion Badge */}
                    {isCompleted && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Done
                      </span>
                    )}
                    
                    {stats && !isCompleted && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-indigo-600">
                          {Math.round((stats.completed / stats.total) * 100)}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtasks */}
                {hasSubtasks && isExpanded && (
                  <div className="border-t bg-gray-50">
                    <div className="p-4 space-y-3">
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center justify-between pl-8">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => onToggleSubtask(subtask.id, !subtask.completed)}
                              className="flex-shrink-0 transition-transform hover:scale-110"
                            >
                              {subtask.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400 hover:text-green-500 transition-colors" />
                              )}
                            </button>
                            
                            <span className={`text-sm font-medium ${
                              subtask.completed 
                                ? 'text-gray-500 line-through' 
                                : 'text-gray-700'
                            }`}>
                              {subtask.task_name}
                            </span>
                          </div>

                          {/* Link for coding subtasks */}
                          {subtask.link && (
                            <a
                              href={subtask.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>GitHub</span>
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

      {/* Overall Progress */}
      {mainTasks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>
              {Math.round((mainTasks.filter(task => isTaskCompleted(task)).length / mainTasks.length) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(mainTasks.filter(task => isTaskCompleted(task)).length / mainTasks.length) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskList;
