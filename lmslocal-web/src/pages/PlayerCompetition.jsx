import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function PlayerCompetition() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [competition, setCompetition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [playerStatus, setPlayerStatus] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [playerPick, setPlayerPick] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPickingTeam, setIsPickingTeam] = useState(false);
  const [pickSuccess, setPickSuccess] = useState('');
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  useEffect(() => {
    // Always start by loading competition data (no auth required)
    loadCompetitionData();
  }, [slug]);

  const loadCompetitionData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading competition data for slug:', slug);
      const response = await api.post('/get-competition-by-slug', {
        slug: slug
      });

      if (response.data.return_code === 'SUCCESS') {
        console.log('Competition loaded:', response.data.competition);
        setCompetition(response.data.competition);
        // Show access code dialog after loading competition
        setShowAccessCodeDialog(true);
      } else {
        setError(`Competition not found: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error loading competition:', error);
      setError(`Failed to load competition: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/player-login', {
        email: loginForm.email,
        password: loginForm.password,
        slug: slug
      });

      if (response.data.return_code === 'SUCCESS') {
        setIsAuthenticated(true);
        setPlayerStatus(response.data.player_status);
        setCompetition(response.data.competition); // Set competition from login response!
        setSuccess(`Welcome back, ${response.data.user.display_name}!`);
        
        // Store JWT token and user data
        localStorage.setItem('playerToken', response.data.jwt_token);
        localStorage.setItem('playerUser', JSON.stringify(response.data.user));
        
        // Load current round data
        await loadCurrentRound(response.data.jwt_token);
        
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


  const loadCurrentRound = async (token) => {
    try {
      const authToken = token || localStorage.getItem('playerToken');
      if (!authToken) {
        console.log('No auth token available for loading round data');
        return;
      }

      console.log('Loading current round data...');
      console.log('Using token:', authToken.substring(0, 50) + '...');
      console.log('Using slug:', slug);
      
      const response = await api.post('/get-player-current-round', 
        { slug: slug },
        { 
          headers: { 
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data.return_code === 'SUCCESS') {
        console.log('Current round data loaded:', response.data);
        setCurrentRound(response.data.current_round);
        setPlayerPick(response.data.player_pick);
      } else {
        console.error('Failed to load round data:', response.data.message);
        setError(`Failed to load round data: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error loading current round:', error);
      console.error('Full error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message;
      setError(`Failed to load round data: ${errorMessage}`);
    }
  };

  const handleAccessCodeSubmit = async (e) => {
    e.preventDefault();
    setIsValidatingCode(true);
    setError('');

    try {
      const response = await api.post('/validate-access-code', {
        slug: slug,
        access_code: accessCode
      });

      if (response.data.return_code === 'SUCCESS') {
        setShowAccessCodeDialog(false);
        setSuccess('Access granted! Welcome to the competition.');
        // Competition is now accessible - you could show basic info here
        // without requiring full authentication
      } else {
        // Show friendly error message
        if (response.data.return_code === 'INVALID_ACCESS_CODE') {
          setError('Invalid access code. Please check the code and try again.');
        } else {
          setError('Unable to access competition. Please check the access code.');
        }
      }
    } catch (error) {
      console.error('Access code validation error:', error);
      setError(error.response?.data?.message || 'Failed to validate access code');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handlePick = async (fixtureId, team) => {
    setIsPickingTeam(true);
    setError('');
    setPickSuccess('');

    try {
      const authToken = localStorage.getItem('playerToken');
      if (!authToken) {
        setError('Please log in to make a pick');
        return;
      }

      const response = await api.post('/set-pick', 
        {
          fixture_id: fixtureId,
          team: team
        },
        { 
          headers: { 
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data.return_code === 'SUCCESS') {
        setPickSuccess(`Pick saved! You chose ${response.data.pick.team}`);
        // Reload current round to update pick display
        await loadCurrentRound();
      } else {
        setError(`Pick failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Pick error:', error);
      setError(`Pick failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsPickingTeam(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Competition Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError('');
              setShowAccessCodeDialog(false);
              loadCompetitionData();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-4"
          >
            Try Again
          </button>
          <a
            href="/play"
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Back to Competitions
          </a>
        </div>
      </div>
    );
  }

  // Show access code dialog if competition loaded but not authenticated
  if (showAccessCodeDialog && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Enter Access Code</h2>
            <p className="text-gray-600 mt-2">
              {competition ? competition.name : `Competition ${slug}`}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Enter the competition access code to view details
            </p>
          </div>
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-center">
                <div className="mb-3">
                  <strong>❌ {error}</strong>
                </div>
                <p className="text-sm mb-4">Please check the access code and try again, or contact the competition organizer.</p>
                <button
                  onClick={() => {
                    setError('');
                    setAccessCode('');
                    // Focus back on the input field
                    setTimeout(() => {
                      const input = document.querySelector('input[type="text"]');
                      if (input) input.focus();
                    }, 100);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Try Different Code
                </button>
              </div>
            )}
            
            <form onSubmit={handleAccessCodeSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Access Code</label>
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                  placeholder="Enter access code"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isValidatingCode}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isValidatingCode ? 'Validating...' : 'Enter Competition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!competition && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Competition Not Found</h2>
          <a
            href="/"
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Add logout functionality as a separate component
  const LogoutButton = () => (
    <button
      onClick={() => {
        localStorage.removeItem('playerToken');
        localStorage.removeItem('playerUser');
        setIsAuthenticated(false);
        setPlayerStatus(null);
        setCurrentRound(null);
        setPlayerPick(null);
        setCompetition(null);
        setError('');
        setSuccess('');
        setPickSuccess('');
      }}
      className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
    >
      Logout
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Always show if authenticated */}
      {isAuthenticated && (
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  {competition ? competition.name : `Competition ${slug}`}
                </h1>
                {competition && (
                  <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                    competition.status === 'LOCKED' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {competition.status}
                  </span>
                )}
              </div>
              
              {/* Logout Button - Always visible when authenticated */}
              <div className="flex items-center">
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Success/Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-start">
                <div><strong>Error:</strong> {error}</div>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-start">
                <div><strong>Success:</strong> {success}</div>
                <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">×</button>
              </div>
            </div>
          )}
          
          {pickSuccess && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-start">
                <div><strong>Pick Saved:</strong> {pickSuccess}</div>
                <button onClick={() => setPickSuccess('')} className="text-blue-400 hover:text-blue-600">×</button>
              </div>
            </div>
          )}
          
          {/* Competition Info */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Competition Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dl className="space-y-2">
                    {competition.description && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-sm text-gray-900">{competition.description}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Team List</dt>
                      <dd className="text-sm text-gray-900">{competition.team_list_name}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Players</dt>
                      <dd className="text-sm text-gray-900">{competition.player_count} players</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Lives per Player</dt>
                      <dd className="text-sm text-gray-900">{competition.lives_per_player}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">No Team Twice</dt>
                      <dd className="text-sm text-gray-900">{competition.no_team_twice ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Player Dashboard or Join Section */}
          {isAuthenticated && playerStatus ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Your Competition Status</h2>
                  <div className="flex items-center space-x-2">
                    {playerStatus.status === 'active' ? (
                      <span className="flex items-center text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        ELIMINATED
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">{playerStatus.lives_remaining}</div>
                      <div className="text-sm font-medium text-blue-800">Lives Remaining</div>
                      <div className="text-xs text-blue-600 mt-1">
                        {playerStatus.lives_remaining === 1 ? 'Last life - be careful!' : 
                         playerStatus.lives_remaining === 0 ? 'Eliminated' : 
                         'You\'re doing well!'}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${
                    playerStatus.status === 'active' 
                      ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
                      : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                  }`}>
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-1 ${
                        playerStatus.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {playerStatus.status === 'active' ? '🎯' : '💀'}
                      </div>
                      <div className={`text-sm font-medium ${
                        playerStatus.status === 'active' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {playerStatus.status.toUpperCase()}
                      </div>
                      <div className={`text-xs mt-1 ${
                        playerStatus.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {playerStatus.status === 'active' ? 'Keep going!' : 'Better luck next time'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">{competition.player_count}</div>
                      <div className="text-sm font-medium text-purple-800">Total Players</div>
                      <div className="text-xs text-purple-600 mt-1">
                        Joined {new Date(playerStatus.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Current Round Section */}
                {currentRound ? (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Round {currentRound.round_number}</h3>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Lock Time: {new Date(currentRound.lock_time).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {currentRound.is_locked ? '🔒 LOCKED' : '🔓 OPEN FOR PICKS'}
                      </p>
                    </div>
                    
                    {currentRound.fixtures && currentRound.fixtures.length > 0 ? (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Choose Your Team:</h4>
                        {currentRound.fixtures.map(fixture => (
                          <FixtureCard
                            key={fixture.id}
                            fixture={fixture}
                            playerPick={playerPick}
                            isLocked={currentRound.is_locked}
                            onPick={handlePick}
                            isPickingTeam={isPickingTeam}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No fixtures available for this round</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">No active rounds yet</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6 text-center">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Login to Competition</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Sign in to access {competition.name} and compete against {competition.player_count} other players!
                </p>
                
                {!showLoginForm ? (
                  <button
                    className="bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-blue-700"
                    onClick={() => setShowLoginForm(true)}
                  >
                    Sign In
                  </button>
                ) : (
                  <form onSubmit={handleLoginSubmit} className="max-w-md mx-auto space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Your password"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoggingIn ? 'Signing in...' : 'Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLoginForm(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// FixtureCard Component
function FixtureCard({ fixture, playerPick, isLocked, onPick, isPickingTeam }) {
  const isPlayerPicked = playerPick && playerPick.fixture_id === fixture.id;
  const playerPickedTeam = isPlayerPicked ? (
    playerPick.team === fixture.home_team_short ? 'home' : 'away'
  ) : null;

  const handleTeamClick = (team) => {
    if (isLocked || isPickingTeam) return;
    onPick(fixture.id, team);
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      {/* Match Header */}
      <div className="text-center mb-4">
        <div className="text-sm text-gray-500 mb-1">
          {new Date(fixture.kickoff_time).toLocaleDateString()} at {new Date(fixture.kickoff_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
        <div className="font-medium text-gray-900">Match {fixture.id}</div>
      </div>

      {/* Teams */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Home Team */}
        <button
          onClick={() => handleTeamClick('home')}
          disabled={isLocked || isPickingTeam}
          className={`
            w-full sm:flex-1 p-4 rounded-lg border-2 transition-all
            ${playerPickedTeam === 'home' 
              ? 'border-green-500 bg-green-50 text-green-800' 
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }
            ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            ${isPickingTeam ? 'opacity-50' : ''}
          `}
        >
          <div className="text-center">
            <div className="text-lg font-bold">{fixture.home_team_short}</div>
            <div className="text-sm text-gray-600 mt-1">{fixture.home_team}</div>
            <div className="text-xs text-gray-500 mt-1">HOME</div>
            {playerPickedTeam === 'home' && (
              <div className="mt-2">
                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                  ✓ YOUR PICK
                </span>
              </div>
            )}
          </div>
        </button>

        {/* VS Divider */}
        <div className="flex flex-col items-center px-2 sm:px-4">
          <div className="text-gray-400 font-bold text-sm sm:text-base">VS</div>
        </div>

        {/* Away Team */}
        <button
          onClick={() => handleTeamClick('away')}
          disabled={isLocked || isPickingTeam}
          className={`
            w-full sm:flex-1 p-4 rounded-lg border-2 transition-all
            ${playerPickedTeam === 'away' 
              ? 'border-green-500 bg-green-50 text-green-800' 
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }
            ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            ${isPickingTeam ? 'opacity-50' : ''}
          `}
        >
          <div className="text-center">
            <div className="text-lg font-bold">{fixture.away_team_short}</div>
            <div className="text-sm text-gray-600 mt-1">{fixture.away_team}</div>
            <div className="text-xs text-gray-500 mt-1">AWAY</div>
            {playerPickedTeam === 'away' && (
              <div className="mt-2">
                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                  ✓ YOUR PICK
                </span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Status Messages */}
      {isLocked && (
        <div className="mt-3 text-center">
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
            🔒 Round Locked - No Changes Allowed
          </span>
        </div>
      )}
      
      {isPickingTeam && (
        <div className="mt-3 text-center">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
            ⏳ Saving your pick...
          </span>
        </div>
      )}
    </div>
  );
}