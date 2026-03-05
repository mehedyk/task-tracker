// src/config/taskTemplates.js
export const taskTemplates = [
  {
    id: 'salah',
    name: 'Salah (At Least Qaza)',
    type: 'expandable',
    icon: '🕌',
    subtasks: [
      { id: 'fajr',    name: 'Fajr',    completed: false },
      { id: 'dhuhr',   name: 'Dhuhr',   completed: false },
      { id: 'asr',     name: 'Asr',     completed: false },
      { id: 'maghrib', name: 'Maghrib', completed: false },
      { id: 'isha',    name: 'Isha',    completed: false }
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
      { id: 'study',    name: 'Academic Study (1 hour)', completed: false },
      { id: 'research', name: 'Research / Learning',     completed: false },
      { id: 'project',  name: 'Personal Project Work',   completed: false }
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
      { id: 'running',    name: 'Running (30 mins)',           completed: false },
      { id: 'water',      name: 'Drink 8 Glasses of Water',    completed: false },
      { id: 'pushups',    name: '20 Push-ups',                 completed: false },
      { id: 'stretching', name: 'Stretching (15 mins)',        completed: false },
      { id: 'meditation', name: 'Meditation / Muraqabah (10 mins)', completed: false }
    ]
  },

  // ── Business / Professional ────────────────────────────────────────────────
  // These are optional work-mode tasks. Complete ALL subtasks to mark done.
  // Only add these if they apply to your current work situation.

  {
    id: 'digital_marketing',
    name: 'Digital Marketing',
    type: 'expandable',
    icon: '📣',
    category: 'business',
    description: 'Daily marketing tasks — consistency compounds',
    subtasks: [
      {
        id: 'dm_content',
        name: 'Create / Post Content (1 piece)',
        completed: false
        // Why: Content is the foundation. One post per day = 365/year.
        // Can be LinkedIn, Instagram, Twitter/X, or a blog post.
      },
      {
        id: 'dm_engage',
        name: 'Engage with Audience (15 mins)',
        completed: false
        // Why: Reply to comments, DMs, or engage in your niche.
        // Algorithms reward engagement — and so do real people.
      },
      {
        id: 'dm_analytics',
        name: 'Review Key Metric (1 insight)',
        completed: false
        // Why: Pick one number to track daily — impressions, CTR, followers.
        // You can't improve what you don't measure.
      },
      {
        id: 'dm_seo',
        name: 'SEO / Keyword Task',
        completed: false
        // Why: One small SEO task per day — optimise a title, add a meta desc,
        // build a backlink, or research a keyword. Slow but permanent gains.
      },
      {
        id: 'dm_plan',
        name: 'Plan Tomorrow\'s Content',
        completed: false
        // Why: Pre-planning removes the "what do I post?" daily friction.
        // Even 5 minutes tonight saves 30 minutes tomorrow.
      }
    ]
  },

  {
    id: 'freelance_work',
    name: 'Freelance / Agency Work',
    type: 'expandable',
    icon: '💼',
    category: 'business',
    description: 'Client work — your reputation is your product',
    subtasks: [
      {
        id: 'fl_deliver',
        name: 'Work on Active Deliverable',
        completed: false
        // Why: The core habit. Show up for your clients every day,
        // even if only for 30 mins. Consistency = trust = repeat business.
      },
      {
        id: 'fl_comms',
        name: 'Client Communication (reply / update)',
        completed: false
        // Why: Clients don't just pay for the work — they pay for peace of mind.
        // A quick update message is worth more than you think.
      },
      {
        id: 'fl_prospect',
        name: 'Send 1 Proposal or Cold Outreach',
        completed: false
        // Why: Pipeline never stops. Even when busy, keep one lead warm.
        // The feast/famine cycle is caused by stopping this when you're busy.
      },
      {
        id: 'fl_skill',
        name: 'Learn Something Billable (30 mins)',
        completed: false
        // Why: Your rate grows with your skills. Invest daily in what you
        // can charge more for tomorrow — a new tool, framework, or technique.
      }
    ]
  },

  {
    id: 'startup_work',
    name: 'Startup / Side Project',
    type: 'expandable',
    icon: '🚀',
    category: 'business',
    description: 'Building something from zero — ship, learn, repeat',
    subtasks: [
      {
        id: 'sw_build',
        name: 'Ship Something (code / design / copy)',
        completed: false
        // Why: Shipping is the only real metric for builders.
        // Even one small thing — a fix, a feature, a line of copy.
      },
      {
        id: 'sw_users',
        name: 'Talk to / Observe a User',
        completed: false
        // Why: Most startups fail because founders stop talking to users.
        // One conversation or one piece of feedback per day keeps you honest.
      },
      {
        id: 'sw_growth',
        name: 'One Growth Action',
        completed: false
        // Why: Share what you built. Post a thread, reply in a forum,
        // message someone who'd benefit. Distribution is half the product.
      },
      {
        id: 'sw_review',
        name: 'Review Metrics / Numbers',
        completed: false
        // Why: Check your one north star metric daily. Users, revenue,
        // signups, retention — pick one and watch it like a heartbeat.
      },
      {
        id: 'sw_document',
        name: 'Document a Decision or Learning',
        completed: false
        // Why: Startups move fast and forget why they made decisions.
        // A daily note — even 3 sentences — becomes invaluable in 6 months.
      }
    ]
  },

  {
    id: 'corporate_tasks',
    name: 'Corporate / Office',
    type: 'expandable',
    icon: '🏢',
    category: 'business',
    description: 'Professional excellence — be the person they can\'t ignore',
    subtasks: [
      {
        id: 'corp_deep',
        name: 'Deep Work Block (90 mins, no distractions)',
        completed: false
        // Why: One focused 90-min block beats 4 hours of distracted work.
        // This is your most important professional habit. Guard it.
      },
      {
        id: 'corp_priority',
        name: 'Complete #1 Priority Task',
        completed: false
        // Why: Every day has one task that matters most. Do it first,
        // before meetings, email, or anything reactive. Everything else is noise.
      },
      {
        id: 'corp_collab',
        name: 'Add Value to Someone\'s Work',
        completed: false
        // Why: Help a colleague, give feedback, share a resource.
        // Your reputation is built more by how you treat others than your output.
      },
      {
        id: 'corp_learn',
        name: 'Industry / Skill Learning (20 mins)',
        completed: false
        // Why: Read an article, watch a talk, take a lesson.
        // The person who keeps learning in a company eventually leads it.
      },
      {
        id: 'corp_reflect',
        name: 'End-of-Day Review (what moved forward?)',
        completed: false
        // Why: 5 minutes of honest reflection daily compounds into
        // massive self-awareness over months. What worked, what didn't, why.
      }
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

  // Everything else — need ALL subtasks completed
  return subtasks.length > 0 && subtasks.every(st => st.completed);
};

export const getSimpleTasks = () =>
  taskTemplates.filter(t => t.type === 'simple');

export const getExpandableTasks = () =>
  taskTemplates.filter(t => t.type.includes('expandable'));