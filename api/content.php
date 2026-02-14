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
        'location' => $row['location'] ?? 'N/A',
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

function content_csv_to_array($value)
{
    if (is_array($value)) {
        $items = $value;
    } else {
        $items = explode(',', (string) $value);
    }
    return array_values(array_filter(array_map(static function ($item) {
        return trim((string) $item);
    }, $items), static function ($item) {
        return $item !== '';
    }));
}

function content_input_to_csv($value)
{
    return implode(', ', content_csv_to_array($value));
}

function content_map_profile($row)
{
    if (!$row || !is_array($row)) {
        return null;
    }

    $role = strtolower((string) ($row['role'] ?? 'student'));
    $mentorExpertise = content_csv_to_array($row['expertise'] ?? '');
    $rawSkills = content_csv_to_array($row['skills'] ?? '');
    $skills = $role === 'mentor'
        ? ($rawSkills ?: $mentorExpertise)
        : $rawSkills;

    return [
        'id' => (int) ($row['id'] ?? 0),
        'name' => $row['name'] ?? '',
        'email' => $row['email'] ?? '',
        'role' => $role,
        'avatar' => $row['avatar'] ?? null,
        'profile_image' => $row['avatar'] ?? null,
        'bio' => $row['bio'] ?? '',
        'phone' => $row['phone'] ?? '',
        'location' => $row['location'] ?? '',
        'skills' => $skills,
        'interests' => content_csv_to_array($row['interests'] ?? ''),
        'roll_number' => $row['roll_number'] ?? '',
        'branch' => $row['branch'] ?? '',
        'year' => isset($row['year']) ? (int) $row['year'] : null,
        'company' => $row['company'] ?? '',
        'position' => $row['position'] ?? '',
        'expertise' => $mentorExpertise,
        'joined_date' => repo_datetime_to_display($row['created_at'] ?? null),
        'id_card_status' => 'verified',
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
            $response['profile'] = content_map_profile(repo_fetch_user_profile((int) $user['id']));
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
    $sessionUser = api_require_role('student');

    $mentorUserId = (int) ($input['mentor_user_id'] ?? 0);
    $message = api_clean_text($input['message'] ?? '');
    if ($mentorUserId <= 0) {
        api_json_response(['success' => false, 'error' => 'Invalid mentor selected.'], 400);
    }
    if ($mentorUserId === (int) $sessionUser['id']) {
        api_json_response(['success' => false, 'error' => 'You cannot request mentorship from your own account.'], 400);
    }

    $result = repo_create_mentorship_request((int) $sessionUser['id'], $mentorUserId, $message);
    if (!$result['success']) {
        $statusCode = (($result['code'] ?? '') === 'rate_limited') ? 429 : 400;
        api_json_response($result, $statusCode);
    }
    api_json_response(['success' => true, 'id' => $result['id'] ?? null]);
}

if ($action === 'mentorship_requests') {
    $user = api_require_login();
    $role = $user['role'] ?? '';
    $requests = repo_fetch_mentorship_requests((int) $user['id'], $role);
    api_json_response(['success' => true, 'requests' => $requests]);
}

if ($action === 'update_profile') {
    $user = api_require_login();
    $role = strtolower((string) ($user['role'] ?? ''));
    if (!in_array($role, ['student', 'mentor', 'admin'], true)) {
        api_json_response(['success' => false, 'error' => 'Forbidden.'], 403);
    }

    $name = api_clean_text($input['name'] ?? '');
    $email = strtolower(api_clean_text($input['email'] ?? ''));
    $phone = api_clean_text($input['phone'] ?? '');
    $location = api_clean_text($input['location'] ?? '');
    $bio = api_clean_text($input['bio'] ?? '');
    $avatar = api_clean_text($input['avatar'] ?? ($input['profile_image'] ?? ''));
    $skillsCsv = content_input_to_csv($input['skills'] ?? '');
    $interestsCsv = content_input_to_csv($input['interests'] ?? '');

    $nameLength = function_exists('mb_strlen') ? mb_strlen($name) : strlen($name);
    if ($name === '' || $nameLength < 2) {
        api_json_response(['success' => false, 'error' => 'Name must be at least 2 characters.'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        api_json_response(['success' => false, 'error' => 'A valid email address is required.'], 400);
    }
    if ($phone !== '' && !preg_match('/^[0-9+\-\s()]{7,20}$/', $phone)) {
        api_json_response(['success' => false, 'error' => 'Phone number format is invalid.'], 400);
    }
    if ($role === 'student') {
        $rollNumber = api_clean_text($input['roll_number'] ?? '');
        if ($rollNumber === '') {
            api_json_response(['success' => false, 'error' => 'Roll number is required for student profiles.'], 400);
        }
    }

    $yearInput = $input['year'] ?? null;
    $year = null;
    if ($yearInput !== null && trim((string) $yearInput) !== '') {
        if (!is_numeric($yearInput)) {
            api_json_response(['success' => false, 'error' => 'Year must be a valid number.'], 400);
        }
        $year = (int) $yearInput;
        if ($year < 1 || $year > 10) {
            api_json_response(['success' => false, 'error' => 'Year must be between 1 and 10.'], 400);
        }
    }

    $expertiseCsv = content_input_to_csv($input['expertise'] ?? ($input['skills'] ?? ''));

    $payload = [
        'name' => $name,
        'email' => $email,
        'phone' => $phone !== '' ? $phone : null,
        'location' => $location !== '' ? $location : null,
        'bio' => $bio !== '' ? $bio : null,
        'avatar' => $avatar !== '' ? $avatar : ($user['avatar'] ?? null),
        'skills' => $skillsCsv !== '' ? $skillsCsv : null,
        'interests' => $interestsCsv !== '' ? $interestsCsv : null,
        'roll_number' => api_clean_text($input['roll_number'] ?? ''),
        'branch' => api_clean_text($input['branch'] ?? '') ?: null,
        'year' => $year,
        'company' => api_clean_text($input['company'] ?? '') ?: null,
        'position' => api_clean_text($input['position'] ?? '') ?: null,
        'expertise' => $expertiseCsv !== '' ? $expertiseCsv : null,
    ];

    $result = repo_update_user_profile_details((int) $user['id'], $role, $payload);
    if (!($result['success'] ?? false)) {
        api_json_response(['success' => false, 'error' => $result['error'] ?? 'Failed to update profile.'], 400);
    }

    $updatedProfile = repo_fetch_user_profile((int) $user['id']);
    if (!$updatedProfile) {
        api_json_response(['success' => false, 'error' => 'Profile updated but could not be reloaded.'], 500);
    }
    $mappedProfile = content_map_profile($updatedProfile);

    $_SESSION['user']['name'] = $mappedProfile['name'] ?? $name;
    $_SESSION['user']['email'] = $mappedProfile['email'] ?? $email;
    $_SESSION['user']['avatar'] = $mappedProfile['avatar'] ?? ($user['avatar'] ?? null);

    api_json_response([
        'success' => true,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $_SESSION['user']['name'],
            'email' => $_SESSION['user']['email'],
            'role' => $user['role'],
            'avatar' => $_SESSION['user']['avatar'] ?? '',
        ],
        'profile' => $mappedProfile,
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

if ($action === 'send_message') {
    $user = api_require_login();
    $role = $user['role'] ?? '';
    if ($role === 'admin') {
        api_json_response(['success' => false, 'error' => 'Admin cannot access chat.'], 403);
    }
    $requestId = (int) ($input['request_id'] ?? 0);
    $message = api_clean_text($input['message'] ?? '');
    if ($requestId <= 0 || $message === '') {
        api_json_response(['success' => false, 'error' => 'Request ID and message are required.'], 400);
    }
    $access = repo_validate_chat_access($requestId, (int) $user['id']);
    if (!$access['allowed']) {
        api_json_response(['success' => false, 'error' => $access['error']], 403);
    }

    $senderId = (int) $user['id'];
    $isStudentSender = $senderId === (int) $access['student_id'];
    $senderRole = $isStudentSender ? 'student' : 'mentor';
    if ($role !== $senderRole) {
        api_json_response(['success' => false, 'error' => 'Sender role mismatch for this mentorship chat.'], 403);
    }

    $receiverId = $isStudentSender ? (int) $access['mentor_id'] : (int) $access['student_id'];
    $result = repo_create_message($requestId, $senderId, $receiverId, $message, $senderRole);
    if (!$result['success']) {
        api_json_response($result, 400);
    }
    api_json_response(['success' => true, 'id' => $result['id']]);
}

if ($action === 'get_messages') {
    $user = api_require_login();
    $role = $user['role'] ?? '';
    if ($role === 'admin') {
        api_json_response(['success' => false, 'error' => 'Admin cannot access chat.'], 403);
    }
    $requestId = (int) ($input['request_id'] ?? 0);
    if ($requestId <= 0) {
        api_json_response(['success' => false, 'error' => 'Request ID is required.'], 400);
    }
    $access = repo_validate_chat_access($requestId, (int) $user['id']);
    if (!$access['allowed']) {
        api_json_response(['success' => false, 'error' => $access['error']], 403);
    }
    $messages = repo_fetch_messages($requestId);
    $request = $access['request'];
    api_json_response([
        'success' => true,
        'messages' => $messages,
        'current_user_id' => (int) $user['id'],
        'current_user_role' => $role,
        'request' => [
            'id' => (int) $request['id'],
            'student_id' => (int) $request['student_id'],
            'mentor_id' => (int) $request['mentor_id'],
            'student_name' => $request['student_name'],
            'mentor_name' => $request['mentor_name'],
            'status' => $request['status'],
        ],
    ]);
}

api_json_response(['success' => false, 'error' => 'Unknown action.'], 400);
