<?php

require_once __DIR__ . '/_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['success' => false, 'error' => 'Method not allowed.'], 405);
}

$role = api_clean_text($_POST['role'] ?? '');
$name = api_clean_text($_POST['name'] ?? '');
$email = api_clean_text($_POST['email'] ?? '');
$password = (string) ($_POST['password'] ?? '');

if (!in_array($role, ['student', 'mentor'], true)) {
    api_json_response(['success' => false, 'error' => 'Invalid role.'], 400);
}
if ($name === '' || strlen($name) < 2) {
    api_json_response(['success' => false, 'error' => 'Name must be at least 2 characters.'], 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    api_json_response(['success' => false, 'error' => 'Invalid email address.'], 400);
}
if (strlen($password) < 6) {
    api_json_response(['success' => false, 'error' => 'Password must be at least 6 characters.'], 400);
}

if (!isset($_FILES['id_file']) || !is_uploaded_file($_FILES['id_file']['tmp_name'])) {
    api_json_response(['success' => false, 'error' => 'ID file is required.'], 400);
}

$file = $_FILES['id_file'];
$maxSize = 5 * 1024 * 1024;
$allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];

if (($file['size'] ?? 0) > $maxSize) {
    api_json_response(['success' => false, 'error' => 'File size must be less than 5 MB.'], 400);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = $finfo ? finfo_file($finfo, $file['tmp_name']) : '';
if ($finfo) {
    finfo_close($finfo);
}

if (!in_array($mime, $allowedMime, true)) {
    api_json_response(['success' => false, 'error' => 'Only PNG, JPG, WEBP or PDF files are allowed.'], 400);
}

$extensionMap = [
    'image/png' => 'png',
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/webp' => 'webp',
    'application/pdf' => 'pdf',
];
$ext = $extensionMap[$mime] ?? pathinfo($file['name'], PATHINFO_EXTENSION);
$safeName = sprintf('%s_%s.%s', $role, bin2hex(random_bytes(12)), preg_replace('/[^a-zA-Z0-9]/', '', strtolower($ext)));

$uploadDir = __DIR__ . '/../uploads/ids/' . $role;
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
    api_json_response(['success' => false, 'error' => 'Upload directory is not writable.'], 500);
}

$targetPath = $uploadDir . '/' . $safeName;
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    api_json_response(['success' => false, 'error' => 'Failed to save uploaded file.'], 500);
}

$relativeFilePath = 'uploads/ids/' . $role . '/' . $safeName;

$payload = [
    'name' => $name,
    'email' => strtolower($email),
    'password' => password_hash($password, PASSWORD_DEFAULT),
    'role' => $role,
    'status' => 'active',
    'is_email_verified' => 0,
    'verification_token' => bin2hex(random_bytes(32)),
    'verification_status' => 'pending',
];

if ($role === 'student') {
    $payload['roll_number'] = api_clean_text($_POST['roll_number'] ?? '');
    $payload['branch'] = api_clean_text($_POST['branch'] ?? '');
    $payload['year'] = isset($_POST['year']) && $_POST['year'] !== '' ? (int) $_POST['year'] : null;
    $payload['college_id_path'] = $relativeFilePath;
} else {
    $payload['company'] = api_clean_text($_POST['company'] ?? '');
    $payload['position'] = api_clean_text($_POST['position'] ?? '');
    $payload['expertise'] = api_clean_text($_POST['expertise'] ?? '');
    $payload['job_id_path'] = $relativeFilePath;
    $payload['verified_by_admin'] = 0;
}

$result = repo_create_user_with_role($payload);
if (!$result['success']) {
    if (file_exists($targetPath)) {
        @unlink($targetPath);
    }
    api_json_response(['success' => false, 'error' => $result['error'] ?? 'Registration failed.'], 400);
}

api_json_response([
    'success' => true,
    'message' => 'Registration submitted. Your account will be available after admin approval.',
    'user_id' => $result['user_id'],
]);
