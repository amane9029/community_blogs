<?php

require_once __DIR__ . '/_common.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['success' => false, 'error' => 'Method not allowed.'], 405);
}

$input = api_get_json_input();
$action = $input['action'] ?? '';

function content_role_label($role)
{
    $role = strtolower((string) $role);
    if ($role === 'admin') return 'Admin';
    if ($role === 'mentor') return 'Mentor';
    return 'Student';
}

function content_map_blog($row)
{
    $authorName = $row['author_name'] ?? 'Unknown';
    $category = $row['category'] ?? 'General';

    return [
        'id' => (int) ($row['id'] ?? 0),
        'title' => $row['title'] ?? '',
        'author' => $authorName,
        'authorRole' => content_role_label($row['author_role'] ?? ''),
        'authorAvatar' => strtoupper(substr($authorName, 0, 1)),
        'authorBio' => $row['author_bio'] ?? '',
        'category' => $category,
        'readTime' => repo_calculate_read_time($row['content'] ?? ''),
        'date' => repo_datetime_to_display($row['created_at'] ?? null),
        'excerpt' => $row['excerpt'] ?? mb_substr((string) ($row['content'] ?? ''), 0, 160),
        'content' => $row['content'] ?? '',
        'tags' => [$category],
        'views' => (int) ($row['views'] ?? 0),
        'likes' => 0,
        'status' => $row['status'] ?? 'published',
        'authorId' => isset($row['author_id']) ? (int) $row['author_id'] : null,
        'approvedAt' => $row['approved_at'] ?? null,
        'approvedBy' => isset($row['approved_by']) ? (int) $row['approved_by'] : null,
    ];
}

function content_map_question($row)
{
    $authorName = $row['author_name'] ?? 'Anonymous';
    $answers = (int) ($row['answers_count'] ?? 0);
    $verified = ((int) ($row['has_verified_answer'] ?? 0)) === 1;

    return [
        'id' => (int) ($row['id'] ?? 0),
        'title' => $row['title'] ?? '',
        'authorId' => isset($row['author_id']) ? (int) $row['author_id'] : null,
        'author' => $authorName,
        'authorRole' => content_role_label($row['author_role'] ?? ''),
        'avatar' => strtoupper(substr($authorName, 0, 1)),
        'content' => $row['content'] ?? '',
        'answers' => $answers,
        'views' => (int) ($row['views'] ?? 0),
        'upvotes' => max(0, $answers * 2),
        'tags' => ['General'],
        'verified' => $verified,
        'timeAgo' => repo_time_ago($row['created_at'] ?? null),
        'hasAcceptedAnswer' => $verified,
    ];
}

function content_map_answer($row)
{
    $authorName = $row['author_name'] ?? 'Anonymous';
    $verified = ((int) ($row['is_verified'] ?? 0)) === 1;

    return [
        'id' => (int) ($row['id'] ?? 0),
        'questionId' => isset($row['question_id']) ? (int) $row['question_id'] : null,
        'authorId' => isset($row['author_id']) ? (int) $row['author_id'] : null,
        'author' => $authorName,
        'authorRole' => content_role_label($row['author_role'] ?? ''),
        'avatar' => strtoupper(substr($authorName, 0, 1)),
        'content' => $row['content'] ?? '',
        'isVerified' => $verified,
        'createdAt' => $row['created_at'] ?? null,
        'date' => repo_datetime_to_display($row['created_at'] ?? null),
        'timeAgo' => repo_time_ago($row['created_at'] ?? null),
    ];
}

function content_map_mentor($row)
{
    $name = $row['name'] ?? 'Mentor';
    $skills = array_values(array_filter(array_map('trim', explode(',', (string) ($row['expertise'] ?? '')))));
    if (!$skills) {
        $skills = ['Mentorship'];
    }

    return [
        'id' => isset($row['user_id']) ? (int) $row['user_id'] : (int) ($row['id'] ?? 0),
        'name' => $name,
        'role' => $row['position'] ?? 'Mentor',
        'company' => $row['company'] ?? 'N/A',
        'location' => 'N/A',
        'avatar' => strtoupper(substr($name, 0, 1)),
        'domain' => 'Career Guidance',
        'experience' => '5+ years',
        'alumni' => true,
        'batch' => null,
        'skills' => $skills,
        'rating' => ((int) ($row['verified_by_admin'] ?? 0)) === 1 ? 4.9 : 4.5,
        'reviews' => 0,
        'students' => 0,
        'bio' => $row['bio'] ?? '',
        'userId' => isset($row['user_id']) ? (int) $row['user_id'] : null,
    ];
}

function content_map_announcement($row)
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'title' => $row['title'] ?? '',
        'content' => $row['content'] ?? '',
        'created_by' => isset($row['created_by']) ? (int) $row['created_by'] : null,
        'created_by_name' => $row['created_by_name'] ?? 'Admin',
        'created_at' => $row['created_at'] ?? null,
        'date' => repo_datetime_to_display($row['created_at'] ?? null),
    ];
}

if ($action === 'bootstrap' || $action === 'public_data') {
    $blogs = array_map('content_map_blog', repo_fetch_blogs('published'));
    $questions = array_map('content_map_question', repo_fetch_questions());
    $mentors = array_map('content_map_mentor', repo_fetch_mentors());
    $announcements = array_map('content_map_announcement', repo_fetch_announcements());

    $studentCount = repo_count_active_students();

    $response = [
        'success' => true,
        'blogs' => $blogs,
        'questions' => $questions,
        'mentors' => $mentors,
        'announcements' => $announcements,
        'student_count' => $studentCount,
    ];

    if (isLoggedIn()) {
        $user = getCurrentUser();
        if (in_array($user['role'], ['student', 'mentor'], true)) {
            $response['my_blogs'] = array_map('content_map_blog', repo_fetch_blogs_by_author((int) $user['id']));
            $response['mentorship_requests'] = repo_fetch_mentorship_requests((int) $user['id'], $user['role']);
        }
    }

    api_json_response($response);
}

if ($action === 'search') {
    $query = api_clean_text($input['query'] ?? '');
    $queryLength = function_exists('mb_strlen') ? mb_strlen($query) : strlen($query);
    if ($queryLength < 2) {
        api_json_response(['success' => false, 'error' => 'Search query must be at least 2 characters.'], 400);
    }

    $results = repo_search_content($query, 8);
    api_json_response([
        'success' => true,
        'query' => $query,
        'blogs' => array_map('content_map_blog', $results['blogs'] ?? []),
        'questions' => array_map('content_map_question', $results['questions'] ?? []),
        'mentors' => array_map('content_map_mentor', $results['mentors'] ?? []),
    ]);
}

if ($action === 'get_question_detail') {
    $questionId = (int) ($input['question_id'] ?? 0);
    if ($questionId <= 0) {
        api_json_response(['success' => false, 'error' => 'Invalid question id.'], 400);
    }

    $question = repo_fetch_question_by_id($questionId);
    if (!$question) {
        api_json_response(['success' => false, 'error' => 'Question not found.'], 404);
    }

    repo_increment_question_views($questionId);
    $question = repo_fetch_question_by_id($questionId) ?: $question;
    $answers = repo_fetch_answers_by_question($questionId);

    api_json_response([
        'success' => true,
        'question' => content_map_question($question),
        'answers' => array_map('content_map_answer', $answers),
    ]);
}

if ($action === 'create_blog') {
    $user = api_require_login();
    $title = api_clean_text($input['title'] ?? '');
    $content = api_clean_text($input['content'] ?? '');
    $excerpt = api_clean_text($input['excerpt'] ?? '');
    $category = api_clean_text($input['category'] ?? '');

    if ($title === '' || $content === '') {
        api_json_response(['success' => false, 'error' => 'Title and content are required.'], 400);
    }

    $result = repo_create_blog((int) $user['id'], $title, $content, $excerpt, $category, 'pending');
    if (!$result['success']) {
        api_json_response($result, 400);
    }
    api_json_response(['success' => true, 'id' => $result['id']]);
}

if ($action === 'update_blog') {
    $user = api_require_login();
    $blogId = (int) ($input['blog_id'] ?? 0);
    if ($blogId <= 0) {
        api_json_response(['success' => false, 'error' => 'Invalid blog id.'], 400);
    }

    $existing = repo_fetch_blog_by_id($blogId);
    if (!$existing) {
        api_json_response(['success' => false, 'error' => 'Blog not found.'], 404);
    }

    $isAdmin = ($user['role'] ?? '') === 'admin';
    $isOwner = (int) ($existing['author_id'] ?? 0) === (int) $user['id'];
    if (!$isAdmin && !$isOwner) {
        api_json_response(['success' => false, 'error' => 'Forbidden.'], 403);
    }

    $title = api_clean_text($input['title'] ?? $existing['title'] ?? '');
    $content = api_clean_text($input['content'] ?? $existing['content'] ?? '');
    $excerpt = api_clean_text($input['excerpt'] ?? $existing['excerpt'] ?? '');
    $category = api_clean_text($input['category'] ?? $existing['category'] ?? '');
    $status = null;
    if (($input['status'] ?? null) !== null) {
        $requestedStatus = api_clean_text($input['status']);
        if (!in_array($requestedStatus, ['pending', 'published', 'rejected'], true)) {
            api_json_response(['success' => false, 'error' => 'Invalid blog status.'], 400);
        }
        if ($isAdmin) {
            $status = $requestedStatus;
        } elseif ($requestedStatus === 'pending' && $isOwner) {
            // Authors can only re-submit for review; they cannot self-publish.
            $status = 'pending';
        }
    }

    if ($title === '' || $content === '') {
        api_json_response(['success' => false, 'error' => 'Title and content are required.'], 400);
    }

    $ok = repo_update_blog($blogId, $title, $content, $excerpt, $category, null);
    if (!$ok && $status === null) {
        api_json_response(['success' => false, 'error' => 'Failed to update blog.'], 400);
    }

    if ($status !== null) {
        $statusUpdated = repo_update_blog_status($blogId, $status, $isAdmin ? (int) $user['id'] : null);
        if (!$statusUpdated) {
            api_json_response(['success' => false, 'error' => 'Failed to update blog status.'], 400);
        }
    }

    api_json_response(['success' => true]);
}

if ($action === 'delete_blog') {
    $user = api_require_login();
    $blogId = (int) ($input['blog_id'] ?? 0);
    if ($blogId <= 0) {
        api_json_response(['success' => false, 'error' => 'Invalid blog id.'], 400);
    }

    $existing = repo_fetch_blog_by_id($blogId);
    if (!$existing) {
        api_json_response(['success' => false, 'error' => 'Blog not found.'], 404);
    }

    $isAdmin = ($user['role'] ?? '') === 'admin';
    $isOwner = (int) ($existing['author_id'] ?? 0) === (int) $user['id'];
    if (!$isAdmin && !$isOwner) {
        api_json_response(['success' => false, 'error' => 'Forbidden.'], 403);
    }

    $ok = repo_delete_blog($blogId);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Failed to delete blog.'], 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'create_question') {
    $user = api_require_login();
    $title = api_clean_text($input['title'] ?? '');
    $content = api_clean_text($input['content'] ?? '');

    if ($title === '' || $content === '') {
        api_json_response(['success' => false, 'error' => 'Title and content are required.'], 400);
    }

    $result = repo_create_question((int) $user['id'], $title, $content);
    if (!$result['success']) {
        api_json_response($result, 400);
    }
    api_json_response(['success' => true, 'id' => $result['id']]);
}

if ($action === 'update_question') {
    $user = api_require_login();
    $questionId = (int) ($input['question_id'] ?? 0);
    $title = api_clean_text($input['title'] ?? '');
    $content = api_clean_text($input['content'] ?? '');
    if ($questionId <= 0 || $title === '' || $content === '') {
        api_json_response(['success' => false, 'error' => 'Question title and content are required.'], 400);
    }

    $existing = repo_fetch_question_by_id($questionId);
    if (!$existing) {
        api_json_response(['success' => false, 'error' => 'Question not found.'], 404);
    }

    $isAdmin = ($user['role'] ?? '') === 'admin';
    $isOwner = (int) ($existing['author_id'] ?? 0) === (int) $user['id'];
    if (!$isAdmin && !$isOwner) {
        api_json_response(['success' => false, 'error' => 'Forbidden.'], 403);
    }

    $ok = repo_update_question($questionId, $title, $content);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Failed to update question.'], 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'delete_question') {
    $user = api_require_login();
    $questionId = (int) ($input['question_id'] ?? 0);
    if ($questionId <= 0) {
        api_json_response(['success' => false, 'error' => 'Invalid question id.'], 400);
    }

    $existing = repo_fetch_question_by_id($questionId);
    if (!$existing) {
        api_json_response(['success' => false, 'error' => 'Question not found.'], 404);
    }

    $isAdmin = ($user['role'] ?? '') === 'admin';
    $isOwner = (int) ($existing['author_id'] ?? 0) === (int) $user['id'];
    if (!$isAdmin && !$isOwner) {
        api_json_response(['success' => false, 'error' => 'Forbidden.'], 403);
    }

    $ok = repo_delete_question($questionId);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Failed to delete question.'], 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'create_answer') {
    $user = api_require_login();
    $questionId = (int) ($input['question_id'] ?? 0);
    $content = api_clean_text($input['content'] ?? '');
    if ($questionId <= 0 || $content === '') {
        api_json_response(['success' => false, 'error' => 'Question and answer content are required.'], 400);
    }

    $isVerified = ($user['role'] ?? '') === 'mentor' ? 1 : 0;
    $result = repo_create_answer($questionId, (int) $user['id'], $content, $isVerified);
    if (!$result['success']) {
        api_json_response($result, 400);
    }
    api_json_response(['success' => true, 'id' => $result['id']]);
}

if ($action === 'update_mentorship_request_status') {
    $user = api_require_login();
    $requestId = (int) ($input['request_id'] ?? 0);
    $status = api_clean_text($input['status'] ?? '');
    if ($requestId <= 0 || !in_array($status, ['pending', 'approved', 'rejected', 'completed'], true)) {
        api_json_response(['success' => false, 'error' => 'Invalid mentorship status payload.'], 400);
    }

    $isAdmin = ($user['role'] ?? '') === 'admin';
    if (!$isAdmin && ($user['role'] ?? '') !== 'mentor') {
        api_json_response(['success' => false, 'error' => 'Forbidden.'], 403);
    }

    $ok = repo_update_mentorship_request_status($requestId, $status, (int) $user['id'], $isAdmin);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Failed to update mentorship request.'], 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'create_mentorship_request') {
    $sessionUser = isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
    if (!$sessionUser || !isset($sessionUser['id'])) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }

    if (($sessionUser['role'] ?? '') !== 'student') {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $mentorUserId = (int) ($input['mentor_user_id'] ?? 0);
    $message = api_clean_text($input['message'] ?? '');
    if ($mentorUserId <= 0) {
        api_json_response(['success' => false, 'error' => 'Invalid mentor selected.'], 400);
    }

    $mentorExists = false;
    $mentors = repo_fetch_mentors();
    foreach ($mentors as $mentor) {
        if ((int) ($mentor['user_id'] ?? 0) === $mentorUserId) {
            $mentorExists = true;
            break;
        }
    }
    if (!$mentorExists) {
        api_json_response(['success' => false, 'error' => 'Invalid mentor selected.'], 400);
    }

    $result = repo_create_mentorship_request((int) $sessionUser['id'], $mentorUserId, $message);
    if (!$result['success']) {
        api_json_response($result, 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'mentorship_requests') {
    $user = api_require_login();
    $role = $user['role'] ?? '';
    $requests = repo_fetch_mentorship_requests((int) $user['id'], $role);
    api_json_response(['success' => true, 'requests' => $requests]);
}

if ($action === 'update_profile') {
    $user = api_require_login();
    $name = api_clean_text($input['name'] ?? '');
    $bio = api_clean_text($input['bio'] ?? '');
    if ($name === '' || mb_strlen($name) < 2) {
        api_json_response(['success' => false, 'error' => 'Name must be at least 2 characters.'], 400);
    }

    $ok = repo_update_user_profile((int) $user['id'], $name, $bio === '' ? null : $bio, $user['avatar'] ?? null);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Failed to update profile.'], 400);
    }

    $_SESSION['user']['name'] = $name;
    api_json_response([
        'success' => true,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $name,
            'email' => $user['email'],
            'role' => $user['role'],
            'avatar' => $user['avatar'] ?? '',
        ],
    ]);
}

if ($action === 'change_password') {
    $user = api_require_login();
    $currentPassword = (string) ($input['current_password'] ?? '');
    $newPassword = (string) ($input['new_password'] ?? '');
    if ($currentPassword === '' || mb_strlen($newPassword) < 6) {
        api_json_response(['success' => false, 'error' => 'Current password and a new password (min 6 chars) are required.'], 400);
    }

    $dbUser = repo_fetch_user_by_email((string) $user['email']);
    if (!$dbUser || !password_verify($currentPassword, (string) ($dbUser['password'] ?? ''))) {
        api_json_response(['success' => false, 'error' => 'Current password is incorrect.'], 400);
    }

    $ok = repo_update_user_password((int) $user['id'], password_hash($newPassword, PASSWORD_DEFAULT));
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Failed to change password.'], 400);
    }
    api_json_response(['success' => true]);
}

if ($action === 'delete_account') {
    $user = api_require_login();
    if (($user['role'] ?? '') === 'admin') {
        api_json_response(['success' => false, 'error' => 'Admin account deletion is not allowed from this action.'], 403);
    }

    $ok = repo_delete_user_account((int) $user['id']);
    if (!$ok) {
        api_json_response(['success' => false, 'error' => 'Failed to delete account.'], 400);
    }

    logout();
    api_json_response(['success' => true, 'loggedOut' => true]);
}

api_json_response(['success' => false, 'error' => 'Unknown action.'], 400);
