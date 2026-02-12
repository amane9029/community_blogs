<?php

require_once __DIR__ . '/_common.php';

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
    $blogs = array_map('content_map_blog', repo_fetch_blogs(null));
    $questions = array_map('content_map_question', repo_fetch_questions());
    $mentors = array_map('content_map_mentor', repo_fetch_mentors());
    $announcements = array_map('content_map_announcement', repo_fetch_announcements());

    $response = [
        'success' => true,
        'blogs' => $blogs,
        'questions' => $questions,
        'mentors' => $mentors,
        'announcements' => $announcements,
    ];

    if (isLoggedIn()) {
        $user = getCurrentUser();
        if (in_array($user['role'], ['student', 'mentor'], true)) {
            $response['mentorship_requests'] = repo_fetch_mentorship_requests((int) $user['id'], $user['role']);
        }
    }

    api_json_response($response);
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

if ($action === 'create_mentorship_request') {
    $user = api_require_role('student');
    $mentorUserId = (int) ($input['mentor_user_id'] ?? 0);
    $message = api_clean_text($input['message'] ?? '');
    if ($mentorUserId <= 0) {
        api_json_response(['success' => false, 'error' => 'Invalid mentor selected.'], 400);
    }

    $result = repo_create_mentorship_request((int) $user['id'], $mentorUserId, $message);
    if (!$result['success']) {
        api_json_response($result, 400);
    }
    api_json_response(['success' => true, 'id' => $result['id']]);
}

if ($action === 'mentorship_requests') {
    $user = api_require_login();
    $role = $user['role'] ?? '';
    $requests = repo_fetch_mentorship_requests((int) $user['id'], $role);
    api_json_response(['success' => true, 'requests' => $requests]);
}

api_json_response(['success' => false, 'error' => 'Unknown action.'], 400);
