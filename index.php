<?php
// Error handling - disable display in production
$debug_mode = false; // Set to true for development debugging

if ($debug_mode) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/logs/error.log');
}

session_start();
require_once __DIR__ . '/config/config.php';

// Handle ?page= parameter for PHP-based routing (from login redirects)
$page = $_GET['page'] ?? '';
if ($page) {
    // Convert query parameter to JavaScript-readable state
    $role = explode('/', $page)[0] ?? '';
    $section = explode('/', $page)[1] ?? 'dashboard';
    
    // Store in session for JavaScript to read on page load
    $_SESSION['redirect_path'] = '/' . $page;
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Community & Blogs Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#eff6ff',
                            100: '#dbeafe',
                            200: '#bfdbfe',
                            300: '#93c5fd',
                            400: '#60a5fa',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                            800: '#1e40af',
                            900: '#1e3a8a',
                        },
                        success: {
                            50: '#f0fdf4',
                            100: '#dcfce7',
                            200: '#bbf7d0',
                            500: '#22c55e',
                            600: '#16a34a',
                            700: '#15803d',
                            800: '#166534',
                        },
                        warning: {
                            50: '#fffbeb',
                            100: '#fef3c7',
                            500: '#f59e0b',
                            600: '#d97706',
                            800: '#92400e',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        .view {
            display: none;
        }

        .view.active {
            display: block;
        }

        .fade-in {
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .nav-link.active {
            color: #2563eb;
            background-color: #eff6ff;
        }

        .nav-link:hover {
            background-color: #f3f4f6;
        }

        #admin-layout .nav-link:hover {
            background-color: #1f2937;
        }
    </style>
</head>

<body class="bg-gray-50 text-gray-900"<?php if (isset($_SESSION['redirect_path'])): ?> data-redirect-path="<?php echo htmlspecialchars($_SESSION['redirect_path']); ?>"<?php unset($_SESSION['redirect_path']); endif; ?>>
    <!-- Auth Modal (multi-step registration & login) -->
    <?php
    require_once __DIR__ . '/config/session.php';
    include __DIR__ . '/components/auth-modal.php';
    ?>

    <!-- Public Layout -->
    <div id="public-layout" class="layout">
        <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center space-x-2 cursor-pointer" onclick="router.navigate('/')">
                        <svg class="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                        <span class="text-xl font-bold text-gray-900">C&B Platform</span>
                    </div>
                    <nav class="hidden md:flex space-x-8">
                        <a href="<?= BASE_URL ?>" onclick="event.preventDefault(); router.navigate('/')" class="nav-link flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium" data-path="/">Home</a>
                        <a href="<?= BASE_URL ?>community" onclick="event.preventDefault(); router.navigate('/community')" class="nav-link flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium" data-path="/community">Community</a>
                        <a href="<?= BASE_URL ?>blogs" onclick="event.preventDefault(); router.navigate('/blogs')" class="nav-link flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium" data-path="/blogs">Blogs</a>
                        <a href="<?= BASE_URL ?>mentors" onclick="event.preventDefault(); router.navigate('/mentors')" class="nav-link flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium" data-path="/mentors">Mentors</a>
                    </nav>
                    <div class="hidden md:flex items-center space-x-4">
                        <button onclick="openLoginFlow()" class="text-sm font-medium text-gray-700 hover:text-gray-900">Login</button>
                        <button onclick="openRegisterFlow()" class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium">Register</button>
                    </div>
                    <button class="md:hidden p-2" onclick="toggleMobileMenu()">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>
            <div id="mobileMenu" class="hidden md:hidden bg-white border-t">
                <div class="px-2 pt-2 pb-3 space-y-1">
                    <a href="<?= BASE_URL ?>" onclick="event.preventDefault(); router.navigate('/')" class="block px-3 py-2 rounded-md text-base font-medium">Home</a>
                    <a href="<?= BASE_URL ?>community" onclick="event.preventDefault(); router.navigate('/community')" class="block px-3 py-2 rounded-md text-base font-medium">Community</a>
                    <a href="<?= BASE_URL ?>blogs" onclick="event.preventDefault(); router.navigate('/blogs')" class="block px-3 py-2 rounded-md text-base font-medium">Blogs</a>
                    <a href="<?= BASE_URL ?>mentors" onclick="event.preventDefault(); router.navigate('/mentors')" class="block px-3 py-2 rounded-md text-base font-medium">Mentors</a>
                    <button onclick="openLoginFlow()" class="w-full text-left px-3 py-2 rounded-md text-base font-medium">Login / Register</button>
                </div>
            </div>
        </header>
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div id="public-views"></div>
        </main>
        <footer class="bg-white border-t mt-12">
            <div class="max-w-7xl mx-auto px-4 py-8">
                <div class="text-center text-sm text-gray-500">
                    2026 Community & Blogs Platform. All rights reserved.
                </div>
            </div>
        </footer>
    </div>

    <!-- Student Dashboard Layout -->
    <div id="student-layout" class="layout hidden">
        <div class="flex h-screen bg-gray-50">
            <!-- Mobile sidebar overlay -->
            <div id="student-sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden md:hidden" onclick="closeDashboardSidebar('student')"></div>
            <aside id="student-sidebar" class="w-64 bg-white border-r fixed md:relative inset-y-0 left-0 z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-200 ease-in-out">
                <div class="p-4 border-b flex items-center justify-between">
                    <div class="flex items-center space-x-2 cursor-pointer" onclick="router.navigate('/student/dashboard')">
                        <svg class="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                        </svg>
                        <span class="text-lg font-bold">Student Portal</span>
                    </div>
                    <button class="md:hidden p-1 hover:bg-gray-100 rounded" onclick="closeDashboardSidebar('student')">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <nav class="p-4 space-y-2">
                    <a href="<?= BASE_URL ?>student/dashboard" onclick="event.preventDefault(); router.navigate('/student/dashboard'); closeDashboardSidebar('student')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/student/dashboard">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="<?= BASE_URL ?>student/community" onclick="event.preventDefault(); router.navigate('/student/community'); closeDashboardSidebar('student')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/student/community">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Community Q&A</span>
                    </a>
                    <a href="<?= BASE_URL ?>student/blogs" onclick="event.preventDefault(); router.navigate('/student/blogs'); closeDashboardSidebar('student')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/student/blogs">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Blogs</span>
                    </a>
                    <a href="<?= BASE_URL ?>student/mentorship" onclick="event.preventDefault(); router.navigate('/student/mentorship'); closeDashboardSidebar('student')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/student/mentorship">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>Mentorship</span>
                    </a>
                    <a href="<?= BASE_URL ?>student/profile" onclick="event.preventDefault(); router.navigate('/student/profile'); closeDashboardSidebar('student')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/student/profile">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>My Profile</span>
                    </a>
                </nav>
                <div class="absolute bottom-0 w-64 p-4 border-t bg-white">
                    <button onclick="logout()" class="flex items-center space-x-3 px-4 py-2 w-full rounded-lg hover:bg-gray-100 text-red-600">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <div class="flex-1 flex flex-col overflow-hidden">
                <header class="bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center">
                    <div class="flex items-center space-x-3">
                        <button class="md:hidden p-2 hover:bg-gray-100 rounded-lg" onclick="openDashboardSidebar('student')">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                        </button>
                        <h1 class="text-lg md:text-xl font-semibold" id="student-page-title">Dashboard</h1>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-sm text-gray-600 hidden sm:inline" id="student-name">Demo Student</span>
                        <button onclick="logout()" class="text-sm text-red-600 hover:text-red-800">Logout</button>
                    </div>
                </header>
                <main class="flex-1 overflow-y-auto p-4 md:p-6" id="student-views"></main>
            </div>
        </div>
    </div>

    <!-- Mentor Dashboard Layout -->
    <div id="mentor-layout" class="layout hidden">
        <div class="flex h-screen bg-gray-50">
            <!-- Mobile sidebar overlay -->
            <div id="mentor-sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden md:hidden" onclick="closeDashboardSidebar('mentor')"></div>
            <aside id="mentor-sidebar" class="w-64 bg-white border-r fixed md:relative inset-y-0 left-0 z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-200 ease-in-out">
                <div class="p-4 border-b flex items-center justify-between">
                    <div class="flex items-center space-x-2 cursor-pointer" onclick="router.navigate('/mentor/dashboard')">
                        <svg class="h-8 w-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span class="text-lg font-bold">Mentor Portal</span>
                    </div>
                    <button class="md:hidden p-1 hover:bg-gray-100 rounded" onclick="closeDashboardSidebar('mentor')">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <nav class="p-4 space-y-2">
                    <a href="<?= BASE_URL ?>mentor/dashboard" onclick="event.preventDefault(); router.navigate('/mentor/dashboard'); closeDashboardSidebar('mentor')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/mentor/dashboard">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="<?= BASE_URL ?>mentor/community" onclick="event.preventDefault(); router.navigate('/mentor/community'); closeDashboardSidebar('mentor')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/mentor/community">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Community Q&A</span>
                    </a>
                    <a href="<?= BASE_URL ?>mentor/blogs" onclick="event.preventDefault(); router.navigate('/mentor/blogs'); closeDashboardSidebar('mentor')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/mentor/blogs">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Blogs</span>
                    </a>
                    <a href="<?= BASE_URL ?>mentor/students" onclick="event.preventDefault(); router.navigate('/mentor/students'); closeDashboardSidebar('mentor')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/mentor/students">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>My Students</span>
                    </a>
                    <a href="<?= BASE_URL ?>mentor/profile" onclick="event.preventDefault(); router.navigate('/mentor/profile'); closeDashboardSidebar('mentor')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg" data-path="/mentor/profile">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>My Profile</span>
                    </a>
                </nav>
                <div class="absolute bottom-0 w-64 p-4 border-t bg-white">
                    <button onclick="logout()" class="flex items-center space-x-3 px-4 py-2 w-full rounded-lg hover:bg-gray-100 text-red-600">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <div class="flex-1 flex flex-col overflow-hidden">
                <header class="bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center">
                    <div class="flex items-center space-x-3">
                        <button class="md:hidden p-2 hover:bg-gray-100 rounded-lg" onclick="openDashboardSidebar('mentor')">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                        </button>
                        <h1 class="text-lg md:text-xl font-semibold" id="mentor-page-title">Dashboard</h1>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="text-right hidden sm:block">
                            <span class="text-sm font-medium block" id="mentor-name">Dr. Sakura Sato</span>
                            <span class="text-xs text-gray-500">Senior Software Engineer</span>
                        </div>
                        <button onclick="logout()" class="text-sm text-red-600 hover:text-red-800">Logout</button>
                    </div>
                </header>
                <main class="flex-1 overflow-y-auto p-4 md:p-6" id="mentor-views"></main>
            </div>
        </div>
    </div>

    <!-- Admin Dashboard Layout -->
    <div id="admin-layout" class="layout hidden">
        <div class="flex h-screen bg-gray-800">
            <!-- Mobile sidebar overlay -->
            <div id="admin-sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden md:hidden" onclick="closeDashboardSidebar('admin')"></div>
            <aside id="admin-sidebar" class="w-64 bg-gray-900 text-white fixed md:relative inset-y-0 left-0 z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-200 ease-in-out">
                <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                    <div class="flex items-center space-x-2 cursor-pointer" onclick="router.navigate('/admin/dashboard')">
                        <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span class="text-lg font-bold">Admin Panel</span>
                    </div>
                    <button class="md:hidden p-1 hover:bg-gray-700 rounded text-gray-300" onclick="closeDashboardSidebar('admin')">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <nav class="p-4 space-y-2">
                    <a href="<?= BASE_URL ?>admin/dashboard" onclick="event.preventDefault(); router.navigate('/admin/dashboard'); closeDashboardSidebar('admin')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800" data-path="/admin/dashboard">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Dashboard</span>
                    </a>
                    <a href="<?= BASE_URL ?>admin/blogs" onclick="event.preventDefault(); router.navigate('/admin/blogs'); closeDashboardSidebar('admin')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800" data-path="/admin/blogs">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Blog Verification</span>
                    </a>
                    <a href="<?= BASE_URL ?>admin/users" onclick="event.preventDefault(); router.navigate('/admin/users'); closeDashboardSidebar('admin')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800" data-path="/admin/users">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>User Management</span>
                    </a>
                    <a href="<?= BASE_URL ?>admin/community" onclick="event.preventDefault(); router.navigate('/admin/community'); closeDashboardSidebar('admin')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800" data-path="/admin/community">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Community Control</span>
                    </a>
                    <a href="<?= BASE_URL ?>admin/announcements" onclick="event.preventDefault(); router.navigate('/admin/announcements'); closeDashboardSidebar('admin')" class="nav-link flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800" data-path="/admin/announcements">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        <span>Announcements</span>
                    </a>
                </nav>
                <div class="absolute bottom-0 w-64 p-4 border-t border-gray-700 bg-gray-900">
                    <button onclick="logout()" class="flex items-center space-x-3 px-4 py-2 w-full rounded-lg hover:bg-gray-800 text-red-400">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <div class="flex-1 flex flex-col overflow-hidden">
                <header class="bg-gray-800 border-b border-gray-700 px-4 md:px-6 py-4 flex justify-between items-center">
                    <div class="flex items-center space-x-3">
                        <button class="md:hidden p-2 hover:bg-gray-700 rounded-lg text-gray-300" onclick="openDashboardSidebar('admin')">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                        </button>
                        <h1 class="text-lg md:text-xl font-semibold text-white" id="admin-page-title">Dashboard</h1>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-sm text-gray-300 hidden sm:inline" id="admin-name">Admin User</span>
                        <button onclick="logout()" class="text-sm text-red-400 hover:text-red-300">Logout</button>
                    </div>
                </header>
                <main class="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50" id="admin-views"></main>
            </div>
        </div>
    </div>

    <script src="<?= BASE_URL ?>assets/js/modal.js"></script>
    <script src="<?= BASE_URL ?>assets/js/app.js"></script>
</body>

</html>