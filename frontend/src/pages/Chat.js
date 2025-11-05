import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Chat.css';

const Chat = () => {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [connectionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCurrentUserProfileId = async () => {
    try {
      const response = await api.get('/researchers/profile');
      if (response.data && response.data.id) {
        setCurrentUserProfileId(response.data.id);
        return response.data.id;
      }
    } catch (error) {
      console.error('Failed to fetch current user profile:', error);
    }
    return null;
  };

  const fetchMessages = async () => {
    try {
      // Get current user profile ID first
      const currentProfileId = await fetchCurrentUserProfileId();
      
      const response = await api.get(`/researchers/chat/${connectionId}/messages`);
      const fetchedMessages = response.data.messages || [];
      setMessages(fetchedMessages);
      
      // Set current user profile ID from response if available
      if (response.data.currentUserProfileId) {
        setCurrentUserProfileId(response.data.currentUserProfileId);
      }
      
      // Get other user info from connection
      try {
        const connectionResponse = await api.get('/researchers/connections');
        const acceptedConnections = connectionResponse.data.accepted || [];
        const currentConnection = acceptedConnections.find(c => c.id === parseInt(connectionId));
        
        if (currentConnection) {
          setOtherUser({ name: currentConnection.name });
        }
      } catch (err) {
        console.error('Failed to fetch connection info:', err);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (error.response?.status === 404) {
        alert('Connection not found or not accepted');
        navigate('/researcher/connections');
      }
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically add message
    const tempMessage = {
      id: Date.now(),
      message: messageText,
      sender_id: 'current',
      sender_name: 'You',
      created_at: new Date().toISOString(),
      is_temp: true,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      await api.post(`/researchers/chat/${connectionId}/messages`, {
        message: messageText,
      });
      // Refresh messages to get the real one from server
      await fetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getCurrentUserId = () => {
    // This will be determined by comparing sender_id with current user's profile
    // For now, we'll use a simple check
    return 'current';
  };

  if (loading) {
    return (
      <>
        <Navbar isPatient={false} />
        <div className="chat-page">
          <div className="container">
            <div className="loading">Loading messages...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar isPatient={false} />
      <div className="chat-page">
        <div className="container">
          <div className="chat-container">
            <div className="chat-header">
              <div className="chat-header-left">
                <button 
                  className="back-button"
                  onClick={() => navigate('/researcher/connections')}
                >
                  ← Back
                </button>
                <h2>{otherUser?.name || 'Chat'}</h2>
              </div>
              <div className="chat-header-actions">
                <a
                  href={`https://meet.jit.si/curalink-connection-${connectionId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="video-call-button"
                  title="Start video meeting"
                >
                  🎥 Start Video
                </a>
              </div>
            </div>

            <div className="chat-messages" ref={messagesContainerRef}>
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  // Determine if message is from current user
                  const isFromCurrentUser = message.is_temp || 
                    (currentUserProfileId && message.sender_id === currentUserProfileId);

                  return (
                    <div
                      key={message.id || `${message.created_at}-${index}`}
                      className={`message ${isFromCurrentUser ? 'message-sent' : 'message-received'}`}
                    >
                      <div className="message-content">
                        <p>{message.message}</p>
                        <span className="message-time">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!newMessage.trim() || sending}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;

