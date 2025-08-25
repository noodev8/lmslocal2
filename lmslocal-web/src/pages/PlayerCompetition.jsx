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
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinForm, setJoinForm] = useState({
    display_name: '',
    email: '',
    invite_code: ''
  });
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    loadCompetitionData();
    
    // Check for magic link token
    const token = searchParams.get('token');
    if (token) {
      handleMagicLinkAuth(token);
    }
  }, [slug, searchParams]);

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

  const handleMagicLinkAuth = async (token) => {
    try {
      console.log('Authenticating with magic link token...');
      const response = await api.post('/verify-player-token', {
        token: token,
        slug: slug
      });

      if (response.data.return_code === 'SUCCESS') {
        console.log('Magic link authentication successful:', response.data);
        console.log('New JWT token:', response.data.jwt_token.substring(0, 50) + '...');
        setIsAuthenticated(true);
        setPlayerStatus(response.data.player_status);
        setSuccess(`Welcome back, ${response.data.user.display_name}! You're now logged in.`);
        
        // Clear any old tokens first
        localStorage.removeItem('playerToken');
        localStorage.removeItem('playerUser');
        
        // Store JWT token for future requests
        localStorage.setItem('playerToken', response.data.jwt_token);
        localStorage.setItem('playerUser', JSON.stringify(response.data.user));
        
        console.log('Token stored. Verifying:', localStorage.getItem('playerToken').substring(0, 50) + '...');
        
        // Load current round data with the fresh token
        await loadCurrentRound(response.data.jwt_token);
      } else {
        setError(`Authentication failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Magic link authentication error:', error);
      setError(`Authentication failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setIsJoining(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/join-competition-by-slug', {
        slug: slug,
        display_name: joinForm.display_name,
        email: joinForm.email,
        invite_code: joinForm.invite_code
      });

      if (response.data.return_code === 'SUCCESS') {
        setSuccess('Magic link sent to your email! Check your inbox and click the link to complete joining.');
        setShowJoinForm(false);
        setJoinForm({ display_name: '', email: '', invite_code: '' });
      } else {
        setError(`Join failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Join competition error:', error);
      setError(`Join failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsJoining(false);
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
          <a
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  if (!competition) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {competition.name}
              </h1>
              <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                competition.status === 'LOCKED' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {competition.status}
              </span>
            </div>
          </div>
        </div>
      </header>

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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Competition Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{playerStatus.lives_remaining}</div>
                    <div className="text-sm text-gray-500">Lives Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${playerStatus.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {playerStatus.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-500">Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{competition.player_count}</div>
                    <div className="text-sm text-gray-500">Total Players</div>
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
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Fixtures:</h4>
                        {currentRound.fixtures.map(fixture => (
                          <div key={fixture.id} className="bg-gray-50 p-3 rounded border">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {fixture.home_team} vs {fixture.away_team}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(fixture.kickoff_time).toLocaleString()}
                              </span>
                            </div>
                            {playerPick && playerPick.fixture_id === fixture.id && (
                              <div className="mt-2 text-sm text-green-600 font-medium">
                                ✓ Your pick: {playerPick.team}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No fixtures available for this round</p>
                    )}
                    
                    {playerPick && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800">
                          <strong>Your Pick:</strong> {playerPick.team} (made {new Date(playerPick.created_at).toLocaleString()})
                        </p>
                      </div>
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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Join This Competition</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Ready to test your football knowledge? Join {competition.name} and compete against {competition.player_count} other players!
                </p>
                
                {!showJoinForm ? (
                  <button
                    className="bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-blue-700"
                    onClick={() => setShowJoinForm(true)}
                  >
                    Join Competition
                  </button>
                ) : (
                  <form onSubmit={handleJoinSubmit} className="max-w-md mx-auto space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                      <input
                        type="text"
                        required
                        value={joinForm.display_name}
                        onChange={(e) => setJoinForm({...joinForm, display_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={joinForm.email}
                        onChange={(e) => setJoinForm({...joinForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="john@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                      <input
                        type="text"
                        required
                        value={joinForm.invite_code}
                        onChange={(e) => setJoinForm({...joinForm, invite_code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter invite code"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={isJoining}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isJoining ? 'Sending...' : 'Send Magic Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowJoinForm(false)}
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