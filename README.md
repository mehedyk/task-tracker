# 🌟 Taqaddum (تقدّم) — Task Tracker

<div align="center">

**Visit the live app → [task-tracker-taqaddum.vercel.app](https://task-tracker-taqaddum.vercel.app/)**

![Version](https://img.shields.io/badge/version-3.0.0-teal.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Powered-3ECF8E?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4.4-38B2AC?logo=tailwind-css)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)

**A comprehensive Islamic lifestyle, academic progress, and personal development tracker**

**Copyright © 2026 S. M. Mehedy Kawser. All Rights Reserved.**

[Live App](https://task-tracker-taqaddum.vercel.app/) · [Report Bug](https://github.com/mehedyk/task-tracker-taqaddum/issues) · [Request Feature](https://github.com/mehedyk/task-tracker-taqaddum/issues)

</div>

---

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [Core Philosophy](#-core-philosophy)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
- [Project Structure](#-project-structure)
- [Features in Detail](#-features-in-detail)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)
- [Contact](#-contact)

---

## 🎯 About The Project

[**Taqaddum (تقدّم)**](https://task-tracker-taqaddum.vercel.app/) means **"Progress"** in Arabic.

This project was born from a deeply personal need: a unified platform for tracking daily Islamic practices, academic goals, personal development, and professional work — all in one place, built specifically for Bengali-speaking Muslims who want to hold themselves accountable.

### The Story Behind Taqaddum

> *"This was not meant to be a 'just for show' type of project. I don't even like Javascript. But our likings mean nothing when our deed or work is faulty. This is an acknowledgement that we are not good humans. And it's not okay to be okay with this version. We gotta change. Be the best possible version of ourselves. And it is not even a good deed. It is a basic responsibility."*
>
> — Project Author

**In one word: Being a better Muslim is the promise we made to our Creator.**

---

## 💡 Core Philosophy

<div align="center">

### *"The most beloved of deeds to Allah are the most consistent of them, even if they are small."*

**— Prophet Muhammad ﷺ, Sahih Bukhari 6464**

</div>

This hadith is the foundation of Taqaddum. The app emphasises:

- **Consistency over intensity** — Small daily actions compound into life-changing habits
- **Accountability** — Track your progress; be honest with yourself
- **Community** — Support each other in the journey of self-improvement
- **Balance** — Spiritual, academic, physical, and professional wellness in harmony

---

## ✨ Key Features

### 🕌 Islamic Lifestyle Tracking
- **5 Daily Prayers (Salah)** — Fajr, Dhuhr, Asr, Maghrib, Isha with Qaza support
- **Learn Core Islam** — Daily commitment to Islamic education
- **Addiction Recovery** — Track your commitment to staying away from harmful content

### 🎓 Academic & IT Progress
- **Flexible Coding System** — Complete ANY ONE coding activity per day (BeeCrowd, HackerRank, CodeForces, Academic Study, Research, Personal Project)
- **GitHub Links** — Direct links to your problem-solving repositories

### 💪 Fitness & Wellness
- **5 Comprehensive Activities** — Running, water intake, push-ups, stretching, meditation
- Complete ALL to mark the category done

### 💼 Business & Professional Tasks *(v3 — new)*
- **4 Business Categories**: Digital Marketing, Freelance Work, Student Startup, Corporate Tasks
- Each with 5 curated subtasks tailored to the work type
- Tracked separately from personal Islamic tasks

### 📊 Analytics Dashboard *(v3 — massively expanded)*
- **10-tab personal report** — Overview, Weekly, Monthly, Heatmap, Categories, Balance Radar, Streaks Calendar, Yearly, Team, Leaderboard
- **16-week activity heatmap** (GitHub-style)
- **Life Balance Radar** — Spiritual / Physical / Academic / Character / Professional
- **Streak Calendar Tiles** — visual 30-day streak grid
- **12-month yearly view** — month-by-month tiles + combo chart
- **Custom Tasks Reports** — 4 tabs with streak calendar
- **Team Reports** — monthly comparison, yearly stats, leaderboard

### 🖊️ Fountain Pen Cursor *(v3 — new)*
- Toggle-able custom SVG pen cursor
- Teal ink trail that fades over 1.8 seconds
- Persisted in localStorage per user preference

### 🌙 Design & UX
- **Light Mode** — Warm editorial notebook aesthetic (cream #F7F3EC, deep ink, teal accents)
- **Dark Mode** — Deep navy base, sky blue accents — no purple anywhere
- **Nixie Tube Clock** — Retro amber glow animation
- **Fully Responsive** — Mobile-first, works on any screen size
- **Georgia serif headers** — premium editorial typography

### 👥 Team & Collaboration
- Multi-user support with shared accountability
- Team leaderboards for friendly competition
- Comparative analytics — see how you stack up

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React | 18.2.0 |
| Styling | Tailwind CSS | 3.4.4 |
| Charts | Recharts | 2.12.7 |
| Icons | Lucide React | 0.424.0 |
| Backend/DB | Supabase (PostgreSQL) | Latest |
| Auth | Supabase Auth | Latest |
| Deployment | Vercel | Latest |
| Build Tool | Create React App | Latest |

---

## 🚀 Getting Started

### ⚠️ Important Notice

This repository is public for **transparency and educational purposes only**. The source code is **proprietary** and may not be copied, used, or distributed without explicit written permission from the author.

- ✅ Use the official deployed app
- ✅ View the code for learning
- ❌ Do NOT copy or use in your own projects without permission

See [License](#-license) for full details.

---

### Prerequisites

- **Node.js** v14 or higher — [nodejs.org](https://nodejs.org/)
- **npm** v6 or higher (bundled with Node.js)
- **Git** — [git-scm.com](https://git-scm.com/)
- **Supabase account** — [supabase.com](https://supabase.com/) (free tier works)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mehedyk/task-tracker-taqaddum.git
cd task-tracker-taqaddum

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
touch .env.local

# 4. Set up the database (see Database Setup below)

# 5. Start development server
npm start
# → http://localhost:3000
```

### Environment Setup

Create `.env.local` in the project root:

```env
# Required — Supabase credentials
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Finding your Supabase credentials:**
1. Go to [app.supabase.com](https://app.supabase.com/)
2. Open your project → ⚙️ Settings → API
3. Copy the **Project URL** and **anon / public** key

### Database Setup

**Option A — Automated (recommended):**
1. Open Supabase Dashboard → SQL Editor → New Query
2. Paste the full contents of `supabase-schema.sql`
3. Click **Run**

This creates all tables, RLS policies, triggers, helper functions, and indexes automatically.

**Option B — Manual:**
Review `supabase-schema.sql` for the full annotated schema.

**Tables created:**
| Table | Purpose |
|---|---|
| `profiles` | User display names and metadata |
| `tasks` | Daily main task instances (Salah, Academic, Fitness, etc.) |
| `custom_task_templates` | User's recurring custom task definitions |
| `custom_tasks` | Daily instances of custom tasks |

---

## 📁 Project Structure

```
task-tracker-taqaddum/
├── public/
│   ├── index.html                    # App shell
│   ├── manifest.json                 # PWA manifest
│   ├── favicon.ico
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
├── src/
│   ├── components/
│   │   ├── EnhancedTaskList.js       # Main task list + subtasks + business badges
│   │   ├── EnhancedReports.js        # 10-tab personal analytics dashboard
│   │   ├── CustomTasksManager.js     # Custom tasks CRUD
│   │   ├── CustomTasksReports.js     # Custom tasks analytics (4 tabs)
│   │   ├── CustomTasksTeamReports.js # Team custom-task analytics (3 tabs)
│   │   └── CursorTrail.js            # Fountain pen cursor + ink trail (v3)
│   ├── config/
│   │   └── taskTemplates.js          # Pre-defined + business task configs
│   ├── App.js                        # Root component — auth, routing, state
│   ├── index.js                      # React entry point
│   ├── index.css                     # Global styles, themes, animations
│   └── supabase.js                   # Supabase client
├── supabase-schema.sql               # Full database schema
├── .env.local                        # Your credentials (create this, gitignored)
├── .gitignore
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── LICENSE
└── README.md
```

---

## 🎨 Features in Detail

### 1. Main Task Tracking

Five pre-configured task categories, always present every day:

#### 🕌 Salah (Prayers)
- 5 subtasks: Fajr, Dhuhr, Asr, Maghrib, Isha
- Mark each as completed or Qaza
- Must complete ALL to mark category done
- Visual progress bar per prayer

#### 🚫 Stop Addictions
- One-click daily commitment
- Private — visible only to you
- Streak counter built in

#### 🎓 Academic / IT Stuff
- **Any ONE** of: BeeCrowd, HackerRank, CodeForces, Academic Study, Research, Personal Project
- One task done = category complete (flexible for busy schedules)
- GitHub repository links for coding platforms

#### 📖 Learn Core Islam
- Single daily checkbox
- Consistent daily reminder to engage with Islamic knowledge

#### 💪 Fitness
- 5 subtasks: Running (30 min), Water (8 glasses), Push-ups (20), Stretching (15 min), Meditation (10 min)
- Must complete ALL 5 to mark category done

---

### 2. Business Task Categories *(v3)*

Four new business task categories available when setting up custom templates:

| Category | Icon | Subtasks |
|---|---|---|
| Digital Marketing | 📣 | Social posts, SEO audit, Email campaigns, Analytics review, Content planning |
| Freelance Work | 💼 | Client comms, Deliverables, Invoicing, Portfolio update, Proposals |
| Student Startup | 🚀 | Feature work, User feedback, Market research, Growth, Admin |
| Corporate Tasks | 🏢 | Deep work block, Meetings, Reports, Team collab, Skill dev |

Business tasks show a subtle badge in the task list to distinguish them from personal tasks.

---

### 3. Analytics Dashboard (10 Tabs) *(v3)*

#### Overview
- 6 KPI cards: Today, Week Avg, Streak, Best Streak, Perfect Days, Consistency
- 7-day combo chart (bar tasks + line rate)
- Team snapshot (top 5 members)
- Islamic motivation banner with hadith

#### Weekly
- 7-day area chart with gradient fill
- Tasks-per-day bar chart (colour-coded by score)
- Day-detail table with emoji status

#### Monthly
- 30-day trend area chart
- Day-of-week performance bar chart (best days highlighted)
- Score distribution histogram (100% / 80-99% / 60-79% / 40-59% / <40% / None)

#### Heatmap *(new)*
- 16-week GitHub-style activity grid
- Colour intensity = completion %
- Hover tooltips with date + score
- Teal gradient legend

#### Categories
- Donut chart (today's completion by task)
- Breakdown bars for each task
- 7-day task history multi-line chart with legend

#### Balance *(new)*
- Radar chart — all tasks mapped to axes
- Life area bars: Spiritual / Physical / Academic / Character / Professional
- Colour-coded by performance tier (green / amber / red)

#### Streaks *(new)*
- 30-day bar chart (colour per tier)
- Streak calendar tiles — click any day to see score
- Legend for Perfect / Good / Fair / Low

#### Yearly *(new)*
- 4 KPI cards: Year Avg, Best Month, Active Days, Strong Months
- 12-month combo chart (bar active days + line avg %)
- Month-by-month tile grid

#### Team
- Horizontal bar chart (all members)
- Per-member expandable detail cards
- Task count per member

#### Leaderboard
- Ranked list with medals 🥇🥈🥉
- Your position highlighted
- Performance tier pie + distribution table

---

### 4. Custom Tasks System

Create unlimited personal tasks beyond the main five:

- **Recurring** — appears daily automatically
- **One-time** — for specific dates
- **16 emoji icons** to choose from
- Edit name + icon anytime
- Delete single day or entire template
- Private — only visible to you

**Example use cases:**
- 📚 Read Quran (1 page daily)
- 🌙 Tahajjud prayer
- 📖 Read 30 pages of a book
- 🎯 Practice Arabic vocabulary
- 🧘 Evening reflection

Custom tasks have their own dedicated reports (4 tabs) and team reports (3 tabs).

---

### 5. Fountain Pen Cursor *(v3)*

- Toggle with the **🖊 pen button** in the navbar
- Custom SVG fountain pen SVG replaces the default cursor
- Leaves a teal ink trail that fades over 1.8 seconds
- Organic stroke width varies by cursor speed
- Preference saved in localStorage

---

## ☁️ Deployment

The app is deployed on **Vercel** with automatic deployments from the `main` branch on GitHub.

**Environment variables to configure in Vercel:**

| Variable | Value |
|---|---|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anon key |

**Deploy your own fork:**
1. Push to GitHub
2. Import into [vercel.com](https://vercel.com)
3. Set environment variables
4. Deploy — Vercel handles the build automatically (`npm run build`)

---

## 🗺️ Roadmap

- [x] Core task tracking (Salah, Academic, Fitness, Islam, Addictions)
- [x] Custom tasks system (recurring + one-time)
- [x] Dark mode
- [x] Team support + leaderboards
- [x] Personal reports (weekly, monthly, categories)
- [x] Custom task reports + team custom task reports
- [x] v3: Business task categories
- [x] v3: Fountain pen cursor with ink trail
- [x] v3: Warm editorial light mode (no purple)
- [x] v3: 10-tab analytics dashboard (heatmap, radar, streaks, yearly)
- [x] v3: N+1 query fixes across all report components
- [ ] Push notifications for prayer times
- [ ] Quran reading tracker (juz / page)
- [ ] Arabic dua library
- [ ] Export reports as PDF
- [ ] Mobile app (React Native)
- [ ] Offline support (PWA)

---

## 📄 License

**Proprietary — All Rights Reserved**

Copyright © 2025 S. M. Mehedy Kawser

This software and its source code are the exclusive property of S. M. Mehedy Kawser. The repository is made public for transparency and educational reference only.

**You MAY:**
- View and read the source code for learning purposes
- Use the live deployed application at [task-tracker-taqaddum.vercel.app](https://task-tracker-taqaddum.vercel.app/)
- Reference the architecture for your own original work

**You MAY NOT:**
- Copy, reproduce, or redistribute any part of this code
- Use this code (or substantial parts of it) in personal or commercial projects
- Modify and re-distribute this code
- Deploy your own instance without explicit written permission
- Remove or alter copyright notices

**For permission requests:** Email `mehedyk@proton.me` with subject line `"Taqaddum Code Usage Request"`.

See the `LICENSE` file for the full legal text.

---

## 🙏 Acknowledgments

### To Allah (SWT)
For the guidance (tawfeeq) to build something that serves the Ummah. For the knowledge and skill He blessed me with. May this be a means of Sadaqah Jariyah.

### To Prophet Muhammad ﷺ
For the teachings that guide every line of this project — especially:
> *"The most beloved of deeds to Allah are the most consistent of them, even if they are small."* — Bukhari 6464

### To the Open Source Community
- [React](https://react.dev/) — for the UI library
- [Supabase](https://supabase.com/) — for the open-source backend
- [Tailwind CSS](https://tailwindcss.com/) — for the styling system
- [Recharts](https://recharts.org/) — for the chart library
- [Lucide](https://lucide.dev/) — for the icon set

### To Future Users
For trusting this app with your daily tracking. For making me part of your journey of self-improvement. For your duas.

---

### 🤲 Du'a

*"O Allah, make this project a source of benefit for me and for all who use it. Make it a means of consistency in good deeds. Accept it as Sadaqah Jariyah. Ameen."*

---

## 📞 Contact

**S. M. Mehedy Kawser**
Founder & Lead Developer

- **GitHub**: [@mehedyk](https://github.com/mehedyk)
- **Portfolio**: [mehedy.netlify.app](https://mehedy.netlify.app)
- **Email**: mehedyk@proton.me
- **University**: Daffodil International University (DIU), Software Engineering
- **Location**: Dhaka, Bangladesh 🇧🇩

**Project Links:**
- **Live App**: [task-tracker-taqaddum.vercel.app](https://task-tracker-taqaddum.vercel.app/)
- **Repository**: [github.com/mehedyk/task-tracker-taqaddum](https://github.com/mehedyk/task-tracker-taqaddum)
- **Issues**: [Report a bug or request a feature](https://github.com/mehedyk/task-tracker-taqaddum/issues)

---

<div align="center">

## 🌙 May Allah Accept This Work

### *"Indeed, Allah will not change the condition of a people until they change what is in themselves."*

**— Quran 13:11**

---

Made with purpose by [@mehedyk](https://github.com/mehedyk)

**Taqaddum (تقدّم) — Progress Every Day**

**Copyright © 2026 S. M. Mehedy Kawser. All Rights Reserved.**

[⬆ Back to Top](#-taqaddum-تقدّم--task-tracker)

</div>