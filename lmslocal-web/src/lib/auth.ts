/**
 * Authentication utilities
 */

/**
 * Clears all authentication and session data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user');
  localStorage.removeItem('current_competition');
  localStorage.removeItem('new_competition_id');
};

/**
 * Standard logout function that clears all data and redirects
 */
export const logout = (router: { push: (path: string) => void }) => {
  clearAuthData();
  router.push('/');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('jwt_token');
  const userData = localStorage.getItem('user');
  return !!(token && userData);
};

/**
 * Get current user data from localStorage
 */
export const getCurrentUser = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};