import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Check if we have authentication data in localStorage as a fallback
  // This helps during navigation transitions when user state might temporarily be null
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  if (!user) {
    // If no user in context but we have token/userData in localStorage, allow access
    // The AuthContext will update the user state soon
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser && parsedUser.user_type) {
          return children; // Allow access, user will be set by AuthContext
        }
      } catch (e) {
        // Invalid userData, redirect to landing
      }
    }
    // No user and no token, redirect to landing
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;

