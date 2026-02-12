<?php

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/repository.php';

function api_json_response($payload, $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    echo json_encode($payload);
    exit;
}

function api_get_json_input()
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function api_require_login()
{
    if (!isLoggedIn()) {
        api_json_response(['success' => false, 'error' => 'Authentication required.'], 401);
    }
    return getCurrentUser();
}

function api_require_role($role)
{
    $user = api_require_login();
    if (($user['role'] ?? '') !== $role) {
        api_json_response(['success' => false, 'error' => 'Forbidden.'], 403);
    }
    return $user;
}

function api_clean_text($value)
{
    return trim((string) ($value ?? ''));
}
