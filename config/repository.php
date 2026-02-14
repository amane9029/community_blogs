<?php

/**
 * Database-only repository helpers.
 * All reads/writes are performed through MySQL via PDO.
 */

require_once __DIR__ . '/database.php';

function repo_db()
{
    return getDatabaseConnection();
}

function repo_table_has_column($table, $column)
{
    if (!isset($GLOBALS['repo_table_columns_cache']) || !is_array($GLOBALS['repo_table_columns_cache'])) {
        $GLOBALS['repo_table_columns_cache'] = [];
    }
    $cache = &$GLOBALS['repo_table_columns_cache'];

    $table = (string) $table;
    $column = (string) $column;
    if ($table === '' || $column === '') {
        return false;
    }

    if (isset($cache[$table]) && array_key_exists($column, $cache[$table])) {
        return $cache[$table][$column];
    }

    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'SELECT 1
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name
             LIMIT 1'
        );
        $stmt->execute([
            ':table_name' => $table,
            ':column_name' => $column,
        ]);
        $exists = (bool) $stmt->fetchColumn();
        if (!isset($cache[$table])) {
            $cache[$table] = [];
        }
        $cache[$table][$column] = $exists;
        return $exists;
    } catch (Throwable $e) {
        error_log('repo_table_has_column failed: ' . $e->getMessage());
        return false;
    }
}

function repo_clear_table_column_cache($table = null)
{
    if (!isset($GLOBALS['repo_table_columns_cache']) || !is_array($GLOBALS['repo_table_columns_cache'])) {
        $GLOBALS['repo_table_columns_cache'] = [];
    }
    $cache = &$GLOBALS['repo_table_columns_cache'];
    if ($table === null) {
        $cache = [];
        return;
    }
    $table = (string) $table;
    if (isset($cache[$table])) {
        unset($cache[$table]);
    }
}

function repo_ensure_column($table, $column, $definitionSql)
{
    $table = (string) $table;
    $column = (string) $column;
    $definitionSql = trim((string) $definitionSql);
    if ($table === '' || $column === '' || $definitionSql === '') {
        return false;
    }

    if (repo_table_has_column($table, $column)) {
        return true;
    }

    try {
        $pdo = repo_db();
        $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definitionSql}");
        repo_clear_table_column_cache($table);
        return repo_table_has_column($table, $column);
    } catch (Throwable $e) {
        error_log("repo_ensure_column failed for {$table}.{$column}: " . $e->getMessage());
        return false;
    }
}

function repo_ensure_index($table, $indexName, $indexSql)
{
    $table = (string) $table;
    $indexName = (string) $indexName;
    $indexSql = trim((string) $indexSql);
    if ($table === '' || $indexName === '' || $indexSql === '') {
        return false;
    }

    try {
        $pdo = repo_db();
        $check = $pdo->prepare(
            'SELECT 1
             FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND INDEX_NAME = :index_name
             LIMIT 1'
        );
        $check->execute([
            ':table_name' => $table,
            ':index_name' => $indexName,
        ]);
        if ($check->fetchColumn()) {
            return true;
        }

        $pdo->exec("ALTER TABLE `{$table}` {$indexSql}");
        return true;
    } catch (Throwable $e) {
        error_log("repo_ensure_index failed for {$table}.{$indexName}: " . $e->getMessage());
        return false;
    }
}

function repo_ensure_application_schema()
{
    static $checked = false;
    if ($checked) {
        return;
    }

    repo_ensure_column('users', 'phone', 'VARCHAR(30) DEFAULT NULL');
    repo_ensure_column('users', 'location', 'VARCHAR(255) DEFAULT NULL');
    repo_ensure_column('users', 'skills', 'TEXT DEFAULT NULL');
    repo_ensure_column('users', 'interests', 'TEXT DEFAULT NULL');
    repo_ensure_column('messages', 'sender_role', "ENUM('student','mentor') DEFAULT NULL");
    repo_ensure_index(
        'mentorship_requests',
        'idx_mentorship_pair_created',
        'ADD INDEX `idx_mentorship_pair_created` (`student_id`, `mentor_id`, `created_at`)'
    );

    $checked = true;
}

function repo_blogs_has_approval_columns()
{
    static $hasColumns = null;

    if ($hasColumns !== null) {
        return $hasColumns;
    }

    try {
        $pdo = repo_db();
        $hasApprovedAt = (bool) $pdo->query("SHOW COLUMNS FROM blogs LIKE 'approved_at'")->fetch();
        $hasApprovedBy = (bool) $pdo->query("SHOW COLUMNS FROM blogs LIKE 'approved_by'")->fetch();
        $hasColumns = $hasApprovedAt && $hasApprovedBy;
    } catch (Throwable $e) {
        error_log('repo_blogs_has_approval_columns failed: ' . $e->getMessage());
        $hasColumns = false;
    }

    return $hasColumns;
}

function repo_blog_select_columns_sql()
{
    $baseColumns = 'b.id, b.title, b.content, b.excerpt, b.category, b.author_id, b.status, b.views, b.created_at, b.updated_at';
    if (repo_blogs_has_approval_columns()) {
        return $baseColumns . ', b.approved_at, b.approved_by';
    }
    return $baseColumns . ', NULL AS approved_at, NULL AS approved_by';
}

function repo_datetime_to_display($value)
{
    if (!$value) {
        return date('M d, Y');
    }

    try {
        return (new DateTime($value))->format('M d, Y');
    } catch (Throwable $e) {
        return (string) $value;
    }
}

function repo_time_ago($value)
{
    if (!$value) {
        return 'Recently';
    }

    try {
        $dt = new DateTime($value);
        $now = new DateTime();
        $diff = $now->getTimestamp() - $dt->getTimestamp();
        if ($diff < 60) return 'Just now';
        if ($diff < 3600) return floor($diff / 60) . ' min ago';
        if ($diff < 86400) return floor($diff / 3600) . ' hours ago';
        if ($diff < 604800) return floor($diff / 86400) . ' days ago';
        return $dt->format('M d, Y');
    } catch (Throwable $e) {
        return 'Recently';
    }
}

function repo_calculate_read_time($content)
{
    $words = max(1, str_word_count(strip_tags((string) $content)));
    return max(1, (int) ceil($words / 200)) . ' min read';
}

function repo_fetch_user_by_email($email)
{
    $pdo = repo_db();
    $stmt = $pdo->prepare(
        'SELECT id, name, email, password, role, status, is_email_verified, verification_status, avatar, bio
         FROM users
         WHERE email = :email
         LIMIT 1'
    );
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function repo_create_user_with_role(array $payload)
{
    $pdo = repo_db();

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'INSERT INTO users
                (name, email, password, role, status, is_email_verified, verification_token, verification_status, avatar, bio, created_at, updated_at)
             VALUES
                (:name, :email, :password, :role, :status, :is_email_verified, :verification_token, :verification_status, :avatar, :bio, NOW(), NOW())'
        );
        $stmt->execute([
            ':name' => $payload['name'],
            ':email' => $payload['email'],
            ':password' => $payload['password'],
            ':role' => $payload['role'],
            ':status' => $payload['status'] ?? 'active',
            ':is_email_verified' => $payload['is_email_verified'] ?? 0,
            ':verification_token' => $payload['verification_token'] ?? null,
            ':verification_status' => $payload['verification_status'] ?? 'pending',
            ':avatar' => $payload['avatar'] ?? null,
            ':bio' => $payload['bio'] ?? null,
        ]);

        $userId = (int) $pdo->lastInsertId();

        if ($payload['role'] === 'student') {
            $studentStmt = $pdo->prepare(
                'INSERT INTO students (user_id, roll_number, branch, year, college_id_path)
                 VALUES (:user_id, :roll_number, :branch, :year, :college_id_path)'
            );
            $studentStmt->execute([
                ':user_id' => $userId,
                ':roll_number' => $payload['roll_number'] ?? ('ROLL-' . $userId),
                ':branch' => $payload['branch'] ?? null,
                ':year' => $payload['year'] ?? null,
                ':college_id_path' => $payload['college_id_path'] ?? null,
            ]);
        } elseif ($payload['role'] === 'mentor') {
            $mentorStmt = $pdo->prepare(
                'INSERT INTO mentors (user_id, company, position, expertise, job_id_path, verified_by_admin)
                 VALUES (:user_id, :company, :position, :expertise, :job_id_path, :verified_by_admin)'
            );
            $mentorStmt->execute([
                ':user_id' => $userId,
                ':company' => $payload['company'] ?? null,
                ':position' => $payload['position'] ?? null,
                ':expertise' => $payload['expertise'] ?? null,
                ':job_id_path' => $payload['job_id_path'] ?? null,
                ':verified_by_admin' => $payload['verified_by_admin'] ?? 0,
            ]);
        }

        $pdo->commit();
        return ['success' => true, 'user_id' => $userId];
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e->getCode() === '23000') {
            return ['success' => false, 'error' => 'Email already exists.'];
        }
        error_log('repo_create_user_with_role failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Registration failed.'];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('repo_create_user_with_role failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Registration failed.'];
    }
}

function repo_fetch_blogs($status = null)
{
    try {
        $pdo = repo_db();
        $blogColumns = repo_blog_select_columns_sql();
        $sql = "SELECT
                    {$blogColumns},
                    u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar, u.bio AS author_bio
                FROM blogs b
                LEFT JOIN users u ON u.id = b.author_id";
        $params = [];

        if ($status !== null) {
            $sql .= ' WHERE b.status = :status';
            $params[':status'] = $status;
        }

        $sql .= ' ORDER BY b.created_at DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_blogs failed: ' . $e->getMessage());
        return [];
    }
}

function repo_fetch_blogs_by_author($authorId, $status = null)
{
    try {
        $pdo = repo_db();
        $blogColumns = repo_blog_select_columns_sql();
        $sql = "SELECT
                    {$blogColumns},
                    u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar, u.bio AS author_bio
                FROM blogs b
                LEFT JOIN users u ON u.id = b.author_id
                WHERE b.author_id = :author_id";
        $params = [':author_id' => (int) $authorId];

        if ($status !== null) {
            $sql .= ' AND b.status = :status';
            $params[':status'] = $status;
        }

        $sql .= ' ORDER BY b.created_at DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_blogs_by_author failed: ' . $e->getMessage());
        return [];
    }
}

function repo_fetch_blog_by_id($blogId)
{
    try {
        $pdo = repo_db();
        $blogColumns = repo_blog_select_columns_sql();
        $stmt = $pdo->prepare(
            "SELECT
                {$blogColumns},
                u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar, u.bio AS author_bio
             FROM blogs b
             LEFT JOIN users u ON u.id = b.author_id
             WHERE b.id = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => (int) $blogId]);
        $row = $stmt->fetch();
        return $row ?: null;
    } catch (Throwable $e) {
        error_log('repo_fetch_blog_by_id failed: ' . $e->getMessage());
        return null;
    }
}

function repo_create_blog($authorId, $title, $content, $excerpt = null, $category = null, $status = 'pending')
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'INSERT INTO blogs (title, content, excerpt, category, author_id, status, views, created_at, updated_at)
             VALUES (:title, :content, :excerpt, :category, :author_id, :status, 0, NOW(), NOW())'
        );
        $stmt->execute([
            ':title' => $title,
            ':content' => $content,
            ':excerpt' => $excerpt,
            ':category' => $category,
            ':author_id' => $authorId,
            ':status' => $status,
        ]);

        return ['success' => true, 'id' => (int) $pdo->lastInsertId()];
    } catch (Throwable $e) {
        error_log('repo_create_blog failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to create blog.'];
    }
}

function repo_update_blog($blogId, $title, $content, $excerpt = null, $category = null, $status = null)
{
    try {
        $pdo = repo_db();
        $sql = 'UPDATE blogs
                SET title = :title,
                    content = :content,
                    excerpt = :excerpt,
                    category = :category,
                    updated_at = NOW()';
        $params = [
            ':title' => $title,
            ':content' => $content,
            ':excerpt' => $excerpt,
            ':category' => $category,
            ':id' => (int) $blogId,
        ];

        if ($status !== null) {
            $sql .= ', status = :status';
            $params[':status'] = $status;
        }

        $sql .= ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_update_blog failed: ' . $e->getMessage());
        return false;
    }
}

function repo_update_blog_status($blogId, $status, $approvedByUserId = null)
{
    try {
        $pdo = repo_db();
        $status = in_array($status, ['pending', 'published', 'rejected'], true) ? $status : 'pending';
        $hasApprovalColumns = repo_blogs_has_approval_columns();

        if ($status === 'published' && $hasApprovalColumns) {
            $stmt = $pdo->prepare(
                'UPDATE blogs
                 SET status = :status,
                     approved_at = NOW(),
                     approved_by = :approved_by,
                     updated_at = NOW()
                 WHERE id = :id'
            );
            $stmt->execute([
                ':status' => $status,
                ':approved_by' => $approvedByUserId !== null ? (int) $approvedByUserId : null,
                ':id' => (int) $blogId,
            ]);
        } elseif ($status === 'published') {
            $stmt = $pdo->prepare(
                'UPDATE blogs
                 SET status = :status,
                     updated_at = NOW()
                 WHERE id = :id'
            );
            $stmt->execute([
                ':status' => $status,
                ':id' => (int) $blogId,
            ]);
        } elseif ($hasApprovalColumns) {
            $stmt = $pdo->prepare(
                'UPDATE blogs
                 SET status = :status,
                     approved_at = NULL,
                     approved_by = NULL,
                     updated_at = NOW()
                 WHERE id = :id'
            );
            $stmt->execute([
                ':status' => $status,
                ':id' => (int) $blogId,
            ]);
        } else {
            $stmt = $pdo->prepare(
                'UPDATE blogs
                 SET status = :status,
                     updated_at = NOW()
                 WHERE id = :id'
            );
            $stmt->execute([
                ':status' => $status,
                ':id' => (int) $blogId,
            ]);
        }

        if ($stmt->rowCount() > 0) {
            return true;
        }

        $exists = $pdo->prepare('SELECT id FROM blogs WHERE id = :id LIMIT 1');
        $exists->execute([':id' => (int) $blogId]);
        return (bool) $exists->fetchColumn();
    } catch (Throwable $e) {
        error_log('repo_update_blog_status failed: ' . $e->getMessage());
        return false;
    }
}

function repo_delete_blog($blogId)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare('DELETE FROM blogs WHERE id = :id');
        $stmt->execute([':id' => (int) $blogId]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_delete_blog failed: ' . $e->getMessage());
        return false;
    }
}

function repo_fetch_questions()
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->query(
            'SELECT
                q.id, q.title, q.content, q.author_id, q.views, q.created_at,
                u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar,
                COUNT(a.id) AS answers_count,
                MAX(CASE WHEN a.is_verified = 1 THEN 1 ELSE 0 END) AS has_verified_answer
             FROM questions q
             LEFT JOIN users u ON u.id = q.author_id
             LEFT JOIN answers a ON a.question_id = q.id
             GROUP BY q.id, q.title, q.content, q.author_id, q.views, q.created_at, u.name, u.role, u.avatar
             ORDER BY q.created_at DESC'
        );
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_questions failed: ' . $e->getMessage());
        return [];
    }
}

function repo_fetch_question_by_id($questionId)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'SELECT
                q.id, q.title, q.content, q.author_id, q.views, q.created_at,
                u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar,
                COUNT(a.id) AS answers_count,
                MAX(CASE WHEN a.is_verified = 1 THEN 1 ELSE 0 END) AS has_verified_answer
             FROM questions q
             LEFT JOIN users u ON u.id = q.author_id
             LEFT JOIN answers a ON a.question_id = q.id
             WHERE q.id = :id
             GROUP BY q.id, q.title, q.content, q.author_id, q.views, q.created_at, u.name, u.role, u.avatar
             LIMIT 1'
        );
        $stmt->execute([':id' => (int) $questionId]);
        $row = $stmt->fetch();
        return $row ?: null;
    } catch (Throwable $e) {
        error_log('repo_fetch_question_by_id failed: ' . $e->getMessage());
        return null;
    }
}

function repo_fetch_answers_by_question($questionId)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'SELECT
                a.id, a.question_id, a.author_id, a.content, a.is_verified, a.created_at,
                u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar
             FROM answers a
             LEFT JOIN users u ON u.id = a.author_id
             WHERE a.question_id = :question_id
             ORDER BY
                CASE
                    WHEN a.is_verified = 1 THEN 0
                    WHEN LOWER(COALESCE(u.role, \'student\')) = \'mentor\' THEN 1
                    ELSE 2
                END ASC,
                a.created_at DESC,
                a.id DESC'
        );
        $stmt->execute([':question_id' => (int) $questionId]);
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_answers_by_question failed: ' . $e->getMessage());
        return [];
    }
}

function repo_increment_question_views($questionId)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'UPDATE questions
             SET views = COALESCE(views, 0) + 1
             WHERE id = :id'
        );
        $stmt->execute([':id' => (int) $questionId]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_increment_question_views failed: ' . $e->getMessage());
        return false;
    }
}

function repo_create_question($authorId, $title, $content)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'INSERT INTO questions (title, content, author_id, views, created_at)
             VALUES (:title, :content, :author_id, 0, NOW())'
        );
        $stmt->execute([
            ':title' => $title,
            ':content' => $content,
            ':author_id' => $authorId,
        ]);

        return ['success' => true, 'id' => (int) $pdo->lastInsertId()];
    } catch (Throwable $e) {
        error_log('repo_create_question failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to create question.'];
    }
}

function repo_update_question($questionId, $title, $content)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'UPDATE questions
             SET title = :title,
                 content = :content
             WHERE id = :id'
        );
        $stmt->execute([
            ':title' => $title,
            ':content' => $content,
            ':id' => (int) $questionId,
        ]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_update_question failed: ' . $e->getMessage());
        return false;
    }
}

function repo_delete_question($questionId)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare('DELETE FROM questions WHERE id = :id');
        $stmt->execute([':id' => (int) $questionId]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_delete_question failed: ' . $e->getMessage());
        return false;
    }
}

function repo_create_answer($questionId, $authorId, $content, $isVerified = 0)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'INSERT INTO answers (question_id, author_id, content, is_verified, created_at)
             VALUES (:question_id, :author_id, :content, :is_verified, NOW())'
        );
        $stmt->execute([
            ':question_id' => $questionId,
            ':author_id' => $authorId,
            ':content' => $content,
            ':is_verified' => (int) $isVerified,
        ]);

        return ['success' => true, 'id' => (int) $pdo->lastInsertId()];
    } catch (Throwable $e) {
        error_log('repo_create_answer failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to create answer.'];
    }
}

function repo_fetch_mentors()
{
    try {
        $pdo = repo_db();
        $locationSelect = repo_table_has_column('users', 'location')
            ? 'u.location AS location'
            : 'NULL AS location';
        $stmt = $pdo->query(
            "SELECT
                m.id, m.user_id, m.company, m.position, m.expertise, m.verified_by_admin,
                {$locationSelect},
                u.name, u.email, u.avatar, u.bio, u.status, u.verification_status
             FROM mentors m
             INNER JOIN users u ON u.id = m.user_id
             ORDER BY u.created_at DESC"
        );
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_mentors failed: ' . $e->getMessage());
        return [];
    }
}

function repo_create_mentorship_request($studentUserId, $mentorUserId, $message)
{
    try {
        repo_ensure_application_schema();
        $pdo = repo_db();
        $studentUserId = (int) $studentUserId;
        $mentorUserId = (int) $mentorUserId;

        if ($studentUserId <= 0 || $mentorUserId <= 0) {
            return ['success' => false, 'error' => 'Invalid student or mentor profile.'];
        }
        if ($studentUserId === $mentorUserId) {
            return ['success' => false, 'error' => 'You cannot request mentorship from your own account.'];
        }

        $pdo->beginTransaction();

        $studentStmt = $pdo->prepare('SELECT 1 FROM students WHERE user_id = :user_id LIMIT 1');
        $studentStmt->execute([':user_id' => $studentUserId]);
        $student = $studentStmt->fetchColumn();

        $mentorStmt = $pdo->prepare('SELECT 1 FROM mentors WHERE user_id = :user_id LIMIT 1');
        $mentorStmt->execute([':user_id' => $mentorUserId]);
        $mentor = $mentorStmt->fetchColumn();

        if (!$student || !$mentor) {
            $pdo->rollBack();
            return ['success' => false, 'error' => 'Invalid student or mentor profile.'];
        }

        $recentStmt = $pdo->prepare(
            'SELECT created_at
             FROM mentorship_requests
             WHERE student_id = :student_id
               AND mentor_id = :mentor_id
               AND created_at > DATE_SUB(NOW(), INTERVAL 2 DAY)
             ORDER BY created_at DESC
             LIMIT 1
             FOR UPDATE'
        );
        $recentStmt->execute([
            ':student_id' => $studentUserId,
            ':mentor_id' => $mentorUserId,
        ]);
        $recentRequest = $recentStmt->fetch();
        if ($recentRequest) {
            $createdAt = (string) ($recentRequest['created_at'] ?? '');
            $retryDate = null;
            $retryAfterSeconds = null;

            if ($createdAt !== '') {
                try {
                    $requestTime = new DateTimeImmutable($createdAt);
                    $retryDateTime = $requestTime->modify('+2 days');
                    $retryDate = $retryDateTime->format('Y-m-d H:i:s');
                    $retryAfterSeconds = max(1, $retryDateTime->getTimestamp() - time());
                } catch (Throwable $e) {
                    $retryDate = null;
                    $retryAfterSeconds = null;
                }
            }

            $pdo->rollBack();

            $messageText = 'You can send another mentorship request to this mentor only after 2 days.';
            if ($retryDate) {
                try {
                    $messageText = 'You can send another mentorship request to this mentor after ' . (new DateTimeImmutable($retryDate))->format('M d, Y h:i A') . '.';
                } catch (Throwable $e) {
                    $messageText = 'You can send another mentorship request to this mentor after ' . $retryDate . '.';
                }
            }

            return [
                'success' => false,
                'code' => 'rate_limited',
                'error' => $messageText,
                'retry_at' => $retryDate,
                'retry_after_seconds' => $retryAfterSeconds,
            ];
        }

        $insert = $pdo->prepare(
            'INSERT INTO mentorship_requests (student_id, mentor_id, status, message, created_at)
             VALUES (:student_id, :mentor_id, :status, :message, NOW())'
        );
        $insert->execute([
            ':student_id' => $studentUserId,
            ':mentor_id' => $mentorUserId,
            ':status' => 'pending',
            ':message' => $message,
        ]);

        $pdo->commit();
        return ['success' => true, 'id' => (int) $pdo->lastInsertId()];
    } catch (Throwable $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('repo_create_mentorship_request failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to create mentorship request.'];
    }
}

function repo_fetch_mentorship_requests($userId = null, $role = null)
{
    try {
        $pdo = repo_db();
        $sql = 'SELECT
                    mr.id, mr.status, mr.message, mr.created_at,
                    su.id AS student_user_id, su.name AS student_name,
                    mu.id AS mentor_user_id, mu.name AS mentor_name
                FROM mentorship_requests mr
                INNER JOIN users su ON su.id = mr.student_id
                INNER JOIN users mu ON mu.id = mr.mentor_id
                INNER JOIN students s ON s.user_id = su.id
                INNER JOIN mentors m ON m.user_id = mu.id';
        $params = [];

        if ($role === 'student' && $userId) {
            $sql .= ' WHERE mr.student_id = :user_id';
            $params[':user_id'] = $userId;
        } elseif ($role === 'mentor' && $userId) {
            $sql .= ' WHERE mr.mentor_id = :user_id';
            $params[':user_id'] = $userId;
        }

        $sql .= ' ORDER BY mr.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_mentorship_requests failed: ' . $e->getMessage());
        return [];
    }
}

function repo_update_mentorship_request_status($requestId, $status, $mentorUserId = null, $isAdmin = false)
{
    $status = in_array($status, ['pending', 'approved', 'rejected', 'completed'], true) ? $status : 'pending';

    try {
        $pdo = repo_db();
        if ($isAdmin) {
            $stmt = $pdo->prepare(
                'UPDATE mentorship_requests
                 SET status = :status
                 WHERE id = :id'
            );
            $stmt->execute([
                ':status' => $status,
                ':id' => (int) $requestId,
            ]);
        } else {
            $stmt = $pdo->prepare(
                'UPDATE mentorship_requests
                 SET status = :status
                 WHERE id = :id AND mentor_id = :mentor_id'
            );
            $stmt->execute([
                ':status' => $status,
                ':id' => (int) $requestId,
                ':mentor_id' => (int) $mentorUserId,
            ]);
        }
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_update_mentorship_request_status failed: ' . $e->getMessage());
        return false;
    }
}

function repo_fetch_admin_users()
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->query(
            'SELECT
                u.id, u.name, u.email, u.role, u.status, u.is_email_verified, u.verification_status, u.created_at, u.updated_at,
                s.roll_number, s.branch, s.year,
                m.company, m.position, m.expertise, m.verified_by_admin
             FROM users u
             LEFT JOIN students s ON s.user_id = u.id
             LEFT JOIN mentors m ON m.user_id = u.id
             ORDER BY u.created_at DESC'
        );
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_admin_users failed: ' . $e->getMessage());
        return [];
    }
}

function repo_update_user_verification($userId, $verificationStatus)
{
    $verificationStatus = in_array($verificationStatus, ['pending', 'approved', 'rejected'], true) ? $verificationStatus : 'pending';
    $isEmailVerified = $verificationStatus === 'approved' ? 1 : 0;
    $status = $verificationStatus === 'approved' ? 'active' : 'inactive';

    try {
        $pdo = repo_db();
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'UPDATE users
             SET verification_status = :verification_status,
                 is_email_verified = :is_email_verified,
                 status = :status,
                 updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            ':verification_status' => $verificationStatus,
            ':is_email_verified' => $isEmailVerified,
            ':status' => $status,
            ':id' => $userId,
        ]);

        if ($verificationStatus === 'approved') {
            $mentorStmt = $pdo->prepare('UPDATE mentors SET verified_by_admin = 1 WHERE user_id = :user_id');
            $mentorStmt->execute([':user_id' => $userId]);
        }

        $pdo->commit();
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('repo_update_user_verification failed: ' . $e->getMessage());
        return false;
    }
}

function repo_fetch_user_profile($userId)
{
    try {
        $pdo = repo_db();

        $phoneColumn = repo_table_has_column('users', 'phone') ? 'u.phone AS phone' : 'NULL AS phone';
        $locationColumn = repo_table_has_column('users', 'location') ? 'u.location AS location' : 'NULL AS location';
        $skillsColumn = repo_table_has_column('users', 'skills') ? 'u.skills AS skills' : 'NULL AS skills';
        $interestsColumn = repo_table_has_column('users', 'interests') ? 'u.interests AS interests' : 'NULL AS interests';

        $stmt = $pdo->prepare(
            "SELECT
                u.id, u.name, u.email, u.role, u.avatar, u.bio, u.created_at, u.updated_at,
                {$phoneColumn},
                {$locationColumn},
                {$skillsColumn},
                {$interestsColumn},
                s.roll_number, s.branch, s.year, s.college_id_path,
                m.company, m.position, m.expertise, m.job_id_path, m.verified_by_admin
             FROM users u
             LEFT JOIN students s ON s.user_id = u.id
             LEFT JOIN mentors m ON m.user_id = u.id
             WHERE u.id = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => (int) $userId]);
        $profile = $stmt->fetch();
        return $profile ?: null;
    } catch (Throwable $e) {
        error_log('repo_fetch_user_profile failed: ' . $e->getMessage());
        return null;
    }
}

function repo_update_user_profile_details($userId, $role, array $payload)
{
    $role = strtolower((string) $role);
    if (!in_array($role, ['student', 'mentor', 'admin'], true)) {
        return ['success' => false, 'error' => 'Invalid role for profile update.'];
    }

    try {
        repo_ensure_application_schema();
        $pdo = repo_db();
        $pdo->beginTransaction();

        $params = [
            ':name' => $payload['name'],
            ':email' => $payload['email'],
            ':bio' => $payload['bio'] ?? null,
            ':avatar' => $payload['avatar'] ?? null,
            ':id' => (int) $userId,
            ':role' => $role,
        ];

        $userSql = 'UPDATE users
                    SET name = :name,
                        email = :email,
                        bio = :bio,
                        avatar = :avatar,
                        updated_at = NOW()';

        if (repo_table_has_column('users', 'phone')) {
            $userSql .= ', phone = :phone';
            $params[':phone'] = $payload['phone'] ?? null;
        }
        if (repo_table_has_column('users', 'location')) {
            $userSql .= ', location = :location';
            $params[':location'] = $payload['location'] ?? null;
        }
        if (repo_table_has_column('users', 'skills')) {
            $userSql .= ', skills = :skills';
            $params[':skills'] = $payload['skills'] ?? null;
        }
        if (repo_table_has_column('users', 'interests')) {
            $userSql .= ', interests = :interests';
            $params[':interests'] = $payload['interests'] ?? null;
        }

        $userSql .= ' WHERE id = :id AND role = :role';
        $userStmt = $pdo->prepare($userSql);
        $userStmt->execute($params);

        if ($userStmt->rowCount() === 0) {
            $existsStmt = $pdo->prepare('SELECT 1 FROM users WHERE id = :id AND role = :role LIMIT 1');
            $existsStmt->execute([':id' => (int) $userId, ':role' => $role]);
            if (!$existsStmt->fetchColumn()) {
                $pdo->rollBack();
                return ['success' => false, 'error' => 'User profile not found.'];
            }
        }

        if ($role === 'student') {
            $studentStmt = $pdo->prepare(
                'INSERT INTO students (user_id, roll_number, branch, year, college_id_path)
                 VALUES (:user_id, :roll_number, :branch, :year, :college_id_path)
                 ON DUPLICATE KEY UPDATE
                    roll_number = VALUES(roll_number),
                    branch = VALUES(branch),
                    year = VALUES(year)'
            );
            $studentStmt->execute([
                ':user_id' => (int) $userId,
                ':roll_number' => $payload['roll_number'],
                ':branch' => $payload['branch'] ?? null,
                ':year' => $payload['year'] ?? null,
                ':college_id_path' => $payload['college_id_path'] ?? null,
            ]);
        } elseif ($role === 'mentor') {
            $mentorStmt = $pdo->prepare(
                'INSERT INTO mentors (user_id, company, position, expertise, job_id_path, verified_by_admin)
                 VALUES (:user_id, :company, :position, :expertise, :job_id_path, :verified_by_admin)
                 ON DUPLICATE KEY UPDATE
                    company = VALUES(company),
                    position = VALUES(position),
                    expertise = VALUES(expertise)'
            );
            $mentorStmt->execute([
                ':user_id' => (int) $userId,
                ':company' => $payload['company'] ?? null,
                ':position' => $payload['position'] ?? null,
                ':expertise' => $payload['expertise'] ?? null,
                ':job_id_path' => $payload['job_id_path'] ?? null,
                ':verified_by_admin' => $payload['verified_by_admin'] ?? 0,
            ]);
        }

        $pdo->commit();
        return ['success' => true];
    } catch (PDOException $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e->getCode() === '23000') {
            $errorText = strtolower((string) $e->getMessage());
            if (strpos($errorText, 'roll') !== false) {
                return ['success' => false, 'error' => 'Roll number already exists.'];
            }
            return ['success' => false, 'error' => 'Email already exists.'];
        }
        error_log('repo_update_user_profile_details failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to update profile.'];
    } catch (Throwable $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('repo_update_user_profile_details failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to update profile.'];
    }
}

function repo_update_user_profile($userId, $name, $bio = null, $avatar = null)
{
    $profile = repo_fetch_user_profile((int) $userId);
    if (!$profile) {
        return false;
    }

    $result = repo_update_user_profile_details((int) $userId, (string) ($profile['role'] ?? ''), [
        'name' => $name,
        'email' => (string) ($profile['email'] ?? ''),
        'bio' => $bio,
        'avatar' => $avatar,
        'phone' => $profile['phone'] ?? null,
        'location' => $profile['location'] ?? null,
        'skills' => $profile['skills'] ?? null,
        'interests' => $profile['interests'] ?? null,
        'roll_number' => $profile['roll_number'] ?? null,
        'branch' => $profile['branch'] ?? null,
        'year' => $profile['year'] ?? null,
        'college_id_path' => $profile['college_id_path'] ?? null,
        'company' => $profile['company'] ?? null,
        'position' => $profile['position'] ?? null,
        'expertise' => $profile['expertise'] ?? null,
        'job_id_path' => $profile['job_id_path'] ?? null,
        'verified_by_admin' => $profile['verified_by_admin'] ?? 0,
    ]);

    return (bool) ($result['success'] ?? false);
}

function repo_update_user_password($userId, $passwordHash)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'UPDATE users
             SET password = :password,
                 updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            ':password' => $passwordHash,
            ':id' => (int) $userId,
        ]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_update_user_password failed: ' . $e->getMessage());
        return false;
    }
}

function repo_delete_user_account($userId)
{
    try {
        $pdo = repo_db();
        $pdo->beginTransaction();

        // Prevent FK restriction from announcements.created_by
        $delAnnouncements = $pdo->prepare('DELETE FROM announcements WHERE created_by = :id');
        $delAnnouncements->execute([':id' => (int) $userId]);

        $delUser = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $delUser->execute([':id' => (int) $userId]);

        $deleted = $delUser->rowCount() > 0;
        $pdo->commit();
        return $deleted;
    } catch (Throwable $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('repo_delete_user_account failed: ' . $e->getMessage());
        return false;
    }
}

function repo_update_mentor_by_admin($userId, array $payload)
{
    try {
        $pdo = repo_db();
        $pdo->beginTransaction();

        $userStmt = $pdo->prepare(
            'UPDATE users
             SET name = :name,
                 email = :email,
                 status = :status,
                 verification_status = :verification_status,
                 is_email_verified = :is_email_verified,
                 updated_at = NOW()
             WHERE id = :id AND role = \'mentor\''
        );
        $userStmt->execute([
            ':name' => $payload['name'],
            ':email' => $payload['email'],
            ':status' => $payload['status'],
            ':verification_status' => $payload['verification_status'],
            ':is_email_verified' => (int) $payload['is_email_verified'],
            ':id' => (int) $userId,
        ]);

        $mentorStmt = $pdo->prepare(
            'UPDATE mentors
             SET company = :company,
                 position = :position,
                 expertise = :expertise,
                 verified_by_admin = :verified_by_admin
             WHERE user_id = :id'
        );
        $mentorStmt->execute([
            ':company' => $payload['company'],
            ':position' => $payload['position'],
            ':expertise' => $payload['expertise'],
            ':verified_by_admin' => (int) $payload['verified_by_admin'],
            ':id' => (int) $userId,
        ]);

        $pdo->commit();
        return ($userStmt->rowCount() > 0) || ($mentorStmt->rowCount() > 0);
    } catch (Throwable $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('repo_update_mentor_by_admin failed: ' . $e->getMessage());
        return false;
    }
}

function repo_delete_user_by_admin($userId, array $allowedRoles = ['student', 'mentor'])
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => (int) $userId]);
        $role = $stmt->fetchColumn();
        if (!$role || !in_array($role, $allowedRoles, true)) {
            return false;
        }
        return repo_delete_user_account((int) $userId);
    } catch (Throwable $e) {
        error_log('repo_delete_user_by_admin failed: ' . $e->getMessage());
        return false;
    }
}

function repo_fetch_admin_blogs()
{
    return repo_fetch_blogs(null);
}

function repo_count_active_students()
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->query(
            'SELECT COUNT(*) FROM students s
             INNER JOIN users u ON u.id = s.user_id
             WHERE u.status = \'active\''
        );
        return (int) $stmt->fetchColumn();
    } catch (Throwable $e) {
        error_log('repo_count_active_students failed: ' . $e->getMessage());
        return 0;
    }
}

function repo_fetch_announcements()
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->query(
            'SELECT a.id, a.title, a.content, a.created_by, a.created_at, u.name AS created_by_name
             FROM announcements a
             LEFT JOIN users u ON u.id = a.created_by
             ORDER BY a.created_at DESC'
        );
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_announcements failed: ' . $e->getMessage());
        return [];
    }
}

function repo_create_announcement($title, $content, $createdBy)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'INSERT INTO announcements (title, content, created_by, created_at)
             VALUES (:title, :content, :created_by, NOW())'
        );
        $stmt->execute([
            ':title' => $title,
            ':content' => $content,
            ':created_by' => $createdBy,
        ]);

        return ['success' => true, 'id' => (int) $pdo->lastInsertId()];
    } catch (Throwable $e) {
        error_log('repo_create_announcement failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to create announcement.'];
    }
}

function repo_update_announcement($announcementId, $title, $content)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'UPDATE announcements
             SET title = :title,
                 content = :content
             WHERE id = :id'
        );
        $stmt->execute([
            ':title' => $title,
            ':content' => $content,
            ':id' => (int) $announcementId,
        ]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_update_announcement failed: ' . $e->getMessage());
        return false;
    }
}

function repo_delete_announcement($announcementId)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare('DELETE FROM announcements WHERE id = :id');
        $stmt->execute([':id' => (int) $announcementId]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        error_log('repo_delete_announcement failed: ' . $e->getMessage());
        return false;
    }
}

function repo_search_content($query, $limitPerType = 8)
{
    $query = trim((string) $query);
    if ($query === '') {
        return ['blogs' => [], 'questions' => [], 'mentors' => []];
    }

    $limit = max(1, min(25, (int) $limitPerType));
    $like = '%' . $query . '%';

    try {
        $pdo = repo_db();
        $blogColumns = repo_blog_select_columns_sql();

        $blogStmt = $pdo->prepare(
            "SELECT
                {$blogColumns},
                u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar, u.bio AS author_bio
             FROM blogs b
             LEFT JOIN users u ON u.id = b.author_id
             WHERE (b.title LIKE :blog_like_title OR b.content LIKE :blog_like_content)
               AND b.status = 'published'
             ORDER BY b.created_at DESC
             LIMIT :lim"
        );
        $blogStmt->bindValue(':blog_like_title', $like, PDO::PARAM_STR);
        $blogStmt->bindValue(':blog_like_content', $like, PDO::PARAM_STR);
        $blogStmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $blogStmt->execute();
        $blogs = $blogStmt->fetchAll();

        $questionStmt = $pdo->prepare(
            'SELECT
                q.id, q.title, q.content, q.author_id, q.views, q.created_at,
                u.name AS author_name, u.role AS author_role, u.avatar AS author_avatar,
                COUNT(a.id) AS answers_count,
                MAX(CASE WHEN a.is_verified = 1 THEN 1 ELSE 0 END) AS has_verified_answer
             FROM questions q
             LEFT JOIN users u ON u.id = q.author_id
             LEFT JOIN answers a ON a.question_id = q.id
             WHERE q.title LIKE :question_like_title OR q.content LIKE :question_like_content
             GROUP BY q.id, q.title, q.content, q.author_id, q.views, q.created_at, u.name, u.role, u.avatar
             ORDER BY q.created_at DESC
             LIMIT :lim'
        );
        $questionStmt->bindValue(':question_like_title', $like, PDO::PARAM_STR);
        $questionStmt->bindValue(':question_like_content', $like, PDO::PARAM_STR);
        $questionStmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $questionStmt->execute();
        $questions = $questionStmt->fetchAll();

        $locationSelect = repo_table_has_column('users', 'location')
            ? 'u.location AS location'
            : 'NULL AS location';

        $mentorStmt = $pdo->prepare(
            "SELECT
                m.id, m.user_id, m.company, m.position, m.expertise, m.verified_by_admin,
                {$locationSelect},
                u.name, u.email, u.avatar, u.bio, u.status, u.verification_status
             FROM mentors m
             INNER JOIN users u ON u.id = m.user_id
             WHERE u.name LIKE :mentor_like_name OR COALESCE(u.bio, '') LIKE :mentor_like_bio
             ORDER BY u.created_at DESC
             LIMIT :lim"
        );
        $mentorStmt->bindValue(':mentor_like_name', $like, PDO::PARAM_STR);
        $mentorStmt->bindValue(':mentor_like_bio', $like, PDO::PARAM_STR);
        $mentorStmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $mentorStmt->execute();
        $mentors = $mentorStmt->fetchAll();

        return [
            'blogs' => $blogs ?: [],
            'questions' => $questions ?: [],
            'mentors' => $mentors ?: [],
        ];
    } catch (Throwable $e) {
        error_log('repo_search_content failed: ' . $e->getMessage());
        return ['blogs' => [], 'questions' => [], 'mentors' => []];
    }
}

// ===== Chat / Messages =====

function repo_fetch_mentorship_request_by_id($requestId)
{
    try {
        $pdo = repo_db();
        $stmt = $pdo->prepare(
            'SELECT mr.id, mr.student_id, mr.mentor_id, mr.status, mr.message, mr.created_at,
                    su.name AS student_name, mu.name AS mentor_name
             FROM mentorship_requests mr
             INNER JOIN users su ON su.id = mr.student_id
             INNER JOIN users mu ON mu.id = mr.mentor_id
             WHERE mr.id = :id
             LIMIT 1'
        );
        $stmt->execute([':id' => (int) $requestId]);
        return $stmt->fetch() ?: null;
    } catch (Throwable $e) {
        error_log('repo_fetch_mentorship_request_by_id failed: ' . $e->getMessage());
        return null;
    }
}

function repo_validate_chat_access($requestId, $userId)
{
    $request = repo_fetch_mentorship_request_by_id($requestId);
    if (!$request) {
        return ['allowed' => false, 'error' => 'Mentorship request not found.'];
    }
    if ($request['status'] !== 'approved') {
        return ['allowed' => false, 'error' => 'Chat is only available for approved mentorship requests.'];
    }
    $studentId = (int) $request['student_id'];
    $mentorId = (int) $request['mentor_id'];
    if ((int) $userId !== $studentId && (int) $userId !== $mentorId) {
        return ['allowed' => false, 'error' => 'You are not part of this mentorship.'];
    }
    return [
        'allowed' => true,
        'request' => $request,
        'student_id' => $studentId,
        'mentor_id' => $mentorId,
    ];
}

function repo_create_message($requestId, $senderId, $receiverId, $message, $senderRole = null)
{
    try {
        repo_ensure_application_schema();
        $pdo = repo_db();
        $normalizedRole = strtolower((string) $senderRole);
        if (!in_array($normalizedRole, ['student', 'mentor'], true)) {
            $normalizedRole = null;
        }

        if (repo_table_has_column('messages', 'sender_role')) {
            $stmt = $pdo->prepare(
                'INSERT INTO messages (request_id, sender_id, sender_role, receiver_id, message, created_at)
                 VALUES (:request_id, :sender_id, :sender_role, :receiver_id, :message, NOW())'
            );
            $stmt->execute([
                ':request_id' => (int) $requestId,
                ':sender_id' => (int) $senderId,
                ':sender_role' => $normalizedRole,
                ':receiver_id' => (int) $receiverId,
                ':message' => $message,
            ]);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO messages (request_id, sender_id, receiver_id, message, created_at)
                 VALUES (:request_id, :sender_id, :receiver_id, :message, NOW())'
            );
            $stmt->execute([
                ':request_id' => (int) $requestId,
                ':sender_id' => (int) $senderId,
                ':receiver_id' => (int) $receiverId,
                ':message' => $message,
            ]);
        }

        return ['success' => true, 'id' => (int) $pdo->lastInsertId()];
    } catch (Throwable $e) {
        error_log('repo_create_message failed: ' . $e->getMessage());
        return ['success' => false, 'error' => 'Failed to send message.'];
    }
}

function repo_fetch_messages($requestId)
{
    try {
        $pdo = repo_db();
        $senderRoleSelect = repo_table_has_column('messages', 'sender_role')
            ? 'COALESCE(m.sender_role, u.role) AS sender_role'
            : 'u.role AS sender_role';
        $stmt = $pdo->prepare(
            "SELECT m.id, m.request_id, m.sender_id, m.receiver_id, m.message, m.created_at,
                    {$senderRoleSelect},
                    u.name AS sender_name
             FROM messages m
             INNER JOIN users u ON u.id = m.sender_id
             WHERE m.request_id = :request_id
             ORDER BY m.created_at ASC"
        );
        $stmt->execute([':request_id' => (int) $requestId]);
        return $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('repo_fetch_messages failed: ' . $e->getMessage());
        return [];
    }
}
