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

        $pdo->exec('USE `' . DB_NAME . '`');

        // Check if core tables exist
        $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
        if ($stmt->rowCount() === 0) {
            return false;
        }

        // Verify seed data was imported: check multiple tables for data.
        // If tables exist but are empty (or only have manually-created users),
        // seed data was not imported — need to re-run setup.
        $studentCount = (int) $pdo->query('SELECT COUNT(*) FROM students')->fetchColumn();
        $mentorCount  = (int) $pdo->query('SELECT COUNT(*) FROM mentors')->fetchColumn();
        if ($studentCount === 0 && $mentorCount === 0) {
            return false;
        }

        return true;
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

        // Split SQL into core statements and migration (PREPARE/EXECUTE) block.
        // multi_query can choke on dynamic SQL, so we run them separately.
        $migrationMarker = '-- Migration:';
        $markerPos = strpos($sql, $migrationMarker);
        $coreSql = $markerPos !== false ? substr($sql, 0, $markerPos) : $sql;
        $migrationSql = $markerPos !== false ? substr($sql, $markerPos) : '';

        // Use mysqli for reliable multi-statement import.
        $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, '', DB_PORT);
        if ($mysqli->connect_error) {
            return ['success' => false, 'message' => 'MySQL connection failed: ' . $mysqli->connect_error];
        }

        $mysqli->set_charset('utf8mb4');

        // Step 1: Run core SQL (schema + seed data)
        if (!$mysqli->multi_query($coreSql)) {
            $err = $mysqli->error;
            $mysqli->close();
            return ['success' => false, 'message' => 'SQL import failed: ' . $err];
        }

        // Consume all result sets from core SQL
        do {
            if ($result = $mysqli->store_result()) {
                $result->free();
            }
        } while ($mysqli->next_result());

        $coreError = $mysqli->error;

        // Step 2: Run migration SQL separately (PREPARE/EXECUTE)
        $migrationWarning = '';
        if ($migrationSql !== '' && !$coreError) {
            if (!$mysqli->multi_query($migrationSql)) {
                $migrationWarning = $mysqli->error;
            } else {
                do {
                    if ($result = $mysqli->store_result()) {
                        $result->free();
                    }
                } while ($mysqli->next_result());
                if ($mysqli->error) {
                    $migrationWarning = $mysqli->error;
                }
            }
        }

        $mysqli->close();

        if ($coreError) {
            return ['success' => false, 'message' => 'SQL import failed: ' . $coreError];
        }

        $msg = 'Database created and seed data imported successfully.';
        if ($migrationWarning) {
            $msg .= ' (Migration note: ' . $migrationWarning . ')';
        }

        return ['success' => true, 'message' => $msg];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Setup error: ' . $e->getMessage()];
    }
}

// When accessed directly, run setup and show result
if (php_sapi_name() !== 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    header('Content-Type: text/html; charset=utf-8');

    $forceReset = isset($_GET['force']);

    if (!$forceReset && isDatabaseReady()) {
        echo '<!DOCTYPE html><html><head><title>Setup</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;">';
        echo '<h2 style="color:green;">&#10003; Database is already set up!</h2>';
        echo '<p>Everything is ready. <a href="' . htmlspecialchars(BASE_URL) . '">Open the app</a></p>';
        echo '<p style="margin-top:20px;"><a href="?force" style="color:#c00;" onclick="return confirm(\'This will reset the database and re-import all seed data. Continue?\')">&#x21bb; Force re-import seed data</a></p>';
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
