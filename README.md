# Community & Blogs Platform - PHP Preview Version

A PHP preview/demo version of the college career-guidance ecosystem platform, converted from React.

## 🎯 Overview

This is a **preview-only PHP version** - no database required. All data is mock/demo data stored in PHP arrays, similar to the original React version.

## ✨ Features

- **Demo Authentication** - Login with test credentials (no real user registration)
- **Public Pages** - Browse community, blogs, and mentors without login
- **Student Dashboard** - Mentorship requests, community Q&A, blog writing
- **Mentor Dashboard** - Student management, verified answers, blog approval
- **Admin Panel** - User verification, blog moderation, announcements
- **Responsive Design** - Tailwind CSS for beautiful, mobile-friendly UI

## 🚀 Getting Started

### Prerequisites

- PHP 8.0 or higher (check with `php -v`)

### Installation

1. Navigate to the project directory:
```bash
cd community-blogs-php
```

2. Start the PHP built-in server:
```bash
php -S localhost:8000
```

3. Open your browser and visit:
```
http://localhost:8000
```

## 🔑 Demo Credentials

All passwords are: **123456**

- **Student**: `student@demo.com`
- **Mentor**: `mentor@demo.com`
- **Admin**: `admin@demo.com`

## 📁 Project Structure

```
community-blogs-php/
├── index.php                 # Main entry point & layouts (SPA shell)
├── config/
│   ├── config.php           # Base URL & helper functions
│   ├── session.php          # Authentication & session management
│   └── mock-data.php        # Demo data arrays
├── components/
│   └── auth-modal.php       # Login/register modal
├── data/
│   ├── blogs.json           # Blog data (JSON)
│   └── questions.json       # Question data (JSON)
├── assets/
│   ├── css/styles.css       # Custom styles
│   └── js/
│       ├── app.js           # SPA router & all views
│       └── modal.js         # Auth modal functionality
└── README.md
```

## 🎨 Technology Stack

- **PHP 8+** - Entry point, session management, auth modal
- **Tailwind CSS** - Utility-first CSS framework (via CDN)
- **Vanilla JavaScript** - SPA router & client-side rendering (app.js)
- **No Database** - Mock data in JS objects and PHP arrays

## 📝 Current Status

### All Phases: ✅ Complete
- [x] Folder structure & configuration
- [x] Mock data system
- [x] Authentication (demo sessions)
- [x] SPA Router (client-side navigation)
- [x] Public pages (Home, Community, Blogs, Mentors, Blog Detail)
- [x] Student pages (Dashboard, Community, Blogs, Mentorship, Profile, Chat)
- [x] Mentor pages (Dashboard, Community, Blogs, Students, Profile, Chat)
- [x] Admin pages (Dashboard, Blogs, Users, Community, Announcements)

## 🔗 Routing

All pages use query parameters:
- Home: `/?page=`
- Community: `/?page=community`
- Student Dashboard: `/?page=student/dashboard`
- Admin Panel: `/?page=admin/dashboard`

## 🛠️ Development

To stop the server, press `Ctrl+C` in the terminal.

To restart the server:
```bash
php -S localhost:8000
```

## ⚠️ Important Notes

- This is a **preview/demo only** - no real data persistence
- No database required (XAMPP not needed)
- All data resets when server restarts
- Forms don't actually save data
- For demonstration purposes only

## 📊 Architecture

This is a **Single Page Application (SPA)** built with vanilla JavaScript:
- `index.php` serves as the shell (layouts, navigation, auth modal)
- `assets/js/app.js` contains the SPA router and all view templates
- Navigation is handled client-side via `history.pushState`
- PHP handles session management and CSRF tokens only

| Feature | Implementation |
|---------|---------------|
| Routing | Client-side SPA router (app.js) |
| Views | JavaScript template literals |
| Auth | Demo-mode via localStorage + PHP sessions |
| Data | Hardcoded JS objects (mock data) |
| Build | No build needed |
| Server | `php -S localhost:8000` or XAMPP |

## 🎓 Learning Resource

This project demonstrates:
- PHP session management
- Server-side routing
- Template-based rendering
- Role-based access control
- Mock data patterns

## 📞 Support

This is a community project. For issues or questions, refer to the implementation plan documentation.

---

**Built with ❤️ as a PHP conversion of the React community-blogs platform**
