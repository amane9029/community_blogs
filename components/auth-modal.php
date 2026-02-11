<?php
// Auth modal — registration step state (login errors now handled via JS/AJAX)
$auth_step = $_SESSION['auth_step'] ?? 'role-selection';
$selected_role = $_SESSION['selected_role'] ?? '';
?>

<!-- Auth Modal - Multi-step Registration / Login -->
<div id="authModal" class="hidden fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen px-4 py-6 sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" aria-hidden="true" onclick="closeAuthModal()"></div>

        <div class="relative w-full sm:max-w-lg mx-auto transform transition-all">
            <!-- Modal Card -->
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 relative">
                <!-- Close Button -->
                <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition" onclick="closeAuthModal()">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <!-- ============================================ -->
                <!-- MODE: LOGIN (shown when user clicks "Login") -->
                <!-- ============================================ -->
                <div id="mode-login" class="auth-mode hidden">
                    <div class="text-center mb-6">
                        <div class="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-primary-100 mb-4">
                            <svg class="h-7 w-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                                <polyline points="10 17 15 12 10 7"/>
                                <line x1="15" x2="3" y1="12" y2="12"/>
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900">Welcome Back</h3>
                        <p class="text-sm text-gray-500 mt-1">Sign in to your account</p>
                    </div>

                    <form id="loginForm" onsubmit="event.preventDefault(); submitLogin();" class="space-y-4" novalidate>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                    </svg>
                                </div>
                                <input type="email" id="login-email" required
                                    class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                    placeholder="you@example.com">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </div>
                                <input type="password" id="login-password" required
                                    class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
                            </div>
                        </div>

                        <!-- Error display (populated by JS) -->
                        <div id="login-error" class="hidden rounded-xl bg-red-50 border border-red-200 p-3">
                            <div class="flex items-center">
                                <svg class="h-4 w-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" x2="12" y1="8" y2="12"/>
                                    <line x1="12" x2="12.01" y1="16" y2="16"/>
                                </svg>
                                <p id="login-error-text" class="ml-2 text-sm text-red-700"></p>
                            </div>
                        </div>

                        <button type="submit" id="login-submit-btn" class="w-full py-2.5 px-4 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition inline-flex items-center justify-center">
                            Sign In
                        </button>
                    </form>

                    <p class="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?
                        <button onclick="openRegisterFlow()" class="font-semibold text-primary-600 hover:text-primary-700 transition">Register</button>
                    </p>
                </div>

                <!-- ================================================= -->
                <!-- MODE: REGISTER (multi-step registration)           -->
                <!-- ================================================= -->
                <div id="mode-register" class="auth-mode hidden">

                    <!-- Progress Indicator (hidden on role-selection) -->
                    <div id="reg-progress" class="hidden mb-8">
                        <div class="flex items-center justify-center">
                            <!-- Step 1 indicator -->
                            <div class="flex items-center">
                                <div id="prog-step1" class="flex items-center justify-center h-8 w-8 rounded-full bg-primary-600 text-white text-sm font-bold transition-all">1</div>
                                <span id="prog-label1" class="ml-2 text-sm font-medium text-primary-700 hidden sm:inline">Details</span>
                            </div>
                            <!-- Connector -->
                            <div class="mx-3 sm:mx-4 h-0.5 w-10 sm:w-16 rounded-full bg-gray-200 overflow-hidden">
                                <div id="prog-bar" class="h-full bg-primary-600 transition-all duration-500" style="width:0%"></div>
                            </div>
                            <!-- Step 2 indicator -->
                            <div class="flex items-center">
                                <div id="prog-step2" class="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-500 text-sm font-bold transition-all">2</div>
                                <span id="prog-label2" class="ml-2 text-sm font-medium text-gray-400 hidden sm:inline">Verify</span>
                            </div>
                        </div>
                    </div>

                    <!-- ===== STEP: Role Selection ===== -->
                    <div id="reg-step-role" class="reg-step">
                        <div class="text-center mb-8">
                            <div class="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-primary-100 mb-4">
                                <svg class="h-7 w-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900">Create an Account</h3>
                            <p class="text-sm text-gray-500 mt-1">Choose your role to get started</p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <!-- Student Card -->
                            <button onclick="selectRegRole('student')" class="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 text-center hover:border-primary-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all">
                                <div class="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-primary-50 group-hover:bg-primary-100 transition mb-3">
                                    <svg class="h-7 w-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                    </svg>
                                </div>
                                <p class="text-sm font-semibold text-gray-900">Student</p>
                                <p class="text-xs text-gray-500 mt-1">Learn, connect & grow</p>
                            </button>

                            <!-- Mentor Card -->
                            <button onclick="selectRegRole('mentor')" class="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 text-center hover:border-primary-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all">
                                <div class="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-primary-50 group-hover:bg-primary-100 transition mb-3">
                                    <svg class="h-7 w-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                </div>
                                <p class="text-sm font-semibold text-gray-900">Mentor</p>
                                <p class="text-xs text-gray-500 mt-1">Guide & inspire</p>
                            </button>
                        </div>

                        <p class="text-center text-sm text-gray-500 mt-6">
                            Already have an account?
                            <button onclick="openLoginFlow()" class="font-semibold text-primary-600 hover:text-primary-700 transition">Sign In</button>
                        </p>
                    </div>

                    <!-- ===== STEP: Student Step 1 — Details ===== -->
                    <div id="reg-step-student-1" class="reg-step hidden">
                        <div class="text-center mb-6">
                            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-3">
                                <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">Student Registration</h3>
                            <p class="text-sm text-gray-500 mt-1">Step 1 of 2 — Enter your college details</p>
                        </div>

                        <form id="studentStep1Form" onsubmit="event.preventDefault(); validateStudentStep1();" class="space-y-4" novalidate>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Full Name <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <input type="text" id="stu-name" required
                                        class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                        placeholder="e.g., John Doe">
                                </div>
                                <p id="stu-name-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Roll Number <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                        </svg>
                                    </div>
                                    <input type="text" id="stu-roll" required
                                        class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                        placeholder="e.g., CS2023001">
                                </div>
                                <p id="stu-roll-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">College Email <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                        </svg>
                                    </div>
                                    <input type="email" id="stu-email" required
                                        class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                        placeholder="your.name@college.edu">
                                </div>
                                <p class="mt-1 text-xs text-gray-500">Use your official college email address</p>
                                <p id="stu-email-err" class="mt-0.5 text-xs text-red-500 hidden"></p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Password <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                    </div>
                                    <input type="password" id="stu-password" required minlength="6"
                                        class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                        placeholder="Min. 6 characters">
                                </div>
                                <p id="stu-password-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <div class="flex space-x-3 pt-2">
                                <button type="button" onclick="regGoBack('role')" class="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition">
                                    Back
                                </button>
                                <button type="submit" class="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition inline-flex items-center justify-center">
                                    Next
                                    <svg class="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- ===== STEP: Student Step 2 — ID Upload ===== -->
                    <div id="reg-step-student-2" class="reg-step hidden">
                        <div class="text-center mb-6">
                            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-3">
                                <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" x2="12" y1="3" y2="15"/>
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">Upload College ID</h3>
                            <p class="text-sm text-gray-500 mt-1">Step 2 of 2 — Verify your student identity</p>
                        </div>

                        <form id="studentStep2Form" onsubmit="event.preventDefault(); submitStudentRegistration();" class="space-y-4" novalidate>
                            <!-- File Upload Area -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">College ID Card <span class="text-red-500">*</span></label>
                                <div id="stu-upload-zone" class="relative border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
                                     onclick="document.getElementById('stu-id-file').click()"
                                     ondragover="event.preventDefault(); this.classList.add('border-primary-500','bg-primary-50')"
                                     ondragleave="this.classList.remove('border-primary-500','bg-primary-50')"
                                     ondrop="event.preventDefault(); this.classList.remove('border-primary-500','bg-primary-50'); handleFileDrop(event, 'student')">
                                    
                                    <!-- Default state -->
                                    <div id="stu-upload-placeholder">
                                        <svg class="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="17 8 12 3 7 8"/>
                                            <line x1="12" x2="12" y1="3" y2="15"/>
                                        </svg>
                                        <p class="mt-2 text-sm text-gray-600"><span class="font-semibold text-primary-600">Click to upload</span> or drag and drop</p>
                                        <p class="mt-1 text-xs text-gray-400">PNG, JPG or PDF up to 5 MB</p>
                                    </div>

                                    <!-- Preview state -->
                                    <div id="stu-upload-preview" class="hidden">
                                        <img id="stu-preview-img" class="mx-auto max-h-32 rounded-xl object-contain mb-2" src="" alt="Preview">
                                        <div id="stu-preview-file" class="hidden items-center justify-center space-x-2 text-sm text-gray-700">
                                            <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                                <polyline points="14 2 14 8 20 8"/>
                                            </svg>
                                            <span id="stu-file-name"></span>
                                        </div>
                                        <button type="button" onclick="event.stopPropagation(); removeFile('student')" class="mt-2 inline-flex items-center text-xs text-red-500 hover:text-red-700 transition">
                                            <svg class="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Remove file
                                        </button>
                                    </div>

                                    <input type="file" id="stu-id-file" accept="image/*,.pdf" class="sr-only" onchange="handleFileSelect(this, 'student')">
                                </div>
                                <p id="stu-file-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <!-- Info box -->
                            <div class="bg-primary-50 border border-primary-200 rounded-xl p-4">
                                <div class="flex">
                                    <svg class="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" x2="12" y1="16" y2="12"/>
                                        <line x1="12" x2="12.01" y1="8" y2="8"/>
                                    </svg>
                                    <div class="ml-3">
                                        <p class="text-sm font-medium text-primary-800">Why do we need this?</p>
                                        <p class="text-xs text-primary-600 mt-0.5">Your college ID verifies your student status and keeps the community safe. Review takes up to 24 hours.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="flex space-x-3 pt-2">
                                <button type="button" onclick="regGoBack('student-1')" class="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition">
                                    Back
                                </button>
                                <button type="submit" class="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition inline-flex items-center justify-center">
                                    <svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                    Submit Registration
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- ===== STEP: Mentor Step 1 — Details ===== -->
                    <div id="reg-step-mentor-1" class="reg-step hidden">
                        <div class="text-center mb-6">
                            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-3">
                                <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">Mentor Registration</h3>
                            <p class="text-sm text-gray-500 mt-1">Step 1 of 2 — Enter your professional details</p>
                        </div>

                        <form id="mentorStep1Form" onsubmit="event.preventDefault(); validateMentorStep1();" class="space-y-4" novalidate>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Full Name <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <input type="text" id="mnt-name" required
                                        class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                        placeholder="e.g., Jane Smith">
                                </div>
                                <p id="mnt-name-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Professional Email <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                        </svg>
                                    </div>
                                    <input type="email" id="mnt-email" required
                                        class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                        placeholder="you@company.com">
                                </div>
                                <p id="mnt-email-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Password <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                    </div>
                                    <input type="password" id="mnt-password" required minlength="6"
                                        class="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                                        placeholder="Min. 6 characters">
                                </div>
                                <p id="mnt-password-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <div class="flex space-x-3 pt-2">
                                <button type="button" onclick="regGoBack('role')" class="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition">
                                    Back
                                </button>
                                <button type="submit" class="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition inline-flex items-center justify-center">
                                    Next
                                    <svg class="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- ===== STEP: Mentor Step 2 — ID Upload ===== -->
                    <div id="reg-step-mentor-2" class="reg-step hidden">
                        <div class="text-center mb-6">
                            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-3">
                                <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" x2="12" y1="3" y2="15"/>
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">Upload Company ID</h3>
                            <p class="text-sm text-gray-500 mt-1">Step 2 of 2 — Verify your professional identity</p>
                        </div>

                        <form id="mentorStep2Form" onsubmit="event.preventDefault(); submitMentorRegistration();" class="space-y-4" novalidate>
                            <!-- File Upload Area -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Job / Company ID Card <span class="text-red-500">*</span></label>
                                <div id="mnt-upload-zone" class="relative border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
                                     onclick="document.getElementById('mnt-id-file').click()"
                                     ondragover="event.preventDefault(); this.classList.add('border-primary-500','bg-primary-50')"
                                     ondragleave="this.classList.remove('border-primary-500','bg-primary-50')"
                                     ondrop="event.preventDefault(); this.classList.remove('border-primary-500','bg-primary-50'); handleFileDrop(event, 'mentor')">
                                    
                                    <!-- Default state -->
                                    <div id="mnt-upload-placeholder">
                                        <svg class="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="17 8 12 3 7 8"/>
                                            <line x1="12" x2="12" y1="3" y2="15"/>
                                        </svg>
                                        <p class="mt-2 text-sm text-gray-600"><span class="font-semibold text-primary-600">Click to upload</span> or drag and drop</p>
                                        <p class="mt-1 text-xs text-gray-400">PNG, JPG or PDF up to 5 MB</p>
                                    </div>

                                    <!-- Preview state -->
                                    <div id="mnt-upload-preview" class="hidden">
                                        <img id="mnt-preview-img" class="mx-auto max-h-32 rounded-xl object-contain mb-2" src="" alt="Preview">
                                        <div id="mnt-preview-file" class="hidden items-center justify-center space-x-2 text-sm text-gray-700">
                                            <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                                <polyline points="14 2 14 8 20 8"/>
                                            </svg>
                                            <span id="mnt-file-name"></span>
                                        </div>
                                        <button type="button" onclick="event.stopPropagation(); removeFile('mentor')" class="mt-2 inline-flex items-center text-xs text-red-500 hover:text-red-700 transition">
                                            <svg class="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                            Remove file
                                        </button>
                                    </div>

                                    <input type="file" id="mnt-id-file" accept="image/*,.pdf" class="sr-only" onchange="handleFileSelect(this, 'mentor')">
                                </div>
                                <p id="mnt-file-err" class="mt-1 text-xs text-red-500 hidden"></p>
                            </div>

                            <!-- Info box -->
                            <div class="bg-primary-50 border border-primary-200 rounded-xl p-4">
                                <div class="flex">
                                    <svg class="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="12" x2="12" y1="16" y2="12"/>
                                        <line x1="12" x2="12.01" y1="8" y2="8"/>
                                    </svg>
                                    <div class="ml-3">
                                        <p class="text-sm font-medium text-primary-800">Why do we need this?</p>
                                        <p class="text-xs text-primary-600 mt-0.5">Your company ID verifies your professional credentials and builds trust with students. Review takes up to 24 hours.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="flex space-x-3 pt-2">
                                <button type="button" onclick="regGoBack('mentor-1')" class="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition">
                                    Back
                                </button>
                                <button type="submit" class="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition inline-flex items-center justify-center">
                                    <svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                    Submit Registration
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- ===== STEP: Registration Success ===== -->
                    <div id="reg-step-success" class="reg-step hidden">
                        <div class="text-center py-4">
                            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 mb-4">
                                <svg class="h-8 w-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900">Registration Submitted!</h3>
                            <p class="text-sm text-gray-500 mt-2 max-w-xs mx-auto">Your account has been created. Our team will verify your ID within 24 hours. You can now sign in with your credentials.</p>
                            <button onclick="openLoginFlow()" class="mt-6 w-full py-2.5 px-4 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition">
                                Continue to Sign In
                            </button>
                        </div>
                    </div>

                </div><!-- /mode-register -->
            </div><!-- /Modal Card -->
        </div>
    </div>
</div>
