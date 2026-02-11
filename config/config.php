<?php

/**
 * Configuration File
 * Defines base URL and helper functions for routing
 */

// Define base URL for XAMPP subdirectory hosting
// Change this if you move the project to a different location
define('BASE_URL', '/community-blogs-php/');

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
