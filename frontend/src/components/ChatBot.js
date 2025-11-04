import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'ai',
      text: "Hi there! Welcome to CuraLink. I'm your AI assistant. I can help you find clinical trials, research publications, health experts, collaborators, and answer questions about the platform. How can I assist you today?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const showTypingIndicator = () => {
    setIsTyping(true);
  };

  const hideTypingIndicator = () => {
    setIsTyping(false);
  };

  const addMessage = (type, text, data = null) => {
    setMessages(prev => [...prev, { type, text, data }]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    addMessage('user', userMessage);
    setInputValue('');
    showTypingIndicator();

    try {
      const response = await processMessage(userMessage);
      hideTypingIndicator();
      addMessage('ai', response.text, response.data);
    } catch (error) {
      hideTypingIndicator();
      addMessage('ai', "I apologize, but I encountered an error. Please try again or rephrase your question.");
      console.error('ChatBot error:', error);
    }
  };

  const processMessage = async (userInput) => {
    const lowerInput = userInput.toLowerCase();
    const userType = user?.user_type || 'guest';

    // Search for clinical trials
    if (lowerInput.includes('trial') || lowerInput.includes('clinical trial') || lowerInput.match(/find.*trial|search.*trial|trial.*for/i)) {
      const conditionMatch = userInput.match(/(?:for|about|on|with)\s+([^?.!]+)/i);
      const condition = conditionMatch ? conditionMatch[1].trim() : null;

      if (condition && user) {
        try {
          const response = await api.get('/trials/search', {
            params: { query: condition }
          });
          const trials = response.data || [];
          
          if (trials.length > 0) {
            const topTrials = trials.slice(0, 3);
            let text = `I found ${trials.length} clinical trial${trials.length > 1 ? 's' : ''} related to "${condition}". Here are the top ${topTrials.length}:\n\n`;
            topTrials.forEach((trial, idx) => {
              text += `${idx + 1}. **${trial.title}**\n`;
              text += `   Phase: ${trial.phase || 'N/A'} | Status: ${trial.status || 'Unknown'}\n`;
              if (trial.location) text += `   Location: ${trial.location}\n`;
              text += `\n`;
            });
            text += `Would you like to see more trials or get details about any of these?`;
            return { text, data: { type: 'trials', items: topTrials } };
          } else {
            return { text: `I couldn't find any clinical trials for "${condition}". Try searching with different keywords or check the Clinical Trials page.` };
          }
        } catch (error) {
          if (error.response?.status === 401) {
            return { text: "Please log in to search for clinical trials. You can access the Clinical Trials page after logging in." };
          }
          return { text: "I encountered an issue searching for trials. Please try the Clinical Trials page directly." };
        }
      }
      return { text: "I can help you find clinical trials! For patients, you can search by condition, status, or location. For researchers, you can create and manage your own trials. Would you like to search for a specific condition or navigate to the Clinical Trials page?" };
    }

    // Search for publications
    if (lowerInput.includes('publication') || lowerInput.includes('research paper') || lowerInput.includes('paper') || lowerInput.match(/find.*publication|search.*paper/i)) {
      const topicMatch = userInput.match(/(?:about|on|for|related to)\s+([^?.!]+)/i);
      const topic = topicMatch ? topicMatch[1].trim() : null;

      if (topic) {
        try {
          const response = await api.get('/publications/search', {
            params: { query: topic }
          });
          const publications = response.data || [];
          
          if (publications.length > 0) {
            const topPubs = publications.slice(0, 3);
            let text = `I found ${publications.length} publication${publications.length > 1 ? 's' : ''} about "${topic}". Here are the top ${topPubs.length}:\n\n`;
            topPubs.forEach((pub, idx) => {
              text += `${idx + 1}. **${pub.title}**\n`;
              if (pub.journal) text += `   Journal: ${pub.journal}\n`;
              if (pub.pub_date) text += `   Date: ${new Date(pub.pub_date).getFullYear()}\n`;
              text += `\n`;
            });
            text += `Would you like to see more publications or read the full papers?`;
            return { text, data: { type: 'publications', items: topPubs } };
          } else {
            return { text: `I couldn't find publications about "${topic}". Try different keywords or check the Publications page.` };
          }
        } catch (error) {
          return { text: "I encountered an issue searching for publications. Please try the Publications page directly." };
        }
      }
      return { text: "I can help you find research publications! The platform searches PubMed and Semantic Scholar. What topic are you interested in? Or would you like to navigate to the Publications page?" };
    }

    // Search for health experts
    if ((lowerInput.includes('expert') || lowerInput.includes('doctor') || lowerInput.includes('specialist')) && userType === 'patient' && user) {
      const conditionMatch = userInput.match(/(?:for|specializing in|expert in|doctor for)\s+([^?.!]+)/i);
      const condition = conditionMatch ? conditionMatch[1].trim() : null;

      if (condition) {
        try {
          const response = await api.get('/experts/search', {
            params: { query: condition }
          });
          const experts = response.data || [];
          
          if (experts.length > 0) {
            const topExperts = experts.slice(0, 3);
            let text = `I found ${experts.length} health expert${experts.length > 1 ? 's' : ''} for "${condition}". Here are the top ${topExperts.length}:\n\n`;
            topExperts.forEach((expert, idx) => {
              text += `${idx + 1}. **${expert.name || 'Expert'}**\n`;
              if (expert.specialties?.[0]) text += `   Specialty: ${expert.specialties[0]}\n`;
              if (expert.institution) text += `   Institution: ${expert.institution}\n`;
              if (expert.location) text += `   Location: ${expert.location}\n`;
              text += `\n`;
            });
            text += `You can follow these experts or request meetings. Would you like to see more?`;
            return { text, data: { type: 'experts', items: topExperts } };
          } else {
            return { text: `I couldn't find health experts for "${condition}". Try different keywords or check the Health Experts page.` };
          }
        } catch (error) {
          if (error.response?.status === 401) {
            return { text: "Please log in as a patient to search for health experts." };
          }
          return { text: "I encountered an issue searching for experts. Please try the Health Experts page directly." };
        }
      }
      return { text: "I can help you find health experts! You can search by specialty, condition, or location. What condition or specialty are you looking for? Or navigate to the Health Experts page?" };
    }

    // Search for collaborators (researchers only)
    if ((lowerInput.includes('collaborator') || lowerInput.includes('researcher') || lowerInput.match(/find.*collaborator/i)) && userType === 'researcher') {
      const specialtyMatch = userInput.match(/(?:in|specializing in|expert in)\s+([^?.!]+)/i);
      const specialty = specialtyMatch ? specialtyMatch[1].trim() : null;

      if (specialty) {
        try {
          const response = await api.get('/researchers/collaborators', {
            params: { query: specialty }
          });
          const collaborators = response.data || [];
          
          if (collaborators.length > 0) {
            const topCollabs = collaborators.slice(0, 3);
            let text = `I found ${collaborators.length} potential collaborator${collaborators.length > 1 ? 's' : ''} in "${specialty}". Here are the top ${topCollabs.length}:\n\n`;
            topCollabs.forEach((collab, idx) => {
              text += `${idx + 1}. **${collab.name || 'Researcher'}**\n`;
              if (collab.specialties?.[0]) text += `   Specialty: ${collab.specialties[0]}\n`;
              if (collab.institution) text += `   Institution: ${collab.institution}\n`;
              if (collab.research_interests?.[0]) text += `   Research: ${collab.research_interests[0]}\n`;
              text += `\n`;
            });
            text += `You can send connection requests to collaborate. Would you like to see more?`;
            return { text, data: { type: 'collaborators', items: topCollabs } };
          } else {
            return { text: `I couldn't find collaborators in "${specialty}". Try different keywords or check the Collaborators page.` };
          }
        } catch (error) {
          return { text: "I encountered an issue searching for collaborators. Please try the Collaborators page directly." };
        }
      }
      return { text: "I can help you find potential collaborators! You can search by specialty, research interests, or keywords. What specialty are you interested in? Or navigate to the Collaborators page?" };
    }

    // Navigation
    if (lowerInput.includes('dashboard') || lowerInput.includes('go to dashboard')) {
      const route = userType === 'patient' ? '/patient/dashboard' : '/researcher/dashboard';
      setTimeout(() => navigate(route), 500);
      return { text: `Taking you to your ${userType} dashboard now!` };
    }

    if (lowerInput.includes('trials') && lowerInput.includes('page')) {
      const route = userType === 'patient' ? '/patient/trials' : '/researcher/trials';
      setTimeout(() => navigate(route), 500);
      return { text: `Navigating to the Clinical Trials page...` };
    }

    if (lowerInput.includes('publications') && lowerInput.includes('page')) {
      setTimeout(() => navigate('/patient/publications'), 500);
      return { text: `Navigating to the Publications page...` };
    }

    if (lowerInput.includes('experts') && lowerInput.includes('page') && userType === 'patient') {
      setTimeout(() => navigate('/patient/experts'), 500);
      return { text: `Navigating to the Health Experts page...` };
    }

    if (lowerInput.includes('collaborators') && lowerInput.includes('page') && userType === 'researcher') {
      setTimeout(() => navigate('/researcher/collaborators'), 500);
      return { text: `Navigating to the Collaborators page...` };
    }

    if (lowerInput.includes('forums') && lowerInput.includes('page')) {
      const route = userType === 'patient' ? '/patient/forums' : '/researcher/forums';
      setTimeout(() => navigate(route), 500);
      return { text: `Navigating to the Forums page...` };
    }

    if (lowerInput.includes('favorites') && lowerInput.includes('page')) {
      const route = userType === 'patient' ? '/patient/favorites' : '/researcher/favorites';
      setTimeout(() => navigate(route), 500);
      return { text: `Navigating to your Favorites page...` };
    }

    // General help
    if (lowerInput.includes('help') || lowerInput.includes('what can you do') || lowerInput.includes('how can you help')) {
      const userSpecificHelp = userType === 'patient' 
        ? "• Search for clinical trials by condition\n• Find research publications\n• Locate health experts\n• Post questions in forums\n• Save favorites"
        : userType === 'researcher'
        ? "• Create and manage clinical trials\n• Find potential collaborators\n• Search publications\n• Engage in forums\n• Save favorites"
        : "• Learn about clinical trials\n• Find research publications\n• Connect with experts\n• Navigate the platform";
      
      return { text: `I can help you with:\n\n${userSpecificHelp}\n\nWhat would you like to do?` };
    }

    // Greetings
    if (lowerInput.match(/^(hi|hello|hey|greetings)$/i)) {
      return { text: `Hello! I'm here to help you navigate CuraLink. ${user ? `You're logged in as a ${userType}. ` : ''}What would you like to explore today?` };
    }

    // Thank you
    if (lowerInput.match(/^(thanks|thank you|thank|appreciate)/i)) {
      return { text: "You're welcome! Is there anything else I can help you with?" };
    }

    // Goodbye
    if (lowerInput.match(/^(bye|goodbye|see you|farewell)/i)) {
      return { text: "Goodbye! Feel free to come back anytime if you need help. Have a great day!" };
    }

    // Default response with suggestions
    return { 
      text: `I'm here to help! You can ask me to:\n\n• Search for clinical trials (e.g., "find trials for cancer")\n• Find research publications (e.g., "find papers about immunotherapy")\n• Locate health experts (e.g., "find experts for diabetes")\n• Find collaborators (e.g., "find collaborators in oncology")\n• Navigate to different pages\n• Get help with features\n\nWhat would you like to do?` 
    };
  };

  if (!isOpen) {
    return (
      <button 
        className="chatbot-toggle-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <span className="chatbot-status-dot"></span>
          <span className="chatbot-title">AI Assistant</span>
        </div>
        <button 
          className="chatbot-close-btn"
          onClick={() => setIsOpen(false)}
          aria-label="Close AI Assistant"
        >
          ×
        </button>
      </div>

      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div key={index} className={`chatbot-message ${message.type === 'user' ? 'user-message' : 'ai-message'}`}>
            <div className="message-content">
              {message.text.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < message.text.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
              {message.data && message.data.items && (
                <div className="message-data-preview">
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                    Found {message.data.items.length} result{message.data.items.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chatbot-message ai-message">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chatbot-input-container" onSubmit={handleSend}>
        <input
          type="text"
          className="chatbot-input"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isTyping}
        />
        <button 
          type="submit" 
          className="chatbot-send-btn" 
          aria-label="Send message"
          disabled={isTyping || !inputValue.trim()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatBot;
