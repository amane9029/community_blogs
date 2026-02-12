<?php

require_once __DIR__ . '/_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['success' => false, 'error' => 'Method not allowed.'], 405);
}

$admin = api_require_role('admin');
$input = api_get_json_input();
$action = $input['action'] ?? '';

function admin_map_user($row)
{
    $role = strtolower((string) ($row['role'] ?? 'student'));
    $type = $role === 'student' ? 'Student' : ($role === 'mentor' ? 'Mentor' : 'Admin');

    return [
        'id' => (int) ($row['id'] ?? 0),
        'name' => $row['name'] ?? '',
        'email' => $row['email'] ?? '',
        'role' => $row['role'] ?? '',
        'type' => $type,
        'status' => $row['status'] ?? 'inactive',
        'verification_status' => $row['verification_status'] ?? 'pending',
        'is_email_verified' => (int) ($row['is_email_verified'] ?? 0),
        'year' => isset($row['year']) ? (string) $row['year'] : null,
        'branch' => $row['branch'] ?? null,
        'rollNumber' => $row['roll_number'] ?? null,
        'company' => $row['company'] ?? null,
        'position' => $row['position'] ?? null,
        'expertise' => $row['expertise'] ?? null,
        'joinDate' => repo_datetime_to_display($row['created_at'] ?? null),
    ];
}

function admin_map_blog($row)
{
    $author = $row['author_name'] ?? 'Unknown';
    $status = $row['status'] ?? 'pending';

    return [
        'id' => (int) ($row['id'] ?? 0),
        'title' => $row['title'] ?? '',
        'author' => $author,
        'authorRole' => ucfirst((string) ($row['author_role'] ?? 'user')),
        'category' => $row['category'] ?? 'General',
        'excerpt' => $row['excerpt'] ?? mb_substr((string) ($row['content'] ?? ''), 0, 150),
        'readTime' => repo_calculate_read_time($row['content'] ?? ''),
        'submittedDate' => repo_datetime_to_display($row['created_at'] ?? null),
        'submittedAt' => repo_time_ago($row['created_at'] ?? null),
        'views' => (int) ($row['views'] ?? 0),
        'status' => $status,
    ];
}

if ($action === 'bootstrap' || $action === 'dashboard_data') {
    $users = array_map('admin_map_user', repo_fetch_admin_users());
    $blogs = array_map('admin_map_blog', repo_fetch_admin_blogs());
    $announcements = repo_fetch_announcements();
    api_json_response([
        'success' => true,
        'users' => $users,
        'blogs' => $blogs,
        'announcements' => $announcements,
    ]);
}

if ($action === 'update_user_verification') {
    $userId = (int) ($input['user_id'] ?? 0);
    $verificationStatus = (string) ($input['verification_status'] ?? '');
    if ($userId <= 0 || !in_array($verificationStatus, ['pending', 'approved', 'rejected'], true)) {
        api_json_response(['success' => false, 'error' => 'Invalid verification payload.'], 400);
    }

    $ok = repo_update_user_verification($userId, $verificationStatus);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Unable to update user verification.'], 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'update_blog_status') {
    $blogId = (int) ($input['blog_id'] ?? 0);
    $status = (string) ($input['status'] ?? '');
    if ($blogId <= 0 || !in_array($status, ['pending', 'published', 'rejected'], true)) {
        api_json_response(['success' => false, 'error' => 'Invalid blog moderation payload.'], 400);
    }
    $ok = repo_update_blog_status($blogId, $status);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Unable to update blog status.'], 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'create_announcement') {
    $title = api_clean_text($input['title'] ?? '');
    $content = api_clean_text($input['content'] ?? '');
    if ($title === '' || $content === '') {
        api_json_response(['success' => false, 'error' => 'Title and content are required.'], 400);
    }
    $result = repo_create_announcement($title, $content, (int) $admin['id']);
    if (!$result['success']) {
        api_json_response(['success' => false, 'error' => $result['error'] ?? 'Unable to create announcement.'], 400);
    }
    api_json_response(['success' => true, 'id' => $result['id']]);
}

api_json_response(['success' => false, 'error' => 'Unknown action.'], 400);
