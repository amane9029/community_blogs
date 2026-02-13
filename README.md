# Community & Blogs Platform (PHP + MySQL)

Database-driven community platform for students, mentors, and admins.

## Overview..

- SPA shell is served by `index.php`
- Backend APIs are in `api/`
- Data layer uses MySQL only (PDO + prepared statements).
- No JSON/mock data is used for authentication or content
- Frontend loads live DB rows through `api/content.php` + `api/admin.php`

## Tech Stack

- PHP 8+
- MySQL / MariaDB
- PDO
- Vanilla JavaScript
- Tailwind CSS (CDN)

## Requirements

- XAMPP (Apache + MySQL) or equivalent local PHP/MySQL setup
- `mod_rewrite` enabled (for `.htaccess` SPA routing)

## Quick Start (XAMPP Recommended)

1. Copy project into:
`C:\xampp\htdocs\community-blogs-php`

2. Start:
- Apache
- MySQL

3. Open the app:
- `http://localhost/community-blogs-php/`
- **The database is created automatically on first visit.** You will see a setup page confirming the import.

4. Log in with any demo account:

| Role | Email | Password |
|------|-------|----------|
| Student | kenji@student.com | 123456 |
| Mentor | sakura@mentor.com | 123456 |
| Admin | admin@system.com | 123456 |

> **Manual import (optional):** If auto-setup fails, open phpMyAdmin, create DB `community_blogs`, and import `init_database.sql`.

## Database Configuration

Defaults come from `config/config.php`:

- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_NAME=community_blogs`
- `DB_USER=root`
- `DB_PASS=` (empty by default in XAMPP)

You can override via environment variables:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `BASE_URL` (optional)

## Important Login Requirements

Authentication is strict and DB-only:

- Password must be stored as `password_hash(...)`
- Account must satisfy:
  - `status = 'active'`
  - `is_email_verified = 1`
  - `verification_status = 'approved'`

If any one is missing, login fails.

## Registration Behavior

- Student and mentor registration writes directly to MySQL.
- New accounts are created with:
  - `status='active'`
  - `is_email_verified=1`
  - `verification_status='approved'`
- Result: newly registered users can sign in immediately.

## Create Demo Users (Optional)

`init_database.sql` creates tables only, not seed users.  
You can create users manually in phpMyAdmin/SQL if needed.

1. Generate hash in terminal:

```bash
php -r "echo password_hash('123456', PASSWORD_DEFAULT), PHP_EOL;"
```

2. Use generated hash in SQL:

```sql
INSERT INTO users (name, email, password, role, status, is_email_verified, verification_status, created_at, updated_at)
VALUES
('Kenji Student', 'kenji@student.com', '<PASTE_HASH_HERE>', 'student', 'active', 1, 'approved', NOW(), NOW()),
('Sakura Mentor', 'sakura@mentor.com', '<PASTE_HASH_HERE>', 'mentor', 'active', 1, 'approved', NOW(), NOW()),
('Admin User', 'admin@system.com', '<PASTE_HASH_HERE>', 'admin', 'active', 1, 'approved', NOW(), NOW());
```

3. Add role records:

```sql
INSERT INTO students (user_id, roll_number, branch, year, college_id_path)
SELECT id, 'CS2023001', 'CSE', 3, 'uploads/ids/student/demo.png'
FROM users WHERE email = 'kenji@student.com';

INSERT INTO mentors (user_id, company, position, expertise, job_id_path, verified_by_admin)
SELECT id, 'Tech Corp', 'Senior Engineer', 'Web,Backend,Career', 'uploads/ids/mentor/demo.png', 1
FROM users WHERE email = 'sakura@mentor.com';
```

## Project Architecture Guide

### How the SPA Works

```
index.php (HTML shell + nav + footer)
  ↓ loads
app.js (Router + all page HTML templates)
  ↓ extended by
db-integration.js (API calls, CRUD handlers, modals, toasts)
  ↓ calls
api/content.php  or  api/admin.php
  ↓ uses
config/repository.php (all SQL queries via PDO)
  ↓ connects via
config/database.php → MySQL
```

All pages render inside `index.php`. The JS router swaps HTML into `#public-views`, `#student-views`, `#mentor-views`, or `#admin-views` containers based on the URL hash.

### Role-Based Route Access

| Route prefix | Roles allowed | Container |
|---|---|---|
| `/`, `/blogs`, `/community`, `/mentors` | Everyone | `#public-views` |
| `/student/*` | student | `#student-views` |
| `/mentor/*` | mentor | `#mentor-views` |
| `/admin/*` | admin | `#admin-views` |

### Where to Find Things by Feature

#### Blogs (Student + Mentor + Admin)

| Layer | File | What's there |
|-------|------|-------------|
| **Templates** | `app.js` | `publicBlogs()` — public listing with search/filter/sort; `blogDetail(id)` — single blog with like/share/comments; `studentBlogs()` — student's own blogs; `mentorBlogs()` — mentor's blogs + analytics |
| **Admin views** | `db-integration.js` | `adminBlogs()` — tabbed list (pending/published/rejected/all) with Approve/Reject/Delete; `adminDashboard()` — pending blog cards with quick actions |
| **Action handlers** | `db-integration.js` | `openCreateBlogPrompt()`, `openEditBlogPrompt()`, `deleteBlog()`, `publishBlogFromDraft()`, `openAdminBlogReview()`, `updateBlogModeration()`, `deleteBlogByAdmin()`, `likeBlog()`, `shareBlog()` |
| **API** | `api/content.php` | Actions: `create_blog`, `update_blog`, `delete_blog` |
| **Admin API** | `api/admin.php` | Actions: `update_blog_status`, `delete_blog` |
| **Database** | `config/repository.php` | `repo_fetch_blogs()`, `repo_fetch_blogs_by_author()`, `repo_fetch_blog_by_id()`, `repo_create_blog()`, `repo_update_blog()`, `repo_update_blog_status()`, `repo_delete_blog()` |

#### Community Q&A

| Layer | File | What's there |
|-------|------|-------------|
| **Template** | `app.js` | `publicCommunity()` — question list with vote/search/filter |
| **Admin view** | `db-integration.js` | `adminCommunity()` — question list with delete |
| **Handlers** | `db-integration.js` | `openCreateQuestionPrompt()`, `openEditQuestionPrompt()`, `deleteQuestion()`, `openCreateAnswerPrompt()`, `voteQuestion()`, `deleteQuestionByAdmin()` |
| **API** | `api/content.php` | `create_question`, `update_question`, `delete_question`, `create_answer` |
| **Database** | `config/repository.php` | `repo_fetch_questions()`, `repo_create_question()`, `repo_update_question()`, `repo_delete_question()`, `repo_create_answer()` |

#### Mentors & Mentorship

| Layer | File | What's there |
|-------|------|-------------|
| **Templates** | `app.js` | `publicMentors()` — mentor directory; `studentMentorship()` — student's requests; `mentorStudents()` — mentor's student list; `mentorProfile()` — mentor settings |
| **Handlers** | `db-integration.js` | `sendMentorshipRequest()`, `updateMentorshipRequestStatus()`, `markMentorshipCompleted()`, `openMentorProfileModal()`, `openMentorStudentProfileModal()`, `openMentorshipScheduleModal()` |
| **API** | `api/content.php` | `create_mentorship_request`, `update_mentorship_request_status` |
| **Database** | `config/repository.php` | `repo_fetch_mentors()`, `repo_create_mentorship_request()`, `repo_fetch_mentorship_requests()`, `repo_update_mentorship_request_status()` |

#### User Management (Admin)

| Layer | File | What's there |
|-------|------|-------------|
| **Admin view** | `db-integration.js` | `adminUsers()` — tabbed user list (pending/students/mentors/all) |
| **Handlers** | `db-integration.js` | `updateUserVerification()`, `openEditMentorPrompt()`, `deleteUserByAdmin()` |
| **API** | `api/admin.php` | `update_user_verification`, `update_mentor`, `delete_user` |
| **Database** | `config/repository.php` | `repo_fetch_admin_users()`, `repo_update_user_verification()`, `repo_update_mentor_by_admin()`, `repo_delete_user_by_admin()` |

#### Auth & Profile

| Layer | File | What's there |
|-------|------|-------------|
| **Login/Register UI** | `modal.js` | Login form, multi-step registration (student + mentor), file upload |
| **Profile templates** | `app.js` | `studentProfile()`, `mentorProfile()` — edit/password/delete |
| **Handlers** | `db-integration.js` | `openProfileEditModal()`, `openChangePasswordModal()`, `deleteCurrentAccount()` |
| **Auth API** | `api/auth.php` | `login`, `logout`, `check` |
| **Register API** | `api/register.php` | Multipart POST with ID file upload |
| **Profile API** | `api/content.php` | `update_profile`, `change_password`, `delete_account` |
| **Session** | `config/session.php` | `loginUser()`, `logoutUser()`, `getLoggedInUser()`, `requireRole()` |

#### Announcements (Admin)

| Layer | File | What's there |
|-------|------|-------------|
| **Admin view** | `db-integration.js` | `adminAnnouncements()` — list with create/edit/delete |
| **Handlers** | `db-integration.js` | `openCreateAnnouncementPrompt()`, `openEditAnnouncementPrompt()`, `deleteAnnouncementByAdmin()` |
| **API** | `api/admin.php` | `create_announcement`, `update_announcement`, `delete_announcement` |
| **Database** | `config/repository.php` | `repo_fetch_announcements()`, `repo_create_announcement()`, `repo_update_announcement()`, `repo_delete_announcement()` |

### Shared Systems (db-integration.js)

| System | Functions |
|--------|-----------|
| **Toast notifications** | `showToast(message, type)` — success/error/info |
| **Action modals** | `openActionModal({title, fields, onSubmit})` — dynamic form dialogs |
| **Data refresh** | `refreshDbData()` → calls bootstrap APIs → fills `router.dbData` |
| **Passive button wiring** | `wirePassiveButtons()` — catches unwired buttons by label |
| **Page filters** | `filterByCategory()`, `handlePageSearch()`, `handleSortChange()` |
| **Auth guard** | `ensureLoggedIn(role)` — checks login + role before actions |

### API Endpoints

- `api/auth.php` — `login`, `logout`, `check`
- `api/register.php` — student/mentor registration + ID upload
- `api/content.php` — `bootstrap`, `search`, `create_blog`, `update_blog`, `delete_blog`, `create_question`, `update_question`, `delete_question`, `create_answer`, `create_mentorship_request`, `update_mentorship_request_status`, `update_profile`, `change_password`, `delete_account`
- `api/admin.php` — `bootstrap`, `update_user_verification`, `update_blog_status`, `delete_blog`, `delete_question`, `create_announcement`, `update_announcement`, `delete_announcement`, `update_mentor`, `delete_user`

### Project Structure

```text
community-blogs-php/
├── index.php                    # SPA shell (nav, route containers, footer, scripts)
├── init_database.sql            # Full DB schema (8 tables) + approval migration
├── README.md
│
├── config/
│   ├── config.php               # DB & app constants
│   ├── database.php             # PDO connection singleton
│   ├── session.php              # Session, auth, CSRF helpers
│   └── repository.php           # All DB queries via PDO (~993 lines)
│
├── api/
│   ├── _common.php              # Shared API helpers (JSON response, input parsing)
│   ├── auth.php                 # Login / Logout / Check
│   ├── register.php             # Registration with file upload
│   ├── content.php              # Content CRUD + profile + mentorship
│   └── admin.php                # Admin-only operations
│
├── assets/
│   ├── css/
│   │   └── styles.css           # Custom styles + CSS variables
│   └── js/
│       ├── app.js               # SPA router + all view templates (~3482 lines)
│       ├── db-integration.js    # DB bridge + action handlers + UI system (~2158 lines)
│       └── modal.js             # Auth modal (login + registration)
│
├── components/
│   └── auth-modal.php           # Auth modal HTML partial
│
├── uploads/ids/                 # Uploaded ID verification files
│   └── student/
└── logs/                        # Error logs
```

### Database Migration

- **Fresh install**: Run `init_database.sql` — creates all tables with approval columns included
- **Existing DB**: The migration block at the bottom of `init_database.sql` safely adds `approved_at`/`approved_by` columns if missing (idempotent)

## Troubleshooting

### 1) Invalid email or password

Check all of these:

- Email exists in `users`
- Password in DB is hashed (not plain text)
- `status='active'`
- `is_email_verified=1`
- `verification_status='approved'`

### 2) Old/incorrect UI appears

- Use `http://localhost/community-blogs-php/`
- Avoid `localhost:5173`
- Hard refresh browser: `Ctrl + F5`

### 3) Registration works but login still fails

- Verify app DB settings in `config/config.php` (or env vars):
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
- Confirm inserted user is in `community_blogs.users`
- Confirm password is hashed using `password_hash`

### 4) Blank center page / shell loads only

Run in browser console:

```js
localStorage.removeItem('demo_user');
location.reload();
```

### 5) Data not updating after DB edits

- Confirm you edited DB `community_blogs`
- Refresh page after changes
- API bootstrap reads live rows from MySQL (no JSON fallback)

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | kenji@student.com | 123456 |
| Mentor | sakura@mentor.com | 123456 |
| Admin | admin@system.com | 123456 |

> **Note:** These accounts only exist if you created them using the SQL in the [Create Demo Users](#create-demo-users-optional) section above.
