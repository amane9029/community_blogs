<?php
// Mock Data for Demo/Preview Version
// No database required - all data is hardcoded arrays

// Demo Users
$DEMO_USERS = [
    [
        'id' => 1,
        'name' => '田中花子',
        'email' => 'student@demo.com',
        'password' => '123456', // In real app, this would be hashed
        'role' => 'student',
        'branch' => 'Computer Science',
        'year' => 3,
        'avatar' => 'https://ui-avatars.com/api/?name=Hanako+Tanaka&background=3b82f6&color=fff',
        'skills' => ['JavaScript', 'React', 'Python'],
        'bio' => 'Passionate about web development and AI'
    ],
    [
        'id' => 2,
        'name' => '佐藤健太',
        'email' => 'mentor@demo.com',
        'password' => '123456',
        'role' => 'mentor',
        'company' => 'Tech Innovations Inc.',
        'position' => 'Senior Software Engineer',
        'expertise' => ['Full Stack Development', 'Cloud Architecture', 'DevOps'],
        'avatar' => 'https://ui-avatars.com/api/?name=Kenta+Sato&background=22c55e&color=fff',
        'bio' => '10+ years in software development, specializing in scalable web applications'
    ],
    [
        'id' => 3,
        'name' => 'Admin User',
        'email' => 'admin@demo.com',
        'password' => '123456',
        'role' => 'admin',
        'avatar' => 'https://ui-avatars.com/api/?name=Admin&background=6b7280&color=fff'
    ]
];

// Demo Blogs
$DEMO_BLOGS = [
    [
        'id' => 1,
        'title' => 'Getting Started with React Hooks',
        'content' => 'React Hooks revolutionized the way we write React components. In this comprehensive guide, we\'ll explore useState, useEffect, and custom hooks...',
        'author_id' => 2,
        'author_name' => '佐藤健太',
        'category' => 'Web Development',
        'tags' => ['React', 'JavaScript', 'Frontend'],
        'views' => 1243,
        'status' => 'approved',
        'created_at' => '2026-02-01',
        'read_time' => '8 min read'
    ],
    [
        'id' => 2,
        'title' => 'My Journey to Landing a Software Engineering Job',
        'content' => 'After months of preparation and countless interviews, I finally landed my dream job. Here\'s what I learned along the way...',
        'author_id' => 1,
        'author_name' => '田中花子',
        'category' => 'Career',
        'tags' => ['Career', 'Interview', 'Tips'],
        'views' => 892,
        'status' => 'approved',
        'created_at' => '2026-01-28',
        'read_time' => '6 min read'
    ],
    [
        'id' => 3,
        'title' => 'Understanding Database Indexing',
        'content' => 'Database indexing is crucial for performance optimization. Let\'s dive deep into how indexes work and when to use them...',
        'author_id' => 2,
        'author_name' => '佐藤健太',
        'category' => 'Backend',
        'tags' => ['Database', 'SQL', 'Performance'],
        'views' => 567,
        'status' => 'approved',
        'created_at' => '2026-01-25',
        'read_time' => '10 min read'
    ],
    [
        'id' => 4,
        'title' => 'Top 10 VS Code Extensions for Developers',
        'content' => 'Boost your productivity with these essential VS Code extensions every developer should know about...',
        'author_id' => 1,
        'author_name' => '田中花子',
        'category' => 'Tools',
        'tags' => ['VS Code', 'Productivity', 'Tools'],
        'views' => 1456,
        'status' => 'pending',
        'created_at' => '2026-02-05',
        'read_time' => '5 min read'
    ]
];

// Demo Community Questions
$DEMO_QUESTIONS = [
    [
        'id' => 1,
        'title' => 'How to prepare for technical interviews?',
        'content' => 'I have my first technical interview next week. What topics should I focus on? Any tips for coding challenges?',
        'author_id' => 1,
        'author_name' => '田中花子',
        'tags' => ['Interview', 'Career', 'Coding'],
        'answers_count' => 3,
        'views' => 234,
        'created_at' => '2026-02-06'
    ],
    [
        'id' => 2,
        'title' => 'Best resources for learning Cloud Computing?',
        'content' => 'I want to transition to cloud engineering. What are the best platforms and certifications to start with?',
        'author_id' => 1,
        'author_name' => '田中花子',
        'tags' => ['Cloud', 'Learning', 'AWS'],
        'answers_count' => 5,
        'views' => 189,
        'created_at' => '2026-02-05'
    ],
    [
        'id' => 3,
        'title' => 'React vs Vue: Which one should I learn first?',
        'content' => 'I\'m starting frontend development. Should I focus on React or Vue? What are the pros and cons of each?',
        'author_id' => 1,
        'author_name' => '田中花子',
        'tags' => ['React', 'Vue', 'Frontend'],
        'answers_count' => 8,
        'views' => 456,
        'created_at' => '2026-02-03'
    ]
];

// Demo Mentors
$DEMO_MENTORS = [
    [
        'id' => 2,
        'name' => '佐藤健太',
        'position' => 'Senior Software Engineer',
        'company' => 'Tech Innovations Inc.',
        'expertise' => ['Full Stack Development', 'Cloud Architecture', 'DevOps'],
        'avatar' => 'https://ui-avatars.com/api/?name=Kenta+Sato&background=22c55e&color=fff',
        'students' => 12,
        'rating' => 4.8
    ],
    [
        'id' => 4,
        'name' => '山田美咲',
        'position' => 'Data Scientist',
        'company' => 'AI Solutions Ltd.',
        'expertise' => ['Machine Learning', 'Python', 'Data Analysis'],
        'avatar' => 'https://ui-avatars.com/api/?name=Misaki+Yamada&background=22c55e&color=fff',
        'students' => 8,
        'rating' => 4.9
    ],
    [
        'id' => 5,
        'name' => '鈴木大輔',
        'position' => 'Mobile App Developer',
        'company' => 'AppCraft Studio',
        'expertise' => ['React Native', 'iOS', 'Android'],
        'avatar' => 'https://ui-avatars.com/api/?name=Daisuke+Suzuki&background=22c55e&color=fff',
        'students' => 15,
        'rating' => 4.7
    ]
];

// Helper Functions

function getUserByEmail($email) {
    global $DEMO_USERS;
    foreach ($DEMO_USERS as $user) {
        if ($user['email'] === $email) {
            return $user;
        }
    }
    return null;
}

function getUserById($id) {
    global $DEMO_USERS;
    foreach ($DEMO_USERS as $user) {
        if ($user['id'] == $id) {
            return $user;
        }
    }
    return null;
}

function getBlogById($id) {
    global $DEMO_BLOGS;
    foreach ($DEMO_BLOGS as $blog) {
        if ($blog['id'] == $id) {
            return $blog;
        }
    }
    return null;
}

function getBlogs($status = null) {
    global $DEMO_BLOGS;
    if ($status === null) {
        return $DEMO_BLOGS;
    }
    return array_filter($DEMO_BLOGS, function($blog) use ($status) {
        return $blog['status'] === $status;
    });
}

function getQuestions() {
    global $DEMO_QUESTIONS;
    return $DEMO_QUESTIONS;
}

function getMentors() {
    global $DEMO_MENTORS;
    return $DEMO_MENTORS;
}
