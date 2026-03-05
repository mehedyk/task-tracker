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
  },

  // ── Business / Professional ──────────────────────────────────────────────────
  {
    id: 'digital_marketing',
    name: 'Digital Marketing',
    type: 'expandable',
    icon: '📣',
    category: 'business',
    description: 'Complete at least one marketing activity today',
    subtasks: [
      { id: 'social_post', name: 'Post on Social Media', completed: false },
      { id: 'seo_task', name: 'SEO / Keyword Research', completed: false },
      { id: 'email_campaign', name: 'Email Campaign / Newsletter', completed: false },
      { id: 'analytics_review', name: 'Review Analytics & Metrics', completed: false },
      { id: 'content_plan', name: 'Content Planning / Scheduling', completed: false }
    ]
  },
  {
    id: 'freelance_work',
    name: 'Freelance / Agency Work',
    type: 'expandable',
    icon: '💼',
    category: 'business',
    description: 'Client-facing work and deliverables',
    subtasks: [
      { id: 'client_comms', name: 'Client Communication', completed: false },
      { id: 'deliverable', name: 'Complete a Deliverable', completed: false },
      { id: 'invoicing', name: 'Invoicing / Admin', completed: false },
      { id: 'portfolio', name: 'Update Portfolio / Case Study', completed: false }
    ]
  },
  {
    id: 'startup_work',
    name: 'Startup / Side Project',
    type: 'expandable',
    icon: '🚀',
    category: 'business',
    description: 'Building and growing your product',
    subtasks: [
      { id: 'build_feature', name: 'Build / Ship a Feature', completed: false },
      { id: 'user_feedback', name: 'Gather User Feedback', completed: false },
      { id: 'market_research', name: 'Market Research', completed: false },
      { id: 'growth_task', name: 'Growth / Acquisition Task', completed: false },
      { id: 'business_admin', name: 'Business Admin / Finance', completed: false }
    ]
  },
  {
    id: 'corporate_tasks',
    name: 'Corporate / Office',
    type: 'expandable',
    icon: '🏢',
    category: 'business',
    description: 'Daily professional responsibilities',
    subtasks: [
      { id: 'deep_work', name: 'Deep Work Block (2 hrs)', completed: false },
      { id: 'meetings', name: 'Meetings / Standups', completed: false },
      { id: 'reports_docs', name: 'Reports / Documentation', completed: false },
      { id: 'team_collab', name: 'Team Collaboration Task', completed: false },
      { id: 'skill_dev', name: 'Professional Skill Development', completed: false }
    ]
  }
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export const getTemplateById = (id) => taskTemplates.find(t => t.id === id);

export const getPersonalTemplates = () =>
  taskTemplates.filter(t => !t.category || t.category !== 'business');

export const getBusinessTemplates = () =>
  taskTemplates.filter(t => t.category === 'business');

export const isTaskCompleted = (template, tasks) => {
  if (template.type === 'simple') {
    const mainTask = tasks.find(t => t.task_id === template.id);
    return mainTask?.completed || false;
  }

  const subtasks = tasks.filter(t => t.parent_id === template.id);

  // Academic/IT — only need ONE subtask completed
  if (template.id === 'coding') {
    return subtasks.length > 0 && subtasks.some(st => st.completed);
  }

  // Business expandable — need ALL subtasks completed
  return subtasks.length > 0 && subtasks.every(st => st.completed);
};

export const getSimpleTasks = () =>
  taskTemplates.filter(t => t.type === 'simple');

export const getExpandableTasks = () =>
  taskTemplates.filter(t => t.type.includes('expandable'));