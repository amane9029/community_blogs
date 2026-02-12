<?php

/**
 * Configuration File
 * Defines base URL and helper functions for routing
 */

// Define base URL.
// Order of precedence:
// 1) BASE_URL environment variable
// 2) Auto-detect from script path (works for /index.php and /api/*.php)
if (!defined('BASE_URL')) {
    $envBaseUrl = getenv('BASE_URL');
    if (is_string($envBaseUrl) && $envBaseUrl !== '') {
        $normalizedBaseUrl = '/' . trim(str_replace('\\', '/', $envBaseUrl), '/');
        if ($normalizedBaseUrl !== '/') {
            $normalizedBaseUrl .= '/';
        }
        define('BASE_URL', $normalizedBaseUrl);
    } else {
        $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
        $detectedBase = preg_replace('#/(index\.php|api/[^/]+\.php)$#', '', $scriptName);
        if (!is_string($detectedBase) || $detectedBase === '') {
            define('BASE_URL', '/');
        } else {
            $detectedBase = '/' . trim($detectedBase, '/');
            define('BASE_URL', $detectedBase . '/');
        }
    }
}

// Database configuration (override through environment variables in production)
if (!defined('DB_HOST')) {
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
}
if (!defined('DB_PORT')) {
    define('DB_PORT', (int) (getenv('DB_PORT') ?: 3306));
}
if (!defined('DB_NAME')) {
    define('DB_NAME', getenv('DB_NAME') ?: 'community_blogs');
}
if (!defined('DB_USER')) {
    define('DB_USER', getenv('DB_USER') ?: 'root');
}
if (!defined('DB_PASS')) {
    define('DB_PASS', getenv('DB_PASS') ?: '');
}

/**
 * Generate a URL with the correct base path
 * 
 * @param string $path Relative path (e.g., 'student/dashboard', 'blogs')
 * @return string Full URL with base path
 */
function url($path = '')
{
    // Remove leading slash if present
    $path = ltrim($path, '/');
    return BASE_URL . $path;
}

/**
 * Generate a URL for assets (CSS, JS, images)
 * 
 * @param string $assetPath Path to asset (e.g., 'css/styles.css', 'js/app.js')
 * @return string Full URL to asset
 */
function asset($assetPath)
{
    $assetPath = ltrim($assetPath, '/');
    return BASE_URL . 'assets/' . $assetPath;
}

/**
 * Escape HTML entities to prevent XSS
 * 
 * @param string $text Text to escape
 * @return string Escaped text
 */
function e($text)
{
    return htmlspecialchars($text ?? '', ENT_QUOTES, 'UTF-8');
}

/**
 * Get current logged-in user
 * Wrapper function to include session functions
 * 
 * @return array|null User data or null if not logged in
 */
function getCurrentUser()
{
    // Include session functions if not already loaded
    if (!function_exists('isLoggedIn')) {
        require_once __DIR__ . '/session.php';
    }
    return $_SESSION['user'] ?? null;
}
