import axios from 'axios';

// API base configuration
const API_BASE_URL = 'http://localhost:3015';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.token) {
        config.headers.Authorization = `Bearer ${userData.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only auto-redirect if it's a token expiration, not other auth errors
      const message = error.response?.data?.message || '';
      if (message.includes('expired') || message.includes('Invalid token')) {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/login', {
        email: email.trim().toLowerCase(),
        password
      });
      
      if (response.data.return_code === 'SUCCESS') {
        // Store user data and token
        const userData = {
          ...response.data.user,
          token: response.data.token
        };
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message };
      }
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  },

  // Register user  
  register: async (displayName, email, password) => {
    try {
      const response = await api.post('/register', {
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        password
      });
      
      if (response.data.return_code === 'SUCCESS') {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.data.message };
      }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message };
      }
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('user');
    return Promise.resolve({ success: true });
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user);
      } catch (e) {
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const user = authAPI.getCurrentUser();
    return user && user.token;
  }
};

export default api;