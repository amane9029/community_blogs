// Database integration bridge for SPA views.
// API-driven content only (no JSON/mock fallback).

(function () {
    if (typeof router === 'undefined' || !router.views) {
        return;
    }

    const originalViews = {
        publicHome: router.views.publicHome,
        studentDashboard: router.views.studentDashboard,
        mentorDashboard: router.views.mentorDashboard,
        studentMentorship: router.views.studentMentorship,
        studentProfile: router.views.studentProfile,
        mentorStudents: router.views.mentorStudents,
        mentorProfile: router.views.mentorProfile,
        mentorBlogs: router.views.mentorBlogs
    };

    const APP_BASE_PATH = (window.APP_BASE_PATH || '/community-blogs-php/').toString();
    const BASE_PATH = APP_BASE_PATH.endsWith('/') ? APP_BASE_PATH : `${APP_BASE_PATH}/`;
    const CONTENT_API = `${BASE_PATH}api/content.php`;
    const ADMIN_API = `${BASE_PATH}api/admin.php`;
    const MIN_REFRESH_INTERVAL_MS = 750;
    const DEBUG_DB = window.location.search.indexOf('debug_db=1') !== -1;

    router.dbData = {
        blogs: [],
        questions: [],
        mentors: [],
        mentorshipRequests: [],
        adminBlogs: [],
        adminUsers: [],
        announcements: [],
        errors: { content: null, admin: null },
        lastFetchedAt: 0
    };

    function normalizeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function renderEmpty(message) {
        return `<div class="card p-6 text-sm text-gray-600">${message}</div>`;
    }

    function formatCount(value) {
        return (Number(value) || 0).toLocaleString();
    }

    async function postJSON(url, payload) {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store',
            body: JSON.stringify(payload)
        });

        let data = {};
        try {
            data = await res.json();
        } catch (_) {
            throw new Error('Invalid API response.');
        }

        if (!res.ok || data.success === false) {
            throw new Error(data.error || 'Request failed.');
        }

        return data;
    }

    async function refreshDbData(force) {
        const now = Date.now();
        if (!force && router.dbData.lastFetchedAt && now - router.dbData.lastFetchedAt < MIN_REFRESH_INTERVAL_MS) {
            return;
        }

        const role = router.user ? router.user.role : 'public';
        router.dbData.errors.content = null;
        router.dbData.errors.admin = null;

        try {
            const contentData = await postJSON(CONTENT_API, { action: 'bootstrap' });
            router.dbData.blogs = normalizeArray(contentData.blogs);
            router.dbData.questions = normalizeArray(contentData.questions);
            router.dbData.mentors = normalizeArray(contentData.mentors);
            router.dbData.mentorshipRequests = normalizeArray(contentData.mentorship_requests);
            if (role !== 'admin') {
                router.dbData.announcements = normalizeArray(contentData.announcements);
            }
        } catch (err) {
            router.dbData.blogs = [];
            router.dbData.questions = [];
            router.dbData.mentors = [];
            router.dbData.mentorshipRequests = [];
            if (role !== 'admin') {
                router.dbData.announcements = [];
            }
            router.dbData.errors.content = err.message || 'Failed to load content data.';
        }

        if (role === 'admin') {
            try {
                const adminData = await postJSON(ADMIN_API, { action: 'bootstrap' });
                router.dbData.adminUsers = normalizeArray(adminData.users);
                router.dbData.adminBlogs = normalizeArray(adminData.blogs);
                router.dbData.announcements = normalizeArray(adminData.announcements);
            } catch (err) {
                router.dbData.adminUsers = [];
                router.dbData.adminBlogs = [];
                router.dbData.announcements = [];
                router.dbData.errors.admin = err.message || 'Failed to load admin data.';
            }
        } else {
            router.dbData.adminUsers = [];
            router.dbData.adminBlogs = [];
        }

        router.dbData.lastFetchedAt = Date.now();

        if (DEBUG_DB && typeof console !== 'undefined' && typeof console.debug === 'function') {
            console.debug('[db-integration] refreshed', {
                blogs: router.dbData.blogs.length,
                questions: router.dbData.questions.length,
                mentors: router.dbData.mentors.length,
                mentorshipRequests: router.dbData.mentorshipRequests.length,
                adminUsers: router.dbData.adminUsers.length,
                adminBlogs: router.dbData.adminBlogs.length,
                announcements: router.dbData.announcements.length
            });
        }
    }

    window.refreshDbData = refreshDbData;

    const baseRender = router.render.bind(router);
    router.render = function () {
        baseRender();

        if (router.__dbLoading) {
            return;
        }

        router.__dbLoading = true;
        refreshDbData(false)
            .catch(() => {})
            .finally(() => {
                router.__dbLoading = false;
                baseRender();
            });
    };

    router.views.getSampleQuestions = function () {
        return normalizeArray(router.dbData.questions);
    };

    router.views.getSampleBlogs = function () {
        return normalizeArray(router.dbData.blogs);
    };

    router.views.getSampleMentors = function () {
        return normalizeArray(router.dbData.mentors);
    };

    router.views.publicHome = function () {
        const blogs = normalizeArray(router.dbData.blogs);
        const questions = normalizeArray(router.dbData.questions);
        const mentors = normalizeArray(router.dbData.mentors);
        const announcements = normalizeArray(router.dbData.announcements);

        const totalAnswers = questions.reduce((sum, q) => sum + (Number(q.answers) || 0), 0);

        return `
            <div class="space-y-8">
                <section class="text-center py-10">
                    <h1 class="text-4xl font-bold text-gray-900">Your Career Journey Starts Here</h1>
                    <p class="text-gray-600 mt-2">Live MySQL data</p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 max-w-3xl mx-auto">
                        <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-primary-600">${formatCount(questions.length)}</div><div class="text-sm text-gray-600">Questions</div></div>
                        <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-primary-600">${formatCount(totalAnswers)}</div><div class="text-sm text-gray-600">Answers</div></div>
                        <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-primary-600">${formatCount(blogs.length)}</div><div class="text-sm text-gray-600">Blogs</div></div>
                        <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-primary-600">${formatCount(mentors.length)}</div><div class="text-sm text-gray-600">Mentors</div></div>
                    </div>
                    ${router.dbData.errors.content ? `<p class="text-sm text-red-600 mt-3">${router.dbData.errors.content}</p>` : ''}
                </section>

                <section class="bg-white rounded-lg border border-gray-200 p-6">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-xl font-semibold text-gray-900">Announcements</h2>
                    </div>
                    <div class="space-y-3">
                        ${announcements.length ? announcements.slice(0, 2).map(a => `
                            <div class="border-l-4 border-primary-500 pl-3 py-1">
                                <p class="font-medium text-gray-900">${a.title || 'Untitled announcement'}</p>
                                <p class="text-sm text-gray-600">${a.content || ''}</p>
                                <p class="text-xs text-gray-500 mt-1">${a.date || a.created_at || ''}</p>
                            </div>
                        `).join('') : renderEmpty('No announcements available.')}
                    </div>
                </section>

                <section>
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-xl font-semibold text-gray-900">Latest Questions</h2>
                        <a href="/community" onclick="event.preventDefault(); router.navigate('/community')" class="text-sm text-primary-600 hover:text-primary-700">View All</a>
                    </div>
                    <div class="space-y-3">
                        ${questions.length ? questions.slice(0, 3).map(q => `
                            <div class="bg-white border border-gray-200 rounded-lg p-4">
                                <p class="font-medium text-gray-900">${q.title}</p>
                                <p class="text-sm text-gray-600 mt-1">${q.content || ''}</p>
                                <p class="text-xs text-gray-500 mt-2">${q.author || 'Unknown'} | ${q.answers || 0} answers | ${q.views || 0} views</p>
                            </div>
                        `).join('') : renderEmpty('No questions posted yet.')}
                    </div>
                </section>

                <section>
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-xl font-semibold text-gray-900">Latest Blogs</h2>
                        <a href="/blogs" onclick="event.preventDefault(); router.navigate('/blogs')" class="text-sm text-primary-600 hover:text-primary-700">View All</a>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${blogs.length ? blogs.slice(0, 2).map(b => `
                            <div class="bg-white border border-gray-200 rounded-lg p-4">
                                <p class="font-medium text-gray-900">${b.title || 'Untitled Blog'}</p>
                                <p class="text-sm text-gray-600 mt-1">${b.excerpt || ''}</p>
                                <p class="text-xs text-gray-500 mt-2">${b.author || 'Unknown'} | ${b.status || 'unknown'} | ${b.date || ''}</p>
                            </div>
                        `).join('') : renderEmpty('No blogs available.')}
                    </div>
                </section>
            </div>
        `;
    };

    router.views.studentDashboard = function () {
        const questions = normalizeArray(router.dbData.questions);
        const blogs = normalizeArray(router.dbData.blogs);
        const mentors = normalizeArray(router.dbData.mentors);
        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Student Dashboard</h1>
                    <p class="text-gray-600 mt-1">Live data loaded from MySQL</p>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(questions.length)}</div><div class="text-sm text-gray-600">Questions</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(blogs.length)}</div><div class="text-sm text-gray-600">Blogs</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(mentors.length)}</div><div class="text-sm text-gray-600">Mentors</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(questions.reduce((sum, q) => sum + (Number(q.answers) || 0), 0))}</div><div class="text-sm text-gray-600">Answers</div></div>
                </div>
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                    <h2 class="font-semibold text-gray-900 mb-3">Latest Questions</h2>
                    <div class="space-y-3">
                        ${questions.length ? questions.slice(0, 5).map(q => `<div class="border border-gray-200 rounded-lg p-3"><p class="font-medium text-gray-900">${q.title}</p><p class="text-sm text-gray-600 mt-1">${q.author || 'Unknown'} | ${q.answers || 0} answers</p></div>`).join('') : renderEmpty('No questions available.')}
                    </div>
                </div>
            </div>
        `;
    };

    router.views.mentorDashboard = function () {
        const questions = normalizeArray(router.dbData.questions);
        const blogs = normalizeArray(router.dbData.blogs);
        const pendingQuestions = questions.filter(q => !q.verified);
        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Mentor Dashboard</h1>
                    <p class="text-gray-600 mt-1">Live data loaded from MySQL</p>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(questions.length)}</div><div class="text-sm text-gray-600">Questions</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(pendingQuestions.length)}</div><div class="text-sm text-gray-600">Needs Answer</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(blogs.length)}</div><div class="text-sm text-gray-600">Blogs</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(questions.reduce((sum, q) => sum + (Number(q.views) || 0), 0))}</div><div class="text-sm text-gray-600">Question Views</div></div>
                </div>
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                    <h2 class="font-semibold text-gray-900 mb-3">Questions Needing Attention</h2>
                    <div class="space-y-3">
                        ${pendingQuestions.length ? pendingQuestions.slice(0, 5).map(q => `<div class="border border-gray-200 rounded-lg p-3"><p class="font-medium text-gray-900">${q.title}</p><p class="text-sm text-gray-600 mt-1">${q.author || 'Unknown'} | ${q.answers || 0} answers</p><button onclick="openCreateAnswerPrompt(${q.id})" class="mt-2 px-3 py-1.5 bg-success-600 text-white text-xs rounded-lg hover:bg-success-700">Answer</button></div>`).join('') : renderEmpty('No unanswered questions.')}
                    </div>
                </div>
            </div>
        `;
    };

    router.views.studentMentorship = function () {
        const mentors = normalizeArray(router.dbData.mentors);
        const requests = normalizeArray(router.dbData.mentorshipRequests);

        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Mentorship</h1>
                    <p class="text-gray-600 mt-1">Send requests and track status from live data</p>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-5">
                    <h2 class="font-semibold text-gray-900 mb-3">My Requests</h2>
                    <div class="space-y-3">
                        ${requests.length ? requests.map(r => `
                            <div class="border border-gray-200 rounded-lg p-3">
                                <p class="font-medium text-gray-900">${r.mentor_name || 'Mentor'}</p>
                                <p class="text-sm text-gray-600 mt-1">${r.message || 'No message'}</p>
                                <p class="text-xs text-gray-500 mt-1">Status: ${r.status || 'pending'} | ${r.created_at || ''}</p>
                            </div>
                        `).join('') : renderEmpty('No mentorship requests yet.')}
                    </div>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-5">
                    <h2 class="font-semibold text-gray-900 mb-3">Available Mentors</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${mentors.length ? mentors.map(m => `
                            <div class="border border-gray-200 rounded-lg p-4">
                                <p class="font-medium text-gray-900">${m.name || 'Mentor'}</p>
                                <p class="text-sm text-gray-600">${m.role || 'Mentor'} | ${m.company || 'N/A'}</p>
                                <p class="text-xs text-gray-500 mt-1">${(m.skills || []).slice(0, 4).join(', ')}</p>
                                <button onclick="sendMentorshipRequest(${Number(m.userId || m.id)}, '${(m.name || 'Mentor').replace(/'/g, "\\'")}')" class="mt-3 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">Request Mentorship</button>
                            </div>
                        `).join('') : renderEmpty('No mentors available right now.')}
                    </div>
                </div>
            </div>
        `;
    };

    router.views.studentProfile = function () {
        const user = router.user || {};
        const requests = normalizeArray(router.dbData.mentorshipRequests);
        return `
            <div class="space-y-6">
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
                    <p class="text-gray-600 mt-1">Account information from active session</p>
                    <div class="mt-4 space-y-2 text-sm text-gray-700">
                        <p><span class="font-medium">Name:</span> ${user.name || '-'}</p>
                        <p><span class="font-medium">Email:</span> ${user.email || '-'}</p>
                        <p><span class="font-medium">Role:</span> ${user.role || '-'}</p>
                    </div>
                </div>
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 class="font-semibold text-gray-900 mb-3">Mentorship Activity</h2>
                    <p class="text-sm text-gray-600">Total requests: ${formatCount(requests.length)}</p>
                </div>
            </div>
        `;
    };

    router.views.mentorStudents = function () {
        const requests = normalizeArray(router.dbData.mentorshipRequests);
        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">My Students</h1>
                    <p class="text-gray-600 mt-1">Incoming mentorship requests from students</p>
                </div>
                <div class="bg-white border border-gray-200 rounded-lg p-5">
                    <div class="space-y-3">
                        ${requests.length ? requests.map(r => `
                            <div class="border border-gray-200 rounded-lg p-3">
                                <p class="font-medium text-gray-900">${r.student_name || 'Student'}</p>
                                <p class="text-sm text-gray-600 mt-1">${r.message || 'No message provided'}</p>
                                <p class="text-xs text-gray-500 mt-1">Status: ${r.status || 'pending'} | ${r.created_at || ''}</p>
                            </div>
                        `).join('') : renderEmpty('No student mentorship requests yet.')}
                    </div>
                </div>
            </div>
        `;
    };

    router.views.mentorProfile = function () {
        const user = router.user || {};
        const requests = normalizeArray(router.dbData.mentorshipRequests);
        const questions = normalizeArray(router.dbData.questions);
        return `
            <div class="space-y-6">
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Mentor Profile</h1>
                    <p class="text-gray-600 mt-1">Account information from active session</p>
                    <div class="mt-4 space-y-2 text-sm text-gray-700">
                        <p><span class="font-medium">Name:</span> ${user.name || '-'}</p>
                        <p><span class="font-medium">Email:</span> ${user.email || '-'}</p>
                        <p><span class="font-medium">Role:</span> ${user.role || '-'}</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white border border-gray-200 rounded-lg p-6"><p class="text-sm text-gray-600">Assigned Requests</p><p class="text-2xl font-bold text-gray-900 mt-1">${formatCount(requests.length)}</p></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-6"><p class="text-sm text-gray-600">Community Questions</p><p class="text-2xl font-bold text-gray-900 mt-1">${formatCount(questions.length)}</p></div>
                </div>
            </div>
        `;
    };

    router.views.mentorBlogs = function () {
        const user = router.user || {};
        const blogs = normalizeArray(router.dbData.blogs).filter(b => Number(b.authorId) === Number(user.id));
        const totalViews = blogs.reduce((sum, b) => sum + (Number(b.views) || 0), 0);

        return `
            <div class="space-y-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">My Blogs</h1>
                        <p class="text-gray-600 mt-1">Manage your blogs from live database content</p>
                    </div>
                    <button onclick="openCreateBlogPrompt()" class="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-success-600 text-white rounded-lg font-medium hover:bg-success-700 transition-colors">
                        <span>Create Blog</span>
                    </button>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><p class="text-sm text-gray-600">Total Blogs</p><p class="text-2xl font-bold text-gray-900 mt-1">${formatCount(blogs.length)}</p></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><p class="text-sm text-gray-600">Published</p><p class="text-2xl font-bold text-gray-900 mt-1">${formatCount(blogs.filter(b => b.status === 'published').length)}</p></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><p class="text-sm text-gray-600">Pending</p><p class="text-2xl font-bold text-gray-900 mt-1">${formatCount(blogs.filter(b => b.status === 'pending').length)}</p></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><p class="text-sm text-gray-600">Views</p><p class="text-2xl font-bold text-gray-900 mt-1">${formatCount(totalViews)}</p></div>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-5">
                    <div class="space-y-3">
                        ${blogs.length ? blogs.map(b => `
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="flex items-center justify-between gap-2">
                                    <p class="font-medium text-gray-900">${b.title || 'Untitled Blog'}</p>
                                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">${b.status || 'unknown'}</span>
                                </div>
                                <p class="text-sm text-gray-600 mt-2">${b.excerpt || ''}</p>
                                <p class="text-xs text-gray-500 mt-2">${b.category || 'General'} | ${b.date || ''} | ${b.views || 0} views</p>
                            </div>
                        `).join('') : renderEmpty('You have not created any blogs yet.')}
                    </div>
                </div>
            </div>
        `;
    };

    // Preserve original app templates for public/student/mentor pages.
    // DB integration still supplies data via router.dbData + create/update actions.
    router.views.publicHome = originalViews.publicHome;
    router.views.studentDashboard = originalViews.studentDashboard;
    router.views.mentorDashboard = originalViews.mentorDashboard;
    router.views.studentMentorship = originalViews.studentMentorship;
    router.views.studentProfile = originalViews.studentProfile;
    router.views.mentorStudents = originalViews.mentorStudents;
    router.views.mentorProfile = originalViews.mentorProfile;
    router.views.mentorBlogs = originalViews.mentorBlogs;

    router.views.adminDashboard = function () {
        const users = normalizeArray(router.dbData.adminUsers);
        const blogs = normalizeArray(router.dbData.adminBlogs);
        const questions = normalizeArray(router.dbData.questions);
        const announcements = normalizeArray(router.dbData.announcements);

        const pendingBlogs = blogs.filter(b => b.status === 'pending');
        const pendingUsers = users.filter(u => u.verification_status !== 'approved');

        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p class="text-gray-600 mt-1">Live overview from database</p>
                    ${router.dbData.errors.admin ? `<p class="text-sm text-red-600 mt-2">${router.dbData.errors.admin}</p>` : ''}
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(users.filter(u => u.role === 'student').length)}</div><div class="text-sm text-gray-600">Students</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(users.filter(u => u.role === 'mentor').length)}</div><div class="text-sm text-gray-600">Mentors</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(blogs.length)}</div><div class="text-sm text-gray-600">Blogs</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(pendingBlogs.length)}</div><div class="text-sm text-gray-600">Pending Blogs</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(questions.length)}</div><div class="text-sm text-gray-600">Questions</div></div>
                    <div class="bg-white border border-gray-200 rounded-lg p-4"><div class="text-2xl font-bold text-gray-900">${formatCount(pendingUsers.length)}</div><div class="text-sm text-gray-600">Pending Users</div></div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white border border-gray-200 rounded-lg p-5">
                        <h2 class="font-semibold text-gray-900 mb-3">Pending Blog Approvals</h2>
                        <div class="space-y-3">
                            ${pendingBlogs.length ? pendingBlogs.slice(0, 5).map(b => `<div class="border border-gray-200 rounded-lg p-3"><p class="font-medium text-gray-900">${b.title || 'Untitled Blog'}</p><p class="text-sm text-gray-600">${b.author || 'Unknown'} | ${b.category || 'General'}</p></div>`).join('') : renderEmpty('No pending blogs found.')}
                        </div>
                    </div>

                    <div class="bg-white border border-gray-200 rounded-lg p-5">
                        <h2 class="font-semibold text-gray-900 mb-3">Pending User Verifications</h2>
                        <div class="space-y-3">
                            ${pendingUsers.length ? pendingUsers.slice(0, 5).map(u => `<div class="border border-gray-200 rounded-lg p-3"><p class="font-medium text-gray-900">${u.name || 'Unknown User'}</p><p class="text-sm text-gray-600">${u.email || ''}</p><p class="text-xs text-gray-500 mt-1">${u.role || ''} | ${u.verification_status || 'pending'}</p></div>`).join('') : renderEmpty('No users pending verification.')}
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-5">
                    <h2 class="font-semibold text-gray-900 mb-3">Recent Announcements</h2>
                    <div class="space-y-3">
                        ${announcements.length ? announcements.slice(0, 3).map(a => `<div class="border-l-4 border-primary-500 pl-3 py-1"><p class="font-medium text-gray-900">${a.title || 'Untitled announcement'}</p><p class="text-sm text-gray-600">${a.content || ''}</p></div>`).join('') : renderEmpty('No announcements found.')}
                    </div>
                </div>
            </div>
        `;
    };

    router.views.adminBlogs = function () {
        const blogs = normalizeArray(router.dbData.adminBlogs);
        const pendingBlogs = blogs.filter(b => b.status === 'pending');
        const approvedBlogs = blogs.filter(b => b.status === 'published');
        const rejectedBlogs = blogs.filter(b => b.status === 'rejected');

        const tabs = [
            { id: 'pending', label: 'Pending Approval', count: pendingBlogs.length },
            { id: 'approved', label: 'Approved', count: approvedBlogs.length },
            { id: 'rejected', label: 'Rejected', count: rejectedBlogs.length },
            { id: 'all', label: 'All Blogs', count: blogs.length }
        ];

        function renderBlogCard(blog, allowModeration) {
            return `
                <div class="card p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <h3 class="text-lg font-semibold text-gray-900">${blog.title || 'Untitled Blog'}</h3>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">${blog.category || 'General'}</span>
                            </div>
                            <div class="text-sm text-gray-500 mb-2">
                                <span class="font-medium text-gray-800">${blog.author || 'Unknown'}</span>
                                <span class="ml-2">${blog.authorRole || 'User'}</span>
                                <span class="ml-2">${blog.submittedDate || ''}</span>
                            </div>
                            <p class="text-sm text-gray-600">${blog.excerpt || ''}</p>
                        </div>
                        ${allowModeration ? `
                            <div class="flex items-center space-x-2">
                                <button onclick="updateBlogModeration(${blog.id}, 'published')" class="px-4 py-2 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors">Approve</button>
                                <button onclick="updateBlogModeration(${blog.id}, 'rejected')" class="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors">Reject</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Blog Verification</h1>
                    <p class="text-gray-600 mt-1">Review and approve blog submissions</p>
                    ${router.dbData.errors.admin ? `<p class="text-sm text-red-600 mt-2">${router.dbData.errors.admin}</p>` : ''}
                </div>
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-4 md:space-x-8 overflow-x-auto">
                        ${tabs.map((t, i) => `
                            <button onclick="switchAdminTab('ab','${t.id}')" class="ab-tab py-4 px-1 border-b-2 font-medium text-sm transition-colors ${i === 0 ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}" data-tab="${t.id}">
                                ${t.label}
                                <span class="tab-count ml-2 px-2 py-0.5 rounded-full text-xs ${i === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}">${t.count}</span>
                            </button>
                        `).join('')}
                    </nav>
                </div>
                <div id="abTab-pending" class="ab-panel space-y-4">${pendingBlogs.length ? pendingBlogs.map(b => renderBlogCard(b, true)).join('') : renderEmpty('No pending blogs found.')}</div>
                <div id="abTab-approved" class="ab-panel space-y-4 hidden">${approvedBlogs.length ? approvedBlogs.map(b => renderBlogCard(b, false)).join('') : renderEmpty('No approved blogs found.')}</div>
                <div id="abTab-rejected" class="ab-panel space-y-4 hidden">${rejectedBlogs.length ? rejectedBlogs.map(b => renderBlogCard(b, false)).join('') : renderEmpty('No rejected blogs found.')}</div>
                <div id="abTab-all" class="ab-panel space-y-4 hidden">${blogs.length ? blogs.map(b => renderBlogCard(b, false)).join('') : renderEmpty('No blogs found.')}</div>
            </div>
        `;
    };

    router.views.adminUsers = function () {
        const users = normalizeArray(router.dbData.adminUsers);
        const pendingUsers = users.filter(u => u.verification_status !== 'approved');
        const students = users.filter(u => u.role === 'student');
        const mentors = users.filter(u => u.role === 'mentor');

        const tabs = [
            { id: 'pending', label: 'Pending Verification', count: pendingUsers.length },
            { id: 'students', label: 'Students', count: students.length },
            { id: 'mentors', label: 'Mentors', count: mentors.length },
            { id: 'all', label: 'All Users', count: users.length }
        ];

        function renderUserCard(user, actionsHtml) {
            const type = user.role === 'student' ? 'Student' : user.role === 'mentor' ? 'Mentor' : 'Admin';
            return `
                <div class="card p-4 md:p-6 hover:shadow-md transition-shadow">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                <h3 class="font-semibold text-gray-900">${user.name || 'Unknown User'}</h3>
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">${type}</span>
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">${user.status || 'inactive'}</span>
                            </div>
                            <p class="text-sm text-gray-600">${user.email || ''}</p>
                            <p class="text-xs text-gray-400 mt-1">Joined: ${user.joinDate || ''}</p>
                        </div>
                        <div class="flex items-center gap-2">${actionsHtml || ''}</div>
                    </div>
                </div>
            `;
        }

        const pendingActions = (u) => `
            <button onclick="updateUserVerification(${u.id}, 'approved')" class="px-4 py-2 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors">Verify</button>
            <button onclick="updateUserVerification(${u.id}, 'rejected')" class="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors">Reject</button>
        `;

        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1>
                    <p class="text-gray-600 mt-1">Verify users and manage accounts</p>
                    ${router.dbData.errors.admin ? `<p class="text-sm text-red-600 mt-2">${router.dbData.errors.admin}</p>` : ''}
                </div>
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-4 md:space-x-8 overflow-x-auto">
                        ${tabs.map((t, i) => `
                            <button onclick="switchAdminTab('au','${t.id}')" class="au-tab py-4 px-1 border-b-2 font-medium text-sm transition-colors ${i === 0 ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}" data-tab="${t.id}">
                                ${t.label}
                                <span class="tab-count ml-2 px-2 py-0.5 rounded-full text-xs ${i === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}">${t.count}</span>
                            </button>
                        `).join('')}
                    </nav>
                </div>
                <div id="auTab-pending" class="au-panel space-y-4">${pendingUsers.length ? pendingUsers.map(u => renderUserCard(u, pendingActions(u))).join('') : renderEmpty('No users pending verification.')}</div>
                <div id="auTab-students" class="au-panel space-y-4 hidden">${students.length ? students.map(u => renderUserCard(u, '')).join('') : renderEmpty('No student users found.')}</div>
                <div id="auTab-mentors" class="au-panel space-y-4 hidden">${mentors.length ? mentors.map(u => renderUserCard(u, '')).join('') : renderEmpty('No mentor users found.')}</div>
                <div id="auTab-all" class="au-panel space-y-4 hidden">${users.length ? users.map(u => renderUserCard(u, '')).join('') : renderEmpty('No users found.')}</div>
            </div>
        `;
    };

    router.views.adminCommunity = function () {
        const questions = normalizeArray(router.dbData.questions);
        return `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Community Control</h1>
                    <p class="text-gray-600 mt-1">Moderate community discussions</p>
                </div>
                <div class="space-y-4">
                    ${questions.length ? questions.map(q => `
                        <div class="card p-5">
                            <h3 class="font-semibold text-gray-900 mb-1">${q.title}</h3>
                            <p class="text-sm text-gray-600 mb-2">${q.content || ''}</p>
                            <div class="text-xs text-gray-500">${q.author || 'Unknown'} | ${q.answers || 0} answers | ${q.views || 0} views</div>
                        </div>
                    `).join('') : renderEmpty('No community posts found.')}
                </div>
            </div>
        `;
    };

    router.views.adminAnnouncements = function () {
        const announcements = normalizeArray(router.dbData.announcements);
        return `
            <div class="space-y-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Announcements</h1>
                        <p class="text-gray-600 mt-1">Manage platform announcements</p>
                    </div>
                    <button onclick="openCreateAnnouncementPrompt()" class="btn-primary">Create Announcement</button>
                </div>
                <div class="space-y-4">
                    ${announcements.length ? announcements.map(a => `<div class="card p-5"><h3 class="font-semibold text-gray-900">${a.title}</h3><p class="text-sm text-gray-600 mt-2">${a.content}</p><p class="text-xs text-gray-500 mt-2">Posted: ${a.created_at || ''}</p></div>`).join('') : renderEmpty('No announcements published yet.')}
                </div>
            </div>
        `;
    };

    async function safeRefreshAndRender() {
        await refreshDbData(true);
        router.render();
    }

    window.updateUserVerification = async function (userId, verificationStatus) {
        try {
            await postJSON(ADMIN_API, {
                action: 'update_user_verification',
                user_id: userId,
                verification_status: verificationStatus
            });
            await safeRefreshAndRender();
        } catch (err) {
            alert(err.message || 'Failed to update user verification.');
        }
    };

    window.updateBlogModeration = async function (blogId, status) {
        try {
            await postJSON(ADMIN_API, {
                action: 'update_blog_status',
                blog_id: blogId,
                status
            });
            await safeRefreshAndRender();
        } catch (err) {
            alert(err.message || 'Failed to update blog status.');
        }
    };

    window.reactivateMentor = async function (userId) {
        return window.updateUserVerification(userId, 'approved');
    };

    window.openCreateQuestionPrompt = async function () {
        if (!router.user) {
            openAuthModal();
            return;
        }

        const title = prompt('Enter question title:');
        if (!title) return;

        const content = prompt('Describe your question:');
        if (!content) return;

        try {
            await postJSON(CONTENT_API, {
                action: 'create_question',
                title: title.trim(),
                content: content.trim()
            });
            await safeRefreshAndRender();
            alert('Question submitted.');
        } catch (err) {
            alert(err.message || 'Failed to submit question.');
        }
    };

    window.openCreateAnswerPrompt = async function (questionId) {
        if (!router.user) {
            openAuthModal();
            return;
        }

        const content = prompt('Write your answer:');
        if (!content) return;

        try {
            await postJSON(CONTENT_API, {
                action: 'create_answer',
                question_id: Number(questionId),
                content: content.trim()
            });
            await safeRefreshAndRender();
            alert('Answer submitted.');
        } catch (err) {
            alert(err.message || 'Failed to submit answer.');
        }
    };

    window.openCreateBlogPrompt = async function () {
        if (!router.user) {
            openAuthModal();
            return;
        }

        const title = prompt('Enter blog title:');
        if (!title) return;

        const category = prompt('Category (optional):') || 'General';
        const content = prompt('Write blog content:');
        if (!content) return;

        try {
            await postJSON(CONTENT_API, {
                action: 'create_blog',
                title: title.trim(),
                category: category.trim(),
                content: content.trim(),
                excerpt: content.trim().slice(0, 160)
            });
            await safeRefreshAndRender();
            alert('Blog submitted for moderation.');
        } catch (err) {
            alert(err.message || 'Failed to submit blog.');
        }
    };

    window.sendMentorshipRequest = async function (mentorUserId, mentorName) {
        if (!router.user) {
            openAuthModal();
            return;
        }
        if (router.user.role !== 'student') {
            alert('Only students can send mentorship requests.');
            return;
        }

        const message = prompt('Message for ' + mentorName + ' (optional):') || '';

        try {
            await postJSON(CONTENT_API, {
                action: 'create_mentorship_request',
                mentor_user_id: Number(mentorUserId),
                message: message.trim()
            });
            await safeRefreshAndRender();
            alert('Mentorship request sent to ' + mentorName + '.');
        } catch (err) {
            alert(err.message || 'Failed to send mentorship request.');
        }
    };

    window.openCreateAnnouncementPrompt = async function () {
        if (!router.user || router.user.role !== 'admin') {
            return;
        }

        const title = prompt('Announcement title:');
        if (!title) return;

        const content = prompt('Announcement content:');
        if (!content) return;

        try {
            await postJSON(ADMIN_API, {
                action: 'create_announcement',
                title: title.trim(),
                content: content.trim()
            });
            await safeRefreshAndRender();
            alert('Announcement created.');
        } catch (err) {
            alert(err.message || 'Failed to create announcement.');
        }
    };
})();
