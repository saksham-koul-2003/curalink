-- Chat messages table for researcher connections
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    connection_id INT NOT NULL,
    sender_id INT NOT NULL, -- researcher_profile_id of sender
    receiver_id INT NOT NULL, -- researcher_profile_id of receiver
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES collaborator_connections(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES researcher_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES researcher_profiles(id) ON DELETE CASCADE,
    INDEX idx_connection_id (connection_id),
    INDEX idx_sender_receiver (sender_id, receiver_id),
    INDEX idx_created_at (created_at)
);

