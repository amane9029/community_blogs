-- Community Blogs database initialization script
-- Compatible with phpMyAdmin / MySQL

CREATE DATABASE IF NOT EXISTS `community_blogs`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `community_blogs`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `mentorship_requests`;
DROP TABLE IF EXISTS `answers`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `blogs`;
DROP TABLE IF EXISTS `mentors`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student','mentor','admin') NOT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `verification_token` VARCHAR(255) DEFAULT NULL,
  `verification_status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `bio` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `roll_number` VARCHAR(100) NOT NULL,
  `branch` VARCHAR(100) DEFAULT NULL,
  `year` INT DEFAULT NULL,
  `college_id_path` VARCHAR(255) DEFAULT NULL,
  UNIQUE KEY `uq_students_user_id` (`user_id`),
  UNIQUE KEY `uq_students_roll_number` (`roll_number`),
  CONSTRAINT `fk_students_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mentors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `company` VARCHAR(255) DEFAULT NULL,
  `position` VARCHAR(255) DEFAULT NULL,
  `expertise` VARCHAR(255) DEFAULT NULL,
  `job_id_path` VARCHAR(255) DEFAULT NULL,
  `verified_by_admin` TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY `uq_mentors_user_id` (`user_id`),
  CONSTRAINT `fk_mentors_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `blogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `excerpt` TEXT,
  `category` VARCHAR(100) DEFAULT NULL,
  `author_id` INT NOT NULL,
  `status` ENUM('pending','published','rejected') NOT NULL DEFAULT 'pending',
  `views` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approved_at` DATETIME DEFAULT NULL,
  `approved_by` INT DEFAULT NULL,
  KEY `idx_blogs_author_id` (`author_id`),
  KEY `idx_blogs_approved_by` (`approved_by`),
  CONSTRAINT `fk_blogs_author`
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_blogs_approved_by`
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `author_id` INT NOT NULL,
  `views` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_questions_author_id` (`author_id`),
  CONSTRAINT `fk_questions_author`
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `answers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `question_id` INT NOT NULL,
  `author_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_answers_question_id` (`question_id`),
  KEY `idx_answers_author_id` (`author_id`),
  CONSTRAINT `fk_answers_question`
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_answers_author`
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mentorship_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `mentor_id` INT NOT NULL,
  `status` ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  `message` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_mentorship_student_id` (`student_id`),
  KEY `idx_mentorship_mentor_id` (`mentor_id`),
  CONSTRAINT `fk_mentorship_student_user`
    FOREIGN KEY (`student_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_mentorship_mentor_user`
    FOREIGN KEY (`mentor_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `created_by` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_announcements_created_by` (`created_by`),
  CONSTRAINT `fk_announcements_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed data
-- ============================================================

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `is_email_verified`, `verification_token`, `verification_status`, `avatar`, `bio`, `created_at`, `updated_at`) VALUES
(15, 'System Admin', 'admin@system.com', '$2y$10$MPc6ozIZ18W1dG3v/mP0gexXgOXUrHQ7qJl2Qi0QTxyuLaX6quo9W', 'admin', 'active', 1, NULL, 'approved', NULL, NULL, '2026-02-12 00:27:15', '2026-02-12 18:18:03'),
(16, 'Kenji Tanaka', 'kenji@student.com', '$2y$10$ZxljvkVHEjqTxl./lRCj.e4PGljgTJE6NztgQ5CyVezkTH7NbNhJS', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-02-12 00:27:15', '2026-02-12 18:18:03'),
(17, 'Ren Yamamoto', 'ren@student.com', '$2y$10$kJ7sH9dL3xP2qR8uT6vW1uE9yC4zB7mN5fQ2rL8sT3uV9xY6zA1B2', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-02-12 00:27:15', '2026-02-12 00:27:15'),
(18, 'Dr. Sakura Sato', 'sakura@mentor.com', '$2y$10$99IQxLADfD1ACYPePlZzwOXB1eISbaowZ.oQU5uarxJArAa0awMXq', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-02-12 00:27:15', '2026-02-12 18:18:03'),
(19, 'Hiroshi Nakamura', 'hiroshi@mentor.com', '$2y$10$uL9pQ3rS7tV2xY8zA4bC6dE1fG5hJ8kL2mN9pQ4rS6tV3xY7zB8C9', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-02-12 00:27:15', '2026-02-12 00:27:15'),
(22, 'leo', 'leo@gmail.com', '$2y$10$S2rmR/rDnjRyHehh3PDKDuKSXeFF54PLizJKebwLsXfnLOE7SntRG', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-02-13 19:42:59', '2026-02-13 19:42:59');

INSERT INTO `students` (`id`, `user_id`, `roll_number`, `branch`, `year`, `college_id_path`) VALUES
(3, 16, 'CS2023001', 'Computer Science', 3, NULL),
(4, 17, 'IT2022004', 'Information Technology', 4, NULL);

INSERT INTO `mentors` (`id`, `user_id`, `company`, `position`, `expertise`, `job_id_path`, `verified_by_admin`) VALUES
(1, 18, 'Google', 'Senior Software Engineer', 'System Design, Java, Cloud', NULL, 1),
(2, 19, 'Amazon', 'Cloud Architect', 'AWS, Microservices, DevOps', NULL, 1),
(3, 22, '', '', '', 'uploads/ids/mentor/mentor_82cb89c0daa19100fa634932.png', 1);

INSERT INTO `blogs` (`id`, `title`, `content`, `excerpt`, `category`, `author_id`, `status`, `views`, `created_at`, `updated_at`, `approved_at`, `approved_by`) VALUES
(1, 'How to Prepare for Tech Interviews', 'Master DSA, practice mock interviews, and build projects consistently.', 'Complete interview preparation roadmap.', 'Career Guidance', 18, 'published', 120, '2026-02-12 00:29:50', '2026-02-12 00:29:50', NULL, NULL),
(2, 'Understanding System Design Basics', 'Learn about load balancing, caching strategies, CAP theorem, and scalability.', 'Beginner system design guide.', 'Tech', 19, 'published', 85, '2026-02-12 00:29:50', '2026-02-12 00:29:50', NULL, NULL),
(4, 'faaang', 'aaaaaadfgdfshfghfgnvbnvnhdfxgnh', 'aaaaaadfgdfshfghfgnvbnvnhdfxgnh', 'General', 16, 'pending', 0, '2026-02-12 20:26:45', '2026-02-12 20:26:45', NULL, NULL),
(5, 'esrgxfgncfv', 'sdgsdfgasedhfgjgkjydjfhdgsfadfqwertyuiop[lkjhgfd', 'sdgsdfgasedhfgjgkjydjfhdgsfadfqwertyuiop[lkjhgfd', 'General', 16, 'pending', 0, '2026-02-12 20:28:10', '2026-02-12 20:28:10', NULL, NULL),
(8, 'asdfjhadskfjlksjf', 'asdfaskjjhalksuhfaeskjbfksjdfsdf', 'asdfaskjjhalksuhfaeskjbfksjdfsdf', 'General', 15, 'pending', 0, '2026-02-12 21:14:56', '2026-02-12 21:14:56', NULL, NULL),
(9, 'hiiiiiiii', 'asdfasddflkj;lkj;lkj;lkjlkjasdfsdf', 'asdfasddflkj;lkj;lkj;lkjlkjasdfsdf', 'General', 16, 'pending', 0, '2026-02-13 19:23:31', '2026-02-13 19:23:31', NULL, NULL);

INSERT INTO `questions` (`id`, `title`, `content`, `author_id`, `views`, `created_at`) VALUES
(2, 'How to crack FAANG in 6 months?', 'Need structured preparation strategy and roadmap.', 16, 53, '2026-02-12 00:30:04'),
(3, 'Best way to learn System Design?', 'Should I start with theory or real-world projects?', 17, 30, '2026-02-12 00:30:04'),
(4, 'what is php', 'explain why this language is used', 16, 2, '2026-02-12 19:59:59'),
(5, 'what is python', 'tell me its use', 16, 2, '2026-02-12 20:02:52'),
(7, 'i want to know about faang', 'a;lssdfasdfsgdfg', 15, 15, '2026-02-12 21:15:57');

INSERT INTO `answers` (`id`, `question_id`, `author_id`, `content`, `is_verified`, `created_at`) VALUES
(5, 2, 18, 'Focus on DSA, system design fundamentals, and consistent mock interviews.', 1, '2026-02-12 00:33:54'),
(6, 3, 19, 'Start with theory, then implement scalable mini-projects.', 1, '2026-02-12 00:33:54'),
(7, 7, 16, 'it is a multinational company', 0, '2026-02-13 19:29:02'),
(8, 7, 18, 'itisfsjfhasdfasdf', 1, '2026-02-13 19:30:43');

INSERT INTO `mentorship_requests` (`id`, `student_id`, `mentor_id`, `status`, `message`, `created_at`) VALUES
(1, 16, 18, 'approved', 'Looking for backend mentorship guidance.', '2026-02-12 00:30:44'),
(2, 17, 19, 'pending', 'Need help preparing for cloud architecture roles.', '2026-02-12 00:30:44'),
(10, 16, 18, 'rejected', '', '2026-02-12 19:30:48'),
(11, 16, 18, 'pending', '.', '2026-02-12 20:05:45'),
(12, 16, 18, 'pending', 'a', '2026-02-12 21:55:38');

INSERT INTO `announcements` (`id`, `title`, `content`, `created_by`, `created_at`) VALUES
(1, 'Placement Season Started', 'All final year students must register before February 15.', 15, '2026-02-12 00:30:57'),
(2, 'New Mentors Onboarded', 'We have added new industry mentors from top tech companies.', 15, '2026-02-12 00:30:57'),
(4, 'placementssssss', 'starts from feb 29', 15, '2026-02-13 19:25:27');

-- ============================================================
-- Migration: Add blog moderation/approval columns (idempotent)
-- Safe to run on existing databases — skips if columns exist.
-- ============================================================

SET @schema_name = DATABASE();

SET @has_approved_at = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'blogs'
      AND COLUMN_NAME = 'approved_at'
);
SET @sql_add_approved_at = IF(
    @has_approved_at = 0,
    'ALTER TABLE `blogs` ADD COLUMN `approved_at` DATETIME NULL AFTER `updated_at`',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_approved_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_approved_by = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'blogs'
      AND COLUMN_NAME = 'approved_by'
);
SET @sql_add_approved_by = IF(
    @has_approved_by = 0,
    'ALTER TABLE `blogs` ADD COLUMN `approved_by` INT NULL AFTER `approved_at`',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_approved_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'blogs'
      AND INDEX_NAME = 'idx_blogs_approved_by'
);
SET @sql_add_idx = IF(
    @has_idx = 0,
    'ALTER TABLE `blogs` ADD KEY `idx_blogs_approved_by` (`approved_by`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @schema_name
      AND CONSTRAINT_NAME = 'fk_blogs_approved_by'
);
SET @sql_add_fk = IF(
    @has_fk = 0,
    'ALTER TABLE `blogs` ADD CONSTRAINT `fk_blogs_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
