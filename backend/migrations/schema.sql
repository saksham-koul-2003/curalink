-- CuraLink Database Schema (MySQL)

-- Users table (for both patients and researchers)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('patient', 'researcher') NOT NULL,
    name VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patient profiles
CREATE TABLE IF NOT EXISTS patient_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    conditions JSON, -- JSON array of medical conditions
    natural_language_input TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Researcher profiles
CREATE TABLE IF NOT EXISTS researcher_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    specialties JSON, -- JSON array of specialties
    research_interests JSON, -- JSON array of research interests
    orcid_id VARCHAR(255),
    researchgate_id VARCHAR(255),
    available_for_meetings BOOLEAN DEFAULT false,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Publications
CREATE TABLE IF NOT EXISTS publications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title TEXT NOT NULL,
    authors JSON, -- JSON array
    journal VARCHAR(255),
    pub_date DATE,
    doi VARCHAR(255),
    url TEXT,
    abstract TEXT,
    keywords JSON, -- JSON array
    ai_summary TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Researcher publications (many-to-many)
CREATE TABLE IF NOT EXISTS researcher_publications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    researcher_id INT,
    publication_id INT,
    UNIQUE(researcher_id, publication_id),
    FOREIGN KEY (researcher_id) REFERENCES researcher_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE
);

-- Clinical trials
CREATE TABLE IF NOT EXISTS clinical_trials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nct_id VARCHAR(50) UNIQUE, -- ClinicalTrials.gov ID
    title TEXT NOT NULL,
    description TEXT,
    conditions JSON, -- JSON array
    phase VARCHAR(50),
    status VARCHAR(50), -- recruiting, completed, etc.
    location VARCHAR(255),
    eligibility_criteria TEXT,
    contact_email VARCHAR(255),
    ai_summary TEXT,
    progress_percentage INT DEFAULT 0, -- Progress percentage (0-100)
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES researcher_profiles(id)
);

-- Health experts (external researchers or platform researchers)
CREATE TABLE IF NOT EXISTS health_experts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialties JSON, -- JSON array
    institution VARCHAR(255),
    location VARCHAR(255),
    email VARCHAR(255),
    research_interests JSON, -- JSON array
    is_on_platform BOOLEAN DEFAULT false,
    researcher_profile_id INT,
    source VARCHAR(50) DEFAULT 'manual', -- 'platform', 'pubmed', 'researchgate'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (researcher_profile_id) REFERENCES researcher_profiles(id)
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    item_type VARCHAR(50) NOT NULL, -- 'publication', 'clinical_trial', 'health_expert', 'collaborator'
    item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_type, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Forums (categories)
CREATE TABLE IF NOT EXISTS forum_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES researcher_profiles(id)
);

-- Forum posts
CREATE TABLE IF NOT EXISTS forum_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    author_id INT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_question BOOLEAN DEFAULT true, -- Patients can only post questions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Forum replies (only researchers can reply)
CREATE TABLE IF NOT EXISTS forum_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    author_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Collaborator connections
CREATE TABLE IF NOT EXISTS collaborator_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT,
    target_id INT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(requester_id, target_id),
    FOREIGN KEY (requester_id) REFERENCES researcher_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES researcher_profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_different_profiles CHECK (requester_id != target_id)
);

-- Meeting requests
CREATE TABLE IF NOT EXISTS meeting_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    expert_id INT,
    patient_name VARCHAR(255),
    patient_contact VARCHAR(255),
    message TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (expert_id) REFERENCES health_experts(id) ON DELETE CASCADE
);

-- Follow experts
CREATE TABLE IF NOT EXISTS expert_follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    expert_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patient_id, expert_id),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (expert_id) REFERENCES health_experts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_researcher_profiles_user_id ON researcher_profiles(user_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_forum_posts_category ON forum_posts(category_id);
CREATE INDEX idx_forum_replies_post ON forum_replies(post_id);
