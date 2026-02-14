// =============================================
// Auth Modal — Multi-step Registration & Login
// =============================================

const MODAL_APP_BASE_PATH = (window.APP_BASE_PATH || '/community-blogs-php/').toString();
const MODAL_BASE_PATH = MODAL_APP_BASE_PATH.endsWith('/') ? MODAL_APP_BASE_PATH : `${MODAL_APP_BASE_PATH}/`;
const MODAL_AUTH_API = `${MODAL_BASE_PATH}api/auth.php`;
const MODAL_REGISTER_API = `${MODAL_BASE_PATH}api/register.php`;

let currentRegRole = '';       // 'student' | 'mentor'
let studentFile = null;
let mentorFile = null;

function setButtonLoading(btn, isLoading, loadingText, idleText) {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>' + (loadingText || 'Processing...');
        return;
    }
    btn.disabled = false;
    if (idleText) {
        btn.textContent = idleText;
    }
}

// ------- Open / Close -------

function openAuthModal() {
    // Default: show login
    openLoginFlow();
    document.getElementById('authModal').classList.remove('hidden');
}

function openLoginFlow() {
    hideAllModes();
    document.getElementById('mode-login').classList.remove('hidden');
    document.getElementById('authModal').classList.remove('hidden');
}

function openRegisterFlow() {
    hideAllModes();
    document.getElementById('mode-register').classList.remove('hidden');
    showRegStep('role');
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    // Reset forms after close animation
    setTimeout(resetAllForms, 300);
}

function hideAllModes() {
    document.querySelectorAll('.auth-mode').forEach(m => m.classList.add('hidden'));
}

// ------- Unified Login (AJAX) -------

function fillDemoCredentials(email, password) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password || '123456';
    // Hide any previous error
    document.getElementById('login-error').classList.add('hidden');
}

async function submitLogin() {
    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    const errBox  = document.getElementById('login-error');
    const errText = document.getElementById('login-error-text');
    const btn     = document.getElementById('login-submit-btn');

    // Reset error
    errBox.classList.add('hidden');

    const email    = emailEl.value.trim();
    const password = passEl.value;

    // Client-side validation
    if (!email || !password) {
        errText.textContent = 'Please enter both email and password.';
        errBox.classList.remove('hidden');
        return;
    }
    if (!isValidEmail(email)) {
        errText.textContent = 'Please enter a valid email address.';
        errBox.classList.remove('hidden');
        return;
    }
    if (password.length < 6) {
        errText.textContent = 'Password must be at least 6 characters.';
        errBox.classList.remove('hidden');
        return;
    }

    // Disable button while loading
    setButtonLoading(btn, true, 'Signing in...');

    try {
        const res = await fetch(MODAL_AUTH_API, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password })
        });

        const data = await res.json();

        if (data.success) {
            // Store user in localStorage for the SPA router
            localStorage.setItem('demo_user', JSON.stringify(data.user));
            router.user = data.user;
            if (typeof refreshDbData === 'function') {
                await refreshDbData(true);
            }
            closeAuthModal();
            router.navigate(data.redirect);
        } else {
            errText.textContent = data.error || 'Login failed. Please try again.';
            errBox.classList.remove('hidden');
        }
    } catch (err) {
        errText.textContent = 'Network error. Please try again.';
        errBox.classList.remove('hidden');
    } finally {
        setButtonLoading(btn, false, '', 'Sign In');
    }
}

// ------- Registration step navigation -------

function selectRegRole(role) {
    currentRegRole = role;
    if (role === 'student') {
        showRegStep('student-1');
    } else {
        showRegStep('mentor-1');
    }
}

function showRegStep(step) {
    // Hide all reg steps
    document.querySelectorAll('.reg-step').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('reg-step-' + step);
    if (target) target.classList.remove('hidden');

    // Progress indicator visibility & state
    const progress = document.getElementById('reg-progress');
    const isFormStep = ['student-1', 'student-2', 'mentor-1', 'mentor-2'].includes(step);
    progress.classList.toggle('hidden', !isFormStep);

    if (isFormStep) {
        updateProgress(step);
    }
}

function updateProgress(step) {
    const step1El  = document.getElementById('prog-step1');
    const step2El  = document.getElementById('prog-step2');
    const label1   = document.getElementById('prog-label1');
    const label2   = document.getElementById('prog-label2');
    const bar      = document.getElementById('prog-bar');

    const isStep2 = step.endsWith('-2');

    // Step 1 circle
    if (isStep2) {
        step1El.className = 'flex items-center justify-center h-8 w-8 rounded-full bg-success-500 text-white text-sm font-bold transition-all';
        step1El.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
        label1.className  = 'ml-2 text-sm font-medium text-success-600 hidden sm:inline';
    } else {
        step1El.className = 'flex items-center justify-center h-8 w-8 rounded-full bg-primary-600 text-white text-sm font-bold transition-all';
        step1El.textContent = '1';
        label1.className  = 'ml-2 text-sm font-medium text-primary-700 hidden sm:inline';
    }

    // Step 2 circle
    if (isStep2) {
        step2El.className = 'flex items-center justify-center h-8 w-8 rounded-full bg-primary-600 text-white text-sm font-bold transition-all';
        label2.className  = 'ml-2 text-sm font-medium text-primary-700 hidden sm:inline';
    } else {
        step2El.className = 'flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-500 text-sm font-bold transition-all';
        label2.className  = 'ml-2 text-sm font-medium text-gray-400 hidden sm:inline';
    }
    step2El.textContent = '2';

    // Progress bar
    bar.style.width = isStep2 ? '100%' : '0%';
}

function regGoBack(target) {
    showRegStep(target);
}

// ------- Validation helpers -------

function showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideFieldError(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function markInputError(input) {
    input.classList.remove('border-gray-300');
    input.classList.add('border-red-400', 'ring-1', 'ring-red-400');
}
function clearInputError(input) {
    input.classList.remove('border-red-400', 'ring-1', 'ring-red-400');
    input.classList.add('border-gray-300');
}

// ------- Student Step 1 validation -------

function validateStudentStep1() {
    let valid = true;
    const name  = document.getElementById('stu-name');
    const roll  = document.getElementById('stu-roll');
    const email = document.getElementById('stu-email');
    const pass  = document.getElementById('stu-password');

    // Name
    hideFieldError('stu-name-err');
    clearInputError(name);
    if (!name.value.trim()) {
        showFieldError('stu-name-err', 'Full name is required.');
        markInputError(name);
        valid = false;
    } else if (name.value.trim().length < 2) {
        showFieldError('stu-name-err', 'Name must be at least 2 characters.');
        markInputError(name);
        valid = false;
    }

    // Roll
    hideFieldError('stu-roll-err');
    clearInputError(roll);
    if (!roll.value.trim()) {
        showFieldError('stu-roll-err', 'Roll number is required.');
        markInputError(roll);
        valid = false;
    }

    // Email
    hideFieldError('stu-email-err');
    clearInputError(email);
    if (!email.value.trim()) {
        showFieldError('stu-email-err', 'Email is required.');
        markInputError(email);
        valid = false;
    } else if (!isValidEmail(email.value.trim())) {
        showFieldError('stu-email-err', 'Please enter a valid email address.');
        markInputError(email);
        valid = false;
    }

    // Password
    hideFieldError('stu-password-err');
    clearInputError(pass);
    if (!pass.value) {
        showFieldError('stu-password-err', 'Password is required.');
        markInputError(pass);
        valid = false;
    } else if (pass.value.length < 6) {
        showFieldError('stu-password-err', 'Password must be at least 6 characters.');
        markInputError(pass);
        valid = false;
    }

    if (valid) {
        showRegStep('student-2');
    }
}

// ------- Mentor Step 1 validation -------

function validateMentorStep1() {
    let valid = true;
    const name  = document.getElementById('mnt-name');
    const email = document.getElementById('mnt-email');
    const pass  = document.getElementById('mnt-password');

    // Name
    hideFieldError('mnt-name-err');
    clearInputError(name);
    if (!name.value.trim()) {
        showFieldError('mnt-name-err', 'Full name is required.');
        markInputError(name);
        valid = false;
    } else if (name.value.trim().length < 2) {
        showFieldError('mnt-name-err', 'Name must be at least 2 characters.');
        markInputError(name);
        valid = false;
    }

    hideFieldError('mnt-email-err');
    clearInputError(email);
    if (!email.value.trim()) {
        showFieldError('mnt-email-err', 'Email is required.');
        markInputError(email);
        valid = false;
    } else if (!isValidEmail(email.value.trim())) {
        showFieldError('mnt-email-err', 'Please enter a valid email address.');
        markInputError(email);
        valid = false;
    }

    hideFieldError('mnt-password-err');
    clearInputError(pass);
    if (!pass.value) {
        showFieldError('mnt-password-err', 'Password is required.');
        markInputError(pass);
        valid = false;
    } else if (pass.value.length < 6) {
        showFieldError('mnt-password-err', 'Password must be at least 6 characters.');
        markInputError(pass);
        valid = false;
    }

    if (valid) {
        showRegStep('mentor-2');
    }
}

// ------- File upload handling -------

function handleFileSelect(input, role) {
    if (input.files && input.files[0]) {
        processFile(input.files[0], role);
    }
}

function handleFileDrop(event, role) {
    const files = event.dataTransfer.files;
    if (files && files[0]) {
        processFile(files[0], role);
        // Also set on the hidden input so the form has it
        const inputId = role === 'student' ? 'stu-id-file' : 'mnt-id-file';
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        document.getElementById(inputId).files = dt.files;
    }
}

function processFile(file, role) {
    const maxSize = 5 * 1024 * 1024; // 5 MB
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    const errId = role === 'student' ? 'stu-file-err' : 'mnt-file-err';

    hideFieldError(errId);

    if (!allowed.includes(file.type)) {
        showFieldError(errId, 'Only PNG, JPG, or PDF files are allowed.');
        return;
    }
    if (file.size > maxSize) {
        showFieldError(errId, 'File size must be less than 5 MB.');
        return;
    }

    // Store reference
    if (role === 'student') studentFile = file;
    else mentorFile = file;

    // Show preview
    const prefix = role === 'student' ? 'stu' : 'mnt';
    document.getElementById(prefix + '-upload-placeholder').classList.add('hidden');
    document.getElementById(prefix + '-upload-preview').classList.remove('hidden');

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(prefix + '-preview-img');
            img.src = e.target.result;
            img.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        document.getElementById(prefix + '-preview-file').classList.add('hidden');
    } else {
        // PDF — show file name
        document.getElementById(prefix + '-preview-img').classList.add('hidden');
        const fileDiv = document.getElementById(prefix + '-preview-file');
        fileDiv.classList.remove('hidden');
        fileDiv.classList.add('flex');
        document.getElementById(prefix + '-file-name').textContent = file.name;
    }
}

function removeFile(role) {
    const prefix = role === 'student' ? 'stu' : 'mnt';
    if (role === 'student') studentFile = null;
    else mentorFile = null;

    document.getElementById(prefix + '-id-file').value = '';
    document.getElementById(prefix + '-upload-preview').classList.add('hidden');
    document.getElementById(prefix + '-preview-img').src = '';
    document.getElementById(prefix + '-preview-img').classList.add('hidden');
    document.getElementById(prefix + '-preview-file').classList.add('hidden');
    document.getElementById(prefix + '-upload-placeholder').classList.remove('hidden');
}

// ------- Submit registration -------

async function submitStudentRegistration() {
    hideFieldError('stu-file-err');
    if (!studentFile) {
        showFieldError('stu-file-err', 'Please upload your College ID card.');
        return;
    }

    const name = document.getElementById('stu-name').value.trim();
    const roll = document.getElementById('stu-roll').value.trim();
    const email = document.getElementById('stu-email').value.trim();
    const password = document.getElementById('stu-password').value;

    const formData = new FormData();
    formData.append('role', 'student');
    formData.append('name', name);
    formData.append('roll_number', roll);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('id_file', studentFile);

    const submitBtn = document.querySelector('#studentStep2Form button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Submitting...');

    try {
        const res = await fetch(MODAL_REGISTER_API, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showFieldError('stu-file-err', data.error || 'Registration failed. Please try again.');
            return;
        }
        showRegStep('success');
    } catch (_) {
        showFieldError('stu-file-err', 'Network error. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false, '', 'Submit Registration');
    }
}

async function submitMentorRegistration() {
    hideFieldError('mnt-file-err');
    if (!mentorFile) {
        showFieldError('mnt-file-err', 'Please upload your Job / Company ID card.');
        return;
    }

    const name = document.getElementById('mnt-name').value.trim();
    const email = document.getElementById('mnt-email').value.trim();
    const password = document.getElementById('mnt-password').value;

    const formData = new FormData();
    formData.append('role', 'mentor');
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('id_file', mentorFile);

    const submitBtn = document.querySelector('#mentorStep2Form button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Submitting...');

    try {
        const res = await fetch(MODAL_REGISTER_API, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showFieldError('mnt-file-err', data.error || 'Registration failed. Please try again.');
            return;
        }
        showRegStep('success');
    } catch (_) {
        showFieldError('mnt-file-err', 'Network error. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false, '', 'Submit Registration');
    }
}

// ------- Reset -------

function resetAllForms() {
    // Reset login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    const loginErr = document.getElementById('login-error');
    if (loginErr) loginErr.classList.add('hidden');

    // Reset text inputs
    ['stu-name', 'stu-roll', 'stu-email', 'stu-password', 'mnt-name', 'mnt-email', 'mnt-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; clearInputError(el); }
    });

    // Reset error messages
    ['stu-name-err', 'stu-roll-err', 'stu-email-err', 'stu-password-err', 'mnt-name-err', 'mnt-email-err', 'mnt-password-err', 'stu-file-err', 'mnt-file-err'].forEach(hideFieldError);

    // Reset file uploads
    removeFile('student');
    removeFile('mentor');

    currentRegRole = '';
}

// ------- Keyboard / outside-click -------

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeAuthModal();
    }
});

