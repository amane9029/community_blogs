// Single Page Application JavaScript Router
// Configuration: BASE_PATH must match the subdirectory where the app is hosted
const APP_BASE_PATH = (window.APP_BASE_PATH || '/community-blogs-php/').toString();
const BASE_PATH = APP_BASE_PATH.endsWith('/') ? APP_BASE_PATH : `${APP_BASE_PATH}/`;
const AUTH_API = `${BASE_PATH}api/auth.php`;

function getStoredUser() {
    const rawUser = localStorage.getItem('demo_user');
    if (!rawUser) {
        return null;
    }

    try {
        return JSON.parse(rawUser);
    } catch (_) {
        localStorage.removeItem('demo_user');
        return null;
    }
}

const router = {
    currentPath: '/',
    user: getStoredUser(),

    // Helper to strip base path from full path
    stripBasePath(path) {
        const current = path || '/';
        const baseNoSlash = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
        if (current === baseNoSlash) {
            return '/';
        }
        if (current.startsWith(baseNoSlash + '/')) {
            return current.substring(baseNoSlash.length); // Keep leading slash
        }
        return current;
    },

    init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            const path = this.stripBasePath(window.location.pathname);
            this.navigate(path, false);
        });

        // Sync auth state with PHP session on page load
        this.syncSession().then(() => {
            // Check for PHP session redirect (from login)
            const redirectPath = document.body.dataset.redirectPath;
            if (redirectPath) {
                delete document.body.dataset.redirectPath;
                this.navigate(redirectPath, true);
                return;
            }

            // Check for ?page= query parameter (legacy redirect support)
            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = urlParams.get('page');
            if (pageParam) {
                const cleanPath = '/' + pageParam;
                const baseNoSlash = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
                const fullPath = cleanPath === '/' ? (baseNoSlash || '/') : baseNoSlash + cleanPath;
                window.history.replaceState({}, '', fullPath);
                this.navigate(cleanPath, false);
                return;
            }

            // Initial route
            const initialPath = this.stripBasePath(window.location.pathname);
            this.navigate(initialPath, false);
        });
    },

    /**
     * Sync localStorage user with PHP session.
     * If the server says "not logged in", clear client state.
     * If the server says "logged in", update client state.
     */
    async syncSession() {
        try {
            const res = await fetch(AUTH_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check' })
            });
            const data = await res.json();
            if (data.loggedIn && data.user) {
                localStorage.setItem('demo_user', JSON.stringify(data.user));
                this.user = data.user;
            } else {
                localStorage.removeItem('demo_user');
                this.user = null;
            }
        } catch (_) {
            // If API unreachable, keep whatever localStorage has
        }
    },

    navigate(path, pushState = true) {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        this.currentPath = this.stripBasePath(cleanPath);
        if (pushState) {
            const baseNoSlash = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
            const fullPath = this.currentPath === '/' ? (baseNoSlash || '/') : baseNoSlash + this.currentPath;
            window.history.pushState({}, '', fullPath);
        }
        this.render();
    },

    render() {
        const path = this.currentPath;

        // Update navigation active states
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.path === path) {
                link.classList.add('active');
            }
        });

        // Determine which layout to show
        // Route guards: require login + correct role for dashboard routes
        if (path.startsWith('/student')) {
            if (!this.user || this.user.role !== 'student') {
                this.navigate('/');
                setTimeout(() => openAuthModal(), 100);
                return;
            }
            this.showLayout('student-layout');
            this.renderStudentView(path);
        } else if (path.startsWith('/mentor/')) {
            if (!this.user || this.user.role !== 'mentor') {
                this.navigate('/');
                setTimeout(() => openAuthModal(), 100);
                return;
            }
            // Note: /mentor/ with trailing slash to exclude /mentors (public page)
            this.showLayout('mentor-layout');
            this.renderMentorView(path);
        } else if (path.startsWith('/admin')) {
            if (!this.user || this.user.role !== 'admin') {
                this.navigate('/');
                setTimeout(() => openAuthModal(), 100);
                return;
            }
            this.showLayout('admin-layout');
            this.renderAdminView(path);
        } else {
            this.showLayout('public-layout');
            this.renderPublicView(path);
        }
    },

    showLayout(layoutId) {
        document.querySelectorAll('.layout').forEach(layout => {
            layout.classList.add('hidden');
        });
        document.getElementById(layoutId).classList.remove('hidden');
    },

    renderPublicView(path) {
        const container = document.getElementById('public-views');
        let html = '';

        switch (path) {
            case '/':
            case '':
                html = this.views.publicHome();
                break;
            case '/community':
                html = this.views.publicCommunity();
                break;
            case '/blogs':
                html = this.views.publicBlogs();
                break;
            case '/mentors':
                html = this.views.publicMentors();
                break;
            default:
                if (path.startsWith('/blogs/')) {
                    const blogId = path.split('/')[2];
                    html = this.views.blogDetail(blogId);
                } else {
                    html = this.views.notFound();
                }
        }

        container.innerHTML = `<div class="fade-in">${html}</div>`;
    },

    renderStudentView(path) {
        const container = document.getElementById('student-views');
        document.getElementById('student-page-title').textContent = this.getPageTitle(path);

        let html = '';
        switch (path) {
            case '/student/dashboard':
                html = this.views.studentDashboard();
                break;
            case '/student/community':
                html = this.views.studentCommunity();
                break;
            case '/student/blogs':
                html = this.views.studentBlogs();
                break;
            case '/student/mentorship':
                html = this.views.studentMentorship();
                break;
            case '/student/profile':
                html = this.views.studentProfile();
                break;
            default:
                if (path.startsWith('/student/chat/')) {
                    html = this.views.studentChat();
                } else {
                    html = this.views.notFound();
                }
        }

        container.innerHTML = `<div class="fade-in">${html}</div>`;
    },

    renderMentorView(path) {
        const container = document.getElementById('mentor-views');
        document.getElementById('mentor-page-title').textContent = this.getPageTitle(path);

        let html = '';
        switch (path) {
            case '/mentor/dashboard':
                html = this.views.mentorDashboard();
                break;
            case '/mentor/community':
                html = this.views.mentorCommunity();
                break;
            case '/mentor/blogs':
                html = this.views.mentorBlogs();
                break;
            case '/mentor/students':
                html = this.views.mentorStudents();
                break;
            case '/mentor/profile':
                html = this.views.mentorProfile();
                break;
            default:
                if (path.startsWith('/mentor/chat/')) {
                    html = this.views.mentorChat();
                } else {
                    html = this.views.notFound();
                }
        }

        container.innerHTML = `<div class="fade-in">${html}</div>`;
    },

    renderAdminView(path) {
        const container = document.getElementById('admin-views');
        document.getElementById('admin-page-title').textContent = this.getPageTitle(path);

        let html = '';
        switch (path) {
            case '/admin/dashboard':
                html = this.views.adminDashboard();
                break;
            case '/admin/blogs':
                html = this.views.adminBlogs();
                break;
            case '/admin/users':
                html = this.views.adminUsers();
                break;
            case '/admin/community':
                html = this.views.adminCommunity();
                break;
            case '/admin/announcements':
                html = this.views.adminAnnouncements();
                break;
            default:
                html = this.views.notFound();
        }

        container.innerHTML = `<div class="fade-in">${html}</div>`;
    },

    getPageTitle(path) {
        const parts = path.split('/');
        const page = parts[parts.length - 1];
        return page.charAt(0).toUpperCase() + page.slice(1);
    },

    // View Templates
    views: {
        // Public Views
        publicHome() {
            return `
                <div class="space-y-12">
                    <!-- Hero Section -->
                    <section class="text-center py-12 px-4">
                        <div class="max-w-4xl mx-auto">
                            <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                Your Career Journey Starts Here
                            </h1>
                            <p class="text-xl text-gray-600 mb-8">
                                Connect with mentors, access career guidance, and join a community of learners
                                dedicated to helping you succeed in your professional journey.
                            </p>

                            <!-- Search Bar -->
                            <div class="max-w-2xl mx-auto relative mb-8">
                                <input
                                    type="text"
                                    placeholder="Search questions, blogs, or mentors..."
                                    class="w-full px-4 py-3 md:px-6 md:py-4 text-base md:text-lg border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <button class="absolute right-2 top-2 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors">
                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="11" cy="11" r="8"/>
                                        <path d="m21 21-4.35-4.35"/>
                                    </svg>
                                </button>
                            </div>

                            <!-- Stats -->
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                                <div class="text-center">
                                    <div class="text-3xl font-bold text-primary-600">2,500+</div>
                                    <div class="text-sm text-gray-600">Active Students</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-3xl font-bold text-primary-600">150+</div>
                                    <div class="text-sm text-gray-600">Expert Mentors</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-3xl font-bold text-primary-600">500+</div>
                                    <div class="text-sm text-gray-600">Career Blogs</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-3xl font-bold text-primary-600">10,000+</div>
                                    <div class="text-sm text-gray-600">Questions Answered</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Announcements Section -->
                    <section class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                                <svg class="h-5 w-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                                </svg>
                                Announcements
                            </h2>
                            <a href="#" class="text-sm text-primary-600 hover:text-primary-700">View All</a>
                        </div>
                        <div class="space-y-4">
                            <div class="border-l-4 border-primary-500 pl-4 py-2">
                                <div class="flex items-center justify-between mb-1">
                                    <h3 class="font-medium text-gray-900">Campus Placement Drive 2026 Registration Open</h3>
                                    <span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">high</span>
                                </div>
                                <p class="text-sm text-gray-600 mb-1">Registration for the upcoming placement season is now open. All final year students are required to complete their profiles.</p>
                                <p class="text-xs text-gray-400">Jan 30, 2026</p>
                            </div>
                            <div class="border-l-4 border-primary-500 pl-4 py-2">
                                <div class="flex items-center justify-between mb-1">
                                    <h3 class="font-medium text-gray-900">New Mentorship Program Launch</h3>
                                    <span class="text-xs px-2 py-0.5 rounded-full bg-warning-100 text-warning-600">medium</span>
                                </div>
                                <p class="text-sm text-gray-600 mb-1">We are launching a new AI/ML focused mentorship program with industry experts. Applications open till Feb 15.</p>
                                <p class="text-xs text-gray-400">Jan 28, 2026</p>
                            </div>
                        </div>
                    </section>

                    <!-- Features Section -->
                    <section>
                        <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Explore Our Platform</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <a href="/community" onclick="event.preventDefault(); router.navigate('/community')" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow group">
                                <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                                    <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                        <path d="M12 17h.01"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-2">Community Q&A</h3>
                                <p class="text-gray-600 text-sm">Ask questions and get answers from experienced mentors, faculty, and alumni.</p>
                            </a>

                            <a href="/blogs" onclick="event.preventDefault(); router.navigate('/blogs')" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow group">
                                <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                                    <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-2">Career Blogs</h3>
                                <p class="text-gray-600 text-sm">Read verified career guidance blogs written by industry professionals.</p>
                            </a>

                            <a href="/mentors" onclick="event.preventDefault(); router.navigate('/mentors')" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow group">
                                <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                                    <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-2">Find Mentors</h3>
                                <p class="text-gray-600 text-sm">Connect with mentors based on your field of interest and career goals.</p>
                            </a>

                            <a href="/community" onclick="event.preventDefault(); router.navigate('/community')" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow group">
                                <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                                    <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-2">Real-time Guidance</h3>
                                <p class="text-gray-600 text-sm">Get instant support through our mentorship chat system.</p>
                            </a>
                        </div>
                    </section>

                    <!-- Recent Community Questions -->
                    <section>
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">Recent Community Questions</h2>
                            <a href="/community" onclick="event.preventDefault(); router.navigate('/community')" class="text-primary-600 hover:text-primary-700 font-medium flex items-center">
                                View All 
                                <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                </svg>
                            </a>
                        </div>

                        <div class="space-y-4">
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <h3 class="text-lg font-semibold text-gray-900 hover:text-primary-600 cursor-pointer">
                                                How to prepare for FAANG interviews?
                                            </h3>
                                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>
                                                Verified Answer
                                            </span>
                                        </div>
                                        <div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                                            <span>By Riku Suzuki</span>
                                            <span>&bull;</span>
                                            <span>12 answers</span>
                                            <span>&bull;</span>
                                            <span>234 views</span>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Interview Prep</span>
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Tech Careers</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <h3 class="text-lg font-semibold text-gray-900 hover:text-primary-600 cursor-pointer">
                                                Best resources for learning React in 2026?
                                            </h3>
                                        </div>
                                        <div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                                            <span>By Hana Takahashi</span>
                                            <span>&bull;</span>
                                            <span>8 answers</span>
                                            <span>&bull;</span>
                                            <span>156 views</span>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Web Development</span>
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">React</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <h3 class="text-lg font-semibold text-gray-900 hover:text-primary-600 cursor-pointer">
                                                What skills are needed for Data Science roles?
                                            </h3>
                                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600">
                                                <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>
                                                Verified Answer
                                            </span>
                                        </div>
                                        <div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                                            <span>By Ren Yamamoto</span>
                                            <span>&bull;</span>
                                            <span>15 answers</span>
                                            <span>&bull;</span>
                                            <span>312 views</span>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Data Science</span>
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Career Path</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Featured Blogs -->
                    <section>
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">Featured Career Blogs</h2>
                            <a href="/blogs" onclick="event.preventDefault(); router.navigate('/blogs')" class="text-primary-600 hover:text-primary-700 font-medium flex items-center">
                                View All 
                                <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                </svg>
                            </a>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                                <div class="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                                    <svg class="h-16 w-16 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                    </svg>
                                </div>
                                <div class="p-6">
                                    <div class="flex items-center space-x-2 mb-3">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">Career Guidance</span>
                                        <span class="text-sm text-gray-500">8 min read</span>
                                    </div>
                                    <h3 class="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600 cursor-pointer">
                                        My Journey from Campus to Google: A Complete Guide
                                    </h3>
                                    <p class="text-gray-600 text-sm mb-4 line-clamp-2">Sharing my complete journey from college campus placements to landing a role at Google. Includes tips on resume building, interview preparation, and more.</p>
                                    <div class="flex items-center space-x-3">
                                        <div class="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span class="text-sm font-medium text-gray-600">D</span>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">Dr. Sakura Sato</p>
                                            <p class="text-xs text-gray-500">Senior Software Engineer @ Google</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                                <div class="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                                    <svg class="h-16 w-16 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                    </svg>
                                </div>
                                <div class="p-6">
                                    <div class="flex items-center space-x-2 mb-3">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">Tech Stacks</span>
                                        <span class="text-sm text-gray-500">6 min read</span>
                                    </div>
                                    <h3 class="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600 cursor-pointer">
                                        Top 10 Skills Every CS Student Should Master in 2026
                                    </h3>
                                    <p class="text-gray-600 text-sm mb-4 line-clamp-2">A comprehensive guide on the most in-demand technical skills for computer science graduates entering the job market in 2026.</p>
                                    <div class="flex items-center space-x-3">
                                        <div class="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span class="text-sm font-medium text-gray-600">P</span>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">Prof. Kenjiro Ito</p>
                                            <p class="text-xs text-gray-500">Professor, Computer Science</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- CTA Section -->
                    <section class="bg-primary-600 rounded-2xl p-8 md:p-12 text-center">
                        <h2 class="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Start Your Journey?</h2>
                        <p class="text-primary-100 text-lg mb-6 max-w-2xl mx-auto">
                            Join thousands of students who are already learning from industry experts and building their careers.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="openRegisterFlow()" class="px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                                Get Started
                            </button>
                            <button onclick="router.navigate('/mentors')" class="px-8 py-3 bg-primary-700 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors">
                                Browse Mentors
                            </button>
                        </div>
                    </section>
                </div>
            `;
        },

        publicCommunity(role = 'public') {
            const categories = ['All', 'Interview Prep', 'Tech Stacks', 'Career Guidance', 'Internships', 'Higher Studies', 'Placements', 'General'];
            const questions = this.getSampleQuestions();
            const subtitle = role === 'mentor'
                ? 'Answer student questions and share your expertise with the community'
                : 'Ask questions and get answers from mentors, faculty, and alumni';

            return `
                <div class="max-w-7xl mx-auto space-y-8">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Community Q&A</h1>
                            <p class="text-gray-600 mt-1">${subtitle}</p>
                        </div>
                        ${role !== 'mentor' ? `<button onclick="${role === 'student' ? "openCreateQuestionPrompt()" : 'openRegisterFlow()'}" class="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            <span>Ask Question</span>
                        </button>` : ''}
                    </div>

                    <!-- Search and Filter -->
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 hover:shadow-md transition">
                        <div class="flex flex-col md:flex-row gap-4">
                            <div class="flex-1 relative">
                                <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="m21 21-4.35-4.35"/>
                                </svg>
                                <input type="text" placeholder="Search questions..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                            </div>
                            <div class="flex items-center space-x-2">
                                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                                <select class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option>Most Recent</option>
                                    <option>Most Viewed</option>
                                    <option>Most Answered</option>
                                    <option>Trending</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Categories -->
                    <div class="flex flex-wrap gap-2">
                        ${categories.map((category, index) => `
                            <button class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${index === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                                ${category}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Questions List -->
                    <div class="space-y-4">
                        ${questions.length ? questions.map((question) => `
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition-shadow">
                                <div class="flex items-start gap-4">
                                    <!-- Vote Section -->
                                    <div class="flex flex-col items-center space-y-1 pt-1">
                                        <button class="p-2 text-gray-400 hover:text-primary-600">
                                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="m22 8-8 8-8-8"/>
                                            </svg>
                                        </button>
                                        <span class="text-lg font-semibold text-gray-700">${question.upvotes}</span>
                                        <button class="p-2 text-gray-400 hover:text-red-600">
                                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="m6 9 6 6 6-6"/>
                                            </svg>
                                        </button>
                                    </div>

                                    <!-- Content -->
                                    <div class="flex-1">
                                        <div class="flex items-start justify-between mb-2">
                                            <h3 class="text-lg font-semibold text-gray-900 hover:text-primary-600 cursor-pointer">
                                                ${question.title}
                                            </h3>
                                            ${question.verified ? `
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600 ml-2 flex-shrink-0">
                                                    <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                        <polyline points="22 4 12 14.01 9 11.01"/>
                                                    </svg>
                                                    Verified
                                                </span>
                                            ` : ''}
                                        </div>

                                        <p class="text-gray-600 text-sm mb-3 line-clamp-2">${question.content}</p>

                                        <!-- Tags -->
                                        <div class="flex flex-wrap gap-2 mb-3">
                                            ${question.tags.map((tag) => `
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                                                    ${tag}
                                                </span>
                                            `).join('')}
                                        </div>

                                        <!-- Meta Info -->
                                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div class="flex items-center space-x-4">
                                                <div class="flex items-center space-x-2">
                                                    <div class="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center">
                                                        <span class="text-xs font-medium text-primary-600">${question.avatar}</span>
                                                    </div>
                                                    <div>
                                                        <span class="text-sm font-medium text-gray-900">${question.author}</span>
                                                        <span class="text-xs text-gray-500 ml-1">(${question.authorRole})</span>
                                                    </div>
                                                </div>
                                                <span class="text-sm text-gray-500 flex items-center">
                                                    <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="12" r="10"/>
                                                        <polyline points="12 6 12 12 16 14"/>
                                                    </svg>
                                                    ${question.timeAgo}
                                                </span>
                                            </div>

                                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                                                <span class="flex items-center">
                                                    <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                    </svg>
                                                    ${question.answers} answers
                                                </span>
                                                <span class="flex items-center">
                                                    <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                        <circle cx="12" cy="12" r="3"/>
                                                    </svg>
                                                    ${question.views} views
                                                </span>
                                            </div>
                                        </div>

                                        ${question.hasAcceptedAnswer ? `
                                            <div class="mt-3 flex items-center text-success-600 text-sm">
                                                <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                    <polyline points="22 4 12 14.01 9 11.01"/>
                                                </svg>
                                                <span>Has accepted answer</span>
                                            </div>
                                        ` : (role === 'mentor' ? `
                                            <div class="mt-3">
                                                <button onclick="openCreateAnswerPrompt(${question.id})" class="inline-flex items-center px-4 py-2 bg-success-600 text-white text-sm font-medium rounded-lg hover:bg-success-700 transition-colors">
                                                    <svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                                                    </svg>
                                                    Write an Answer
                                                </button>
                                            </div>
                                        ` : '')}
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<div class="card p-6 text-sm text-gray-600">No questions have been posted yet.</div>'}
                    </div>
                </div>
            `;
        },

        publicBlogs() {
            const categories = ['All', 'Career Guidance', 'Tech Stacks', 'Internships', 'Industry Insights', 'Interview Tips', 'Higher Studies'];
            const blogs = this.getSampleBlogs();

            return `
                <div class="max-w-7xl mx-auto space-y-8">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Career Blogs</h1>
                            <p class="text-gray-600 mt-1">Insights and guidance from industry professionals, faculty, and alumni</p>
                        </div>
                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                            <span>All blogs are verified by admin before publishing</span>
                        </div>
                    </div>

                    <!-- Search and Filter -->
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 hover:shadow-md transition">
                        <div class="flex flex-col md:flex-row gap-4">
                            <div class="flex-1 relative">
                                <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="m21 21-4.35-4.35"/>
                                </svg>
                                <input type="text" placeholder="Search blogs by title, content, or tags..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                            </div>
                            <div class="flex items-center space-x-2">
                                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                                <select class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option>Most Recent</option>
                                    <option>Most Popular</option>
                                    <option>Most Viewed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Categories -->
                    <div class="flex flex-wrap gap-2">
                        ${categories.map((category, index) => `
                            <button class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${index === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                                ${category}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Blogs Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${blogs.length ? blogs.map((blog) => `
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition group cursor-pointer" onclick="router.navigate('/blogs/${blog.id}')">
                                <!-- Blog Image Placeholder -->
                                <div class="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:from-primary-200 group-hover:to-primary-300 transition-all">
                                    <svg class="h-16 w-16 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                    </svg>
                                </div>

                                <div class="p-5">
                                    <!-- Category & Read Time -->
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                            ${blog.category}
                                        </span>
                                        <span class="text-xs text-gray-500 flex items-center">
                                            <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12 6 12 12 16 14"/>
                                            </svg>
                                            ${blog.readTime}
                                        </span>
                                    </div>

                                    <!-- Title -->
                                    <h3 class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                                        ${blog.title}
                                    </h3>

                                    <!-- Excerpt -->
                                    <p class="text-gray-600 text-sm mb-4 line-clamp-3">${blog.excerpt}</p>

                                    <!-- Tags -->
                                    <div class="flex flex-wrap gap-1 mb-4">
                                        ${blog.tags.slice(0, 2).map((tag) => `
                                            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#${tag}</span>
                                        `).join('')}
                                        ${blog.tags.length > 2 ? `<span class="text-xs text-gray-400">+${blog.tags.length - 2} more</span>` : ''}
                                    </div>

                                    <!-- Author -->
                                    <div class="flex items-center space-x-3 pt-4 border-t border-gray-100">
                                        <div class="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center">
                                            <span class="text-sm font-medium text-success-600">${blog.authorAvatar}</span>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-medium text-gray-900 truncate">${blog.author}</p>
                                            <p class="text-xs text-gray-500 truncate">${blog.authorRole}</p>
                                        </div>
                                    </div>

                                    <!-- Stats -->
                                    <div class="flex items-center justify-between mt-4 text-xs text-gray-500">
                                        <span class="flex items-center">
                                            <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" x2="16" y1="2" y2="6"/>
                                                <line x1="8" x2="8" y1="2" y2="6"/>
                                                <line x1="3" x2="21" y1="10" y2="10"/>
                                            </svg>
                                            ${blog.date}
                                        </span>
                                        <span>${blog.views.toLocaleString()} views</span>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<div class="card p-6 text-sm text-gray-600 md:col-span-2 lg:col-span-3">No blogs are available yet.</div>'}
                    </div>

                    <!-- Load More -->
                    <div class="text-center pt-8">
                        <button class="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                            <span>Load More Blogs</span>
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        },

        publicMentors() {
            const domains = ['All', 'Software Development', 'Data Science', 'Product Management', 'UX/UI Design', 'Cloud Computing', 'Cybersecurity', 'AI/ML'];
            const mentors = this.getSampleMentors();

            return `
                <div class="space-y-6">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Find Mentors</h1>
                            <p class="text-gray-600 mt-1">Connect with experienced mentors from industry and academia</p>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="text-right">
                                <span class="text-2xl font-bold text-primary-600">150+</span>
                                <span class="text-sm text-gray-600 block">Verified Mentors</span>
                            </div>
                        </div>
                    </div>

                    <!-- Search and Filter -->
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 hover:shadow-md transition">
                        <div class="flex flex-col md:flex-row gap-4">
                            <div class="flex-1 relative">
                                <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="m21 21-4.35-4.35"/>
                                </svg>
                                <input type="text" placeholder="Search mentors by name, company, or skills..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                            </div>
                            <div class="flex items-center space-x-2">
                                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                                <select class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option>Most Experienced</option>
                                    <option>Highest Rated</option>
                                    <option>Most Active</option>
                                    <option>Recently Joined</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Domain Filters -->
                    <div class="flex flex-wrap gap-2">
                        ${domains.map((domain, index) => `
                            <button class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${index === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                                ${domain}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Mentors Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${mentors.length ? mentors.map((mentor) => `
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition">
                                <!-- Header -->
                                <div class="p-6">
                                    <div class="flex items-start justify-between mb-4">
                                        <div class="flex items-center space-x-4">
                                            <div class="h-16 w-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-2xl font-bold text-primary-700">
                                                ${mentor.avatar}
                                            </div>
                                            <div>
                                                <div class="flex items-center space-x-2">
                                                    <h3 class="text-lg font-semibold text-gray-900">${mentor.name}</h3>
                                                    ${mentor.alumni ? `
                                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600">
                                                            <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                                <polyline points="22 4 12 14.01 9 11.01"/>
                                                            </svg>
                                                            Alumni
                                                        </span>
                                                    ` : ''}
                                                </div>
                                                <p class="text-sm text-gray-600">${mentor.role}</p>
                                                <p class="text-sm text-primary-600 font-medium">${mentor.company}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Details -->
                                    <div class="space-y-2 mb-4">
                                        <div class="flex items-center text-sm text-gray-600">
                                            <svg class="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                                                <circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            ${mentor.location}
                                        </div>
                                        <div class="flex items-center text-sm text-gray-600">
                                            <svg class="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                            </svg>
                                            ${mentor.experience} experience
                                        </div>
                                        ${mentor.alumni ? `
                                            <div class="flex items-center text-sm text-gray-600">
                                                <svg class="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                                </svg>
                                                Batch of ${mentor.batch}
                                            </div>
                                        ` : ''}
                                    </div>

                                    <!-- Skills -->
                                    <div class="flex flex-wrap gap-1 mb-4">
                                        ${mentor.skills.map((skill) => `
                                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                ${skill}
                                            </span>
                                        `).join('')}
                                    </div>

                                    <!-- Bio -->
                                    <p class="text-sm text-gray-600 mb-4 line-clamp-2">${mentor.bio}</p>

                                    <!-- Stats -->
                                    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div class="flex items-center space-x-4">
                                            <div class="flex items-center">
                                                <svg class="h-4 w-4 text-warning-400 fill-current" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>
                                                <span class="ml-1 text-sm font-medium text-gray-700">${mentor.rating}</span>
                                                <span class="ml-1 text-xs text-gray-500">(${mentor.reviews})</span>
                                            </div>
                                            <span class="text-sm text-gray-600">${mentor.students} students</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div class="px-6 pb-6">
                                    <button class="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                            <polyline points="22,6 12,13 2,6"/>
                                        </svg>
                                        <span>Request Mentorship</span>
                                    </button>
                                </div>
                            </div>
                        `).join('') : '<div class="card p-6 text-sm text-gray-600 md:col-span-2 lg:col-span-3">No mentors are available yet.</div>'}
                    </div>
                </div>
            `;
        },

        blogDetail(id) {
            const blogs = this.getSampleBlogs();
            if (!blogs.length) {
                return `
                    <div class="text-center py-12">
                        <h1 class="text-2xl md:text-4xl font-bold text-gray-900 mb-4">No Blogs Found</h1>
                        <p class="text-gray-600 mb-8">No blog content is available yet.</p>
                        <button onclick="router.navigate('/')" class="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700">Go Home</button>
                    </div>
                `;
            }
            const blog = blogs.find(b => b.id == id) || blogs[0];
            const authorAvatar = blog.authorAvatar || (blog.author ? blog.author[0] : 'A');
            const authorRole = blog.authorRole || 'Mentor';
            const authorBio = blog.authorBio || 'Experienced professional passionate about mentoring students.';
            const blogViews = blog.views || 0;
            const blogLikes = blog.likes || 0;
            const tags = blog.tags || [];
            const relatedBlogs = blogs.filter(b => b.id !== parseInt(id)).slice(0, 2);

            return `
                <div class="max-w-4xl mx-auto">
                    <!-- Back Button -->
                    <button onclick="event.preventDefault(); router.navigate('/blogs')" class="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6">
                        <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 19-7-7 7-7"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5"/></svg>
                        Back to Blogs
                    </button>

                    <!-- Blog Header -->
                    <div class="mb-8">
                        <div class="flex items-center space-x-2 mb-4">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">${blog.category}</span>
                            <span class="text-sm text-gray-500 flex items-center">
                                <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ${blog.readTime}
                            </span>
                        </div>
                        <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">${blog.title}</h1>
                        <div class="flex items-center justify-between flex-wrap gap-4">
                            <div class="flex items-center space-x-3">
                                <div class="h-12 w-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-xl font-bold text-primary-700">${authorAvatar}</div>
                                <div>
                                    <p class="font-medium text-gray-900 flex items-center">${blog.author}
                                        <svg class="h-4 w-4 ml-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    </p>
                                    <p class="text-sm text-gray-600">${authorRole}</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                                <span class="flex items-center">
                                    <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                    ${blog.date}
                                </span>
                                <span>${blogViews.toLocaleString()} views</span>
                            </div>
                        </div>
                    </div>

                    <!-- Featured Image -->
                    <div class="h-64 md:h-96 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mb-8">
                        <svg class="h-24 w-24 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    </div>

                    <!-- Blog Content -->
                    <div class="prose prose-lg max-w-none mb-8">
                        ${blog.content}
                    </div>

                    <!-- Tags -->
                    <div class="flex flex-wrap gap-2 mb-8 pb-8 border-b border-gray-200">
                        ${tags.map(tag => '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">#' + tag + '</span>').join('')}
                    </div>

                    <!-- Engagement -->
                    <div class="flex items-center justify-between mb-12">
                        <div class="flex items-center space-x-4">
                            <button class="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                                <span class="font-medium">${blogLikes}</span>
                            </button>
                            <button class="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                                <span class="font-medium">Discuss</span>
                            </button>
                            <button class="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                                <span class="font-medium">Share</span>
                            </button>
                        </div>
                    </div>

                    <!-- Author Card -->
                    <div class="card p-6 mb-12">
                        <div class="flex items-start space-x-4">
                            <div class="h-16 w-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-2xl font-bold text-primary-700 flex-shrink-0">${authorAvatar}</div>
                            <div class="flex-1">
                                <div class="flex items-center justify-between mb-2">
                                    <div>
                                        <h3 class="text-lg font-semibold text-gray-900">${blog.author}</h3>
                                        <p class="text-sm text-gray-600">${authorRole}</p>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button class="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                                        </button>
                                        <button class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-gray-600 mb-4">${authorBio}</p>
                                <button class="btn-primary text-sm">View Profile</button>
                            </div>
                        </div>
                    </div>

                    <!-- Comments Section -->
                    <div class="card p-6 mb-12">
                        <h3 class="text-xl font-bold text-gray-900 mb-6">Discussion</h3>
                        <div class="mb-6">
                            <textarea placeholder="Share your thoughts or ask a question... (Login required)" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" rows="3"></textarea>
                            <div class="flex justify-end mt-3">
                                <button class="btn-secondary text-sm">Login to Comment</button>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div class="flex space-x-3">
                                <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <span class="font-medium text-gray-600">R</span>
                                </div>
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-1">
                                        <span class="font-medium text-gray-900">Riku Suzuki</span>
                                        <span class="text-xs text-gray-500">2 days ago</span>
                                    </div>
                                    <p class="text-gray-600 text-sm">This is exactly what I needed! Thank you for sharing your journey. How many hours per day did you dedicate to DSA practice?</p>
                                    <div class="flex items-center space-x-4 mt-2">
                                        <button class="flex items-center space-x-1 text-sm text-gray-500 hover:text-primary-600">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                            <span>12</span>
                                        </button>
                                        <button class="text-sm text-gray-500 hover:text-primary-600">Reply</button>
                                    </div>
                                </div>
                            </div>
                            <div class="flex space-x-3 ml-6 md:ml-12">
                                <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                                    <span class="font-medium text-primary-700">${authorAvatar}</span>
                                </div>
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-1">
                                        <span class="font-medium text-gray-900">${blog.author}</span>
                                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-600">Author</span>
                                        <span class="text-xs text-gray-500">1 day ago</span>
                                    </div>
                                    <p class="text-gray-600 text-sm">Thanks Riku! I dedicated about 3-4 hours daily during my preparation phase. Consistency matters more than long hours sporadically.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Related Blogs -->
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Related Articles</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${relatedBlogs.map(related => '<a href="javascript:void(0)" onclick="event.preventDefault(); router.navigate(\'/blogs/' + related.id + '\')" class="card p-4 hover:shadow-md transition-shadow block"><h4 class="font-semibold text-gray-900 mb-2 hover:text-primary-600">' + related.title + '</h4><div class="flex items-center justify-between text-sm text-gray-500"><span>' + related.author + '</span><span class="flex items-center"><svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + related.readTime + '</span></div></a>').join('')}
                        </div>
                    </div>
                </div>
            `;
        },

        // Student Views
        studentDashboard() {
            const recentQuestions = [
                { id: 1, title: 'How to prepare for FAANG interviews?', answers: 12, views: 234, hasNewAnswer: true },
                { id: 2, title: 'Best resources for learning React in 2026?', answers: 8, views: 156, hasNewAnswer: false }
            ];

            const latestBlogs = [
                { id: 1, title: 'My Journey from Campus to Google', author: 'Dr. Sakura Sato', category: 'Career Guidance', readTime: '8 min' },
                { id: 2, title: 'Top 10 Skills for CS Students in 2026', author: 'Prof. James Wilson', category: 'Tech Stacks', readTime: '6 min' }
            ];

            const mentorSuggestions = [
                { id: 1, name: 'Dr. Sakura Sato', role: 'Senior Software Engineer @ Google', domain: 'Software Development', match: 95 },
                { id: 2, name: 'Hiroshi Nakamura', role: 'Staff Engineer @ Amazon', domain: 'Cloud Computing', match: 88 },
                { id: 3, name: 'Dr. Priya Kumar', role: 'AI Research Scientist', domain: 'AI/ML', match: 82 }
            ];

            return `
                <div class="max-w-7xl mx-auto space-y-8">
                    <!-- Welcome Section -->
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 md:p-8 hover:shadow-md transition">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 class="text-2xl font-bold mb-2">Welcome back, Kenji!</h1>
                                <p class="text-primary-100">
                                    You have 3 new notifications and 2 unread messages from your mentors.
                                </p>
                            </div>
                            <div class="mt-4 md:mt-0 flex space-x-3">
                                <button onclick="router.navigate('/student/community')" class="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                                    Ask a Question
                                </button>
                                <button onclick="router.navigate('/student/mentorship')" class="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors">
                                    Find Mentors
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Left Column -->
                        <div class="lg:col-span-2 space-y-6">
                            <!-- Recent Community Activity -->
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="text-lg font-semibold text-gray-900">Your Recent Questions</h2>
                                    <button onclick="router.navigate('/student/community')" class="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                                        View All 
                                        <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="space-y-3">
                                    ${recentQuestions.map((question) => `
                                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div class="flex-1">
                                                <h3 class="font-medium text-gray-900 text-sm">${question.title}</h3>
                                                <div class="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                    <span>${question.answers} answers</span>
                                                    <span>${question.views} views</span>
                                                </div>
                                            </div>
                                            ${question.hasNewAnswer ? `
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-600">
                                                    New
                                                </span>
                                            ` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Latest Blogs -->
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="text-lg font-semibold text-gray-900">Latest Blogs</h2>
                                    <button onclick="router.navigate('/student/blogs')" class="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                                        View All 
                                        <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="space-y-4">
                                    ${latestBlogs.map((blog) => `
                                        <div class="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                                            <div class="h-12 w-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                                </svg>
                                            </div>
                                            <div class="flex-1">
                                                <h3 class="font-medium text-gray-900 text-sm hover:text-primary-600">${blog.title}</h3>
                                                <div class="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                                    <span>${blog.author}</span>
                                                    <span>•</span>
                                                    <span>${blog.category}</span>
                                                    <span>•</span>
                                                    <span class="flex items-center">
                                                        <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <circle cx="12" cy="12" r="10"/>
                                                            <polyline points="12 6 12 12 16 14"/>
                                                        </svg>
                                                        ${blog.readTime}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Right Column -->
                        <div class="space-y-6">
                            <!-- Mentor Suggestions -->
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <svg class="h-5 w-5 mr-2 text-warning-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                    </svg>
                                    Suggested Mentors
                                </h2>
                                <div class="space-y-4">
                                    ${mentorSuggestions.map((mentor) => `
                                        <div class="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                                            <div class="flex items-center space-x-3 mb-2">
                                                <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                                                    <span class="font-medium text-primary-700">${mentor.name[0]}</span>
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <h3 class="font-medium text-gray-900 text-sm truncate">${mentor.name}</h3>
                                                    <p class="text-xs text-gray-500 truncate">${mentor.role}</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between">
                                                <span class="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                                                    ${mentor.domain}
                                                </span>
                                                <span class="text-xs text-success-600 font-medium">
                                                    ${mentor.match}% match
                                                </span>
                                            </div>
                                            <button class="w-full mt-3 py-1.5 text-xs font-medium text-primary-600 border border-primary-600 rounded hover:bg-primary-50 transition-colors">
                                                Request Mentorship
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                                <button onclick="router.navigate('/student/mentorship')" class="block text-center mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
                                    Browse All Mentors
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        studentCommunity() {
            return this.publicCommunity('student');
        },

        studentBlogs() {
            const categories = ['All', 'Career Guidance', 'Tech Stacks', 'Internships', 'Industry Insights', 'Interview Tips', 'Higher Studies'];
            const blogs = this.getSampleBlogs();

            return `
                <div class="max-w-7xl mx-auto space-y-8">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Career Blogs</h1>
                            <p class="text-gray-600 mt-1">Insights and guidance from industry professionals, faculty, and alumni</p>
                        </div>
                        <button onclick="openCreateBlogPrompt()" class="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            <span>Write New Blog</span>
                        </button>
                    </div>

                    <!-- Search and Filter -->
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 hover:shadow-md transition">
                        <div class="flex flex-col md:flex-row gap-4">
                            <div class="flex-1 relative">
                                <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="m21 21-4.35-4.35"/>
                                </svg>
                                <input type="text" placeholder="Search blogs by title, content, or tags..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                            </div>
                            <div class="flex items-center space-x-2">
                                <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                                <select class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option>Most Recent</option>
                                    <option>Most Popular</option>
                                    <option>Most Viewed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Categories -->
                    <div class="flex flex-wrap gap-2">
                        ${categories.map((category, index) => `
                            <button class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${index === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
                                ${category}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Blogs Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${blogs.length ? blogs.map((blog) => `
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition group cursor-pointer" onclick="router.navigate('/blogs/${blog.id}')">
                                <div class="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:from-primary-200 group-hover:to-primary-300 transition-all">
                                    <svg class="h-16 w-16 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                    </svg>
                                </div>
                                <div class="p-5">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">${blog.category}</span>
                                        <span class="text-xs text-gray-500 flex items-center">
                                            <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            ${blog.readTime}
                                        </span>
                                    </div>
                                    <h3 class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">${blog.title}</h3>
                                    <p class="text-gray-600 text-sm mb-4 line-clamp-3">${blog.excerpt}</p>
                                    <div class="flex flex-wrap gap-1 mb-4">
                                        ${blog.tags.slice(0, 2).map((tag) => `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#${tag}</span>`).join('')}
                                        ${blog.tags.length > 2 ? `<span class="text-xs text-gray-400">+${blog.tags.length - 2} more</span>` : ''}
                                    </div>
                                    <div class="flex items-center space-x-3 pt-4 border-t border-gray-100">
                                        <div class="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center">
                                            <span class="text-sm font-medium text-success-600">${blog.authorAvatar}</span>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-medium text-gray-900 truncate">${blog.author}</p>
                                            <p class="text-xs text-gray-500 truncate">${blog.authorRole}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center justify-between mt-4 text-xs text-gray-500">
                                        <span class="flex items-center">
                                            <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                            ${blog.date}
                                        </span>
                                        <span>${blog.views.toLocaleString()} views</span>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<div class="card p-6 text-sm text-gray-600 md:col-span-2 lg:col-span-3">No blogs found for your dashboard.</div>'}
                    </div>

                    <!-- Load More -->
                    <div class="text-center pt-8">
                        <button class="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                            <span>Load More Blogs</span>
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>`;
        },

        studentMentorship() {
            const availableMentors = [
                { id: 1, name: 'Dr. Sakura Sato', role: 'Senior Software Engineer', company: 'Google', location: 'Mountain View, CA', avatar: 'S', domain: 'Software Development', experience: '10+ years', alumni: true, batch: '2010', skills: ['System Design', 'Java', 'Python', 'Leadership'], rating: 4.9, reviews: 45, bio: 'Experienced software engineer with expertise in distributed systems.', availability: 'Available' },
                { id: 2, name: 'Hiroshi Nakamura', role: 'Staff Engineer', company: 'Amazon', location: 'Seattle, WA', avatar: 'M', domain: 'Cloud Computing', experience: '8+ years', alumni: true, batch: '2015', skills: ['AWS', 'Kubernetes', 'Microservices'], rating: 4.9, reviews: 38, bio: 'Cloud architecture specialist with deep AWS expertise.', availability: 'Available' },
                { id: 3, name: 'Dr. Priya Kumar', role: 'AI Research Scientist', company: 'OpenAI', location: 'San Francisco, CA', avatar: 'P', domain: 'AI/ML', experience: '6+ years', alumni: true, batch: '2017', skills: ['Machine Learning', 'Deep Learning', 'Python'], rating: 5.0, reviews: 32, bio: 'AI researcher working on cutting-edge language models.', availability: 'Limited spots' }
            ];
            const myRequests = [
                { id: 1, mentorName: 'Prof. James Wilson', domain: 'Software Development', status: 'pending', requestedDate: 'Jan 25, 2026', message: 'I would like guidance on preparing for technical interviews.' },
                { id: 2, mentorName: 'Ananya Reddy', domain: 'Product Management', status: 'accepted', requestedDate: 'Jan 20, 2026', responseDate: 'Jan 22, 2026' }
            ];
            const activeMentorships = [
                { id: 1, mentorName: 'Ananya Reddy', mentorRole: 'Product Manager @ Microsoft', domain: 'Product Management', startDate: 'Jan 22, 2026', lastChat: '2 hours ago', unreadMessages: 3, progress: 'In Progress' }
            ];
            const domains = ['All', 'Software Development', 'Data Science', 'Product Management', 'UX/UI Design', 'Cloud Computing', 'Cybersecurity', 'AI/ML'];

            return `
                <div class="max-w-7xl mx-auto space-y-8">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Mentorship</h1>
                            <p class="text-gray-600 mt-1">Connect with experienced mentors for personalized guidance</p>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="border-b border-gray-200">
                        <nav class="flex space-x-4 md:space-x-8 overflow-x-auto" id="mentorshipTabs">
                            <button onclick="switchMentorshipTab('find')" class="mentorship-tab py-4 px-1 border-b-2 font-medium text-sm transition-colors border-primary-600 text-primary-600" data-tab="find">Find Mentors</button>
                            <button onclick="switchMentorshipTab('requests')" class="mentorship-tab py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300" data-tab="requests">My Requests</button>
                            <button onclick="switchMentorshipTab('active')" class="mentorship-tab py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300" data-tab="active">Active Mentorships</button>
                        </nav>
                    </div>

                    <!-- Find Mentors Tab -->
                    <div id="mentorshipTab-find" class="mentorship-panel space-y-6">
                        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 hover:shadow-md transition">
                            <div class="flex flex-col md:flex-row gap-4">
                                <div class="flex-1 relative">
                                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                    <input type="text" placeholder="Search mentors by name, company, or skills..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                </div>
                                <div class="flex items-center space-x-2">
                                    <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                                    <select class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option>Highest Rated</option>
                                        <option>Most Experienced</option>
                                        <option>Recently Active</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${domains.map((d, i) => '<button class="px-4 py-2 rounded-full text-sm font-medium transition-colors ' + (i === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + '">' + d + '</button>').join('')}
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${availableMentors.map(mentor => `
                                <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition">
                                    <div class="p-6">
                                        <div class="flex items-start justify-between mb-4">
                                            <div class="flex items-center space-x-4">
                                                <div class="h-16 w-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-2xl font-bold text-primary-700">${mentor.avatar}</div>
                                                <div>
                                                    <div class="flex items-center space-x-2">
                                                        <h3 class="text-lg font-semibold text-gray-900">${mentor.name}</h3>
                                                        ${mentor.alumni ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600"><svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Alumni</span>' : ''}
                                                    </div>
                                                    <p class="text-sm text-gray-600">${mentor.role}</p>
                                                    <p class="text-sm text-primary-600 font-medium">${mentor.company}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="space-y-2 mb-4">
                                            <div class="flex items-center text-sm text-gray-600">
                                                <svg class="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                                ${mentor.location}
                                            </div>
                                            <div class="flex items-center text-sm text-gray-600">
                                                <svg class="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                                                ${mentor.experience}
                                            </div>
                                        </div>
                                        <div class="flex flex-wrap gap-1 mb-4">
                                            ${mentor.skills.map(s => '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">' + s + '</span>').join('')}
                                        </div>
                                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">${mentor.bio}</p>
                                        <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <div class="flex items-center">
                                                <svg class="h-4 w-4 text-warning-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                                <span class="ml-1 text-sm font-medium text-gray-700">${mentor.rating}</span>
                                                <span class="ml-1 text-xs text-gray-500">(${mentor.reviews})</span>
                                            </div>
                                            <span class="text-xs font-medium ${mentor.availability === 'Available' ? 'text-success-600' : 'text-warning-600'}">${mentor.availability}</span>
                                        </div>
                                    </div>
                                    <div class="px-6 pb-6">
                                        <button onclick='sendMentorshipRequest(${mentor.userId || mentor.id}, ${JSON.stringify(mentor.name)})' class="w-full btn-primary flex items-center justify-center space-x-2">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                                            <span>Request Mentorship</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- My Requests Tab -->
                    <div id="mentorshipTab-requests" class="mentorship-panel space-y-4 hidden">
                        ${myRequests.map(request => `
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 class="font-semibold text-gray-900">${request.mentorName}</h3>
                                        <p class="text-sm text-gray-600">Domain: ${request.domain}</p>
                                        <p class="text-sm text-gray-500 mt-1">Requested on: ${request.requestedDate}</p>
                                        ${request.message ? '<p class="text-sm text-gray-600 mt-2 italic">"' + request.message + '"</p>' : ''}
                                    </div>
                                    <div class="sm:text-right">
                                        ${request.status === 'pending' ?
                                            '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning-100 text-warning-600"><svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Pending</span>' :
                                            '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-600"><svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Accepted</span>'
                                        }
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Active Mentorships Tab -->
                    <div id="mentorshipTab-active" class="mentorship-panel space-y-4 hidden">
                        ${activeMentorships.map(m => `
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div class="flex items-center space-x-4">
                                        <div class="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center text-xl sm:text-2xl font-bold text-success-700 flex-shrink-0">${m.mentorName[0]}</div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">${m.mentorName}</h3>
                                            <p class="text-sm text-gray-600">${m.mentorRole}</p>
                                            <p class="text-sm text-primary-600">${m.domain}</p>
                                            <p class="text-xs text-gray-500 mt-1">Started: ${m.startDate}</p>
                                        </div>
                                    </div>
                                    <div class="sm:text-right ml-18 sm:ml-0">
                                        <button onclick="alert('Open chat with ${m.mentorName}')" class="btn-primary flex items-center space-x-2">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                                            <span>Open Chat</span>
                                            ${m.unreadMessages > 0 ? '<span class="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">' + m.unreadMessages + '</span>' : ''}
                                        </button>
                                        <p class="text-xs text-gray-500 mt-2">Last active: ${m.lastChat}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        studentProfile() {
            const studentData = {
                name: 'Kenji Tanaka',
                email: 'kenji.tanaka@college.edu',
                phone: '+91 98765 43210',
                branch: 'Computer Science',
                year: '3rd Year',
                rollNumber: 'CS2023001',
                joinedDate: 'August 2023',
                location: 'Campus Hostel',
                bio: 'Passionate about software development and AI. Looking for mentorship in full-stack development and career guidance.',
                interests: ['Web Development', 'Machine Learning', 'Cloud Computing', 'System Design'],
                skills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'],
                idCardStatus: 'verified'
            };
            const stats = { questionsAsked: 5, questionsAnswered: 12, blogsWritten: 2, blogsPending: 1, mentorshipsActive: 1, mentorshipsCompleted: 0 };
            const recentActivity = [
                { type: 'question', title: 'How to prepare for FAANG interviews?', date: '2 days ago' },
                { type: 'blog', title: 'My Experience with Summer Internship', date: '1 week ago' },
                { type: 'mentorship', title: 'Connected with Ananya Reddy', date: '2 weeks ago' }
            ];

            return `
                <div class="max-w-7xl mx-auto space-y-8">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
                            <p class="text-gray-600 mt-1">Manage your personal information and view your activity</p>
                        </div>
                        <button onclick="alert('Edit profile toggled')" class="btn-secondary flex items-center justify-center space-x-2">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            <span>Edit Profile</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Left Column - Profile Info -->
                        <div class="lg:col-span-1 space-y-6">
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 text-center hover:shadow-md transition">
                                <div class="relative inline-block mb-4">
                                    <div class="h-24 w-24 md:h-32 md:w-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 mx-auto flex items-center justify-center">
                                        <span class="text-3xl md:text-4xl font-bold text-primary-700">${studentData.name[0]}</span>
                                    </div>
                                    <button class="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                    </button>
                                </div>
                                <h2 class="text-xl font-semibold text-gray-900">${studentData.name}</h2>
                                <p class="text-gray-600">${studentData.branch}</p>
                                <p class="text-primary-600 font-medium">${studentData.year}</p>
                                <div class="mt-4 flex items-center justify-center">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-600">
                                        <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ID Verified
                                    </span>
                                </div>
                                <div class="mt-6 space-y-3 text-left">
                                    <div class="flex items-center text-sm">
                                        <svg class="h-4 w-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                        <span class="text-gray-600">${studentData.email}</span>
                                    </div>
                                    <div class="flex items-center text-sm">
                                        <svg class="h-4 w-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                        <span class="text-gray-600">${studentData.phone}</span>
                                    </div>
                                    <div class="flex items-center text-sm">
                                        <svg class="h-4 w-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                        <span class="text-gray-600">Roll No: ${studentData.rollNumber}</span>
                                    </div>
                                    <div class="flex items-center text-sm">
                                        <svg class="h-4 w-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span class="text-gray-600">${studentData.location}</span>
                                    </div>
                                    <div class="flex items-center text-sm">
                                        <svg class="h-4 w-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                        <span class="text-gray-600">Joined: ${studentData.joinedDate}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <h3 class="font-semibold text-gray-900 mb-4 flex items-center">
                                    <svg class="h-5 w-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                                    Verification Status
                                </h3>
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                                        <div class="flex items-center">
                                            <svg class="h-5 w-5 text-success-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                            <span class="text-sm font-medium text-gray-900">College ID Card</span>
                                        </div>
                                        <span class="text-xs font-medium text-success-600">Verified</span>
                                    </div>
                                    <div class="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                                        <div class="flex items-center">
                                            <svg class="h-5 w-5 text-success-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                            <span class="text-sm font-medium text-gray-900">Email Address</span>
                                        </div>
                                        <span class="text-xs font-medium text-success-600">Verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column - Details -->
                        <div class="lg:col-span-2 space-y-6">
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <h3 class="font-semibold text-gray-900 mb-4">About Me</h3>
                                <p class="text-gray-600">${studentData.bio}</p>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                    <h3 class="font-semibold text-gray-900 mb-4">Skills</h3>
                                    <div class="flex flex-wrap gap-2">
                                        ${studentData.skills.map(s => '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">' + s + '</span>').join('')}
                                    </div>
                                </div>
                                <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                    <h3 class="font-semibold text-gray-900 mb-4">Interests</h3>
                                    <div class="flex flex-wrap gap-2">
                                        ${studentData.interests.map(i => '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning-100 text-warning-800">' + i + '</span>').join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <h3 class="font-semibold text-gray-900 mb-4">Activity Statistics</h3>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div class="text-center p-4 bg-gray-50 rounded-xl"><div class="text-2xl font-bold text-gray-900">${stats.questionsAsked}</div><div class="text-sm text-gray-600">Questions Asked</div></div>
                                    <div class="text-center p-4 bg-gray-50 rounded-xl"><div class="text-2xl font-bold text-gray-900">${stats.blogsWritten}</div><div class="text-sm text-gray-600">Blogs Written</div></div>
                                    <div class="text-center p-4 bg-gray-50 rounded-xl"><div class="text-2xl font-bold text-gray-900">${stats.blogsPending}</div><div class="text-sm text-gray-600">Blogs Pending</div></div>
                                    <div class="text-center p-4 bg-gray-50 rounded-xl"><div class="text-2xl font-bold text-gray-900">${stats.mentorshipsActive}</div><div class="text-sm text-gray-600">Active Mentorships</div></div>
                                    <div class="text-center p-4 bg-gray-50 rounded-xl"><div class="text-2xl font-bold text-gray-900">${stats.questionsAnswered}</div><div class="text-sm text-gray-600">Answers Received</div></div>
                                    <div class="text-center p-4 bg-gray-50 rounded-xl"><div class="text-2xl font-bold text-gray-900">${stats.mentorshipsCompleted}</div><div class="text-sm text-gray-600">Completed Mentorships</div></div>
                                </div>
                            </div>
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <h3 class="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                                <div class="space-y-4">
                                    ${recentActivity.map(a => `
                                        <div class="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                            <div class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${a.type === 'question' ? 'bg-primary-100' : a.type === 'blog' ? 'bg-warning-100' : 'bg-success-100'}">
                                                ${a.type === 'question' ? '<svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>' : a.type === 'blog' ? '<svg class="h-5 w-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' : '<svg class="h-5 w-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>'}
                                            </div>
                                            <div class="flex-1">
                                                <p class="text-sm font-medium text-gray-900">${a.title}</p>
                                                <p class="text-xs text-gray-500 mt-0.5 capitalize">${a.type} • ${a.date}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <h3 class="font-semibold text-gray-900 mb-4">My Questions</h3>
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                        <div><p class="font-medium text-gray-900 text-sm">How to prepare for FAANG interviews?</p><p class="text-xs text-gray-500 mt-0.5">12 answers • 234 views</p></div>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600">Answered</span>
                                    </div>
                                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                        <div><p class="font-medium text-gray-900 text-sm">Best resources for learning React?</p><p class="text-xs text-gray-500 mt-0.5">8 answers • 156 views</p></div>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-100 text-warning-600">Open</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 hover:shadow-md transition">
                                <h3 class="font-semibold text-gray-900 mb-4">My Blogs</h3>
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                        <div><p class="font-medium text-gray-900 text-sm">My Experience with Summer Internship</p><p class="text-xs text-gray-500 mt-0.5">234 views • 45 likes</p></div>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600">Published</span>
                                    </div>
                                    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                        <div><p class="font-medium text-gray-900 text-sm">How I Cracked My First Coding Interview</p><p class="text-xs text-gray-500 mt-0.5">Submitted 2 days ago</p></div>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-100 text-warning-600">Pending Review</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        studentChat() {
            const messages = [
                { id: 1, sender: 'mentor', text: 'Hi John! Welcome to our mentorship program. How can I help you today?', time: '10:30 AM', status: 'read' },
                { id: 2, sender: 'student', text: 'Hi Ananya! Thanks for accepting my mentorship request. I wanted to discuss my career path in product management.', time: '10:32 AM', status: 'read' },
                { id: 3, sender: 'mentor', text: "That sounds great! I'd be happy to help. What specific areas are you interested in learning about?", time: '10:35 AM', status: 'read' },
                { id: 4, sender: 'student', text: "I'm particularly interested in understanding how to transition from a technical role to product management. I have a CS background.", time: '10:38 AM', status: 'read' },
                { id: 5, sender: 'mentor', text: "That's a great question! With a CS background, you already have a strong foundation. Let me share some insights...", time: '10:42 AM', status: 'read' },
                { id: 6, sender: 'mentor', text: '1. Start by understanding user needs and market research\n2. Learn to communicate with both technical and non-technical stakeholders\n3. Practice prioritization and roadmap planning\n4. Get hands-on experience through side projects or internships', time: '10:43 AM', status: 'read' },
                { id: 7, sender: 'student', text: 'Thank you so much! This is very helpful. Do you recommend any specific courses or resources?', time: '10:45 AM', status: 'delivered' },
                { id: 8, sender: 'mentor', text: 'Absolutely! Here are some resources I recommend:\n\n• "Inspired" by Marty Cagan - A must-read book\n• Coursera\'s Product Management specialization\n• Follow product blogs like Mind the Product\n• Join PM communities on Slack and Discord', time: '2 hours ago', status: 'read' }
            ];
            const mentor = { name: 'Ananya Reddy', role: 'Product Manager @ Microsoft', avatar: 'A' };
            const checkSvg = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
            const dblCheckSvg = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 6 7 17l-5-5"/><path d="m22 10-9.5 9.5L10 17"/></svg>';
            const clockSvg = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
            return `
                <div class="h-[calc(100dvh-8rem)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                        <div class="flex items-center space-x-4">
                            <a href="javascript:void(0)" onclick="event.preventDefault(); router.navigate('/student/mentorship')" class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg></a>
                            <div class="relative">
                                <div class="h-12 w-12 rounded-full bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center"><span class="text-xl font-bold text-success-700">${mentor.avatar}</span></div>
                                <div class="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div><h2 class="font-semibold text-gray-900">${mentor.name}</h2><p class="text-sm text-gray-500">${mentor.role}</p></div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></button>
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 bg-gray-50">
                        <div class="flex justify-center"><span class="px-4 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">Today</span></div>
                        ${messages.map(msg => `
                            <div class="flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}">
                                <div class="flex max-w-[85%] md:max-w-[70%] ${msg.sender === 'student' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2">
                                    ${msg.sender === 'mentor' ? '<div class="h-8 w-8 rounded-full bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center flex-shrink-0"><span class="text-sm font-bold text-success-700">' + mentor.avatar + '</span></div>' : ''}
                                    <div class="px-4 py-2 rounded-2xl ${msg.sender === 'student' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'}">
                                        <p class="text-sm whitespace-pre-wrap">${msg.text}</p>
                                        <div class="flex items-center justify-end mt-1 space-x-1 ${msg.sender === 'student' ? 'text-primary-200' : 'text-gray-400'}">
                                            <span class="text-xs">${msg.time}</span>
                                            ${msg.sender === 'student' ? (msg.status === 'sending' ? clockSvg : msg.status === 'delivered' ? checkSvg : dblCheckSvg) : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="px-3 py-3 md:px-6 md:py-4 border-t border-gray-200 bg-white">
                        <form onsubmit="event.preventDefault(); handleChatSend('studentChatInput')" class="flex items-center space-x-3">
                            <button type="button" class="p-2 text-gray-400 hover:text-gray-600 transition-colors"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                            <div class="flex-1 relative">
                                <input id="studentChatInput" type="text" placeholder="Type a message..." class="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <button type="button" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg></button>
                            </div>
                            <button type="submit" class="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
                        </form>
                    </div>
                </div>
            `;
        },

        // Mentor Views
        mentorDashboard() {
            const pendingRequests = [
                { id: 1, studentName: 'Riku Suzuki', year: '3rd Year', branch: 'Computer Science', domain: 'Software Development', message: 'I want to learn about full-stack development and prepare for interviews.', requestedDate: '2 hours ago' },
                { id: 2, studentName: 'Hana Takahashi', year: '2nd Year', branch: 'Computer Science', domain: 'Web Development', message: 'Looking for guidance on React and modern frontend technologies.', requestedDate: '5 hours ago' },
                { id: 3, studentName: 'Ren Yamamoto', year: '4th Year', branch: 'Information Technology', domain: 'System Design', message: 'Need help preparing for system design interviews at top tech companies.', requestedDate: '1 day ago' }
            ];

            const taggedQuestions = [
                { id: 1, title: 'How to prepare for system design interviews?', student: 'Kaito Saito', answers: 3, timeAgo: '2 hours ago', status: 'unanswered' },
                { id: 2, title: 'Best practices for scalable architecture?', student: 'Yui Kobayashi', answers: 5, timeAgo: '5 hours ago', status: 'answered' }
            ];

            const myStudents = [
                { id: 1, name: 'Kenji Tanaka', year: '3rd Year', branch: 'Computer Science', progress: 'In Progress', lastChat: '2 hours ago', unreadMessages: 2 },
                { id: 2, name: 'Mei Watanabe', year: '2nd Year', branch: 'Computer Science', progress: 'Just Started', lastChat: '1 day ago', unreadMessages: 0 }
            ];

            const recentBlogs = [
                { id: 1, title: 'My Journey from Campus to Google: A Complete Guide', views: 2340, likes: 156, date: 'Jan 28, 2026', status: 'published' },
                { id: 2, title: 'Top 5 Mistakes to Avoid in Technical Interviews', views: 1890, likes: 134, date: 'Jan 25, 2026', status: 'published' }
            ];

            return `
                <div class="space-y-6">
                    <!-- Welcome Section -->
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 bg-gradient-to-r from-success-600 to-success-700 text-white">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 class="text-2xl font-bold mb-2">Welcome back, Dr. Sakura!</h1>
                                <p class="text-success-100">
                                    You have ${pendingRequests.length} new mentorship requests and ${taggedQuestions.filter(q => q.status === 'unanswered').length} questions tagged to you.
                                </p>
                            </div>
                            <div class="mt-4 md:mt-0 flex space-x-3">
                                <button onclick="router.navigate('/mentor/community')" class="px-4 py-2 bg-white text-success-600 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                                    Answer Questions
                                </button>
                                <button onclick="router.navigate('/mentor/blogs')" class="px-4 py-2 bg-success-500 text-white rounded-lg font-medium hover:bg-success-400 transition-colors">
                                    Write Blog
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Left Column -->
                        <div class="lg:col-span-2 space-y-6">
                            <!-- Mentorship Requests -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                                        <svg class="h-5 w-5 mr-2 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="9" cy="7" r="4"/>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                        </svg>
                                        Pending Mentorship Requests
                                    </h2>
                                    <button onclick="router.navigate('/mentor/students')" class="text-sm text-success-600 hover:text-success-700">View All</button>
                                </div>
                                <div class="space-y-4">
                                    ${pendingRequests.map((request) => `
                                        <div class="border border-gray-200 rounded-lg p-4">
                                            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                <div class="flex items-start space-x-3">
                                                    <div class="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                                        <span class="font-medium text-primary-600">${request.studentName[0]}</span>
                                                    </div>
                                                    <div>
                                                        <h3 class="font-medium text-gray-900">${request.studentName}</h3>
                                                        <p class="text-sm text-gray-600">${request.year}, ${request.branch}</p>
                                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600 mt-1">
                                                            ${request.domain}
                                                        </span>
                                                        <p class="text-sm text-gray-600 mt-2 italic">"${request.message}"</p>
                                                        <p class="text-xs text-gray-400 mt-1">Requested ${request.requestedDate}</p>
                                                    </div>
                                                </div>
                                                <div class="flex space-x-2 ml-15 sm:ml-0 flex-shrink-0">
                                                    <button class="px-4 py-2 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors">
                                                        Accept
                                                    </button>
                                                    <button class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Questions Tagged to Me -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                                        <svg class="h-5 w-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                            <path d="M12 17h.01"/>
                                        </svg>
                                        Questions Tagged to You
                                    </h2>
                                    <button onclick="router.navigate('/mentor/community')" class="text-sm text-success-600 hover:text-success-700 flex items-center">
                                        View All 
                                        <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="space-y-3">
                                    ${taggedQuestions.map((question) => `
                                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div class="flex-1">
                                                <h3 class="font-medium text-gray-900 text-sm">${question.title}</h3>
                                                <div class="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                    <span>By ${question.student}</span>
                                                    <span>${question.answers} answers</span>
                                                    <span>${question.timeAgo}</span>
                                                </div>
                                            </div>
                                            ${question.status === 'unanswered' ? `
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                                                    Needs Answer
                                                </span>
                                            ` : `
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-600">
                                                    <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                        <polyline points="22 4 12 14.01 9 11.01"/>
                                                    </svg>
                                                    Answered
                                                </span>
                                            `}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Right Column -->
                        <div class="space-y-6">
                            <!-- My Students -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <svg class="h-5 w-5 mr-2 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    My Students
                                </h2>
                                <div class="space-y-4">
                                    ${myStudents.map((student) => `
                                        <div class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                                            <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                                <span class="font-medium text-primary-600">${student.name[0]}</span>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <h3 class="font-medium text-gray-900 text-sm truncate">${student.name}</h3>
                                                <p class="text-xs text-gray-500">${student.year}, ${student.branch}</p>
                                                <span class="text-xs text-success-600">${student.progress}</span>
                                            </div>
                                            <button class="relative p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors">
                                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
                                                </svg>
                                                ${student.unreadMessages > 0 ? `
                                                    <span class="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                                        ${student.unreadMessages}
                                                    </span>
                                                ` : ''}
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                                <button onclick="router.navigate('/mentor/students')" class="block text-center mt-4 text-sm text-success-600 hover:text-success-700 font-medium">
                                    View All Students
                                </button>
                            </div>

                            <!-- My Recent Blogs -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                                        <svg class="h-5 w-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                        </svg>
                                        My Recent Blogs
                                    </h2>
                                    <button onclick="router.navigate('/mentor/blogs')" class="text-sm text-success-600 hover:text-success-700 flex items-center">
                                        View All 
                                        <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="space-y-4">
                                    ${recentBlogs.map((blog) => `
                                        <div class="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                            <div class="h-12 w-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                                </svg>
                                            </div>
                                            <div class="flex-1">
                                                <h3 class="font-medium text-gray-900 text-sm hover:text-success-600 cursor-pointer">${blog.title}</h3>
                                                <div class="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                    <span>${blog.views.toLocaleString()} views</span>
                                                    <span>${blog.likes} likes</span>
                                                    <span>${blog.date}</span>
                                                </div>
                                            </div>
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-600">
                                                Published
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        mentorCommunity() {
            return this.publicCommunity('mentor');
        },

        mentorBlogs() {
            const blogs = [
                { 
                    id: 1, 
                    title: 'My Journey from Campus to Google: A Complete Guide', 
                    excerpt: 'Sharing my complete journey from college campus placements to landing a role at Google. Includes tips on resume building, interview preparation, and what to expect.',
                    status: 'published',
                    views: 2340, 
                    likes: 156, 
                    date: 'Jan 28, 2026',
                    category: 'Career Guidance',
                    readTime: '8 min read'
                },
                { 
                    id: 2, 
                    title: 'Top 5 Mistakes to Avoid in Technical Interviews', 
                    excerpt: 'Common pitfalls that candidates face during technical interviews and how to avoid them. Based on my experience interviewing 100+ candidates.',
                    status: 'published',
                    views: 1890, 
                    likes: 134, 
                    date: 'Jan 25, 2026',
                    category: 'Interview Tips',
                    readTime: '6 min read'
                },
                { 
                    id: 3, 
                    title: 'Understanding System Design: A Beginner\'s Guide', 
                    excerpt: 'Everything you need to know about system design interviews. From basic concepts to designing scalable distributed systems.',
                    status: 'published',
                    views: 4560, 
                    likes: 389, 
                    date: 'Jan 20, 2026',
                    category: 'System Design',
                    readTime: '12 min read'
                },
                { 
                    id: 4, 
                    title: 'Advanced TypeScript Patterns', 
                    excerpt: 'Deep dive into advanced TypeScript patterns including generics, decorators, and utility types.',
                    status: 'draft',
                    views: 0, 
                    likes: 0, 
                    date: 'Jan 18, 2026',
                    category: 'Tech Stacks',
                    readTime: '10 min read'
                }
            ];

            const stats = {
                totalPublished: 3,
                totalDrafts: 1,
                totalViews: 8790,
                totalLikes: 679
            };

            return `
                <div class="space-y-6">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">My Blogs</h1>
                            <p class="text-gray-600 mt-1">Manage your blog posts and track their performance</p>
                        </div>
                        <button onclick="openCreateBlogPrompt()" class="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 transition-colors">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            <span>Write New Blog</span>
                        </button>
                    </div>

                    <!-- Stats Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-gray-900">${stats.totalPublished}</div>
                            <div class="text-sm text-gray-600">Published</div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-gray-900">${stats.totalDrafts}</div>
                            <div class="text-sm text-gray-600">Drafts</div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-primary-600">${stats.totalViews.toLocaleString()}</div>
                            <div class="text-sm text-gray-600">Total Views</div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-red-600">${stats.totalLikes}</div>
                            <div class="text-sm text-gray-600">Total Likes</div>
                        </div>
                    </div>

                    <!-- Blog List -->
                    <div class="space-y-4">
                        ${blogs.length ? blogs.map((blog) => `
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div class="flex flex-col md:flex-row md:items-start gap-4">
                                    <!-- Blog Image Placeholder -->
                                    <div class="h-24 w-24 md:h-32 md:w-32 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg class="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                        </svg>
                                    </div>
                                    
                                    <div class="flex-1">
                                        <div class="flex flex-wrap items-center gap-2 mb-2">
                                            <h3 class="text-lg font-semibold text-gray-900 hover:text-success-600 cursor-pointer">${blog.title}</h3>
                                            ${blog.status === 'published' ? `
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600">
                                                    Published
                                                </span>
                                            ` : `
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-100 text-warning-600">
                                                    Draft
                                                </span>
                                            `}
                                        </div>
                                        
                                        <p class="text-gray-600 text-sm mb-3 line-clamp-2">${blog.excerpt}</p>
                                        
                                        <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                                ${blog.category}
                                            </span>
                                            <span class="flex items-center">
                                                <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <polyline points="12 6 12 12 16 14"/>
                                                </svg>
                                                ${blog.readTime}
                                            </span>
                                            ${blog.status === 'published' ? `
                                                <span class="flex items-center">
                                                    <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                        <circle cx="12" cy="12" r="3"/>
                                                    </svg>
                                                    ${blog.views.toLocaleString()} views
                                                </span>
                                                <span class="flex items-center">
                                                    <svg class="h-4 w-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                                                    </svg>
                                                    ${blog.likes} likes
                                                </span>
                                            ` : ''}
                                            <span>${blog.date}</span>
                                        </div>
                                        
                                        <div class="flex flex-wrap gap-2">
                                            ${blog.status === 'published' ? `
                                                <button onclick="alert('View blog: ${blog.title}')" class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                                    View
                                                </button>
                                                <button onclick="alert('Edit blog: ${blog.title}')" class="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                                                    Edit
                                                </button>
                                                <button onclick="alert('View analytics for: ${blog.title}')" class="px-4 py-2 text-sm font-medium text-success-600 border border-success-600 rounded-lg hover:bg-success-50 transition-colors">
                                                    Analytics
                                                </button>
                                            ` : `
                                                <button onclick="alert('Continue editing: ${blog.title}')" class="px-4 py-2 text-sm font-medium text-warning-600 border border-warning-600 rounded-lg hover:bg-warning-50 transition-colors">
                                                    Continue Editing
                                                </button>
                                                <button onclick="alert('Publish blog: ${blog.title}')" class="px-4 py-2 text-sm font-medium text-success-600 border border-success-600 rounded-lg hover:bg-success-50 transition-colors">
                                                    Publish
                                                </button>
                                            `}
                                            <button onclick="alert('Delete blog: ${blog.title}')" class="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors ml-auto">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<div class="card p-6 text-sm text-gray-600">No blog posts found.</div>'}
                    </div>
                </div>
            `;
        },

        mentorStudents() {
            const students = [
                {
                    id: 1,
                    name: 'Kenji Tanaka',
                    email: 'kenji.t@college.edu',
                    year: '3rd Year',
                    branch: 'Computer Science',
                    avatar: 'K',
                    interests: ['Web Development', 'System Design'],
                    progress: 'In Progress',
                    lastSession: '2 days ago',
                    nextSession: 'Tomorrow, 3:00 PM',
                    totalSessions: 12,
                    status: 'active'
                },
                {
                    id: 2,
                    name: 'Mei Watanabe',
                    email: 'mei.w@college.edu',
                    year: '2nd Year',
                    branch: 'Computer Science',
                    avatar: 'M',
                    interests: ['AI/ML', 'Data Science'],
                    progress: 'Just Started',
                    lastSession: '1 week ago',
                    nextSession: 'Friday, 2:00 PM',
                    totalSessions: 3,
                    status: 'active'
                },
                {
                    id: 3,
                    name: 'Riku Suzuki',
                    email: 'riku.s@college.edu',
                    year: '4th Year',
                    branch: 'Information Technology',
                    avatar: 'R',
                    interests: ['Cloud Computing', 'DevOps'],
                    progress: 'Advanced',
                    lastSession: '3 days ago',
                    nextSession: 'Saturday, 10:00 AM',
                    totalSessions: 20,
                    status: 'active'
                }
            ];

            const stats = {
                totalStudents: 3,
                activeMentorships: 3,
                completedMentorships: 0,
                pendingRequests: 3
            };

            return `
                <div class="space-y-6">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">My Students</h1>
                            <p class="text-gray-600 mt-1">Manage your mentorship relationships and track student progress</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="alert('View pending requests')" class="relative px-4 py-2 bg-warning-100 text-warning-700 rounded-lg font-medium hover:bg-warning-200 transition-colors">
                                Pending Requests
                                ${stats.pendingRequests > 0 ? `
                                    <span class="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                        ${stats.pendingRequests}
                                    </span>
                                ` : ''}
                            </button>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-gray-900">${stats.totalStudents}</div>
                            <div class="text-sm text-gray-600">Total Students</div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-success-600">${stats.activeMentorships}</div>
                            <div class="text-sm text-gray-600">Active</div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-primary-600">${stats.completedMentorships}</div>
                            <div class="text-sm text-gray-600">Completed</div>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="text-2xl font-bold text-warning-600">${stats.pendingRequests}</div>
                            <div class="text-sm text-gray-600">Pending</div>
                        </div>
                    </div>

                    <!-- Students List -->
                    <div class="space-y-4">
                        ${students.map((student) => `
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div class="flex flex-col md:flex-row md:items-start gap-4">
                                    <!-- Avatar -->
                                    <div class="h-16 w-16 rounded-full bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center text-2xl font-bold text-success-700 flex-shrink-0">
                                        ${student.avatar}
                                    </div>
                                    
                                    <div class="flex-1">
                                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                                            <div>
                                                <div class="flex items-center space-x-2">
                                                    <h3 class="text-lg font-semibold text-gray-900">${student.name}</h3>
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-600">
                                                        <span class="w-1.5 h-1.5 bg-success-500 rounded-full mr-1"></span>
                                                        ${student.status === 'active' ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <p class="text-sm text-gray-600">${student.year}, ${student.branch}</p>
                                                <p class="text-xs text-gray-500">${student.email}</p>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-700">
                                                    ${student.progress}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <!-- Interests -->
                                        <div class="flex flex-wrap gap-2 mb-4">
                                            ${student.interests.map(interest => `
                                                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                    ${interest}
                                                </span>
                                            `).join('')}
                                        </div>
                                        
                                        <!-- Session Info -->
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                                            <div>
                                                <p class="text-xs text-gray-500">Total Sessions</p>
                                                <p class="text-sm font-medium text-gray-900">${student.totalSessions}</p>
                                            </div>
                                            <div>
                                                <p class="text-xs text-gray-500">Last Session</p>
                                                <p class="text-sm font-medium text-gray-900">${student.lastSession}</p>
                                            </div>
                                            <div>
                                                <p class="text-xs text-gray-500">Next Session</p>
                                                <p class="text-sm font-medium text-gray-900">${student.nextSession}</p>
                                            </div>
                                        </div>
                                        
                                        <!-- Actions -->
                                        <div class="flex flex-wrap gap-2">
                                            <button onclick="alert('View profile of ${student.name}')" class="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                                View Profile
                                            </button>
                                            <button onclick="alert('Message ${student.name}')" class="px-4 py-2 text-sm font-medium text-success-600 border border-success-600 rounded-lg hover:bg-success-50 transition-colors flex items-center space-x-1">
                                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
                                                </svg>
                                                <span>Message</span>
                                            </button>
                                            <button onclick="alert('Schedule session with ${student.name}')" class="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors flex items-center space-x-1">
                                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                    <line x1="16" x2="16" y1="2" y2="6"/>
                                                    <line x1="8" x2="8" y1="2" y2="6"/>
                                                    <line x1="3" x2="21" y1="10" y2="10"/>
                                                </svg>
                                                <span>Schedule</span>
                                            </button>
                                            <button onclick="alert('View progress of ${student.name}')" class="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors flex items-center space-x-1 ml-auto">
                                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                    <polyline points="22 4 12 14.01 9 11.01"/>
                                                </svg>
                                                <span>Progress</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        mentorProfile() {
            const mentorData = {
                name: 'Dr. Sakura Sato',
                email: 'mentor@demo.com',
                role: 'Senior Software Engineer',
                company: 'Google',
                location: 'Mountain View, CA',
                avatar: 'S',
                batch: '2010',
                experience: '10+ years',
                bio: 'Experienced software engineer with expertise in distributed systems and cloud architecture. Passionate about mentoring the next generation of developers. Former Tech Lead at multiple startups.',
                expertise: ['System Design', 'React', 'Node.js', 'Cloud Architecture', 'Distributed Systems'],
                skills: ['Java', 'Python', 'Go', 'AWS', 'Kubernetes', 'Microservices'],
                stats: {
                    studentsMentored: 24,
                    questionsAnswered: 156,
                    blogsPublished: 12,
                    avgRating: 4.9
                },
                availability: 'Available for mentorship',
                linkedin: '#',
                website: '#'
            };

            return `
                <div class="space-y-6">
                    <!-- Profile Header -->
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div class="flex flex-col md:flex-row md:items-center gap-6">
                            <div class="h-24 w-24 rounded-full bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center text-3xl font-bold text-success-700">
                                ${mentorData.avatar}
                            </div>
                            <div class="flex-1">
                                <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h1 class="text-2xl font-bold text-gray-900">${mentorData.name}</h1>
                                        <p class="text-gray-600">${mentorData.role} at ${mentorData.company}</p>
                                        <div class="flex items-center space-x-2 mt-1">
                                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                                                <circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            <span class="text-sm text-gray-500">${mentorData.location}</span>
                                        </div>
                                    </div>
                                    <div class="mt-4 md:mt-0">
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-700">
                                            <span class="w-2 h-2 bg-success-500 rounded-full mr-2"></span>
                                            ${mentorData.availability}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="flex flex-wrap gap-2 mt-4">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                                        <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                        </svg>
                                        Alumni Batch ${mentorData.batch}
                                    </span>
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                        ${mentorData.experience} experience
                                    </span>
                                </div>
                            </div>
                            <div class="flex flex-col space-y-2">
                                <button onclick="alert('Edit mentor profile')" class="px-4 py-2 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors flex items-center justify-center space-x-2">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                    <span>Edit Profile</span>
                                </button>
                                <button onclick="alert('Change password')" class="px-4 py-2 text-success-600 text-sm border border-success-600 rounded-lg hover:bg-success-50 transition-colors">
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Left Column -->
                        <div class="lg:col-span-2 space-y-6">
                            <!-- About Section -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4">About</h2>
                                <p class="text-gray-600 text-sm leading-relaxed">${mentorData.bio}</p>
                            </div>

                            <!-- Expertise Section -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4">Areas of Expertise</h2>
                                <div class="flex flex-wrap gap-2">
                                    ${mentorData.expertise.map(exp => `
                                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-success-50 text-success-700">
                                            ${exp}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Skills Section -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4">Technical Skills</h2>
                                <div class="flex flex-wrap gap-2">
                                    ${mentorData.skills.map(skill => `
                                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700">
                                            ${skill}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Contact Information -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                                <div class="space-y-4">
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
                                            <svg class="h-5 w-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">Email</p>
                                            <p class="text-sm text-gray-600">${mentorData.email}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                                            <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                                                <rect x="2" y="9" width="4" height="12"/>
                                                <circle cx="4" cy="4" r="2"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">LinkedIn</p>
                                            <a href="#" class="text-sm text-primary-600 hover:underline">View Profile</a>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <div class="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                            <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10"/>
                                                <line x1="2" x2="22" y1="12" y2="12"/>
                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">Website</p>
                                            <a href="#" class="text-sm text-primary-600 hover:underline">Visit Website</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column - Stats -->
                        <div class="space-y-6">
                            <!-- Impact Stats -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4">Impact</h2>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div class="text-center p-4 bg-success-50 rounded-lg">
                                        <div class="text-2xl font-bold text-success-600">${mentorData.stats.studentsMentored}</div>
                                        <div class="text-xs text-gray-600 mt-1">Students</div>
                                    </div>
                                    <div class="text-center p-4 bg-primary-50 rounded-lg">
                                        <div class="text-2xl font-bold text-primary-600">${mentorData.stats.questionsAnswered}</div>
                                        <div class="text-xs text-gray-600 mt-1">Answers</div>
                                    </div>
                                    <div class="text-center p-4 bg-purple-50 rounded-lg">
                                        <div class="text-2xl font-bold text-purple-600">${mentorData.stats.blogsPublished}</div>
                                        <div class="text-xs text-gray-600 mt-1">Blogs</div>
                                    </div>
                                    <div class="text-center p-4 bg-warning-50 rounded-lg">
                                        <div class="text-2xl font-bold text-warning-600">${mentorData.stats.avgRating}</div>
                                        <div class="text-xs text-gray-600 mt-1">Rating</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Mentorship Preferences -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4">Mentorship Settings</h2>
                                <div class="space-y-3">
                                    <button onclick="alert('Manage availability')" class="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div class="flex items-center space-x-3">
                                            <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12 6 12 12 16 14"/>
                                            </svg>
                                            <span class="text-sm text-gray-700">Availability</span>
                                        </div>
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="m9 18 6-6-6-6"/>
                                        </svg>
                                    </button>
                                    <button onclick="alert('Set expertise areas')" class="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div class="flex items-center space-x-3">
                                            <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                            </svg>
                                            <span class="text-sm text-gray-700">Expertise Areas</span>
                                        </div>
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="m9 18 6-6-6-6"/>
                                        </svg>
                                    </button>
                                    <button onclick="alert('Notification preferences')" class="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div class="flex items-center space-x-3">
                                            <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                                                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                                            </svg>
                                            <span class="text-sm text-gray-700">Notifications</span>
                                        </div>
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="m9 18 6-6-6-6"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Danger Zone -->
                            <div class="bg-red-50 rounded-lg p-6 border border-red-200">
                                <h2 class="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
                                <p class="text-sm text-red-700 mb-4">Once you delete your account, there is no going back.</p>
                                <button onclick="alert('Delete mentor account')" class="w-full px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        mentorChat() {
            const messages = [
                { id: 1, sender: 'student', text: 'Hi Akari! Thanks for accepting my mentorship request.', time: '10:30 AM', status: 'read' },
                { id: 2, sender: 'mentor', text: 'Hi Kenji! Welcome to our mentorship program. How can I help you today?', time: '10:32 AM', status: 'read' },
                { id: 3, sender: 'student', text: 'I wanted to discuss my career path in product management. I have a CS background.', time: '10:35 AM', status: 'read' },
                { id: 4, sender: 'mentor', text: "That's a great question! I'd be happy to help. With a CS background, you already have a strong foundation.", time: '10:38 AM', status: 'read' },
                { id: 5, sender: 'mentor', text: 'Let me share some insights:\n\n1. Start by understanding user needs and market research\n2. Learn to communicate with both technical and non-technical stakeholders\n3. Practice prioritization and roadmap planning\n4. Get hands-on experience through side projects or internships', time: '10:42 AM', status: 'read' },
                { id: 6, sender: 'student', text: 'Thank you so much! This is very helpful. Do you recommend any specific courses or resources?', time: '10:45 AM', status: 'read' },
                { id: 7, sender: 'mentor', text: 'Absolutely! Here are some resources I recommend:\n\n• "Inspired" by Marty Cagan - A must-read book\n• Coursera\'s Product Management specialization\n• Follow product blogs like Mind the Product\n• Join PM communities on Slack and Discord', time: '2 hours ago', status: 'read' },
                { id: 8, sender: 'student', text: "That's amazing! I'll definitely check these out. Can we schedule a call to discuss my specific situation?", time: '1 hour ago', status: 'read' }
            ];
            const student = { name: 'Kenji Tanaka', year: '3rd Year', branch: 'Computer Science', avatar: 'K', mentorshipStart: 'Jan 22, 2026', sessionsCompleted: 5, totalSessions: 10 };
            const checkSvg = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
            const dblCheckSvg = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 6 7 17l-5-5"/><path d="m22 10-9.5 9.5L10 17"/></svg>';
            const clockSvg = '<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
            const progressPct = Math.round((student.sessionsCompleted / student.totalSessions) * 100);
            return `
                <div class="h-[calc(100dvh-8rem)] flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="flex-1 flex flex-col">
                        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                            <div class="flex items-center space-x-4">
                                <a href="javascript:void(0)" onclick="event.preventDefault(); router.navigate('/mentor/students')" class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg></a>
                                <div class="relative">
                                    <div class="h-12 w-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center"><span class="text-xl font-bold text-primary-700">${student.avatar}</span></div>
                                    <div class="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div><h2 class="font-semibold text-gray-900">${student.name}</h2><p class="text-sm text-gray-500">${student.year}, ${student.branch}</p></div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                                <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></button>
                                <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors"><svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
                            </div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 bg-gray-50">
                            <div class="flex justify-center"><span class="px-4 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">Today</span></div>
                            ${messages.map(msg => `
                                <div class="flex ${msg.sender === 'mentor' ? 'justify-end' : 'justify-start'}">
                                    <div class="flex max-w-[85%] md:max-w-[70%] ${msg.sender === 'mentor' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2">
                                        ${msg.sender === 'student' ? '<div class="h-8 w-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0"><span class="text-sm font-bold text-primary-700">' + student.avatar + '</span></div>' : ''}
                                        <div class="px-4 py-2 rounded-2xl ${msg.sender === 'mentor' ? 'bg-success-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'}">
                                            <p class="text-sm whitespace-pre-wrap">${msg.text}</p>
                                            <div class="flex items-center justify-end mt-1 space-x-1 ${msg.sender === 'mentor' ? 'text-success-200' : 'text-gray-400'}">
                                                <span class="text-xs">${msg.time}</span>
                                                ${msg.sender === 'mentor' ? (msg.status === 'sending' ? clockSvg : msg.status === 'delivered' ? checkSvg : dblCheckSvg) : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="px-3 py-3 md:px-6 md:py-4 border-t border-gray-200 bg-white">
                            <form onsubmit="event.preventDefault(); handleChatSend('mentorChatInput')" class="flex items-center space-x-3">
                                <button type="button" class="p-2 text-gray-400 hover:text-gray-600 transition-colors"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                                <div class="flex-1 relative">
                                    <input id="mentorChatInput" type="text" placeholder="Type a message..." class="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-success-500">
                                    <button type="button" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg></button>
                                </div>
                                <button type="submit" class="p-3 bg-success-600 text-white rounded-full hover:bg-success-700 transition-colors disabled:opacity-50"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
                            </form>
                        </div>
                    </div>
                    <div class="w-80 border-l border-gray-200 bg-gray-50 hidden lg:block">
                        <div class="p-6">
                            <div class="text-center mb-6">
                                <div class="h-20 w-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 mx-auto flex items-center justify-center mb-3"><span class="text-3xl font-bold text-primary-700">${student.avatar}</span></div>
                                <h3 class="font-semibold text-gray-900">${student.name}</h3>
                                <p class="text-sm text-gray-600">${student.year}, ${student.branch}</p>
                            </div>
                            <div class="space-y-4">
                                <div class="bg-white rounded-lg p-4">
                                    <h4 class="text-sm font-medium text-gray-900 mb-3">Mentorship Details</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between"><span class="text-gray-600">Started</span><span class="text-gray-900">${student.mentorshipStart}</span></div>
                                        <div class="flex justify-between"><span class="text-gray-600">Sessions</span><span class="text-gray-900">${student.sessionsCompleted}/${student.totalSessions}</span></div>
                                        <div class="mt-3"><div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div class="h-full bg-success-600 rounded-full" style="width: ${progressPct}%"></div></div></div>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg p-4">
                                    <h4 class="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                                    <div class="space-y-2">
                                        <button class="w-full flex items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"><svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> Schedule Session</button>
                                        <button class="w-full flex items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"><svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> View Profile</button>
                                        <button class="w-full flex items-center p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"><svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Call Student</button>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg p-4">
                                    <h4 class="text-sm font-medium text-gray-900 mb-3">Notes</h4>
                                    <textarea placeholder="Add private notes about this student..." rows="4" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-success-500"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // Admin Views
        adminDashboard() {
            const stats = {
                totalStudents: 2500,
                totalMentors: 150,
                totalBlogs: 500,
                pendingBlogs: 8,
                pendingVerifications: 12,
                communityPosts: 1250,
                activeDiscussions: 45
            };

            const pendingBlogs = [
                { id: 1, title: 'How to Transition from Developer to Tech Lead', author: 'Dr. Sakura Sato', authorRole: 'Mentor', submittedDate: 'Jan 29, 2026', category: 'Career Guidance' },
                { id: 2, title: 'My Experience with Summer Internship at Startup', author: 'Kenji Tanaka', authorRole: 'Student', submittedDate: 'Jan 28, 2026', category: 'Internships' },
                { id: 3, title: 'Cloud Architecture Patterns for Beginners', author: 'Hiroshi Nakamura', authorRole: 'Mentor', submittedDate: 'Jan 28, 2026', category: 'Cloud Computing' }
            ];

            const pendingVerifications = [
                { id: 1, name: 'Hana Takahashi', type: 'Student', email: 'hana.t@college.edu', submittedDate: 'Jan 29, 2026' },
                { id: 2, name: 'Riku Suzuki', type: 'Student', email: 'riku.s@college.edu', submittedDate: 'Jan 29, 2026' }
            ];

            const recentActivity = [
                { id: 1, type: 'blog', action: 'approved', title: 'My Journey from Campus to Google', user: 'Dr. Sakura Sato', time: '2 hours ago' },
                { id: 2, type: 'user', action: 'verified', title: 'Ren Yamamoto - ID Verified', user: 'Admin', time: '3 hours ago' },
                { id: 3, type: 'community', action: 'pinned', title: 'Important: Placement Guidelines 2026', user: 'Admin', time: '5 hours ago' }
            ];

            const platformStats = {
                dailyActiveUsers: 850,
                weeklyGrowth: '+12%',
                questionsThisWeek: 45,
                answersThisWeek: 128,
                newSignups: 23
            };

            return `
                <div class="space-y-6">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                            <p class="text-gray-600 mt-1">Overview of platform activity and management</p>
                        </div>
                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                            <span>Last updated: Just now</span>
                        </div>
                    </div>

                    <!-- Main Stats Grid -->
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="flex items-center justify-between mb-2">
                                <svg class="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                                <span class="text-2xl font-bold text-gray-900">${stats.totalStudents.toLocaleString()}</span>
                            </div>
                            <p class="text-sm text-gray-600">Total Students</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="flex items-center justify-between mb-2">
                                <svg class="h-8 w-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                </svg>
                                <span class="text-2xl font-bold text-gray-900">${stats.totalMentors}</span>
                            </div>
                            <p class="text-sm text-gray-600">Mentors/Alumni</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="flex items-center justify-between mb-2">
                                <svg class="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                </svg>
                                <span class="text-2xl font-bold text-gray-900">${stats.totalBlogs}</span>
                            </div>
                            <p class="text-sm text-gray-600">Total Blogs</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="flex items-center justify-between mb-2">
                                <svg class="h-8 w-8 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span class="text-2xl font-bold text-gray-900">${stats.pendingBlogs}</span>
                            </div>
                            <p class="text-sm text-gray-600">Pending Blogs</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="flex items-center justify-between mb-2">
                                <svg class="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                    <path d="M12 17h.01"/>
                                </svg>
                                <span class="text-2xl font-bold text-gray-900">${stats.communityPosts}</span>
                            </div>
                            <p class="text-sm text-gray-600">Community Posts</p>
                        </div>
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div class="flex items-center justify-between mb-2">
                                <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" x2="12" y1="8" y2="12"/>
                                    <line x1="12" x2="12.01" y1="16" y2="16"/>
                                </svg>
                                <span class="text-2xl font-bold text-gray-900">${stats.pendingVerifications}</span>
                            </div>
                            <p class="text-sm text-gray-600">Pending Verifications</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Left Column -->
                        <div class="lg:col-span-2 space-y-6">
                            <!-- Pending Blogs -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                                        <svg class="h-5 w-5 mr-2 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        Pending Blog Approvals
                                    </h2>
                                    <button onclick="router.navigate('/admin/blogs')" class="text-sm text-gray-600 hover:text-gray-900 flex items-center">
                                        View All 
                                        <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="space-y-4">
                                    ${pendingBlogs.map((blog) => `
                                        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div class="flex-1">
                                                <h3 class="font-medium text-gray-900">${blog.title}</h3>
                                                <div class="flex items-center space-x-3 mt-1 text-sm text-gray-600">
                                                    <span>${blog.author}</span>
                                                    <span>•</span>
                                                    <span class="text-primary-600">${blog.authorRole}</span>
                                                    <span>•</span>
                                                    <span>${blog.category}</span>
                                                </div>
                                                <p class="text-xs text-gray-500 mt-1">Submitted: ${blog.submittedDate}</p>
                                            </div>
                                            <div class="flex space-x-2">
                                                <button class="px-4 py-2 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors">
                                                    Approve
                                                </button>
                                                <button class="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors">
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Pending Verifications -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                                        <svg class="h-5 w-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10"/>
                                            <line x1="12" x2="12" y1="8" y2="12"/>
                                            <line x1="12" x2="12.01" y1="16" y2="16"/>
                                        </svg>
                                        Pending User Verifications
                                    </h2>
                                    <button onclick="router.navigate('/admin/users')" class="text-sm text-gray-600 hover:text-gray-900 flex items-center">
                                        View All 
                                        <svg class="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="space-y-4">
                                    ${pendingVerifications.map((user) => `
                                        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div class="flex items-center space-x-3">
                                                <div class="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                                                    <span class="font-medium text-primary-600">${user.name[0]}</span>
                                                </div>
                                                <div>
                                                    <h3 class="font-medium text-gray-900">${user.name}</h3>
                                                    <p class="text-sm text-gray-600">${user.email}</p>
                                                    <p class="text-xs text-gray-500">${user.type} • Submitted: ${user.submittedDate}</p>
                                                </div>
                                            </div>
                                            <div class="flex space-x-2">
                                                <button class="px-4 py-2 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors">
                                                    Verify
                                                </button>
                                                <button class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                                                    Review
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Right Column -->
                        <div class="space-y-6">
                            <!-- Platform Activity -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <svg class="h-5 w-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                                    </svg>
                                    Platform Activity
                                </h2>
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Daily Active Users</span>
                                        <span class="font-semibold text-gray-900">${platformStats.dailyActiveUsers}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Weekly Growth</span>
                                        <span class="font-semibold text-success-600">${platformStats.weeklyGrowth}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Questions This Week</span>
                                        <span class="font-semibold text-gray-900">${platformStats.questionsThisWeek}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Answers This Week</span>
                                        <span class="font-semibold text-gray-900">${platformStats.answersThisWeek}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">New Signups</span>
                                        <span class="font-semibold text-gray-900">${platformStats.newSignups}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Recent Activity -->
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Admin Activity</h2>
                                <div class="space-y-4">
                                    ${recentActivity.map((activity) => `
                                        <div class="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                            <div class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${activity.type === 'blog' ? 'bg-purple-100' : activity.type === 'user' ? 'bg-success-100' : 'bg-primary-100'}">
                                                ${activity.type === 'blog' ? `
                                                    <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                                    </svg>
                                                ` : activity.type === 'user' ? `
                                                    <svg class="h-5 w-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                                        <polyline points="22 4 12 14.01 9 11.01"/>
                                                    </svg>
                                                ` : `
                                                    <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
                                                    </svg>
                                                `}
                                            </div>
                                            <div class="flex-1">
                                                <p class="text-sm text-gray-900">
                                                    <span class="font-medium capitalize">${activity.action}</span> ${activity.title}
                                                </p>
                                                <p class="text-xs text-gray-500 mt-0.5">By ${activity.user} • ${activity.time}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        adminBlogs() {
            return `
                <div class="space-y-6">
                    <div><h1 class="text-2xl md:text-3xl font-bold text-gray-900">Blog Verification</h1><p class="text-gray-600 mt-1">Loading blog data from database...</p></div>
                </div>
            `;
        },

        adminUsers() {
            return `
                <div class="space-y-6">
                    <div><h1 class="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1><p class="text-gray-600 mt-1">Loading user data from database...</p></div>
                </div>
            `;
        },

        adminCommunity() {
            return `
                <div class="space-y-6">
                    <div><h1 class="text-2xl md:text-3xl font-bold text-gray-900">Community Control</h1><p class="text-gray-600 mt-1">Loading community data from database...</p></div>
                </div>
            `;
        },

        adminAnnouncements() {
            return `
                <div class="space-y-6">
                    <div><h1 class="text-2xl md:text-3xl font-bold text-gray-900">Announcements</h1><p class="text-gray-600 mt-1">Loading announcement data from database...</p></div>
                </div>
            `;
        },

        notFound() {
            return `
                <div class="text-center py-12">
                    <h1 class="text-2xl md:text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                    <p class="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
                    <button onclick="router.navigate('/')" class="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700">Go Home</button>
                </div>
            `;
        },

        // API-backed data accessors
        getSampleQuestions() {
            return Array.isArray(router.dbData && router.dbData.questions) ? router.dbData.questions : [];
        },


        getSampleBlogs() {
            return Array.isArray(router.dbData && router.dbData.blogs) ? router.dbData.blogs : [];
        },


        getSampleMentors() {
            return Array.isArray(router.dbData && router.dbData.mentors) ? router.dbData.mentors : [];
        }
    }
};

// Authentication Functions (handled by modal.js)
// openAuthModal, openLoginFlow, openRegisterFlow, closeAuthModal defined in modal.js
// submitLogin (AJAX) defined in modal.js

// handleLogin is kept as a no-op guard; actual login goes through submitLogin() in modal.js
function handleLogin(event) {
    if (event) event.preventDefault();
    // Actual login is handled by submitLogin() in modal.js via AJAX
}

async function logout() {
    try {
        await fetch(AUTH_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' })
        });
    } catch (_) { /* ignore network errors on logout */ }
    localStorage.removeItem('demo_user');
    router.user = null;
    router.navigate('/');
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('hidden');
}

function openDashboardSidebar(role) {
    const sidebar = document.getElementById(role + '-sidebar');
    const overlay = document.getElementById(role + '-sidebar-overlay');
    if (sidebar) sidebar.classList.remove('-translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden', 'md:overflow-auto');
}

function closeDashboardSidebar(role) {
    const sidebar = document.getElementById(role + '-sidebar');
    const overlay = document.getElementById(role + '-sidebar-overlay');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
}

// Generic tab switcher for views with tabs
function switchMentorshipTab(tabId) {
    document.querySelectorAll('.mentorship-tab').forEach(t => {
        t.classList.remove('border-primary-600', 'text-primary-600');
        t.classList.add('border-transparent', 'text-gray-500');
    });
    document.querySelectorAll('.mentorship-panel').forEach(p => p.classList.add('hidden'));
    const activeBtn = document.querySelector(`.mentorship-tab[data-tab="${tabId}"]`);
    if (activeBtn) { activeBtn.classList.add('border-primary-600', 'text-primary-600'); activeBtn.classList.remove('border-transparent', 'text-gray-500'); }
    const panel = document.getElementById('mentorshipTab-' + tabId);
    if (panel) panel.classList.remove('hidden');
}

function switchAdminTab(prefix, tabId) {
    document.querySelectorAll('.' + prefix + '-tab').forEach(t => {
        t.classList.remove('border-gray-900', 'text-gray-900');
        t.classList.add('border-transparent', 'text-gray-500');
    });
    document.querySelectorAll('.' + prefix + '-tab .tab-count').forEach(c => {
        c.classList.remove('bg-gray-900', 'text-white');
        c.classList.add('bg-gray-100', 'text-gray-600');
    });
    document.querySelectorAll('.' + prefix + '-panel').forEach(p => p.classList.add('hidden'));
    const activeBtn = document.querySelector('.' + prefix + '-tab[data-tab="' + tabId + '"]');
    if (activeBtn) {
        activeBtn.classList.add('border-gray-900', 'text-gray-900');
        activeBtn.classList.remove('border-transparent', 'text-gray-500');
        const cnt = activeBtn.querySelector('.tab-count');
        if (cnt) { cnt.classList.add('bg-gray-900', 'text-white'); cnt.classList.remove('bg-gray-100', 'text-gray-600'); }
    }
    const panel = document.getElementById(prefix + 'Tab-' + tabId);
    if (panel) panel.classList.remove('hidden');
}

function reactivateMentor(userId) {
    if (typeof updateUserVerification === 'function') {
        updateUserVerification(userId, 'approved');
    }
}

function handleChatSend(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;
    alert('Message sent: ' + input.value);
    input.value = '';
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    router.init();
});
