# Community & Blogs Platform (PHP + MySQL)

Database-driven community platform for students, mentors, and admins.

## Overview

- SPA shell is served by `index.php`
- Backend APIs are in `api/`
- Data layer uses MySQL only (PDO + prepared statements)
- No JSON/mock data is used for authentication or content

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

3. Import database schema:
- Open phpMyAdmin
- Create/select DB `community_blogs`
- Import file: `init_database.sql`

4. Open app:
- `http://localhost/community-blogs-php/`

Do not use `http://localhost:5173` for this PHP app.

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

## Create Demo Users (Required for First Login)

`init_database.sql` creates tables only, not users.  
Create users manually in phpMyAdmin or SQL.

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

## API Endpoints

- `api/auth.php`
  - `login`
  - `logout`
  - `check`
- `api/register.php`
  - student/mentor registration + ID upload
- `api/content.php`
  - bootstrap content (blogs/questions/mentors/announcements)
  - create blog/question/answer/mentorship request
- `api/admin.php`
  - admin bootstrap + moderation actions

## Project Structure

```text
community-blogs-php/
|-- .htaccess
|-- index.php
|-- init_database.sql
|-- README.md
|-- api/
|   |-- _common.php
|   |-- auth.php
|   |-- register.php
|   |-- content.php
|   |-- admin.php
|-- assets/
|   |-- css/styles.css
|   |-- js/app.js
|   |-- js/modal.js
|   |-- js/db-integration.js
|-- components/
|   |-- auth-modal.php
|-- config/
|   |-- config.php
|   |-- database.php
|   |-- repository.php
|   |-- session.php
|-- logs/
|   |-- .gitkeep
```

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

### 3) Blank center page / shell loads only

Run in browser console:

```js
localStorage.removeItem('demo_user');
location.reload();
```

### 4) Data not updating after DB edits

- Confirm you edited DB `community_blogs`
- Refresh page after changes
- API bootstrap reads live rows from MySQL (no JSON fallback)
