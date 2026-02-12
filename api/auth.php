<?php
/**
 * Auth API endpoint.
 * Provides login, logout and session-check actions for the SPA.
 */

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

session_start();
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/session.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid request body.']);
    exit;
}

$action = $input['action'] ?? '';

if ($action === 'login') {
    $email = trim((string) ($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');

    if ($email === '' || $password === '') {
        echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
        exit;
    }

    $result = login($email, $password);
    if ($result['success']) {
        $user = getCurrentUser();
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'avatar' => $user['avatar'] ?? '',
            ],
            'redirect' => '/' . $user['role'] . '/dashboard',
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => $result['error']]);
    }
    exit;
}

if ($action === 'logout') {
    logout();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'check') {
    if (isLoggedIn()) {
        $user = getCurrentUser();
        echo json_encode([
            'success' => true,
            'loggedIn' => true,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'avatar' => $user['avatar'] ?? '',
            ],
        ]);
    } else {
        echo json_encode(['success' => true, 'loggedIn' => false]);
    }
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Unknown action.']);
