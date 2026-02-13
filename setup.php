<?php
/**
 * Auto-setup script — creates the database and imports init_database.sql
 * if the DB does not yet exist. Safe to call multiple times.
 */

require_once __DIR__ . '/config/config.php';

function isDatabaseReady(): bool
{
    try {
        $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', DB_HOST, DB_PORT);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);

        // Check if the database exists
        $stmt = $pdo->prepare(
            "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = :db"
        );
        $stmt->execute([':db' => DB_NAME]);
        if (!$stmt->fetch()) {
            return false;
        }

        // Check if the users table exists (core table)
        $pdo->exec('USE `' . DB_NAME . '`');
        $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        return false;
    }
}

function runSetup(): array
{
    $sqlFile = __DIR__ . '/init_database.sql';
    if (!file_exists($sqlFile)) {
        return ['success' => false, 'message' => 'init_database.sql not found.'];
    }

    try {
        $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', DB_HOST, DB_PORT);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);

        $sql = file_get_contents($sqlFile);

        // PDO::exec cannot run multiple statements, so use multi_query via mysqli
        // or split and execute. We'll use mysqli for reliable multi-statement import.
        $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, '', DB_PORT);
        if ($mysqli->connect_error) {
            return ['success' => false, 'message' => 'MySQL connection failed: ' . $mysqli->connect_error];
        }

        $mysqli->set_charset('utf8mb4');

        if (!$mysqli->multi_query($sql)) {
            $err = $mysqli->error;
            $mysqli->close();
            return ['success' => false, 'message' => 'SQL import failed: ' . $err];
        }

        // Consume all result sets
        do {
            if ($result = $mysqli->store_result()) {
                $result->free();
            }
        } while ($mysqli->next_result());

        $finalError = $mysqli->error;
        $mysqli->close();

        if ($finalError) {
            return ['success' => false, 'message' => 'SQL import warning: ' . $finalError];
        }

        return ['success' => true, 'message' => 'Database created and seed data imported successfully.'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Setup error: ' . $e->getMessage()];
    }
}

// When accessed directly, run setup and show result
if (php_sapi_name() !== 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    header('Content-Type: text/html; charset=utf-8');

    if (isDatabaseReady()) {
        echo '<!DOCTYPE html><html><head><title>Setup</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;">';
        echo '<h2 style="color:green;">&#10003; Database is already set up!</h2>';
        echo '<p>Everything is ready. <a href="' . htmlspecialchars(BASE_URL) . '">Open the app</a></p>';
        echo '</body></html>';
        exit;
    }

    $result = runSetup();

    echo '<!DOCTYPE html><html><head><title>Setup</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;">';
    if ($result['success']) {
        echo '<h2 style="color:green;">&#10003; ' . htmlspecialchars($result['message']) . '</h2>';
        echo '<p><a href="' . htmlspecialchars(BASE_URL) . '">Open the app</a></p>';
        echo '<h3>Demo Login Credentials</h3>';
        echo '<table style="margin:0 auto;border-collapse:collapse;text-align:left;">';
        echo '<tr style="background:#f0f0f0;"><th style="padding:8px 16px;">Role</th><th style="padding:8px 16px;">Email</th><th style="padding:8px 16px;">Password</th></tr>';
        echo '<tr><td style="padding:8px 16px;">Student</td><td style="padding:8px 16px;">kenji@student.com</td><td style="padding:8px 16px;">123456</td></tr>';
        echo '<tr><td style="padding:8px 16px;">Mentor</td><td style="padding:8px 16px;">sakura@mentor.com</td><td style="padding:8px 16px;">123456</td></tr>';
        echo '<tr><td style="padding:8px 16px;">Admin</td><td style="padding:8px 16px;">admin@system.com</td><td style="padding:8px 16px;">123456</td></tr>';
        echo '</table>';
    } else {
        echo '<h2 style="color:red;">&#10007; ' . htmlspecialchars($result['message']) . '</h2>';
        echo '<p>Make sure XAMPP Apache and MySQL are running, then <a href="">try again</a>.</p>';
    }
    echo '</body></html>';
    exit;
}
