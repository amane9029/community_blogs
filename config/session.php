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

// Include configuration and mock data (mock-data still used for blogs / questions / mentors)
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mock-data.php';

/**
 * Read users from JSON file.
 * Future: swap this for a real DB query.
 */
function getUserByEmailFromJSON($email)
{
    $file = __DIR__ . '/../data/users.json';
    if (!file_exists($file)) {
        return null;
    }
    $users = json_decode(file_get_contents($file), true);
    if (!is_array($users)) {
        return null;
    }
    foreach ($users as $user) {
        if (isset($user['email']) && $user['email'] === $email) {
            return $user;
        }
    }
    return null;
}

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
 * Login user with email and password (reads from data/users.json)
 */
function login($email, $password)
{
    $user = getUserByEmailFromJSON($email);

    if ($user && $user['password'] === $password) {
        // Regenerate session ID to prevent session fixation
        session_regenerate_id(true);
        
        // Store user info in session (exclude password)
        $_SESSION['user'] = [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'avatar' => $user['avatar'] ?? null
        ];
        
        // Generate CSRF token for this session
        generateCSRFToken();
        
        return ['success' => true];
    }

    return ['success' => false, 'error' => 'Invalid email or password'];
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
 * This legacy POST handler is kept for graceful fallback only.
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
