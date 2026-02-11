<?php
/**
 * Auth API Endpoint
 * Handles login via AJAX — validates credentials against data/users.json
 * Returns JSON response with user data + role for client-side redirect
 *
 * Future: swap JSON file read for a real DB query — only getUserFromJSON() changes.
 */

header('Content-Type: application/json');

// Boot session + config
session_start();
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/session.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

// Decode JSON body (sent from fetch)
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid request body.']);
    exit;
}

$action = $input['action'] ?? '';

// ── LOGIN ───────────────────────────────────────────────
if ($action === 'login') {
    $email    = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
        exit;
    }

    // Validate against JSON file
    $result = login($email, $password);

    if ($result['success']) {
        $user = getCurrentUser();
        echo json_encode([
            'success'  => true,
            'user'     => [
                'id'     => $user['id'],
                'name'   => $user['name'],
                'email'  => $user['email'],
                'role'   => $user['role'],
                'avatar' => $user['avatar'] ?? ''
            ],
            'redirect' => '/' . $user['role'] . '/dashboard'
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => $result['error']]);
    }
    exit;
}

// ── LOGOUT ──────────────────────────────────────────────
if ($action === 'logout') {
    logout();
    echo json_encode(['success' => true]);
    exit;
}

// ── CHECK SESSION ───────────────────────────────────────
if ($action === 'check') {
    if (isLoggedIn()) {
        $user = getCurrentUser();
        echo json_encode([
            'success'    => true,
            'loggedIn'   => true,
            'user'       => [
                'id'     => $user['id'],
                'name'   => $user['name'],
                'email'  => $user['email'],
                'role'   => $user['role'],
                'avatar' => $user['avatar'] ?? ''
            ]
        ]);
    } else {
        echo json_encode(['success' => true, 'loggedIn' => false]);
    }
    exit;
}

// Unknown action
http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Unknown action.']);
