import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' 
    ? 'https://curalink-backend-l45u.onrender.com/api' 
    : 'http://localhost:5001/api'),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add token to requests dynamically using an interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized) - clear token and redirect to landing
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear it
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      // Redirect to landing page if not already there
      if (window.location.pathname !== '/' && !window.location.pathname.includes('/onboarding')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

