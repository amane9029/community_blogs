<?php
// Session Management for Authentication
// This file handles user login, logout, and session state

// Configure secure session settings before starting session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.use_strict_mode', 1);
    ini_set('session.gc_maxlifetime', 3600); // 1 hour
    session_start();
}

// Include configuration and repository
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/repository.php';

/**
 * Generate CSRF token
 */
function generateCSRFToken()
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token
 */
function validateCSRFToken($token)
{
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Login user with email and password (database only)
 */
function login($email, $password)
{
    try {
        $user = repo_fetch_user_by_email($email);
    } catch (Throwable $e) {
        error_log('login user lookup failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Authentication service unavailable. Please try again later.'];
    }

    if (!$user) {
        return ['success' => false, 'error' => 'Invalid email or password'];
    }

    $storedPassword = $user['password'] ?? '';
    $passwordValid = is_string($storedPassword) && $storedPassword !== '' && password_verify($password, $storedPassword);

    if (!$passwordValid) {
        return ['success' => false, 'error' => 'Invalid email or password'];
    }

    if (($user['status'] ?? 'inactive') !== 'active') {
        return ['success' => false, 'error' => 'Your account is inactive. Please contact support.'];
    }
    if ((int) ($user['is_email_verified'] ?? 0) !== 1) {
        return ['success' => false, 'error' => 'Please verify your email before signing in.'];
    }
    if (($user['verification_status'] ?? 'pending') !== 'approved') {
        return ['success' => false, 'error' => 'Your account is pending admin approval.'];
    }

    // Regenerate session ID to prevent session fixation
    session_regenerate_id(true);
    
    // Store user info in session (exclude password)
    $_SESSION['user'] = [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'avatar' => $user['avatar'] ?? null
    ];
    
    // Generate CSRF token for this session
    generateCSRFToken();
    
    return ['success' => true];
}

/**
 * Logout current user
 */
function logout()
{
    unset($_SESSION['user']);
    session_destroy();
}

/**
 * Check if user is logged in
 */
function isLoggedIn()
{
    return isset($_SESSION['user']);
}

/**
 * Get current logged-in user
 */
if (!function_exists('getCurrentUser')) {
    function getCurrentUser()
    {
        return $_SESSION['user'] ?? null;
    }
}

/**
 * Check if current user has specific role
 */
function hasRole($role)
{
    $user = getCurrentUser();
    return $user && $user['role'] === $role;
}

/**
 * Require login - redirect to home if not logged in
 */
function requireLogin()
{
    if (!isLoggedIn()) {
        header('Location: ' . BASE_URL);
        exit;
    }
}

/**
 * Require specific role - redirect if user doesn't have role
 */
function requireRole($role)
{
    requireLogin();
    if (!hasRole($role)) {
        header('Location: ' . BASE_URL);
        exit;
    }
}

/**
 * Handle login form submission
 * Note: AJAX auth is handled by api/auth.php
 * This legacy POST handler is kept for non-JS form submissions.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    // Validate CSRF token for all POST requests
    if (!isset($_POST['csrf_token']) || !validateCSRFToken($_POST['csrf_token'])) {
        $_SESSION['auth_error'] = 'Invalid request. Please try again.';
        header('Location: ' . BASE_URL);
        exit;
    }
    
    if ($_POST['action'] === 'login') {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $result = login($email, $password);

        if ($result['success']) {
            $user = getCurrentUser();
            header('Location: ' . BASE_URL . '?page=' . $user['role'] . '/dashboard');
            exit;
        } else {
            $_SESSION['auth_error'] = $result['error'];
            header('Location: ' . BASE_URL);
            exit;
        }
    } elseif ($_POST['action'] === 'logout') {
        logout();
        header('Location: ' . BASE_URL);
        exit;
    }
}
