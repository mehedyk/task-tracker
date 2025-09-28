// src/config/taskTemplates.js - Updated with Academic/IT Stuff
export const taskTemplates = [
  {
    id: 'salah',
    name: 'Salah (At Least Qaza)',
    type: 'expandable',
    icon: '🕌',
    subtasks: [
      { id: 'fajr', name: 'Fajr', completed: false },
      { id: 'dhuhr', name: 'Dhuhr', completed: false },
      { id: 'asr', name: 'Asr', completed: false },
      { id: 'maghrib', name: 'Maghrib', completed: false },
      { id: 'isha', name: 'Isha', completed: false }
    ]
  },
  {
    id: 'addictions',
    name: 'Stop Addictions and Porn Content',
    type: 'simple',
    icon: '🚫',
    completed: false
  },
  {
    id: 'coding',
    name: 'Academic/IT Stuff',
    type: 'expandable_with_links',
    icon: '🎓',
    description: 'Complete any ONE of these activities to mark as done',
    subtasks: [
      { 
        id: 'beecrowd', 
        name: 'BeeCrowd Programming', 
        completed: false,
        link: 'https://github.com/mehedyk/100-BeeCrowd-Problems'
      },
      { 
        id: 'hackerrank', 
        name: 'HackerRank Challenges', 
        completed: false,
        link: 'https://github.com/mehedyk/100-HackerRank-Problems'
      },
      { 
        id: 'codeforces', 
        name: 'CodeForces Contest', 
        completed: false,
        link: 'https://github.com/mehedyk/100-CodeForces-Problems'
      },
      { 
        id: 'study', 
        name: 'Academic Study (1 hour)', 
        completed: false
      },
      { 
        id: 'research', 
        name: 'Research/Learning', 
        completed: false
      },
      { 
        id: 'project', 
        name: 'Personal Project Work', 
        completed: false
      }
    ]
  },
  {
    id: 'islam',
    name: 'Learn Core Islam',
    type: 'simple',
    icon: '📖',
    completed: false
  },
  {
    id: 'fitness',
    name: 'Fitness',
    type: 'expandable',
    icon: '💪',
    subtasks: [
      { id: 'running', name: 'Running (30 mins)', completed: false },
      { id: 'water', name: 'Drink 8 Glasses of Water', completed: false },
      { id: 'pushups', name: '20 Push-ups', completed: false },
      { id: 'stretching', name: 'Stretching (15 mins)', completed: false },
      { id: 'meditation', name: 'Meditation (10 mins)', completed: false }
    ]
  }
];

// Helper function to get template by id
export const getTemplateById = (id) => {
  return taskTemplates.find(template => template.id === id);
};

// Helper function to check if task is completed based on its type
export const isTaskCompleted = (template, tasks) => {
  if (template.type === 'simple') {
    const mainTask = tasks.find(t => t.task_id === template.id);
    return mainTask?.completed || false;
  }
  
  const subtasks = tasks.filter(t => t.parent_id === template.id);
  
  // Special logic for Academic/IT Stuff - only need one subtask completed
  if (template.id === 'coding') {
    return subtasks.length > 0 && subtasks.some(st => st.completed);
  }
  
  // For other expandable tasks, need all subtasks completed
  return subtasks.length > 0 && subtasks.every(st => st.completed);
};

// Helper function to get all simple tasks
export const getSimpleTasks = () => {
  return taskTemplates.filter(template => template.type === 'simple');
};

// Helper function to get all expandable tasks
export const getExpandableTasks = () => {
  return taskTemplates.filter(template => template.type.includes('expandable'));
};
