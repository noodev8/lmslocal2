import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [competitions, setCompetitions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Check if already logged in (try player token first, then admin token)
    const playerToken = localStorage.getItem('playerToken');
    const adminToken = localStorage.getItem('token');
    
    if (playerToken) {
      // Use player token - separate player login
      setIsAuthenticated(true);
      loadUserCompetitions(playerToken);
    } else if (adminToken) {
      // Use admin token - already logged in from main dashboard
      setIsAuthenticated(true);
      loadUserCompetitions(adminToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/player-login-general', {
        email: loginForm.email,
        password: loginForm.password
      });

      if (response.data.return_code === 'SUCCESS') {
        // Clear any existing tokens first
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('playerToken');
        localStorage.removeItem('playerUser');
        
        setIsAuthenticated(true);
        setSuccess(`Welcome back, ${response.data.user.display_name}!`);
        
        // Store JWT token and user data
        localStorage.setItem('playerToken', response.data.jwt_token);
        localStorage.setItem('playerUser', JSON.stringify(response.data.user));
        
        // Load user's competitions
        await loadUserCompetitions(response.data.jwt_token);
        
        // Reset form
        setLoginForm({ email: '', password: '' });
        setShowLoginForm(false);
      } else {
        setError(`Login failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(`Login failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadUserCompetitions = async (token) => {
    try {
      const authToken = token || localStorage.getItem('playerToken') || localStorage.getItem('token');
      if (!authToken) {
        setError('Please log in to view your competitions');
        return;
      }

      const response = await api.post('/get-user-competitions', 
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data.return_code === 'SUCCESS') {
        setCompetitions(response.data.competitions);
      } else {
        setError(`Failed to load competitions: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error loading competitions:', error);
      setError(`Failed to load competitions: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterCompetition = (competition) => {
    // Navigate to specific competition page
    navigate(`/play/${competition.slug}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('playerToken');
    localStorage.removeItem('playerUser');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCompetitions([]);
    setError('');
    setSuccess('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Player Login</h2>
            <p className="text-gray-600 mt-2">Access your competitions</p>
          </div>
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your password"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoggingIn ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show competitions dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                My Competitions
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {JSON.parse(localStorage.getItem('playerUser') || localStorage.getItem('user') || '{}').display_name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Success/Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-start">
                <div>{error}</div>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-start">
                <div>{success}</div>
                <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">×</button>
              </div>
            </div>
          )}

          {/* Competitions Grid */}
          {competitions.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Competitions Found</h3>
              <p className="text-gray-500">You haven't joined any competitions yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {competitions.map(competition => (
                <div key={competition.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEnterCompetition(competition)}>
                  <div className="p-6">
                    {/* Competition Header */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{competition.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        competition.status === 'LOCKED' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {competition.status}
                      </span>
                    </div>

                    {/* Player Status */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            competition.player_status.lives_remaining === 0 ? 'text-red-600' :
                            competition.player_status.lives_remaining === 1 ? 'text-orange-600' :
                            'text-blue-600'
                          }`}>
                            {competition.player_status.lives_remaining}
                          </div>
                          <div className="text-xs text-gray-500">Lives Left</div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            competition.player_status.status === 'active' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {competition.player_status.status === 'active' ? '🎯' : '💀'}
                          </div>
                          <div className="text-xs text-gray-500">{competition.player_status.status.toUpperCase()}</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{competition.player_count}</div>
                          <div className="text-xs text-gray-500">Players</div>
                        </div>
                      </div>
                    </div>

                    {/* Competition Info */}
                    <div className="text-sm text-gray-600 mb-4">
                      <p>League: {competition.team_list_name}</p>
                      <p>Joined: {new Date(competition.player_status.joined_at).toLocaleDateString()}</p>
                    </div>

                    {/* Enter Button */}
                    <button 
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterCompetition(competition);
                      }}
                    >
                      Enter Competition
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}