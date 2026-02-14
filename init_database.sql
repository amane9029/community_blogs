-- Community Blogs database initialization script
-- Compatible with phpMyAdmin / MySQL

CREATE DATABASE IF NOT EXISTS `community_blogs`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `community_blogs`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `_meta`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `mentorship_requests`;
DROP TABLE IF EXISTS `answers`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `blogs`;
DROP TABLE IF EXISTS `mentors`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- Data version: bump this number whenever seed/demo data changes.
-- setup.php checks this to detect stale data and auto-reimport.
CREATE TABLE `_meta` (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `_meta` (`key`, `value`) VALUES ('data_version', '2');

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
-- Demo Data (Auto-generated for GitHub distribution)
-- All demo user passwords: 123456
-- ============================================================

-- 70 Student Users (IDs 100–169)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `is_email_verified`, `verification_token`, `verification_status`, `avatar`, `bio`, `created_at`, `updated_at`) VALUES
(100, 'Aarav Sharma', 'aarav.sharma@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 01:54:53', '2026-01-05 01:54:53'),
(101, 'Rohan Verma', 'rohan.verma@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 03:45:11', '2026-01-05 03:45:11'),
(102, 'Priya Nair', 'priya.nair@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 06:13:00', '2026-01-05 06:13:00'),
(103, 'Ananya Reddy', 'ananya.reddy@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 11:28:04', '2026-01-05 11:28:04'),
(104, 'Vikram Singh', 'vikram.singh@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 14:06:28', '2026-01-05 14:06:28'),
(105, 'Sneha Iyer', 'sneha.iyer@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 16:24:31', '2026-01-05 16:24:31'),
(106, 'Arjun Mehta', 'arjun.mehta@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 19:50:16', '2026-01-05 19:50:16'),
(107, 'Diya Patel', 'diya.patel@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 22:45:25', '2026-01-05 22:45:25'),
(108, 'Kabir Joshi', 'kabir.joshi@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 01:56:24', '2026-01-06 01:56:24'),
(109, 'Ishita Gupta', 'ishita.gupta@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 03:04:30', '2026-01-06 03:04:30'),
(110, 'Aditya Kumar', 'aditya.kumar@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 08:28:06', '2026-01-06 08:28:06'),
(111, 'Meera Bhat', 'meera.bhat@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 10:08:37', '2026-01-06 10:08:37'),
(112, 'Siddharth Rao', 'siddharth.rao@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 12:48:46', '2026-01-06 12:48:46'),
(113, 'Kavya Menon', 'kavya.menon@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 15:28:26', '2026-01-06 15:28:26'),
(114, 'Rahul Chauhan', 'rahul.chauhan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 20:29:32', '2026-01-06 20:29:32'),
(115, 'Pooja Deshmukh', 'pooja.deshmukh@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 22:31:20', '2026-01-06 22:31:20'),
(116, 'Vivaan Thakur', 'vivaan.thakur@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 01:19:42', '2026-01-07 01:19:42'),
(117, 'Riya Kulkarni', 'riya.kulkarni@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 04:38:05', '2026-01-07 04:38:05'),
(118, 'Karthik Subramaniam', 'karthik.subramaniam@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 06:10:59', '2026-01-07 06:10:59'),
(119, 'Nandini Pillai', 'nandini.pillai@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 11:01:59', '2026-01-07 11:01:59'),
(120, 'Harsh Agarwal', 'harsh.agarwal@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 13:41:22', '2026-01-07 13:41:22'),
(121, 'Tanvi Choudhury', 'tanvi.choudhury@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 16:43:38', '2026-01-07 16:43:38'),
(122, 'Yash Malhotra', 'yash.malhotra@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 19:39:09', '2026-01-07 19:39:09'),
(123, 'Shruti Saxena', 'shruti.saxena@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 21:19:04', '2026-01-07 21:19:04'),
(124, 'Dev Pandey', 'dev.pandey@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 01:54:41', '2026-01-08 01:54:41'),
(125, 'Simran Kaur', 'simran.kaur@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 04:20:43', '2026-01-08 04:20:43'),
(126, 'Nikhil Banerjee', 'nikhil.banerjee@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 08:45:43', '2026-01-08 08:45:43'),
(127, 'Aditi Mishra', 'aditi.mishra@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 09:07:35', '2026-01-08 09:07:35'),
(128, 'Arnav Tiwari', 'arnav.tiwari@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 13:23:17', '2026-01-08 13:23:17'),
(129, 'Neha Jain', 'neha.jain@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 16:23:39', '2026-01-08 16:23:39'),
(130, 'Dhruv Kapoor', 'dhruv.kapoor@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 20:59:35', '2026-01-08 20:59:35'),
(131, 'Sakshi Sinha', 'sakshi.sinha@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-08 23:26:31', '2026-01-08 23:26:31'),
(132, 'Pranav Deshpande', 'pranav.deshpande@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 02:27:26', '2026-01-09 02:27:26'),
(133, 'Ritika Bhatt', 'ritika.bhatt@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 04:03:14', '2026-01-09 04:03:14'),
(134, 'Akash Dubey', 'akash.dubey@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 08:38:46', '2026-01-09 08:38:46'),
(135, 'Anjali Rangan', 'anjali.rangan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 11:40:15', '2026-01-09 11:40:15'),
(136, 'Manav Chandra', 'manav.chandra@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 13:09:06', '2026-01-09 13:09:06'),
(137, 'Divya Hegde', 'divya.hegde@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 15:41:03', '2026-01-09 15:41:03'),
(138, 'Varun Srinivasan', 'varun.srinivasan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 19:05:06', '2026-01-09 19:05:06'),
(139, 'Trisha Das', 'trisha.das@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-09 23:57:18', '2026-01-09 23:57:18'),
(140, 'Om Prakash Yadav', 'om.prakash.yadav@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 01:07:48', '2026-01-10 01:07:48'),
(141, 'Gayatri Krishnan', 'gayatri.krishnan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 05:33:07', '2026-01-10 05:33:07'),
(142, 'Abhinav Shukla', 'abhinav.shukla@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 08:04:07', '2026-01-10 08:04:07'),
(143, 'Kriti Bajaj', 'kriti.bajaj@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 09:12:31', '2026-01-10 09:12:31'),
(144, 'Rajat Goswami', 'rajat.goswami@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 12:27:05', '2026-01-10 12:27:05'),
(145, 'Isha Venkatesh', 'isha.venkatesh@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 16:54:28', '2026-01-10 16:54:28'),
(146, 'Sagar Patil', 'sagar.patil@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 18:52:06', '2026-01-10 18:52:06'),
(147, 'Aparna Mukherjee', 'aparna.mukherjee@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-10 23:58:10', '2026-01-10 23:58:10'),
(148, 'Kunal Bhardwaj', 'kunal.bhardwaj@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 00:00:09', '2026-01-11 00:00:09'),
(149, 'Swati Garg', 'swati.garg@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 05:25:49', '2026-01-11 05:25:49'),
(150, 'Tushar Bose', 'tushar.bose@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 08:54:57', '2026-01-11 08:54:57'),
(151, 'Latika Ranganathan', 'latika.ranganathan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 09:57:32', '2026-01-11 09:57:32'),
(152, 'Mohit Rawat', 'mohit.rawat@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 12:57:06', '2026-01-11 12:57:06'),
(153, 'Bhavna Sethi', 'bhavna.sethi@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 16:41:40', '2026-01-11 16:41:40'),
(154, 'Parth Khanna', 'parth.khanna@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 20:38:02', '2026-01-11 20:38:02'),
(155, 'Anushka Dhar', 'anushka.dhar@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-11 22:13:50', '2026-01-11 22:13:50'),
(156, 'Chirag Nanda', 'chirag.nanda@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 02:02:25', '2026-01-12 02:02:25'),
(157, 'Jahnavi Acharya', 'jahnavi.acharya@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 05:31:14', '2026-01-12 05:31:14'),
(158, 'Rohan Khatri', 'rohan.khatri@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 07:40:54', '2026-01-12 07:40:54'),
(159, 'Madhuri Parikh', 'madhuri.parikh@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 09:46:42', '2026-01-12 09:46:42'),
(160, 'Ayush Rastogi', 'ayush.rastogi@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 14:33:38', '2026-01-12 14:33:38'),
(161, 'Tara Sundaram', 'tara.sundaram@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 17:06:40', '2026-01-12 17:06:40'),
(162, 'Gaurav Lele', 'gaurav.lele@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 18:07:53', '2026-01-12 18:07:53'),
(163, 'Nisha Mohan', 'nisha.mohan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-12 23:22:20', '2026-01-12 23:22:20'),
(164, 'Soham Chatterjee', 'soham.chatterjee@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-13 02:05:34', '2026-01-13 02:05:34'),
(165, 'Vaishnavi Jadhav', 'vaishnavi.jadhav@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-13 04:51:14', '2026-01-13 04:51:14'),
(166, 'Rishabh Mittal', 'rishabh.mittal@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-13 07:50:36', '2026-01-13 07:50:36'),
(167, 'Preeti Seshadri', 'preeti.seshadri@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-13 11:30:33', '2026-01-13 11:30:33'),
(168, 'Vedant Apte', 'vedant.apte@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-13 14:03:06', '2026-01-13 14:03:06'),
(169, 'Amrita Basu', 'amrita.basu@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'student', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-13 16:07:35', '2026-01-13 16:07:35');

-- 30 Mentor Users (IDs 170–199)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `is_email_verified`, `verification_token`, `verification_status`, `avatar`, `bio`, `created_at`, `updated_at`) VALUES
(170, 'Dr. Rajesh Krishnamurthy', 'rajesh.krishnamurthy@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 01:04:04', '2026-01-05 01:04:04'),
(171, 'Sunita Venkataraman', 'sunita.venkataraman@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 03:45:44', '2026-01-05 03:45:44'),
(172, 'Dr. Anil Bharadwaj', 'anil.bharadwaj@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 05:49:07', '2026-01-05 05:49:07'),
(173, 'Padma Raghunathan', 'padma.raghunathan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 06:56:15', '2026-01-05 06:56:15'),
(174, 'Dr. Suresh Narayanan', 'suresh.narayanan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 08:59:53', '2026-01-05 08:59:53'),
(175, 'Lakshmi Viswanathan', 'lakshmi.viswanathan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 10:56:30', '2026-01-05 10:56:30'),
(176, 'Ramesh Sundaresan', 'ramesh.sundaresan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 13:31:41', '2026-01-05 13:31:41'),
(177, 'Dr. Kavitha Rangarajan', 'kavitha.rangarajan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 14:20:26', '2026-01-05 14:20:26'),
(178, 'Mohan Iyengar', 'mohan.iyengar@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 17:14:26', '2026-01-05 17:14:26'),
(179, 'Dr. Geeta Parthasarathy', 'geeta.parthasarathy@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 19:09:35', '2026-01-05 19:09:35'),
(180, 'Sanjay Natarajan', 'sanjay.natarajan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 20:06:30', '2026-01-05 20:06:30'),
(181, 'Dr. Meena Chandrasekaran', 'meena.chandrasekaran@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-05 22:59:31', '2026-01-05 22:59:31'),
(182, 'Ashok Ramaswamy', 'ashok.ramaswamy@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 01:56:48', '2026-01-06 01:56:48'),
(183, 'Dr. Deepa Subramanian', 'deepa.subramanian@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 03:13:23', '2026-01-06 03:13:23'),
(184, 'Venkatesh Balasubramanian', 'venkatesh.balasubramanian@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 04:10:45', '2026-01-06 04:10:45'),
(185, 'Dr. Usha Vasudevan', 'usha.vasudevan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 06:48:13', '2026-01-06 06:48:13'),
(186, 'Harish Thiruvengadam', 'harish.thiruvengadam@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 08:57:07', '2026-01-06 08:57:07'),
(187, 'Dr. Anita Mahadevan', 'anita.mahadevan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 11:27:41', '2026-01-06 11:27:41'),
(188, 'Prakash Gopinath', 'prakash.gopinath@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 12:42:51', '2026-01-06 12:42:51'),
(189, 'Dr. Savitri Srinivasan', 'savitri.srinivasan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 15:05:25', '2026-01-06 15:05:25'),
(190, 'Dinesh Balakrishnan', 'dinesh.balakrishnan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 16:55:29', '2026-01-06 16:55:29'),
(191, 'Dr. Nirmala Padmanabhan', 'nirmala.padmanabhan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 19:05:03', '2026-01-06 19:05:03'),
(192, 'Girish Shankaranarayan', 'girish.shankaranarayan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 21:02:49', '2026-01-06 21:02:49'),
(193, 'Dr. Revathi Lakshmanan', 'revathi.lakshmanan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-06 23:15:55', '2026-01-06 23:15:55'),
(194, 'Manoj Kalyanaraman', 'manoj.kalyanaraman@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 00:22:10', '2026-01-07 00:22:10'),
(195, 'Dr. Sumathi Ramachandran', 'sumathi.ramachandran@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 02:01:25', '2026-01-07 02:01:25'),
(196, 'Ravi Shankar Hegde', 'ravi.shankar.hegde@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 04:39:57', '2026-01-07 04:39:57'),
(197, 'Dr. Jaya Sivaramakrishnan', 'jaya.sivaramakrishnan@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 06:00:06', '2026-01-07 06:00:06'),
(198, 'Kiran Kumar Pawar', 'kiran.kumar.pawar@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 08:57:27', '2026-01-07 08:57:27'),
(199, 'Dr. Vasundhara Iyer', 'vasundhara.iyer@gmail.com', '$2y$10$xnr8WKsEIzKYUSfe18Jax.YLYBQFwauSAwOBGHAcaz3e7HG81R1b6', 'mentor', 'active', 1, NULL, 'approved', NULL, NULL, '2026-01-07 11:59:32', '2026-01-07 11:59:32');

-- 70 Student Records
INSERT INTO `students` (`id`, `user_id`, `roll_number`, `branch`, `year`, `college_id_path`) VALUES
(100, 100, 'CS2022001', 'Computer Science', 4, NULL),
(101, 101, 'CS2023002', 'Computer Science', 3, NULL),
(102, 102, 'CS2024003', 'Computer Science', 2, NULL),
(103, 103, 'CS2025004', 'Computer Science', 1, NULL),
(104, 104, 'CS2022005', 'Computer Science', 4, NULL),
(105, 105, 'CS2023006', 'Computer Science', 3, NULL),
(106, 106, 'CS2024007', 'Computer Science', 2, NULL),
(107, 107, 'CS2025008', 'Computer Science', 1, NULL),
(108, 108, 'CS2022009', 'Computer Science', 4, NULL),
(109, 109, 'CS2023010', 'Computer Science', 3, NULL),
(110, 110, 'CS2024011', 'Computer Science', 2, NULL),
(111, 111, 'CS2025012', 'Computer Science', 1, NULL),
(112, 112, 'CS2022013', 'Computer Science', 4, NULL),
(113, 113, 'CS2023014', 'Computer Science', 3, NULL),
(114, 114, 'CS2024015', 'Computer Science', 2, NULL),
(115, 115, 'CS2025016', 'Computer Science', 1, NULL),
(116, 116, 'CS2022017', 'Computer Science', 4, NULL),
(117, 117, 'CS2023018', 'Computer Science', 3, NULL),
(118, 118, 'CS2024019', 'Computer Science', 2, NULL),
(119, 119, 'CS2025020', 'Computer Science', 1, NULL),
(120, 120, 'IT2022001', 'Information Technology', 4, NULL),
(121, 121, 'IT2023002', 'Information Technology', 3, NULL),
(122, 122, 'IT2024003', 'Information Technology', 2, NULL),
(123, 123, 'IT2025004', 'Information Technology', 1, NULL),
(124, 124, 'IT2022005', 'Information Technology', 4, NULL),
(125, 125, 'IT2023006', 'Information Technology', 3, NULL),
(126, 126, 'IT2024007', 'Information Technology', 2, NULL),
(127, 127, 'IT2025008', 'Information Technology', 1, NULL),
(128, 128, 'IT2022009', 'Information Technology', 4, NULL),
(129, 129, 'IT2023010', 'Information Technology', 3, NULL),
(130, 130, 'IT2024011', 'Information Technology', 2, NULL),
(131, 131, 'IT2025012', 'Information Technology', 1, NULL),
(132, 132, 'IT2022013', 'Information Technology', 4, NULL),
(133, 133, 'IT2023014', 'Information Technology', 3, NULL),
(134, 134, 'IT2024015', 'Information Technology', 2, NULL),
(135, 135, 'ECE2025001', 'Electronics and Communication', 1, NULL),
(136, 136, 'ECE2022002', 'Electronics and Communication', 4, NULL),
(137, 137, 'ECE2023003', 'Electronics and Communication', 3, NULL),
(138, 138, 'ECE2024004', 'Electronics and Communication', 2, NULL),
(139, 139, 'ECE2025005', 'Electronics and Communication', 1, NULL),
(140, 140, 'ECE2022006', 'Electronics and Communication', 4, NULL),
(141, 141, 'ECE2023007', 'Electronics and Communication', 3, NULL),
(142, 142, 'ECE2024008', 'Electronics and Communication', 2, NULL),
(143, 143, 'ECE2025009', 'Electronics and Communication', 1, NULL),
(144, 144, 'ECE2022010', 'Electronics and Communication', 4, NULL),
(145, 145, 'ECE2023011', 'Electronics and Communication', 3, NULL),
(146, 146, 'ECE2024012', 'Electronics and Communication', 2, NULL),
(147, 147, 'ME2025001', 'Mechanical Engineering', 1, NULL),
(148, 148, 'ME2022002', 'Mechanical Engineering', 4, NULL),
(149, 149, 'ME2023003', 'Mechanical Engineering', 3, NULL),
(150, 150, 'ME2024004', 'Mechanical Engineering', 2, NULL),
(151, 151, 'ME2025005', 'Mechanical Engineering', 1, NULL),
(152, 152, 'ME2022006', 'Mechanical Engineering', 4, NULL),
(153, 153, 'ME2023007', 'Mechanical Engineering', 3, NULL),
(154, 154, 'ME2024008', 'Mechanical Engineering', 2, NULL),
(155, 155, 'ME2025009', 'Mechanical Engineering', 1, NULL),
(156, 156, 'ME2022010', 'Mechanical Engineering', 4, NULL),
(157, 157, 'EE2023001', 'Electrical Engineering', 3, NULL),
(158, 158, 'EE2024002', 'Electrical Engineering', 2, NULL),
(159, 159, 'EE2025003', 'Electrical Engineering', 1, NULL),
(160, 160, 'EE2022004', 'Electrical Engineering', 4, NULL),
(161, 161, 'EE2023005', 'Electrical Engineering', 3, NULL),
(162, 162, 'EE2024006', 'Electrical Engineering', 2, NULL),
(163, 163, 'EE2025007', 'Electrical Engineering', 1, NULL),
(164, 164, 'EE2022008', 'Electrical Engineering', 4, NULL),
(165, 165, 'CE2023001', 'Civil Engineering', 3, NULL),
(166, 166, 'CE2024002', 'Civil Engineering', 2, NULL),
(167, 167, 'CE2025003', 'Civil Engineering', 1, NULL),
(168, 168, 'CE2022004', 'Civil Engineering', 4, NULL),
(169, 169, 'CE2023005', 'Civil Engineering', 3, NULL);

-- 30 Mentor Records
INSERT INTO `mentors` (`id`, `user_id`, `company`, `position`, `expertise`, `job_id_path`, `verified_by_admin`) VALUES
(100, 170, 'Google', 'Principal Engineer', 'System Design, Distributed Systems, Go', NULL, 1),
(101, 171, 'Microsoft', 'Senior Engineering Manager', 'Azure, .NET, Cloud Architecture', NULL, 1),
(102, 172, 'Amazon', 'Distinguished Engineer', 'AWS, Scalability, Microservices', NULL, 1),
(103, 173, 'TCS', 'Vice President - Technology', 'Java, Enterprise Architecture, SAP', NULL, 1),
(104, 174, 'Infosys', 'Senior Architect', 'Full Stack, Angular, Spring Boot', NULL, 1),
(105, 175, 'Wipro', 'Technical Director', 'AI/ML, Python, TensorFlow', NULL, 1),
(106, 176, 'Flipkart', 'Staff Engineer', 'E-Commerce, Java, Kafka', NULL, 1),
(107, 177, 'Adobe', 'Senior Computer Scientist', 'PDF Technologies, C++, React', NULL, 1),
(108, 178, 'Oracle', 'Principal Member of Technical Staff', 'Database Internals, SQL, PL/SQL', NULL, 1),
(109, 179, 'Samsung R&D', 'Lead Engineer', 'Embedded Systems, IoT, C', NULL, 1),
(110, 180, 'IBM Research', 'Research Scientist', 'Quantum Computing, AI, Python', NULL, 1),
(111, 181, 'Cognizant', 'Associate Vice President', 'Digital Transformation, Agile, DevOps', NULL, 1),
(112, 182, 'Goldman Sachs', 'VP - Engineering', 'FinTech, Java, Risk Systems', NULL, 1),
(113, 183, 'JP Morgan', 'Executive Director - Tech', 'Blockchain, Kotlin, Capital Markets', NULL, 1),
(114, 184, 'Deloitte', 'Senior Consultant', 'Cybersecurity, Cloud, Compliance', NULL, 1),
(115, 185, 'Accenture', 'Technology Architect', 'Salesforce, Integration, APIs', NULL, 1),
(116, 186, 'Capgemini', 'Director of Engineering', 'Data Engineering, Spark, Hadoop', NULL, 1),
(117, 187, 'Uber', 'Staff Software Engineer', 'Ride Systems, Go, gRPC', NULL, 1),
(118, 188, 'Swiggy', 'Engineering Manager', 'Logistics Tech, Node.js, MongoDB', NULL, 1),
(119, 189, 'Zomato', 'Principal Engineer', 'Search & Discovery, Elasticsearch, Python', NULL, 1),
(120, 190, 'Razorpay', 'Lead Architect', 'Payments, Ruby, PostgreSQL', NULL, 1),
(121, 191, 'PhonePe', 'Senior Staff Engineer', 'UPI, Android, Kotlin', NULL, 1),
(122, 192, 'Zoho', 'Technical Lead', 'SaaS, Java, ManageEngine', NULL, 1),
(123, 193, 'Freshworks', 'Staff Engineer', 'CRM, React, Node.js', NULL, 1),
(124, 194, 'Atlassian', 'Principal Developer', 'Collaboration Tools, Java, GraphQL', NULL, 1),
(125, 195, 'SAP Labs', 'Chief Architect', 'ERP, ABAP, HANA', NULL, 1),
(126, 196, 'Cisco', 'Distinguished Engineer', 'Networking, SDN, Python', NULL, 1),
(127, 197, 'Intel', 'Principal Engineer', 'Chip Design, VLSI, SystemVerilog', NULL, 1),
(128, 198, 'Qualcomm', 'Senior Staff Engineer', '5G, Embedded C, RTOS', NULL, 1),
(129, 199, 'NVIDIA', 'Senior Architect', 'GPU Computing, CUDA, Deep Learning', NULL, 1);

-- 36 Questions
INSERT INTO `questions` (`id`, `title`, `content`, `author_id`, `views`, `created_at`) VALUES
(100, 'How to start learning Data Structures and Algorithms?', 'I am a second year student and want to start DSA preparation. What resources and roadmap should I follow? Any tips for beginners?', 170, 14, '2026-01-15 01:27:39'),
(101, 'What are the best resources for learning React.js?', 'I know basic HTML, CSS and JavaScript. I want to learn React.js for frontend development. Please suggest good courses, tutorials and projects.', 101, 22, '2026-01-15 07:59:07'),
(102, 'How to prepare for Google interviews?', 'I have 6 months left before placement season. What topics should I focus on to crack Google interviews? Any specific preparation strategy?', 102, 40, '2026-01-15 13:44:07'),
(103, 'Is Python better than Java for beginners?', 'I am confused between Python and Java as my first programming language. Which one should I pick and why?', 103, 106, '2026-01-15 23:08:22'),
(104, 'What is the difference between SQL and NoSQL databases?', 'When should I use SQL databases like MySQL and when should I go for NoSQL like MongoDB? What are the trade-offs?', 174, 141, '2026-01-16 00:07:24'),
(105, 'How to build a strong GitHub portfolio?', 'What kind of projects should I put on GitHub to impress recruiters? How many repositories are ideal?', 105, 80, '2026-01-16 10:18:57'),
(106, 'Best online courses for Machine Learning?', 'I want to transition into ML and AI. Which online courses are worth investing time in? Free or paid both are fine.', 106, 127, '2026-01-16 17:04:52'),
(107, 'How to transition from college to corporate life?', 'I am about to graduate and feeling nervous about corporate culture. Any tips from experienced professionals?', 107, 5, '2026-01-16 20:54:40'),
(108, 'What programming language should I learn first?', 'I am a first year engineering student with no coding background. Which language will help me build a strong foundation?', 178, 47, '2026-01-17 02:44:15'),
(109, 'How to prepare for campus placements?', 'Placement season is approaching. What should be my preparation strategy for aptitude, coding and interview rounds?', 109, 80, '2026-01-17 11:37:46'),
(110, 'Is doing an MBA after engineering worth it?', 'I am not sure if I should go for MBA or continue in tech. What are the pros and cons?', 110, 39, '2026-01-17 15:47:39'),
(111, 'What are microservices and when to use them?', 'I keep hearing about microservices architecture. Can someone explain when monolith is better and when to switch to microservices?', 111, 53, '2026-01-17 19:00:49'),
(112, 'How to get an internship at a top tech company?', 'I am a pre-final year student. What should I do to land an internship at companies like Google, Microsoft or Amazon?', 182, 32, '2026-01-18 01:54:02'),
(113, 'Best practices for writing clean code?', 'I want to improve my coding style. What are some industry-standard practices for clean and maintainable code?', 113, 190, '2026-01-18 09:51:56'),
(114, 'How to learn DevOps from scratch?', 'I have basic knowledge of Linux. What is the roadmap to become a DevOps engineer? Which tools should I learn?', 114, 178, '2026-01-18 12:55:23'),
(115, 'What is the scope of Data Science in India?', 'Is Data Science still a good career choice in 2026? What skills are in demand and what is the salary range for freshers?', 115, 132, '2026-01-18 22:56:14'),
(116, 'How to improve problem-solving skills?', 'I struggle with competitive programming problems. How can I improve my logical thinking and problem-solving ability?', 186, 175, '2026-01-19 02:00:02'),
(117, 'Frontend vs Backend - which career path to choose?', 'I enjoy both frontend and backend work. How do I decide which specialization to pursue in my career?', 117, 126, '2026-01-19 07:42:06'),
(118, 'How to prepare for GRE and MS abroad?', 'I am considering doing MS from the US. What is the preparation timeline for GRE and university applications?', 118, 91, '2026-01-19 14:08:59'),
(119, 'What are design patterns in software engineering?', 'Can someone explain commonly used design patterns like Singleton, Factory, Observer with real-world examples?', 119, 64, '2026-01-19 23:56:09'),
(120, 'How to build a REST API from scratch?', 'I want to learn backend development by building a REST API. Which tech stack should I use and what should the project be?', 190, 197, '2026-01-20 04:15:03'),
(121, 'Is competitive programming necessary for placements?', 'Do I really need to grind LeetCode and Codeforces to crack placements, or are projects and DSA basics enough?', 121, 134, '2026-01-20 11:24:49'),
(122, 'How to learn cloud computing - AWS vs Azure vs GCP?', 'Which cloud platform should I start with as a student? Is AWS certification worth it for freshers?', 122, 45, '2026-01-20 13:11:47'),
(123, 'What is the role of a Product Manager in tech?', 'I am interested in product management. What skills do I need and how is the role different from a software engineer?', 123, 168, '2026-01-20 18:25:39'),
(124, 'How to deal with imposter syndrome in tech?', 'I constantly feel like I am not good enough compared to my peers. How do working professionals deal with this feeling?', 194, 128, '2026-01-21 01:59:54'),
(125, 'Best strategies for time management during exams?', 'I always end up cramming before exams. How can I manage my study schedule better alongside coding practice?', 125, 133, '2026-01-21 08:56:26'),
(126, 'How to contribute to open source projects?', 'I want to start contributing to open source but feel intimidated. Where should I start and which projects are beginner-friendly?', 126, 103, '2026-01-21 16:27:07'),
(127, 'What is blockchain technology and its future?', 'Is blockchain just about cryptocurrency or does it have real applications? Should I invest time learning Solidity and Web3?', 127, 48, '2026-01-21 23:53:34'),
(128, 'How to prepare for GATE exam effectively?', 'I am targeting GATE 2027 for CSE. What is the ideal preparation strategy and which coaching resources are best?', 198, 173, '2026-01-22 02:03:42'),
(129, 'What skills are needed for a full-stack developer role?', 'I want to become a full-stack developer. What is the complete skill set required and how long does it take to become job-ready?', 129, 15, '2026-01-22 07:42:39'),
(130, 'How to choose between higher studies and a job?', 'I have a decent placement offer but also want to pursue MS. How should I decide between the two options?', 130, 110, '2026-01-22 17:58:32'),
(131, 'What is Agile methodology and why is it important?', 'My internship company follows Agile Scrum. Can someone explain the basics of sprints, standups and retrospectives?', 131, 51, '2026-01-22 19:45:06'),
(132, 'How to network effectively on LinkedIn?', 'I have a LinkedIn profile but do not know how to use it for networking. How do professionals leverage LinkedIn for career growth?', 172, 156, '2026-01-23 02:43:41'),
(133, 'What are the best tech conferences in India?', 'I want to attend tech conferences and meetups to learn and network. Which ones are popular and worth attending in India?', 133, 18, '2026-01-23 10:24:55'),
(134, 'How to build a startup while in college?', 'I have a startup idea but no experience. Is it possible to build a startup during final year of engineering? Any advice?', 134, 138, '2026-01-23 16:31:21'),
(135, 'What is the importance of soft skills in tech careers?', 'I have heard that communication and teamwork matter a lot in tech jobs. How important are soft skills compared to technical skills?', 135, 150, '2026-01-23 18:46:06');

-- 20 Answers (for 18 questions; Q116 and Q117 get 2 answers each)
INSERT INTO `answers` (`id`, `question_id`, `author_id`, `content`, `is_verified`, `created_at`) VALUES
(100, 100, 170, 'Start with a good book like Introduction to Algorithms by Cormen or take the Abdul Bari DSA course on YouTube. Practice daily on LeetCode starting with easy problems. Consistency is more important than intensity.', 1, '2026-01-15 21:33:55'),
(101, 101, 172, 'The official React documentation is excellent and recently revamped. Supplement it with projects - build a todo app, then a weather app, then a full e-commerce site. Scrimba and Udemy have great interactive courses.', 1, '2026-01-16 11:00:05'),
(102, 102, 170, 'Focus on three areas: DSA (300+ LeetCode problems), System Design (Grokking the System Design Interview), and Behavioral (STAR method). Start 6 months before and practice mock interviews weekly.', 1, '2026-01-16 19:49:10'),
(103, 103, 174, 'Python is better for beginners due to its simple syntax and vast library ecosystem. You can build projects faster and it is widely used in AI, ML, automation and web development. Java is better once you understand OOP concepts.', 1, '2026-01-16 22:47:15'),
(104, 104, 178, 'SQL databases are ideal for structured data with complex relationships - think banking systems, inventory management. NoSQL is better for unstructured or rapidly changing data like social media feeds, real-time analytics. Choose based on your data model.', 1, '2026-01-17 08:43:20'),
(105, 105, 176, 'Aim for 5-8 quality projects on GitHub. Include at least one full-stack project, one data structures project, and one that solves a real problem. Write clear README files with screenshots and deployment links.', 1, '2026-01-17 12:11:46'),
(106, 106, 175, 'Andrew Ng Machine Learning Specialization on Coursera is the gold standard. Follow it with fast.ai for practical deep learning. For math foundations, 3Blue1Brown YouTube channel is excellent.', 1, '2026-01-18 03:43:26'),
(107, 107, 182, 'Start by being proactive and asking questions. Corporate culture values communication and teamwork over individual brilliance. Build relationships with your team, understand the business context of your work, and never hesitate to ask for feedback.', 1, '2026-01-18 11:42:58'),
(108, 108, 174, 'Start with Python for its simplicity, then learn C to understand memory management and pointers. Once you are comfortable, pick Java or JavaScript based on your interest in mobile/enterprise or web development respectively.', 1, '2026-01-18 18:21:01'),
(109, 109, 180, 'Divide your preparation into three phases: Aptitude and reasoning (1 month), DSA and coding (3 months), and Interview skills (1 month). Practice on platforms like GeeksforGeeks, InterviewBit and LeetCode. Do at least 5 mock interviews.', 1, '2026-01-18 23:29:15'),
(110, 110, 183, 'MBA after engineering opens doors to management consulting, product management and business leadership roles. However, work for 2-3 years first to get meaningful work experience. A fresh MBA without experience limits your options.', 1, '2026-01-19 11:12:04'),
(111, 111, 170, 'Use monoliths for small to medium applications with a small team. Switch to microservices when you need independent scaling, multiple teams working in parallel, or polyglot technology choices. Microservices add operational complexity so evaluate the trade-off.', 1, '2026-01-19 15:55:53'),
(112, 112, 172, 'Start applying early on company career pages and LinkedIn. Build projects that demonstrate your skills, contribute to open source, and participate in hackathons. Referrals are the most effective way to get interviews. Network with alumni at target companies.', 1, '2026-01-20 03:45:13'),
(113, 113, 178, 'Follow SOLID principles, write meaningful variable and function names, keep functions small and focused, write unit tests, and use consistent formatting. Read Clean Code by Robert C. Martin - it is the industry bible for code quality.', 1, '2026-01-20 04:41:17'),
(114, 114, 190, 'Learn Linux fundamentals, then Git, then Docker and Kubernetes. Follow with CI/CD tools like Jenkins or GitHub Actions. Learn Infrastructure as Code with Terraform and configuration management with Ansible. Cloud certification (AWS/Azure) adds credibility.', 1, '2026-01-20 14:03:38'),
(115, 115, 175, 'Data Science is still highly relevant in 2026. Focus on Python, Statistics, SQL, Machine Learning and at least one visualization tool. Fresher salaries range from 6-15 LPA depending on skills and company. Kaggle competitions help build credibility.', 1, '2026-01-20 22:14:27'),
(116, 116, 180, 'Practice daily for at least 1 hour. Start with pattern recognition - group problems by type (arrays, trees, graphs, DP). Solve easy problems first, understand the approach, then gradually increase difficulty. Participate in weekly contests on LeetCode or Codeforces.', 1, '2026-01-21 10:15:43'),
(117, 116, 172, 'Along with practice, study other people solutions after solving a problem. Understanding multiple approaches to the same problem builds deeper intuition. Mathematics and discrete math courses also strengthen logical thinking significantly.', 0, '2026-01-21 19:35:48'),
(118, 117, 183, 'Frontend offers more visual creativity and faster feedback loops. Backend gives you deeper understanding of systems and data. Full-stack is also a valid choice. Try building a complete project end-to-end and see which part excites you more. Follow your curiosity.', 1, '2026-01-22 01:05:34'),
(119, 117, 174, 'Consider market demand in your target location too. Both have excellent careers. Backend developers often earn slightly more at senior levels because system design is highly valued. But the best developers are T-shaped - deep in one area with broad knowledge.', 0, '2026-01-22 05:48:47');

-- 30 Blogs
INSERT INTO `blogs` (`id`, `title`, `content`, `excerpt`, `category`, `author_id`, `status`, `views`, `created_at`, `updated_at`, `approved_at`, `approved_by`) VALUES
(100, 'Mastering DSA: A Complete Roadmap for 2026', 'Data Structures and Algorithms form the backbone of any software engineering career. This comprehensive guide covers everything from arrays and linked lists to advanced graph algorithms and dynamic programming. Follow this structured roadmap to become interview-ready in 6 months.', 'Complete DSA preparation roadmap for engineering students.', 'Career Guidance', 100, 'published', 190, '2026-01-10 02:01:49', '2026-01-10 02:01:49', NULL, NULL),
(101, 'Top 10 System Design Concepts Every Developer Should Know', 'System design interviews are becoming increasingly important for mid and senior-level positions. This article covers load balancing, caching, database sharding, CDNs, message queues, API gateways, rate limiting, consistent hashing, CAP theorem and eventual consistency.', 'Essential system design concepts for tech interviews.', 'Interview Prep', 171, 'published', 57, '2026-01-10 15:39:37', '2026-01-10 15:39:37', NULL, NULL),
(102, 'React vs Angular vs Vue: Choosing the Right Framework', 'Frontend frameworks dominate modern web development. This comparison analyzes React, Angular and Vue.js across parameters like learning curve, performance, ecosystem, community support and job market demand to help you make an informed decision.', 'Detailed comparison of popular frontend frameworks.', 'Tech Stacks', 172, 'published', 190, '2026-01-10 22:36:31', '2026-01-10 22:36:31', NULL, NULL),
(103, 'Complete Guide to MS in Computer Science Abroad', 'Pursuing a Master degree abroad is a dream for many Indian engineering students. This guide covers GRE preparation, university shortlisting, SOP writing, recommendation letters, visa process and scholarship opportunities in the US, Canada and Germany.', 'Everything you need to know about MS abroad.', 'Higher Studies', 103, 'published', 267, '2026-01-11 05:56:28', '2026-01-11 05:56:28', NULL, NULL),
(104, 'Cracking FAANG Interviews: What Actually Works', 'After interviewing at Google, Amazon, Meta and Microsoft, here is what actually matters. This honest guide covers the real preparation strategy that works, common myths debunked, and a month-by-month study plan.', 'Proven strategies for FAANG interview preparation.', 'Interview Prep', 174, 'published', 122, '2026-01-11 15:51:49', '2026-01-11 15:51:49', NULL, NULL),
(105, 'Docker and Kubernetes for Beginners', 'Containerization has revolutionized how we deploy applications. This beginner-friendly guide walks you through Docker fundamentals, creating Dockerfiles, container orchestration with Kubernetes, and deploying your first microservice.', 'Introduction to containerization and orchestration.', 'Tech Stacks', 175, 'published', 64, '2026-01-11 21:40:46', '2026-01-11 21:40:46', NULL, NULL),
(106, 'Why Communication Skills Matter More Than Coding', 'In the tech industry, the best engineers are not just great coders - they are great communicators. This article explores how effective communication, presentation skills and technical writing can accelerate your career growth beyond what coding alone can achieve.', 'The underrated skill that separates good engineers from great ones.', 'Career Guidance', 106, 'published', 264, '2026-01-12 06:13:14', '2026-01-12 06:13:14', NULL, NULL),
(107, 'Building Your First Full-Stack Project with MERN', 'Step-by-step guide to building a complete full-stack application using MongoDB, Express.js, React and Node.js. We will build a task management application from scratch covering authentication, CRUD operations, state management and deployment.', 'Hands-on MERN stack project tutorial.', 'Tech Stacks', 177, 'published', 273, '2026-01-12 12:16:45', '2026-01-12 12:16:45', NULL, NULL),
(108, 'GATE CSE 2027: Complete Preparation Strategy', 'GATE examination opens doors to IITs, IISc and PSU jobs. This article covers subject-wise weightage analysis, recommended books, online resources, previous year paper analysis and a 12-month preparation timeline for CSE aspirants.', 'Strategic guide for GATE CSE preparation.', 'Higher Studies', 178, 'published', 140, '2026-01-12 18:30:42', '2026-01-12 18:30:42', NULL, NULL),
(109, 'The Truth About Competitive Programming', 'Is grinding LeetCode and Codeforces really necessary? This balanced perspective covers when competitive programming helps, when it becomes counterproductive, and alternative ways to build problem-solving skills that companies value.', 'Honest take on the role of CP in career building.', 'Career Guidance', 109, 'published', 176, '2026-01-13 00:38:25', '2026-01-13 00:38:25', NULL, NULL),
(110, 'Introduction to Machine Learning with Python', 'Machine Learning is transforming every industry. This beginner guide covers supervised vs unsupervised learning, common algorithms like linear regression, decision trees and neural networks, and hands-on implementation using scikit-learn and TensorFlow.', 'Getting started with ML using Python.', 'Tech Stacks', 180, 'published', 84, '2026-01-13 12:00:19', '2026-01-13 12:00:19', NULL, NULL),
(111, 'How to Write a Winning SOP for MS Applications', 'Your Statement of Purpose can make or break your university application. Learn the proven SOP structure, common mistakes to avoid, how to highlight research experience, and real examples that got accepted into top-50 US universities.', 'Expert tips for crafting compelling SOPs.', 'Higher Studies', 181, 'published', 157, '2026-01-13 23:05:48', '2026-01-13 23:05:48', NULL, NULL),
(112, 'Behavioral Interview Questions and How to Answer Them', 'Technical skills get you the interview, but behavioral questions determine the outcome. Master the STAR method, prepare for common questions about conflict resolution, leadership and failure, and learn what interviewers actually evaluate.', 'Guide to acing behavioral interview rounds.', 'Interview Prep', 112, 'published', 224, '2026-01-14 02:13:22', '2026-01-14 02:13:22', NULL, NULL),
(113, 'Spring Boot vs Django vs Express: Backend Framework Comparison', 'Choosing the right backend framework depends on your project needs and language preference. This detailed comparison covers Spring Boot for Java, Django for Python and Express for Node.js across performance, scalability, learning curve and ecosystem.', 'Backend framework comparison for developers.', 'Tech Stacks', 183, 'published', 116, '2026-01-14 09:50:55', '2026-01-14 09:50:55', NULL, NULL),
(114, 'Freelancing in Tech: A Side Income Guide for Students', 'Engineering students can earn significant side income through freelancing. This guide covers platforms like Upwork, Fiverr and Toptal, how to build a freelancing portfolio, pricing strategies, client communication and time management alongside studies.', 'How students can earn through freelancing.', 'Career Guidance', 184, 'published', 63, '2026-01-14 20:22:16', '2026-01-14 20:22:16', NULL, NULL),
(115, 'Understanding CI/CD Pipelines from Zero to Hero', 'Continuous Integration and Continuous Deployment are essential DevOps practices. Learn about pipeline stages, popular tools like Jenkins, GitHub Actions and GitLab CI, automated testing strategies and deployment patterns including blue-green and canary deployments.', 'Complete guide to CI/CD for beginners.', 'Tech Stacks', 115, 'published', 31, '2026-01-15 06:55:57', '2026-01-15 06:55:57', NULL, NULL),
(116, 'IIT vs NIT vs IIIT: Which is Better for Tech Careers?', 'The debate between IITs, NITs and IIITs is never-ending. This data-driven analysis compares placement statistics, research opportunities, campus culture, alumni networks and return on investment to help aspirants make an informed choice.', 'Comparative analysis of top engineering institutions.', 'Higher Studies', 186, 'published', 202, '2026-01-15 11:56:52', '2026-01-15 11:56:52', NULL, NULL),
(117, 'How to Ace Your First Technical Interview', 'Your first technical interview can be nerve-wracking. This article covers preparation timeline, common mistakes first-timers make, how to think aloud during coding rounds, tips for whiteboard interviews and how to handle questions you cannot solve.', 'First-timer guide to technical interviews.', 'Interview Prep', 187, 'published', 86, '2026-01-15 17:32:00', '2026-01-15 17:32:00', NULL, NULL),
(118, 'The Rise of Rust: Should You Learn It in 2026?', 'Rust has been the most loved programming language for years. This article explores Rust adoption in industry, its unique ownership model, performance benefits, use cases in systems programming, WebAssembly and blockchain, and learning resources.', 'Exploring Rust as a career investment.', 'Tech Stacks', 118, 'published', 162, '2026-01-16 03:09:52', '2026-01-16 03:09:52', NULL, NULL),
(119, 'Navigating Your First Job: Tips from Industry Veterans', 'The transition from campus to corporate can be overwhelming. Senior engineers share practical advice on onboarding, understanding codebases, building relationships with managers, setting career goals, and avoiding common pitfalls in your first year.', 'Career advice for fresh graduates entering the workforce.', 'Career Guidance', 189, 'published', 270, '2026-01-16 15:48:42', '2026-01-16 15:48:42', NULL, NULL),
(120, 'PostgreSQL vs MySQL vs MongoDB: Database Selection Guide', 'Database choice significantly impacts application architecture. This comprehensive comparison covers relational vs document databases, ACID compliance, scalability, query performance, community support and real-world use cases for each database.', 'Choosing the right database for your project.', 'Tech Stacks', 190, 'published', 238, '2026-01-16 18:33:37', '2026-01-16 18:33:37', NULL, NULL),
(121, 'PhD in Computer Science: Is It Worth the Commitment?', 'A PhD is a significant time investment. This article covers research opportunities in India and abroad, funding options, career prospects in academia and industry, the PhD lifestyle, and honest reflections from current PhD scholars.', 'Evaluating the PhD path in computer science.', 'Higher Studies', 121, 'published', 114, '2026-01-17 00:49:00', '2026-01-17 00:49:00', NULL, NULL),
(122, 'Mock Interview Strategies That Actually Work', 'Practicing mock interviews is crucial but most students do it wrong. Learn how to structure mock interview sessions, give and receive feedback effectively, simulate real interview pressure, and track your progress over time.', 'Effective mock interview techniques for placements.', 'Interview Prep', 192, 'published', 154, '2026-01-17 12:22:00', '2026-01-17 12:22:00', NULL, NULL),
(123, 'GraphQL vs REST: When to Use What', 'API design decisions have long-term implications. This technical deep-dive compares REST and GraphQL architectures, covering query efficiency, caching strategies, error handling, real-time subscriptions, and when each approach is the better choice.', 'API architecture comparison for developers.', 'Tech Stacks', 193, 'published', 213, '2026-01-17 17:13:58', '2026-01-17 17:13:58', NULL, NULL),
(124, 'Building a Personal Brand as a Developer', 'In a competitive job market, personal branding sets you apart. Learn how to create technical content, build a Twitter and LinkedIn presence, speak at meetups, contribute to open source, and position yourself as a thought leader in your domain.', 'Personal branding strategies for tech professionals.', 'Career Guidance', 124, 'published', 195, '2026-01-18 07:00:10', '2026-01-18 07:00:10', NULL, NULL),
(125, 'AWS Certifications Roadmap for Students', 'AWS dominates the cloud market and certifications validate your skills. This roadmap covers which certifications to pursue first, free preparation resources, exam strategies, and how to leverage certifications for internships and job applications.', 'Step-by-step AWS certification guide.', 'Tech Stacks', 195, 'published', 24, '2026-01-18 14:55:45', '2026-01-18 14:55:45', NULL, NULL),
(126, 'Study Abroad Scholarships for Indian Engineering Students', 'Financial constraints should not stop you from pursuing education abroad. This comprehensive list covers fully-funded scholarships, research assistantships, teaching assistantships, and external funding opportunities available for Indian students.', 'Scholarship guide for aspiring MS and PhD students.', 'Higher Studies', 196, 'published', 228, '2026-01-18 20:54:18', '2026-01-18 20:54:18', NULL, NULL),
(127, 'Designing Scalable APIs: Best Practices', 'Well-designed APIs are the backbone of modern applications. This article covers versioning strategies, authentication mechanisms, pagination patterns, error response standards, rate limiting, documentation with Swagger, and monitoring with observability tools.', 'API design principles for production systems.', 'Interview Prep', 127, 'published', 31, '2026-01-19 00:51:45', '2026-01-19 00:51:45', NULL, NULL),
(128, 'Time Management Hacks for Engineering Students', 'Balancing academics, coding practice, projects and social life is challenging. This article shares proven time management techniques including the Pomodoro method, time blocking, priority matrices, and tools that help engineering students stay productive.', 'Productivity tips for busy engineering students.', 'Career Guidance', 198, 'published', 177, '2026-01-19 10:43:28', '2026-01-19 10:43:28', NULL, NULL),
(129, 'Kubernetes in Production: Lessons Learned', 'Running Kubernetes in production is different from local development. This article shares real-world lessons on cluster sizing, resource management, monitoring with Prometheus and Grafana, handling failures, security best practices and cost optimization.', 'Production Kubernetes insights from industry experience.', 'Tech Stacks', 199, 'published', 234, '2026-01-19 18:58:49', '2026-01-19 18:58:49', NULL, NULL);

-- 15 Mentorship Requests
INSERT INTO `mentorship_requests` (`id`, `student_id`, `mentor_id`, `status`, `message`, `created_at`) VALUES
(100, 103, 170, 'pending', 'I am preparing for placements and would love guidance on DSA and system design preparation.', '2026-01-20 02:32:32'),
(101, 105, 171, 'approved', 'I am interested in cloud computing and want to understand the career roadmap in this field.', '2026-01-20 18:36:01'),
(102, 109, 172, 'rejected', 'I need help with my resume and interview preparation for upcoming campus placements.', '2026-01-21 06:32:21'),
(103, 114, 173, 'pending', 'I want to explore machine learning as a career. Can you guide me on where to start?', '2026-01-21 15:15:17'),
(104, 118, 174, 'approved', 'I am confused between pursuing higher studies and taking a job offer. Need career advice.', '2026-01-22 01:17:03'),
(105, 120, 175, 'pending', 'I want to learn backend development. Can you suggest projects and resources?', '2026-01-22 14:00:21'),
(106, 124, 176, 'rejected', 'I am preparing for GATE exam and would appreciate guidance on study plan and resources.', '2026-01-23 08:31:50'),
(107, 130, 177, 'approved', 'I am interested in DevOps and want to understand what skills I should develop as a student.', '2026-01-23 19:03:10'),
(108, 132, 178, 'pending', 'I want to contribute to open source but do not know how to begin. Can you mentor me?', '2026-01-24 04:02:07'),
(109, 138, 179, 'approved', 'I am working on a startup idea and need guidance on technology choices and MVP development.', '2026-01-24 17:22:21'),
(110, 142, 180, 'rejected', 'I want to improve my competitive programming skills for upcoming coding contests.', '2026-01-25 03:49:44'),
(111, 145, 181, 'pending', 'I need guidance on preparing Statement of Purpose for MS applications to US universities.', '2026-01-25 19:26:11'),
(112, 148, 182, 'pending', 'I am interested in product management. Can you help me understand the transition from engineering?', '2026-01-26 09:14:49'),
(113, 152, 183, 'approved', 'I want to learn about system design for senior-level interviews. Looking for a structured approach.', '2026-01-26 20:04:47'),
(114, 158, 184, 'rejected', 'I need help building a portfolio of projects that will impress recruiters during placement season.', '2026-01-27 02:25:09');

-- 10 Announcements
INSERT INTO `announcements` (`id`, `title`, `content`, `created_by`, `created_at`) VALUES
(100, 'Campus Placement Drive 2026 Begins', 'The placement season for the academic year 2025-2026 officially begins on February 20. All eligible students must complete their profiles and upload updated resumes by February 18. Companies like Google, Microsoft, Amazon and TCS have confirmed participation.', 15, '2026-01-31 00:02:19'),
(101, 'New Mentorship Program Launch', 'We are excited to announce our expanded mentorship program with 30 industry professionals from top tech companies. Students can now request mentorship in areas including DSA, System Design, Cloud Computing, AI/ML and career guidance.', 15, '2026-02-01 00:37:15'),
(102, 'Hackathon 2026: Code for India', 'Register for our annual 48-hour hackathon themed around solving real Indian problems using technology. Top 3 teams win cash prizes worth Rs 1,00,000. Registration deadline: February 28, 2026. Open to all branches and years.', 15, '2026-02-02 00:48:04'),
(103, 'Workshop: Introduction to Cloud Computing', 'A free workshop on Cloud Computing fundamentals will be held on February 22 from 10 AM to 4 PM in the Main Auditorium. Topics include AWS basics, deploying applications and serverless architecture. Limited seats available.', 15, '2026-02-03 00:29:13'),
(104, 'Resume Review Sessions Available', 'Our mentor panel is offering free resume review sessions for all final year students. Upload your resume through the platform and get personalized feedback within 48 hours. Make your resume placement-ready with expert guidance.', 15, '2026-02-04 00:14:04'),
(105, 'Community Blog Contest: Win Exciting Prizes', 'Submit your best technical blog on the platform before March 1. Top 5 blogs selected by our mentor panel will win Amazon gift cards worth Rs 5,000 each. Write about any tech topic that helps fellow students.', 15, '2026-02-05 00:33:42'),
(106, 'Webinar: Cracking Product-Based Company Interviews', 'Join our live webinar on February 25 at 7 PM featuring engineers from Google, Microsoft and Flipkart. They will share interview experiences, preparation tips and answer your questions live. Registration link available on the platform.', 15, '2026-02-06 00:10:22'),
(107, 'Library Access: Premium Learning Resources', 'We have partnered with Coursera, Udemy and LeetCode to provide free premium access to all registered students. Activate your accounts through the Resources section. Valid until December 2026.', 15, '2026-02-07 00:51:14'),
(108, 'Semester Exam Schedule Released', 'The end-semester examination schedule for Spring 2026 has been published. Exams begin on April 1. Students are advised to plan their preparation alongside placement activities. Contact your department for any schedule conflicts.', 15, '2026-02-08 00:25:24'),
(109, 'Alumni Meet 2026: Network and Learn', 'Our annual alumni meet is scheduled for March 15. Alumni from FAANG companies, startups and research institutions will be present. This is an excellent opportunity to network, seek career advice and learn about industry trends.', 15, '2026-02-09 00:04:12');

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

