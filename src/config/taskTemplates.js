// src/config/taskTemplates.js
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
    name: 'Code/IT Stuff',
    type: 'expandable_with_links',
    icon: '💻',
    subtasks: [
      { 
        id: 'beecrowd', 
        name: 'BeeCrowd', 
        completed: false,
        link: 'https://github.com/mehedyk/100-BeeCrowd-Problems'
      },
      { 
        id: 'hackerrank', 
        name: 'HackerRank', 
        completed: false,
        link: 'https://github.com/mehedyk/100-HackerRank-Problems'
      },
      { 
        id: 'codeforces', 
        name: 'CodeForces', 
        completed: false,
        link: 'https://github.com/mehedyk/100-CodeForces-Problems'
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

// Helper function to get all simple tasks
export const getSimpleTasks = () => {
  return taskTemplates.filter(template => template.type === 'simple');
};

// Helper function to get all expandable tasks
export const getExpandableTasks = () => {
  return taskTemplates.filter(template => template.type.includes('expandable'));
};
