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

    router.dbData = {
        blogs: [],
        myBlogs: [],
        questions: [],
        mentors: [],
        mentorshipRequests: [],
        profile: null,
        adminBlogs: [],
        adminUsers: [],
        announcements: [],
        studentCount: 0,
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

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureUiRoots() {
        if (!document.getElementById('cb-toast-root')) {
            const toastRoot = document.createElement('div');
            toastRoot.id = 'cb-toast-root';
            toastRoot.className = 'fixed top-4 right-4 z-[100] space-y-2';
            document.body.appendChild(toastRoot);
        }

        if (!document.getElementById('cb-action-modal-root')) {
            const modalRoot = document.createElement('div');
            modalRoot.id = 'cb-action-modal-root';
            modalRoot.className = 'hidden fixed inset-0 z-[90]';
            document.body.appendChild(modalRoot);
        }
    }

    function showToast(message, type) {
        ensureUiRoots();
        const toastRoot = document.getElementById('cb-toast-root');
        const variant = type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-700';

        const toast = document.createElement('div');
        toast.className = `max-w-sm rounded-lg border px-4 py-3 text-sm shadow-sm ${variant}`;
        toast.textContent = message || 'Done.';
        toastRoot.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-1', 'transition');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 200);
        }, 2600);
    }

    function pickInputType(fieldType) {
        if (fieldType === 'email' || fieldType === 'password' || fieldType === 'number') {
            return fieldType;
        }
        return 'text';
    }

    function createFieldMarkup(field) {
        const id = `cb-field-${field.name}`;
        const label = escapeHtml(field.label || field.name);
        const value = field.value == null ? '' : String(field.value);
        const required = field.required ? 'required' : '';
        const placeholder = escapeHtml(field.placeholder || '');
        const min = field.min != null ? `min="${field.min}"` : '';
        const max = field.max != null ? `max="${field.max}"` : '';
        const commonClasses = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

        if (field.type === 'textarea') {
            return `
                <div>
                    <label for="${id}" class="mb-1 block text-sm font-medium text-gray-700">${label}${field.required ? ' *' : ''}</label>
                    <textarea id="${id}" name="${escapeHtml(field.name)}" class="${commonClasses}" rows="${field.rows || 4}" placeholder="${placeholder}" ${required}>${escapeHtml(value)}</textarea>
                    <p id="${id}-err" class="mt-1 hidden text-xs text-red-600"></p>
                </div>
            `;
        }

        if (field.type === 'select') {
            const options = Array.isArray(field.options) ? field.options : [];
            return `
                <div>
                    <label for="${id}" class="mb-1 block text-sm font-medium text-gray-700">${label}${field.required ? ' *' : ''}</label>
                    <select id="${id}" name="${escapeHtml(field.name)}" class="${commonClasses}" ${required}>
                        ${options.map(opt => {
                            const optionValue = typeof opt === 'object' ? opt.value : opt;
                            const optionLabel = typeof opt === 'object' ? opt.label : opt;
                            const selected = String(optionValue) === String(value) ? 'selected' : '';
                            return `<option value="${escapeHtml(optionValue)}" ${selected}>${escapeHtml(optionLabel)}</option>`;
                        }).join('')}
                    </select>
                    <p id="${id}-err" class="mt-1 hidden text-xs text-red-600"></p>
                </div>
            `;
        }

        return `
            <div>
                <label for="${id}" class="mb-1 block text-sm font-medium text-gray-700">${label}${field.required ? ' *' : ''}</label>
                <input id="${id}" name="${escapeHtml(field.name)}" type="${pickInputType(field.type)}" class="${commonClasses}" value="${escapeHtml(value)}" placeholder="${placeholder}" ${required} ${min} ${max} />
                <p id="${id}-err" class="mt-1 hidden text-xs text-red-600"></p>
            </div>
        `;
    }

    function openActionModal(config) {
        ensureUiRoots();
        const modalRoot = document.getElementById('cb-action-modal-root');
        const fields = Array.isArray(config.fields) ? config.fields : [];
        const submitLabel = config.submitLabel || 'Save';
        const title = config.title || 'Update';
        const description = config.description || '';

        modalRoot.innerHTML = `
            <div class="fixed inset-0 bg-gray-900/50" data-cb-close></div>
            <div class="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
                <div class="w-full max-w-lg max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-lg flex flex-col">
                    <div class="px-6 pt-6 pb-3">
                        <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(title)}</h3>
                        ${description ? `<p class="mt-1 text-sm text-gray-600">${escapeHtml(description)}</p>` : ''}
                    </div>
                    <form id="cb-action-form" class="flex min-h-0 flex-1 flex-col">
                        <div class="space-y-4 overflow-y-auto px-6 pb-4">
                            ${fields.map(createFieldMarkup).join('')}
                            <p id="cb-form-error" class="hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"></p>
                        </div>
                        <div class="flex items-center justify-end space-x-2 border-t border-gray-100 bg-white px-6 py-4">
                            <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" data-cb-close>Cancel</button>
                            <button type="submit" id="cb-form-submit" class="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">${escapeHtml(submitLabel)}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modalRoot.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        return new Promise((resolve) => {
            function closeModal(completed) {
                modalRoot.classList.add('hidden');
                modalRoot.innerHTML = '';
                document.body.classList.remove('overflow-hidden');
                resolve(!!completed);
            }

            modalRoot.querySelectorAll('[data-cb-close]').forEach((el) => {
                el.addEventListener('click', () => closeModal(false));
            });

            const form = document.getElementById('cb-action-form');
            const submitBtn = document.getElementById('cb-form-submit');
            const globalErr = document.getElementById('cb-form-error');

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                globalErr.classList.add('hidden');

                const values = {};
                let hasValidationError = false;

                fields.forEach((field) => {
                    const input = form.elements[field.name];
                    const errEl = document.getElementById(`cb-field-${field.name}-err`);
                    if (errEl) {
                        errEl.textContent = '';
                        errEl.classList.add('hidden');
                    }

                    const raw = input ? String(input.value || '').trim() : '';
                    values[field.name] = raw;

                    if (field.required && raw === '') {
                        hasValidationError = true;
                        if (errEl) {
                            errEl.textContent = `${field.label || field.name} is required.`;
                            errEl.classList.remove('hidden');
                        }
                        return;
                    }

                    if (field.type === 'email' && raw !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
                        hasValidationError = true;
                        if (errEl) {
                            errEl.textContent = 'Enter a valid email address.';
                            errEl.classList.remove('hidden');
                        }
                    }

                    if (field.minLength && raw.length < field.minLength) {
                        hasValidationError = true;
                        if (errEl) {
                            errEl.textContent = `${field.label || field.name} must be at least ${field.minLength} characters.`;
                            errEl.classList.remove('hidden');
                        }
                    }
                });

                if (hasValidationError) {
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>Processing...';

                try {
                    await config.onSubmit(values);
                    closeModal(true);
                } catch (err) {
                    globalErr.textContent = err && err.message ? err.message : 'Action failed.';
                    globalErr.classList.remove('hidden');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitLabel;
                }
            });
        });
    }

    async function postJSON(url, payload) {
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
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

    window.apiPostJSON = postJSON;

    function getHomeSearchElements() {
        return {
            input: document.getElementById('home-search-input'),
            button: document.getElementById('home-search-button'),
            error: document.getElementById('home-search-error'),
            results: document.getElementById('home-search-results')
        };
    }

    function setHomeSearchLoading(button, isLoading) {
        if (!button) return;
        if (!button.dataset.idleHtml) {
            button.dataset.idleHtml = button.innerHTML;
        }
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<svg class="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>';
            return;
        }
        button.disabled = false;
        button.innerHTML = button.dataset.idleHtml;
    }

    function renderHomeSearchGroup(title, items, renderItem) {
        if (!items.length) return '';
        return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 class="text-base font-semibold text-gray-900 mb-3">${escapeHtml(title)} (${items.length})</h3>
                <div class="space-y-3">
                    ${items.map(renderItem).join('')}
                </div>
            </div>
        `;
    }

    function renderHomeSearchResults(query, payload) {
        const blogs = normalizeArray(payload.blogs);
        const questions = normalizeArray(payload.questions);
        const mentors = normalizeArray(payload.mentors);
        const total = blogs.length + questions.length + mentors.length;

        if (!total) {
            return `
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 text-sm text-gray-600">
                    No results found for "${escapeHtml(query)}".
                </div>
            `;
        }

        const blogSection = renderHomeSearchGroup('Blogs', blogs, (blog) => `
            <button type="button" onclick="router.navigate('/blogs/${Number(blog.id)}')" class="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <p class="font-medium text-gray-900">${escapeHtml(blog.title || 'Untitled Blog')}</p>
                <p class="text-sm text-gray-600 mt-1">${escapeHtml(blog.excerpt || '')}</p>
                <p class="text-xs text-gray-500 mt-2">${escapeHtml(blog.author || 'Unknown')} | ${escapeHtml(blog.date || '')}</p>
            </button>
        `);

        const questionSection = renderHomeSearchGroup('Questions', questions, (question) => `
            <div class="border border-gray-200 rounded-lg p-3">
                <p class="font-medium text-gray-900">${escapeHtml(question.title || 'Untitled Question')}</p>
                <p class="text-sm text-gray-600 mt-1">${escapeHtml(question.content || '')}</p>
                <p class="text-xs text-gray-500 mt-2">${escapeHtml(question.author || 'Unknown')} | ${Number(question.answers) || 0} answers</p>
            </div>
        `);

        const mentorSection = renderHomeSearchGroup('Mentors', mentors, (mentor) => `
            <div class="border border-gray-200 rounded-lg p-3">
                <p class="font-medium text-gray-900">${escapeHtml(mentor.name || 'Mentor')}</p>
                <p class="text-sm text-gray-600 mt-1">${escapeHtml(mentor.role || 'Mentor')} | ${escapeHtml(mentor.company || 'N/A')}</p>
                <p class="text-xs text-gray-500 mt-2">${escapeHtml(mentor.bio || '')}</p>
            </div>
        `);

        return `
            <div class="space-y-4">
                <p class="text-sm text-gray-600">Showing ${total} result${total === 1 ? '' : 's'} for "${escapeHtml(query)}".</p>
                ${blogSection}
                ${questionSection}
                ${mentorSection}
            </div>
        `;
    }

    window.runHomeSearch = async function (event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        const { input, button, error, results } = getHomeSearchElements();
        if (!input || !button || !error || !results) {
            return;
        }

        const query = String(input.value || '').trim();
        error.textContent = '';
        error.classList.add('hidden');

        if (query.length === 0) {
            results.innerHTML = '';
            results.classList.add('hidden');
            return;
        }

        if (query.length < 2) {
            error.textContent = 'Enter at least 2 characters to search.';
            error.classList.remove('hidden');
            results.innerHTML = '';
            results.classList.add('hidden');
            return;
        }

        if (button.disabled) {
            return;
        }

        setHomeSearchLoading(button, true);
        try {
            const data = await postJSON(CONTENT_API, { action: 'search', query });
            results.innerHTML = renderHomeSearchResults(query, data);
            results.classList.remove('hidden');
        } catch (err) {
            const message = err && err.message ? err.message : 'Search failed. Please try again.';
            error.textContent = message;
            error.classList.remove('hidden');
            results.innerHTML = '';
            results.classList.add('hidden');
            showToast(message, 'error');
        } finally {
            setHomeSearchLoading(button, false);
        }
    };

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
            router.dbData.myBlogs = normalizeArray(contentData.my_blogs);
            router.dbData.questions = normalizeArray(contentData.questions);
            router.dbData.mentors = normalizeArray(contentData.mentors);
            router.dbData.mentorshipRequests = normalizeArray(contentData.mentorship_requests);
            router.dbData.profile = (contentData.profile && typeof contentData.profile === 'object') ? contentData.profile : null;
            router.dbData.studentCount = Number(contentData.student_count) || 0;
            if (role !== 'admin') {
                router.dbData.announcements = normalizeArray(contentData.announcements);
            }
        } catch (err) {
            router.dbData.blogs = [];
            router.dbData.myBlogs = [];
            router.dbData.questions = [];
            router.dbData.mentors = [];
            router.dbData.mentorshipRequests = [];
            router.dbData.profile = null;
            router.dbData.studentCount = 0;
            if (role !== 'admin') {
                router.dbData.announcements = [];
            }
            router.dbData.errors.content = err.message || 'Failed to load content data.';
        }

        if (role === 'admin') {
            router.dbData.profile = null;
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

    }

    window.refreshDbData = refreshDbData;

    function updateHomeStats() {
        const studentsEl = document.querySelector('[data-stat="students"]');
        const mentorsEl = document.querySelector('[data-stat="mentors"]');
        const blogsEl = document.querySelector('[data-stat="blogs"]');
        const answersEl = document.querySelector('[data-stat="answers"]');
        if (studentsEl) studentsEl.textContent = formatCount(router.dbData.studentCount || 0);
        if (mentorsEl) mentorsEl.textContent = formatCount(normalizeArray(router.dbData.mentors).length);
        if (blogsEl) blogsEl.textContent = formatCount(normalizeArray(router.dbData.blogs).length);
        if (answersEl) {
            const total = normalizeArray(router.dbData.questions).reduce(function (sum, q) { return sum + (Number(q.answers) || 0); }, 0);
            answersEl.textContent = formatCount(total);
        }
    }

    const baseRender = router.render.bind(router);
    router.render = function () {
        baseRender();
        wirePassiveButtons();

        if (router.__dbLoading) {
            return;
        }

        router.__dbLoading = true;
        refreshDbData(false)
            .catch(function (err) { console.error('refreshDbData failed:', err); })
            .finally(() => {
                router.__dbLoading = false;
                baseRender();
                wirePassiveButtons();
                updateHomeStats();
                _initChat();
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
                            ${pendingBlogs.length ? pendingBlogs.slice(0, 5).map(b => `
                                <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer" onclick="openAdminBlogReview(${Number(b.id)})">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="flex-1 min-w-0">
                                            <p class="font-medium text-gray-900">${b.title || 'Untitled Blog'}</p>
                                            <p class="text-sm text-gray-600 mt-1">${b.author || 'Unknown'} | ${b.category || 'General'}</p>
                                            <p class="text-xs text-gray-500 mt-1">${b.submittedDate || ''}</p>
                                        </div>
                                        <div class="flex flex-wrap items-center gap-2" onclick="event.stopPropagation()">
                                            <button onclick="openAdminBlogReview(${Number(b.id)})" class="px-3 py-1.5 border border-primary-600 text-primary-600 text-xs rounded-lg hover:bg-primary-50 transition-colors">View</button>
                                            <button onclick="updateBlogModeration(${Number(b.id)}, 'published')" class="px-3 py-1.5 bg-success-600 text-white text-xs rounded-lg hover:bg-success-700 transition-colors">Approve</button>
                                            <button onclick="updateBlogModeration(${Number(b.id)}, 'rejected')" class="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors">Reject</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : renderEmpty('No pending blogs found.')}
                        </div>
                    </div>

                    <div class="bg-white border border-gray-200 rounded-lg p-5">
                        <h2 class="font-semibold text-gray-900 mb-3">Pending User Verifications</h2>
                        <div class="space-y-3">
                            ${pendingUsers.length ? pendingUsers.slice(0, 5).map(u => `
                                <div class="border border-gray-200 rounded-lg p-3">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="flex-1 min-w-0">
                                            <p class="font-medium text-gray-900">${u.name || 'Unknown User'}</p>
                                            <p class="text-sm text-gray-600 mt-1">${u.email || ''}</p>
                                            <p class="text-xs text-gray-500 mt-1">${u.role || ''} | ${u.verification_status || 'pending'}</p>
                                        </div>
                                        <div class="flex flex-wrap items-center gap-2">
                                            <button onclick="updateUserVerification(${Number(u.id)}, 'approved')" class="px-3 py-1.5 bg-success-600 text-white text-xs rounded-lg hover:bg-success-700 transition-colors">Verify</button>
                                            <button onclick="updateUserVerification(${Number(u.id)}, 'rejected')" class="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors">Reject</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : renderEmpty('No users pending verification.')}
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
            const statusBadgeClass = String(blog.status || '').toLowerCase() === 'published'
                ? 'bg-green-100 text-green-600'
                : String(blog.status || '').toLowerCase() === 'rejected'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-yellow-100 text-yellow-700';
            return `
                <div class="card p-6 hover:shadow-md transition-shadow ${allowModeration ? 'cursor-pointer' : ''}" ${allowModeration ? `onclick="openAdminBlogReview(${blog.id})"` : ''}>
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <h3 class="text-lg font-semibold text-gray-900">${blog.title || 'Untitled Blog'}</h3>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">${blog.category || 'General'}</span>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}">${blog.status || 'pending'}</span>
                            </div>
                            <div class="text-sm text-gray-500 mb-2">
                                <span class="font-medium text-gray-800">${blog.author || 'Unknown'}</span>
                                <span class="ml-2">${blog.authorRole || 'User'}</span>
                                <span class="ml-2">${blog.submittedDate || ''}</span>
                            </div>
                            <p class="text-sm text-gray-600">${blog.excerpt || ''}</p>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap items-center gap-2">
                        <button onclick="event.stopPropagation(); openAdminBlogReview(${blog.id})" class="px-4 py-2 border border-primary-600 text-primary-600 text-sm rounded-lg hover:bg-primary-50 transition-colors">View</button>
                        ${allowModeration ? `
                            <button onclick="event.stopPropagation(); updateBlogModeration(${blog.id}, 'published')" class="px-4 py-2 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors">Approve</button>
                            <button onclick="event.stopPropagation(); updateBlogModeration(${blog.id}, 'rejected')" class="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors">Reject</button>
                        ` : ''}
                        <button onclick="event.stopPropagation(); deleteBlogByAdmin(${blog.id})" class="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors ml-auto">Delete</button>
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

        const mentorActions = (u) => `
            <button onclick="openEditMentorPrompt(${u.id})" class="px-4 py-2 text-sm rounded-lg border border-primary-600 text-primary-600 hover:bg-primary-50 transition-colors">Edit</button>
            <button onclick="deleteUserByAdmin(${u.id})" class="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Delete</button>
        `;

        const studentActions = (u) => `
            <button onclick="deleteUserByAdmin(${u.id})" class="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Delete</button>
        `;

        const allActions = (u) => {
            if (u.role === 'mentor') return mentorActions(u);
            if (u.role === 'student') return studentActions(u);
            return '';
        };

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
                <div id="auTab-pending" class="au-panel space-y-4">${pendingUsers.length ? pendingUsers.map(u => renderUserCard(u, u.role === 'mentor' ? `${pendingActions(u)} ${mentorActions(u)}` : pendingActions(u))).join('') : renderEmpty('No users pending verification.')}</div>
                <div id="auTab-students" class="au-panel space-y-4 hidden">${students.length ? students.map(u => renderUserCard(u, studentActions(u))).join('') : renderEmpty('No student users found.')}</div>
                <div id="auTab-mentors" class="au-panel space-y-4 hidden">${mentors.length ? mentors.map(u => renderUserCard(u, mentorActions(u))).join('') : renderEmpty('No mentor users found.')}</div>
                <div id="auTab-all" class="au-panel space-y-4 hidden">${users.length ? users.map(u => renderUserCard(u, allActions(u))).join('') : renderEmpty('No users found.')}</div>
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
                            <div class="mt-3">
                                <button onclick="deleteQuestionByAdmin(${q.id})" class="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors">Delete Question</button>
                            </div>
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
                    ${announcements.length ? announcements.map(a => `
                        <div class="card p-5">
                            <h3 class="font-semibold text-gray-900">${a.title}</h3>
                            <p class="text-sm text-gray-600 mt-2 whitespace-pre-wrap">${a.content}</p>
                            <p class="text-xs text-gray-500 mt-2">Posted: ${a.created_at || ''}</p>
                            <div class="mt-4 flex items-center gap-2">
                                <button onclick="openEditAnnouncementPrompt(${a.id})" class="px-4 py-2 border border-primary-600 text-primary-600 text-sm rounded-lg hover:bg-primary-50 transition-colors">Edit</button>
                                <button onclick="deleteAnnouncementByAdmin(${a.id})" class="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                            </div>
                        </div>
                    `).join('') : renderEmpty('No announcements published yet.')}
                </div>
            </div>
        `;
    };

    async function safeRefreshAndRender() {
        await refreshDbData(true);
        router.render();
    }

    function ensureLoggedIn(requiredRole) {
        if (!router.user) {
            openAuthModal();
            return false;
        }
        if (requiredRole && router.user.role !== requiredRole) {
            showToast(`Only ${requiredRole}s can perform this action.`, 'error');
            return false;
        }
        return true;
    }

    function getQuestionById(questionId) {
        return normalizeArray(router.dbData.questions).find((q) => Number(q.id) === Number(questionId)) || null;
    }

    function getBlogById(blogId) {
        const allBlogs = normalizeArray(router.dbData.myBlogs)
            .concat(normalizeArray(router.dbData.blogs))
            .concat(normalizeArray(router.dbData.adminBlogs));
        return allBlogs.find((b) => Number(b.id) === Number(blogId)) || null;
    }

    function getAnnouncementById(announcementId) {
        return normalizeArray(router.dbData.announcements)
            .find((a) => Number(a.id) === Number(announcementId)) || null;
    }

    function getMentorByUserId(userId, fallbackName) {
        const mentors = normalizeArray(router.dbData.mentors);
        const match = mentors.find((mentor) => Number(mentor.userId || mentor.id) === Number(userId));
        if (match) {
            return match;
        }
        return {
            id: Number(userId) || 0,
            userId: Number(userId) || 0,
            name: fallbackName || 'Mentor',
            role: 'Mentor',
            company: 'N/A',
            bio: 'Profile details are not available yet.',
            skills: ['Mentorship']
        };
    }

    window.openMentorProfileModal = function (mentorUserId, fallbackName) {
        const mentor = getMentorByUserId(mentorUserId, fallbackName);
        ensureUiRoots();
        const modalRoot = document.getElementById('cb-action-modal-root');

        modalRoot.innerHTML = `
            <div class="fixed inset-0 bg-gray-900/50" data-cb-close></div>
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                    <div class="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <h3 class="text-xl font-semibold text-gray-900">${escapeHtml(mentor.name || 'Mentor')}</h3>
                            <p class="text-sm text-gray-600 mt-1">${escapeHtml(mentor.role || 'Mentor')} | ${escapeHtml(mentor.company || 'N/A')}</p>
                        </div>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-700">Verified</span>
                    </div>
                    <p class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(mentor.bio || 'No bio available.')}</p>
                    <div class="mt-4 flex flex-wrap gap-2">
                        ${normalizeArray(mentor.skills).slice(0, 6).map((skill) => `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">${escapeHtml(skill)}</span>
                        `).join('')}
                    </div>
                    <div class="mt-5 flex items-center justify-end gap-2">
                        <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" data-cb-close>Close</button>
                        ${router.user && router.user.role === 'student' && Number(router.user.id) !== Number(mentor.userId || mentor.id) ? `
                            <button type="button" id="cb-mentor-request" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Request Mentorship</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        modalRoot.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        const closeModal = () => {
            modalRoot.classList.add('hidden');
            modalRoot.innerHTML = '';
            document.body.classList.remove('overflow-hidden');
        };
        modalRoot.querySelectorAll('[data-cb-close]').forEach((node) => node.addEventListener('click', closeModal));

        const requestBtn = document.getElementById('cb-mentor-request');
        if (requestBtn) {
            requestBtn.addEventListener('click', async () => {
                closeModal();
                await window.sendMentorshipRequest(Number(mentor.userId || mentor.id), mentor.name || 'Mentor');
            });
        }
    };

    function wirePassiveButtons() {
        const activeContainerId = router.currentPath.startsWith('/student')
            ? 'student-views'
            : router.currentPath.startsWith('/mentor/')
                ? 'mentor-views'
                : router.currentPath.startsWith('/admin')
                    ? 'admin-views'
                    : 'public-views';
        const root = document.getElementById(activeContainerId);
        if (!root) return;

        root.querySelectorAll('button').forEach((button) => {
            if (button.dataset.cbWired === '1') {
                return;
            }

            // Skip buttons that already have explicit handlers.
            if (button.getAttribute('onclick')) {
                button.dataset.cbWired = '1';
                return;
            }

            const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            let handler = null;

            if (label === 'load more blogs') {
                handler = () => showToast('All available blogs are already loaded.', 'info');
            } else if (label === 'login to comment') {
                handler = () => {
                    if (!router.user) {
                        openLoginFlow();
                        return;
                    }
                    showToast('Comment posting will be enabled in the discussion API.', 'info');
                };
            } else if (label === 'discuss') {
                handler = () => router.navigate('/community');
            } else if (label === 'share') {
                handler = async () => {
                    try {
                        if (navigator.clipboard && window.location) {
                            await navigator.clipboard.writeText(window.location.href);
                            showToast('Page link copied.', 'success');
                        } else {
                            showToast('Copy link is not supported in this browser.', 'error');
                        }
                    } catch (_) {
                        showToast('Failed to copy link.', 'error');
                    }
                };
            } else if (label === 'view profile') {
                handler = () => {
                    if (router.currentPath.startsWith('/blogs/')) {
                        const blogId = Number((router.currentPath.split('/')[2] || 0));
                        const blog = getBlogById(blogId);
                        if (blog) {
                            window.openMentorProfileModal(Number(blog.authorId || 0), blog.author || 'Mentor');
                            return;
                        }
                    }
                    showToast('Profile details are unavailable for this view.', 'info');
                };
            } else if (label === 'schedule session') {
                handler = () => showToast('Open student record and use Schedule action.', 'info');
            } else if (label === 'call student') {
                handler = () => showToast('Calling is not enabled in this deployment.', 'info');
            } else if (label === 'reply') {
                handler = () => showToast('Reply API is not enabled yet.', 'info');
            }

            if (handler) {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    handler();
                });
            }

            button.dataset.cbWired = '1';
        });

        root.querySelectorAll('a[href="#"]').forEach((link) => {
            if (link.dataset.cbWired === '1') {
                return;
            }
            link.addEventListener('click', (event) => {
                event.preventDefault();
                showToast('Update your profile settings to add this external link.', 'info');
            });
            link.dataset.cbWired = '1';
        });
    }

    window.openAdminBlogReview = function (blogId) {
        if (!ensureLoggedIn('admin')) return;
        const blog = getBlogById(blogId);
        if (!blog) {
            showToast('Blog not found.', 'error');
            return;
        }

        ensureUiRoots();
        const modalRoot = document.getElementById('cb-action-modal-root');
        const status = String(blog.status || 'pending').toLowerCase();
        const statusClass = status === 'published'
            ? 'bg-green-100 text-green-700'
            : status === 'rejected'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700';

        modalRoot.innerHTML = `
            <div class="fixed inset-0 bg-gray-900/50" data-cb-close></div>
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                    <div class="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <h3 class="text-xl font-semibold text-gray-900">${escapeHtml(blog.title || 'Untitled Blog')}</h3>
                            <p class="text-sm text-gray-600 mt-1">${escapeHtml(blog.author || 'Unknown')} | ${escapeHtml(blog.category || 'General')} | ${escapeHtml(blog.submittedDate || blog.date || '')}</p>
                        </div>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusClass}">${escapeHtml(status)}</span>
                    </div>
                    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(blog.content || blog.excerpt || '')}</p>
                    </div>
                    <div class="mt-5 flex flex-wrap items-center gap-2 justify-end">
                        <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" data-cb-close>Close</button>
                        <button type="button" id="cb-review-delete" class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Delete</button>
                        ${status !== 'published' ? '<button type="button" id="cb-review-approve" class="rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700">Approve</button>' : ''}
                        ${status !== 'rejected' ? '<button type="button" id="cb-review-reject" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">Reject</button>' : ''}
                    </div>
                </div>
            </div>
        `;
        modalRoot.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        const closeModal = () => {
            modalRoot.classList.add('hidden');
            modalRoot.innerHTML = '';
            document.body.classList.remove('overflow-hidden');
        };

        modalRoot.querySelectorAll('[data-cb-close]').forEach((node) => {
            node.addEventListener('click', closeModal);
        });

        const approveBtn = document.getElementById('cb-review-approve');
        if (approveBtn) {
            approveBtn.addEventListener('click', async () => {
                approveBtn.disabled = true;
                try {
                    await postJSON(ADMIN_API, { action: 'update_blog_status', blog_id: Number(blog.id), status: 'published' });
                    closeModal();
                    await safeRefreshAndRender();
                    showToast('Blog approved successfully.', 'success');
                } catch (err) {
                    approveBtn.disabled = false;
                    showToast(err.message || 'Failed to approve blog.', 'error');
                }
            });
        }

        const rejectBtn = document.getElementById('cb-review-reject');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', async () => {
                rejectBtn.disabled = true;
                try {
                    await postJSON(ADMIN_API, { action: 'update_blog_status', blog_id: Number(blog.id), status: 'rejected' });
                    closeModal();
                    await safeRefreshAndRender();
                    showToast('Blog rejected successfully.', 'success');
                } catch (err) {
                    rejectBtn.disabled = false;
                    showToast(err.message || 'Failed to reject blog.', 'error');
                }
            });
        }

        const deleteBtn = document.getElementById('cb-review-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (!window.confirm('Delete this blog permanently?')) return;
                deleteBtn.disabled = true;
                try {
                    await postJSON(ADMIN_API, { action: 'delete_blog', blog_id: Number(blog.id) });
                    closeModal();
                    await safeRefreshAndRender();
                    showToast('Blog deleted.', 'success');
                } catch (err) {
                    deleteBtn.disabled = false;
                    showToast(err.message || 'Failed to delete blog.', 'error');
                }
            });
        }
    };

    window.updateUserVerification = async function (userId, verificationStatus) {
        try {
            await postJSON(ADMIN_API, {
                action: 'update_user_verification',
                user_id: Number(userId),
                verification_status: verificationStatus
            });
            await safeRefreshAndRender();
            showToast('User verification updated.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to update user verification.', 'error');
        }
    };

    window.updateBlogModeration = async function (blogId, status) {
        try {
            await postJSON(ADMIN_API, {
                action: 'update_blog_status',
                blog_id: Number(blogId),
                status
            });
            await safeRefreshAndRender();
            showToast('Blog moderation status updated.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to update blog status.', 'error');
        }
    };

    window.deleteBlogByAdmin = async function (blogId) {
        if (!ensureLoggedIn('admin')) return;
        if (!window.confirm('Delete this blog permanently?')) return;
        try {
            await postJSON(ADMIN_API, {
                action: 'delete_blog',
                blog_id: Number(blogId)
            });
            await safeRefreshAndRender();
            showToast('Blog deleted.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete blog.', 'error');
        }
    };

    window.deleteQuestionByAdmin = async function (questionId) {
        if (!ensureLoggedIn('admin')) return;
        if (!window.confirm('Delete this question permanently?')) return;
        try {
            await postJSON(ADMIN_API, {
                action: 'delete_question',
                question_id: Number(questionId)
            });
            await safeRefreshAndRender();
            showToast('Question deleted.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete question.', 'error');
        }
    };

    window.reactivateMentor = async function (userId) {
        return window.updateUserVerification(userId, 'approved');
    };

    window.openCreateQuestionPrompt = async function () {
        if (!ensureLoggedIn()) return;

        await openActionModal({
            title: 'Ask a Question',
            description: 'Post a question to the community.',
            submitLabel: 'Post Question',
            fields: [
                { name: 'title', label: 'Title', required: true, minLength: 6, placeholder: 'Write a concise title' },
                { name: 'content', label: 'Details', type: 'textarea', required: true, minLength: 12, rows: 5, placeholder: 'Describe your question clearly' }
            ],
            onSubmit: async (values) => {
                await postJSON(CONTENT_API, {
                    action: 'create_question',
                    title: values.title,
                    content: values.content
                });
                await safeRefreshAndRender();
                showToast('Question submitted successfully.', 'success');
            }
        });
    };

    window.openEditQuestionPrompt = async function (questionId) {
        if (!ensureLoggedIn()) return;
        const question = getQuestionById(questionId);
        if (!question) {
            showToast('Question not found.', 'error');
            return;
        }
        const isAdmin = router.user.role === 'admin';
        const isOwner = Number(question.authorId) === Number(router.user.id);
        if (!isAdmin && !isOwner) {
            showToast('You can only edit your own question.', 'error');
            return;
        }

        await openActionModal({
            title: 'Edit Question',
            submitLabel: 'Save Changes',
            fields: [
                { name: 'title', label: 'Title', required: true, minLength: 6, value: question.title || '' },
                { name: 'content', label: 'Details', type: 'textarea', required: true, minLength: 12, rows: 5, value: question.content || '' }
            ],
            onSubmit: async (values) => {
                await postJSON(CONTENT_API, {
                    action: 'update_question',
                    question_id: Number(questionId),
                    title: values.title,
                    content: values.content
                });
                await safeRefreshAndRender();
                showToast('Question updated.', 'success');
            }
        });
    };

    window.deleteQuestion = async function (questionId) {
        if (!ensureLoggedIn()) return;
        if (!window.confirm('Delete this question? This action cannot be undone.')) return;
        try {
            await postJSON(CONTENT_API, {
                action: 'delete_question',
                question_id: Number(questionId)
            });
            await safeRefreshAndRender();
            showToast('Question deleted.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete question.', 'error');
        }
    };

    window.openCreateAnswerPrompt = async function (questionId) {
        if (!ensureLoggedIn()) return;
        const question = getQuestionById(questionId);

        await openActionModal({
            title: 'Write an Answer',
            description: question ? question.title : 'Share your answer with the community.',
            submitLabel: 'Post Answer',
            fields: [
                { name: 'content', label: 'Answer', type: 'textarea', required: true, minLength: 8, rows: 6, placeholder: 'Write a helpful answer' }
            ],
            onSubmit: async (values) => {
                await postJSON(CONTENT_API, {
                    action: 'create_answer',
                    question_id: Number(questionId),
                    content: values.content
                });
                await safeRefreshAndRender();
                showToast('Answer submitted.', 'success');
            }
        });
    };

    window.openCreateBlogPrompt = async function () {
        if (!ensureLoggedIn()) return;

        await openActionModal({
            title: 'Write New Blog',
            description: 'Submit a new blog for review.',
            submitLabel: 'Submit Blog',
            fields: [
                { name: 'title', label: 'Title', required: true, minLength: 6, placeholder: 'Blog title' },
                { name: 'category', label: 'Category', value: 'General', placeholder: 'Career Guidance, Tech, etc.' },
                { name: 'content', label: 'Content', type: 'textarea', required: true, minLength: 30, rows: 8, placeholder: 'Write your blog content' }
            ],
            onSubmit: async (values) => {
                const normalizedContent = values.content || '';
                await postJSON(CONTENT_API, {
                    action: 'create_blog',
                    title: values.title,
                    category: values.category || 'General',
                    content: normalizedContent,
                    excerpt: normalizedContent.slice(0, 180)
                });
                await safeRefreshAndRender();
                showToast('Blog submitted for moderation.', 'success');
            }
        });
    };

    window.openEditBlogPrompt = async function (blogId) {
        if (!ensureLoggedIn()) return;
        const blog = getBlogById(blogId);
        if (!blog) {
            showToast('Blog not found.', 'error');
            return;
        }
        const isAdmin = router.user.role === 'admin';
        const isOwner = Number(blog.authorId) === Number(router.user.id);
        if (!isAdmin && !isOwner) {
            showToast('You can only edit your own blog.', 'error');
            return;
        }

        await openActionModal({
            title: 'Edit Blog',
            submitLabel: 'Save Blog',
            fields: [
                { name: 'title', label: 'Title', required: true, minLength: 6, value: blog.title || '' },
                { name: 'category', label: 'Category', value: blog.category || 'General' },
                { name: 'content', label: 'Content', type: 'textarea', required: true, minLength: 30, rows: 8, value: blog.content || '' }
            ],
            onSubmit: async (values) => {
                await postJSON(CONTENT_API, {
                    action: 'update_blog',
                    blog_id: Number(blogId),
                    title: values.title,
                    category: values.category || 'General',
                    content: values.content,
                    excerpt: (values.content || '').slice(0, 180),
                    status: blog.status || 'pending'
                });
                await safeRefreshAndRender();
                showToast('Blog updated.', 'success');
            }
        });
    };

    window.deleteBlog = async function (blogId) {
        if (!ensureLoggedIn()) return;
        if (!window.confirm('Delete this blog? This action cannot be undone.')) return;
        try {
            await postJSON(CONTENT_API, {
                action: 'delete_blog',
                blog_id: Number(blogId)
            });
            await safeRefreshAndRender();
            showToast('Blog deleted.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete blog.', 'error');
        }
    };

    window.publishBlogFromDraft = async function (blogId) {
        if (!ensureLoggedIn()) return;
        const blog = getBlogById(blogId);
        if (!blog) {
            showToast('Blog not found.', 'error');
            return;
        }
        try {
            await postJSON(CONTENT_API, {
                action: 'update_blog',
                blog_id: Number(blogId),
                title: blog.title || '',
                category: blog.category || 'General',
                content: blog.content || '',
                excerpt: (blog.excerpt || '').slice(0, 180),
                status: 'pending'
            });
            await safeRefreshAndRender();
            showToast('Blog sent for review.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to send blog for review.', 'error');
        }
    };

    window.sendMentorshipRequest = async function (mentorUserId, mentorName) {
        if (!ensureLoggedIn('student')) return;

        await openActionModal({
            title: 'Send Mentorship Request',
            description: mentorName ? `Request mentorship from ${mentorName}.` : '',
            submitLabel: 'Send Request',
            fields: [
                { name: 'message', label: 'Message', type: 'textarea', rows: 4, placeholder: 'Optional: share your goals and expectations' }
            ],
            onSubmit: async (values) => {
                await postJSON(CONTENT_API, {
                    action: 'create_mentorship_request',
                    mentor_user_id: Number(mentorUserId),
                    message: values.message || ''
                });
                await safeRefreshAndRender();
                showToast('Mentorship request sent.', 'success');
            }
        });
    };

    window.updateMentorshipRequestStatus = async function (requestId, status) {
        if (!ensureLoggedIn()) return;
        try {
            await postJSON(CONTENT_API, {
                action: 'update_mentorship_request_status',
                request_id: Number(requestId),
                status
            });
            await safeRefreshAndRender();
            showToast('Mentorship request updated.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to update mentorship request.', 'error');
        }
    };

    window.openCreateAnnouncementPrompt = async function () {
        if (!ensureLoggedIn('admin')) return;

        await openActionModal({
            title: 'Create Announcement',
            submitLabel: 'Publish',
            fields: [
                { name: 'title', label: 'Title', required: true, minLength: 4, placeholder: 'Announcement title' },
                { name: 'content', label: 'Content', type: 'textarea', required: true, minLength: 8, rows: 5, placeholder: 'Announcement details' }
            ],
            onSubmit: async (values) => {
                await postJSON(ADMIN_API, {
                    action: 'create_announcement',
                    title: values.title,
                    content: values.content
                });
                await safeRefreshAndRender();
                showToast('Announcement created.', 'success');
            }
        });
    };

    window.openEditAnnouncementPrompt = async function (announcementId) {
        if (!ensureLoggedIn('admin')) return;
        const announcement = getAnnouncementById(announcementId);
        if (!announcement) {
            showToast('Announcement not found.', 'error');
            return;
        }

        await openActionModal({
            title: 'Edit Announcement',
            submitLabel: 'Save Changes',
            fields: [
                { name: 'title', label: 'Title', required: true, minLength: 4, value: announcement.title || '' },
                { name: 'content', label: 'Content', type: 'textarea', required: true, minLength: 8, rows: 5, value: announcement.content || '' }
            ],
            onSubmit: async (values) => {
                await postJSON(ADMIN_API, {
                    action: 'update_announcement',
                    announcement_id: Number(announcementId),
                    title: values.title,
                    content: values.content
                });
                await safeRefreshAndRender();
                showToast('Announcement updated.', 'success');
            }
        });
    };

    window.deleteAnnouncementByAdmin = async function (announcementId) {
        if (!ensureLoggedIn('admin')) return;
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await postJSON(ADMIN_API, {
                action: 'delete_announcement',
                announcement_id: Number(announcementId)
            });
            await safeRefreshAndRender();
            showToast('Announcement deleted.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete announcement.', 'error');
        }
    };

    window.openEditMentorPrompt = async function (userId) {
        if (!ensureLoggedIn('admin')) return;
        const mentor = normalizeArray(router.dbData.adminUsers).find((u) => Number(u.id) === Number(userId) && u.role === 'mentor');
        if (!mentor) {
            showToast('Mentor not found.', 'error');
            return;
        }

        await openActionModal({
            title: 'Edit Mentor',
            submitLabel: 'Save Mentor',
            fields: [
                { name: 'name', label: 'Name', required: true, minLength: 2, value: mentor.name || '' },
                { name: 'email', label: 'Email', type: 'email', required: true, value: mentor.email || '' },
                { name: 'company', label: 'Company', value: mentor.company || '' },
                { name: 'position', label: 'Position', value: mentor.position || '' },
                { name: 'expertise', label: 'Expertise', value: mentor.expertise || '' },
                { name: 'status', label: 'Status', type: 'select', value: mentor.status || 'active', options: ['active', 'inactive'] },
                { name: 'verification_status', label: 'Verification', type: 'select', value: mentor.verification_status || 'approved', options: ['approved', 'pending', 'rejected'] }
            ],
            onSubmit: async (values) => {
                await postJSON(ADMIN_API, {
                    action: 'update_mentor',
                    user_id: Number(userId),
                    name: values.name,
                    email: values.email,
                    company: values.company,
                    position: values.position,
                    expertise: values.expertise,
                    status: values.status,
                    verification_status: values.verification_status,
                    is_email_verified: values.verification_status === 'approved' ? 1 : 0,
                    verified_by_admin: values.verification_status === 'approved' ? 1 : 0
                });
                await safeRefreshAndRender();
                showToast('Mentor updated.', 'success');
            }
        });
    };

    window.deleteUserByAdmin = async function (userId) {
        if (!ensureLoggedIn('admin')) return;
        if (!window.confirm('Delete this user account permanently?')) return;
        try {
            await postJSON(ADMIN_API, {
                action: 'delete_user',
                user_id: Number(userId)
            });
            await safeRefreshAndRender();
            showToast('User deleted.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete user.', 'error');
        }
    };

    window.openProfileEditModal = async function () {
        if (!ensureLoggedIn()) return;
        const role = String((router.user && router.user.role) || '').toLowerCase();
        const profile = (router.dbData && router.dbData.profile && typeof router.dbData.profile === 'object')
            ? router.dbData.profile
            : {};
        const toCommaList = (value) => {
            if (Array.isArray(value)) {
                return value.join(', ');
            }
            return String(value || '');
        };

        const fields = [
            { name: 'name', label: 'Name', required: true, minLength: 2, value: profile.name || router.user.name || '' },
            { name: 'email', label: 'Email', type: 'email', required: true, value: profile.email || router.user.email || '' },
            { name: 'phone', label: 'Phone', value: profile.phone || '', placeholder: '+1 555 555 5555' },
            { name: 'location', label: 'Location', value: profile.location || '', placeholder: 'City, State' },
            { name: 'bio', label: 'Bio', type: 'textarea', rows: 4, value: profile.bio || '' },
            { name: 'avatar', label: 'Profile Image URL', value: profile.avatar || profile.profile_image || '', placeholder: 'https://example.com/image.jpg' }
        ];

        if (role === 'student') {
            fields.push(
                { name: 'roll_number', label: 'Roll Number', required: true, minLength: 2, value: profile.roll_number || '' },
                { name: 'branch', label: 'Branch', value: profile.branch || '' },
                { name: 'year', label: 'Year', type: 'number', min: 1, max: 10, value: profile.year != null ? profile.year : '' },
                { name: 'skills', label: 'Skills (comma-separated)', value: toCommaList(profile.skills || []) },
                { name: 'interests', label: 'Interests (comma-separated)', value: toCommaList(profile.interests || []) }
            );
        } else if (role === 'mentor') {
            fields.push(
                { name: 'company', label: 'Company', value: profile.company || '' },
                { name: 'position', label: 'Position', value: profile.position || '' },
                { name: 'expertise', label: 'Expertise (comma-separated)', value: toCommaList(profile.expertise || []) },
                { name: 'skills', label: 'Technical Skills (comma-separated)', value: toCommaList(profile.skills || []) }
            );
        }

        await openActionModal({
            title: 'Edit Profile',
            submitLabel: 'Save Profile',
            fields: fields,
            onSubmit: async (values) => {
                const payload = {
                    action: 'update_profile',
                    name: values.name,
                    email: values.email,
                    phone: values.phone || '',
                    location: values.location || '',
                    bio: values.bio || '',
                    avatar: values.avatar || '',
                    skills: values.skills || '',
                    interests: values.interests || '',
                    roll_number: values.roll_number || '',
                    branch: values.branch || '',
                    year: values.year || '',
                    company: values.company || '',
                    position: values.position || '',
                    expertise: values.expertise || ''
                };

                const result = await postJSON(CONTENT_API, {
                    ...payload
                });
                if (result && result.user) {
                    router.user = result.user;
                    localStorage.setItem('demo_user', JSON.stringify(result.user));
                }
                if (result && result.profile) {
                    router.dbData.profile = result.profile;
                }
                await safeRefreshAndRender();
                showToast('Profile updated.', 'success');
            }
        });
    };

    window.openChangePasswordModal = async function () {
        if (!ensureLoggedIn()) return;

        await openActionModal({
            title: 'Change Password',
            submitLabel: 'Update Password',
            fields: [
                { name: 'current_password', label: 'Current Password', type: 'password', required: true, minLength: 1 },
                { name: 'new_password', label: 'New Password', type: 'password', required: true, minLength: 6 }
            ],
            onSubmit: async (values) => {
                await postJSON(CONTENT_API, {
                    action: 'change_password',
                    current_password: values.current_password,
                    new_password: values.new_password
                });
                showToast('Password changed successfully.', 'success');
            }
        });
    };

    window.deleteCurrentAccount = async function () {
        if (!ensureLoggedIn()) return;
        if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
        try {
            await postJSON(CONTENT_API, { action: 'delete_account' });
            localStorage.removeItem('demo_user');
            router.user = null;
            await safeRefreshAndRender();
            router.navigate('/');
            showToast('Account deleted.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete account.', 'error');
        }
    };

    window.viewBlogDetails = function (blogId) {
        router.navigate(`/blogs/${Number(blogId)}`);
    };

    window.openMentorStudentProfileModal = function (requestId) {
        if (!ensureLoggedIn('mentor')) return;
        const request = normalizeArray(router.dbData.mentorshipRequests)
            .find((r) => Number(r.id) === Number(requestId));
        if (!request) {
            showToast('Student details are not available.', 'error');
            return;
        }

        ensureUiRoots();
        const modalRoot = document.getElementById('cb-action-modal-root');
        modalRoot.innerHTML = `
            <div class="fixed inset-0 bg-gray-900/50" data-cb-close></div>
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-900">Student Profile</h3>
                    <div class="mt-4 space-y-3 text-sm text-gray-700">
                        <p><span class="font-medium text-gray-900">Name:</span> ${escapeHtml(request.student_name || 'Student')}</p>
                        <p><span class="font-medium text-gray-900">Request Status:</span> ${escapeHtml(request.status || 'pending')}</p>
                        <p><span class="font-medium text-gray-900">Requested At:</span> ${escapeHtml(request.created_at || '')}</p>
                        <p><span class="font-medium text-gray-900">Message:</span></p>
                        <p class="rounded-lg border border-gray-200 bg-gray-50 p-3">${escapeHtml(request.message || 'No message provided.')}</p>
                    </div>
                    <div class="mt-5 flex items-center justify-end gap-2">
                        <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" data-cb-close>Close</button>
                        <button type="button" class="rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700" id="cb-student-message">Message</button>
                    </div>
                </div>
            </div>
        `;
        modalRoot.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        const closeModal = () => {
            modalRoot.classList.add('hidden');
            modalRoot.innerHTML = '';
            document.body.classList.remove('overflow-hidden');
        };
        modalRoot.querySelectorAll('[data-cb-close]').forEach((node) => node.addEventListener('click', closeModal));
        const messageBtn = document.getElementById('cb-student-message');
        if (messageBtn) {
            messageBtn.addEventListener('click', () => {
                closeModal();
                window.openMentorshipChat(request.id, request.student_name || 'Student', 'mentor');
            });
        }
    };

    window.openMentorshipScheduleModal = async function (requestId, studentName) {
        if (!ensureLoggedIn('mentor')) return;
        await openActionModal({
            title: 'Schedule Session',
            description: studentName ? `Set the next session with ${studentName}.` : 'Set next mentorship session.',
            submitLabel: 'Save Schedule',
            fields: [
                { name: 'session_date', label: 'Session Date', required: true, placeholder: 'YYYY-MM-DD' },
                { name: 'session_time', label: 'Session Time', required: true, placeholder: 'e.g. 15:00' },
                { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Optional session notes' }
            ],
            onSubmit: async (values) => {
                const key = `mentor_schedule_${Number(router.user && router.user.id) || 0}`;
                const payload = {
                    requestId: Number(requestId),
                    studentName: studentName || 'Student',
                    sessionDate: values.session_date,
                    sessionTime: values.session_time,
                    notes: values.notes || '',
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem(key, JSON.stringify(payload));
                showToast('Session schedule saved.', 'success');
            }
        });
    };

    window.markMentorshipCompleted = async function (requestId) {
        if (!ensureLoggedIn('mentor')) return;
        if (!window.confirm('Mark this mentorship progress as completed?')) return;
        try {
            await postJSON(CONTENT_API, {
                action: 'update_mentorship_request_status',
                request_id: Number(requestId),
                status: 'completed'
            });
            await safeRefreshAndRender();
            showToast('Mentorship marked as completed.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to update mentorship progress.', 'error');
        }
    };

    window.openMentorAvailabilityModal = async function () {
        if (!ensureLoggedIn('mentor')) return;
        const key = `mentor_availability_${Number(router.user && router.user.id) || 0}`;
        const current = localStorage.getItem(key) || 'Available for mentorship';
        await openActionModal({
            title: 'Mentor Availability',
            submitLabel: 'Save',
            fields: [
                {
                    name: 'availability',
                    label: 'Availability',
                    type: 'select',
                    value: current,
                    options: ['Available for mentorship', 'Limited availability', 'Unavailable']
                }
            ],
            onSubmit: async (values) => {
                localStorage.setItem(key, values.availability || 'Available for mentorship');
                await safeRefreshAndRender();
                showToast('Availability updated.', 'success');
            }
        });
    };

    window.openMentorExpertiseModal = async function () {
        if (!ensureLoggedIn('mentor')) return;
        const key = `mentor_expertise_${Number(router.user && router.user.id) || 0}`;
        const current = localStorage.getItem(key) || '';
        await openActionModal({
            title: 'Expertise Areas',
            submitLabel: 'Save',
            fields: [
                {
                    name: 'expertise',
                    label: 'Expertise',
                    required: true,
                    minLength: 2,
                    placeholder: 'Example: System Design, Node.js, Databases',
                    value: current
                }
            ],
            onSubmit: async (values) => {
                localStorage.setItem(key, values.expertise || '');
                await safeRefreshAndRender();
                showToast('Expertise areas updated.', 'success');
            }
        });
    };

    window.openMentorNotificationModal = async function () {
        if (!ensureLoggedIn('mentor')) return;
        const key = `mentor_notify_${Number(router.user && router.user.id) || 0}`;
        const current = localStorage.getItem(key) || 'all';
        await openActionModal({
            title: 'Notification Preferences',
            submitLabel: 'Save',
            fields: [
                {
                    name: 'mode',
                    label: 'Notification Mode',
                    type: 'select',
                    value: current,
                    options: [
                        { value: 'all', label: 'All notifications' },
                        { value: 'important', label: 'Important only' },
                        { value: 'none', label: 'Mute notifications' }
                    ]
                }
            ],
            onSubmit: async (values) => {
                localStorage.setItem(key, values.mode || 'all');
                showToast('Notification preferences saved.', 'success');
            }
        });
    };

    window.viewBlogAnalytics = function () {
        if (!ensureLoggedIn()) return;
        const myBlogs = normalizeArray(router.dbData.myBlogs);
        const totalViews = myBlogs.reduce((sum, blog) => sum + (Number(blog.views) || 0), 0);
        const published = myBlogs.filter((blog) => String(blog.status || '').toLowerCase() === 'published').length;
        const pending = myBlogs.filter((blog) => String(blog.status || '').toLowerCase() === 'pending').length;
        const rejected = myBlogs.filter((blog) => String(blog.status || '').toLowerCase() === 'rejected').length;
        showToast(`Blogs: ${myBlogs.length} | Published: ${published} | Pending: ${pending} | Rejected: ${rejected} | Views: ${totalViews}`, 'info');
    };

    window.openMentorshipChat = function (requestId, targetName, role) {
        if (!ensureLoggedIn()) return;
        if (!requestId) {
            showToast('Unable to open chat — missing request ID.', 'error');
            return;
        }
        if (role === 'mentor') {
            router.navigate('/mentor/chat/' + requestId);
        } else {
            router.navigate('/student/chat/' + requestId);
        }
    };

    window.showFeatureNotice = function (message) {
        showToast(message || 'This action is not available yet.', 'info');
    };

    // ===== Category filter handler =====
    window.filterByCategory = function (category, containerSelector) {
        const container = document.querySelector(containerSelector || '.grid');
        if (!container) return;
        const cards = container.querySelectorAll('[data-category]');
        cards.forEach(card => {
            if (category === 'All' || card.getAttribute('data-category') === category) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
        // Update active state on category buttons
        const btns = document.querySelectorAll('.cb-cat-btn');
        btns.forEach(btn => {
            if (btn.textContent.trim() === category) {
                btn.className = btn.className.replace(/bg-gray-100 text-gray-700 hover:bg-gray-200/g, '').replace(/bg-primary-600 text-white/g, '') + ' bg-primary-600 text-white';
            } else {
                btn.className = btn.className.replace(/bg-primary-600 text-white/g, '') + ' bg-gray-100 text-gray-700 hover:bg-gray-200';
            }
        });
    };

    // ===== Search handler for community/blogs/mentors =====
    window.handlePageSearch = function (inputEl, containerSelector) {
        const query = (inputEl.value || '').toLowerCase().trim();
        const container = document.querySelector(containerSelector || '.space-y-4');
        if (!container) return;
        const items = container.querySelectorAll('[data-searchable]');
        let visible = 0;
        items.forEach(item => {
            const text = (item.getAttribute('data-searchable') || item.textContent || '').toLowerCase();
            if (!query || text.includes(query)) {
                item.style.display = '';
                visible++;
            } else {
                item.style.display = 'none';
            }
        });
    };

    // ===== Vote handler (UX only – no backend endpoint) =====
    window.voteQuestion = function (questionId, direction) {
        const counter = document.getElementById('vote-count-' + questionId);
        if (!counter) {
            showToast('Vote registered.', 'success');
            return;
        }
        let current = parseInt(counter.textContent, 10) || 0;
        current += direction === 'up' ? 1 : -1;
        counter.textContent = current;
        showToast(direction === 'up' ? 'Upvoted!' : 'Downvoted!', 'success');
    };

    // ===== Share handler =====
    window.shareBlog = function (blogId) {
        const url = window.location.origin + (window.APP_BASE_PATH || '/community-blogs-php/') + '#/blogs/' + blogId;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                showToast('Blog link copied to clipboard!', 'success');
            }).catch(() => {
                showToast('Could not copy link. URL: ' + url, 'info');
            });
        } else {
            showToast('Blog URL: ' + url, 'info');
        }
    };

    // ===== Like handler (UX only) =====
    window.likeBlog = function (blogId) {
        const likeBtn = document.getElementById('like-count-' + blogId);
        if (likeBtn) {
            let c = parseInt(likeBtn.textContent, 10) || 0;
            likeBtn.textContent = c + 1;
        }
        showToast('You liked this blog!', 'success');
    };

    // ===== Sort handler =====
    window.handleSortChange = function (selectEl, containerSelector) {
        showToast('Sorted by: ' + selectEl.value, 'info');
    };

    // ===== Chat Engine =====
    let _chatPollTimer = null;

    function _stopChatPolling() {
        if (_chatPollTimer) {
            clearInterval(_chatPollTimer);
            _chatPollTimer = null;
        }
    }

    function _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function _formatChatTime(dateStr) {
        try {
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            const now = new Date();
            const isToday = d.toDateString() === now.toDateString();
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (isToday) return timeStr;
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
        } catch (e) {
            return dateStr;
        }
    }

    function _renderChatMessages(messages, currentUserId, role) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="flex justify-center"><span class="px-4 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">No messages yet. Start the conversation!</span></div>';
            return;
        }

        const isMine = (msg) => {
            return Number(msg.sender_id) === Number(currentUserId);
        };
        const myBubbleColor = role === 'mentor' ? 'bg-success-600 text-white rounded-br-none' : 'bg-primary-600 text-white rounded-br-none';
        const myTimeColor = role === 'mentor' ? 'text-success-200' : 'text-primary-200';

        let html = '';
        let lastDate = '';
        messages.forEach(msg => {
            // Date separator
            try {
                const d = new Date(msg.created_at);
                const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                if (dateStr !== lastDate) {
                    html += '<div class="flex justify-center"><span class="px-4 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">' + _escapeHtml(dateStr) + '</span></div>';
                    lastDate = dateStr;
                }
            } catch (e) { /* skip date separator */ }

            const mine = isMine(msg);
            const avatar = (msg.sender_name || 'U').charAt(0).toUpperCase();
            const avatarGrad = mine ? '' : (role === 'mentor'
                ? '<div class="h-8 w-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0"><span class="text-sm font-bold text-primary-700">' + _escapeHtml(avatar) + '</span></div>'
                : '<div class="h-8 w-8 rounded-full bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center flex-shrink-0"><span class="text-sm font-bold text-success-700">' + _escapeHtml(avatar) + '</span></div>');

            html += '<div class="flex ' + (mine ? 'justify-end' : 'justify-start') + '">';
            html += '<div class="flex max-w-[85%] md:max-w-[70%] ' + (mine ? 'flex-row-reverse' : 'flex-row') + ' items-end space-x-2">';
            html += avatarGrad;
            html += '<div class="px-4 py-2 rounded-2xl ' + (mine ? myBubbleColor : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none') + '">';
            html += '<p class="text-sm whitespace-pre-wrap">' + _escapeHtml(msg.message) + '</p>';
            html += '<div class="flex items-center justify-end mt-1 space-x-1 ' + (mine ? myTimeColor : 'text-gray-400') + '">';
            html += '<span class="text-xs">' + _formatChatTime(msg.created_at) + '</span>';
            html += '</div></div></div></div>';
        });

        container.innerHTML = html;

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async function _fetchAndRenderChat(requestId, role) {
        try {
            const resp = await postJSON(CONTENT_API, { action: 'get_messages', request_id: Number(requestId) });

            const messages = resp.messages || [];
            const request = resp.request || {};
            const userId = Number(resp.current_user_id || (router.user && router.user.id) || 0);

            // Update header info
            const partnerName = role === 'student' ? (request.mentor_name || 'Mentor') : (request.student_name || 'Student');
            const nameEl = document.getElementById('chatPartnerName');
            if (nameEl) nameEl.textContent = partnerName;
            const roleEl = document.getElementById('chatPartnerRole');
            if (roleEl) roleEl.textContent = role === 'student' ? 'Mentor' : 'Student';
            const avatarEl = document.getElementById('chatPartnerAvatar');
            if (avatarEl) {
                const initial = partnerName.charAt(0).toUpperCase();
                const grad = role === 'student' ? 'from-success-100 to-success-200' : 'from-primary-100 to-primary-200';
                const txtColor = role === 'student' ? 'text-success-700' : 'text-primary-700';
                avatarEl.innerHTML = '<span class="text-xl font-bold ' + txtColor + '">' + _escapeHtml(initial) + '</span>';
                avatarEl.className = 'h-12 w-12 rounded-full bg-gradient-to-br ' + grad + ' flex items-center justify-center';
            }
            // Sidebar (mentor view)
            const sidebarNameEl = document.getElementById('sidebarName');
            if (sidebarNameEl) sidebarNameEl.textContent = partnerName;
            const sidebarRoleEl = document.getElementById('sidebarRole');
            if (sidebarRoleEl) sidebarRoleEl.textContent = role === 'student' ? 'Mentor' : 'Student';
            const sidebarAvatarEl = document.getElementById('sidebarAvatar');
            if (sidebarAvatarEl) {
                const initial = partnerName.charAt(0).toUpperCase();
                sidebarAvatarEl.innerHTML = '<span class="text-3xl font-bold text-primary-700">' + _escapeHtml(initial) + '</span>';
            }

            _renderChatMessages(messages, userId, role);
        } catch (e) {
            console.error('Chat fetch error:', e);
            const container = document.getElementById('chatMessages');
            if (container) {
                container.innerHTML = '<div class="flex justify-center"><span class="px-4 py-1 bg-red-200 text-red-700 text-xs rounded-full">' + _escapeHtml(e.message || 'Failed to load messages') + '</span></div>';
            }
            _stopChatPolling();
        }
    }

    function _initChat() {
        const container = document.getElementById('chatContainer');
        if (!container) {
            _stopChatPolling();
            return;
        }
        const requestId = container.getAttribute('data-request-id');
        const role = container.getAttribute('data-role');
        if (!requestId || !role) return;

        // Already polling for this exact chat instance?
        if (_chatPollTimer && container.getAttribute('data-polling') === '1') return;

        // Stop any previous timer before starting a new one
        _stopChatPolling();
        container.setAttribute('data-polling', '1');

        // Initial fetch
        _fetchAndRenderChat(requestId, role);

        // Poll every 2 seconds
        _chatPollTimer = setInterval(() => {
            // If we navigated away, clean up
            if (!document.getElementById('chatContainer')) {
                _stopChatPolling();
                return;
            }
            _fetchAndRenderChat(requestId, role);
        }, 2000);
    }

    window.sendChatMessage = async function () {
        const container = document.getElementById('chatContainer');
        if (!container) return;
        const requestId = container.getAttribute('data-request-id');
        const role = container.getAttribute('data-role');
        const input = document.getElementById('chatInput');
        if (!input) return;
        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        input.disabled = true;

        try {
            await postJSON(CONTENT_API, {
                action: 'send_message',
                request_id: Number(requestId),
                message: message,
            });
            // Immediately fetch to show the new message
            await _fetchAndRenderChat(requestId, role);
        } catch (e) {
            showToast('Failed to send message.', 'error');
            input.value = message;
        } finally {
            input.disabled = false;
            input.focus();
        }
    };

    // ===== wirePassiveButtons enhancements =====
    // Extend the existing render pipeline to add extra button wiring
    const _renderBefore = router.render.bind(router);
    router.render = function () {
        // Stop chat polling if navigating away from chat
        if (!document.getElementById('chatContainer')) {
            _stopChatPolling();
        }
        _renderBefore();
        // Initialize chat if on a chat page
        _initChat();
        // Wire additional passive buttons after the base render & wirePassiveButtons have run
        document.querySelectorAll('button').forEach(btn => {
            const txt = (btn.textContent || '').trim();
            if (txt === 'Login to Comment' && !btn.getAttribute('data-wired2')) {
                btn.setAttribute('data-wired2', '1');
                btn.addEventListener('click', () => {
                    if (typeof openAuthModal === 'function') openAuthModal('login');
                    else showToast('Please log in to comment.', 'info');
                });
            }
            // Wire chat quick actions
            if (['Schedule Session', 'Call Student', 'View Profile'].includes(txt) && !btn.getAttribute('data-wired2')) {
                btn.setAttribute('data-wired2', '1');
                btn.addEventListener('click', () => showFeatureNotice(txt + ' – Coming soon.'));
            }
        });
    };

})();
