import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import api from '../services/api';

export default function Competition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateRound, setShowCreateRound] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  useEffect(() => {
    const currentUser = authAPI.getCurrentUser();
    if (!currentUser || !authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadCompetitionData();
  }, [id, navigate]);

  const loadCompetitionData = async () => {
    setIsLoading(true);
    try {
      // Load competition details
      console.log('Loading competition data for ID:', id);
      const compResponse = await api.post('/mycompetitions');

      if (compResponse.data.return_code === 'SUCCESS') {
        console.log('Competitions loaded:', compResponse.data.competitions);
        const comp = compResponse.data.competitions.find(c => c.id === parseInt(id));
        if (!comp) {
          setError('Competition not found');
          return;
        }
        setCompetition(comp);
        console.log('Competition found:', comp);

        // Load rounds for this competition
        await loadRounds(parseInt(id));
      } else {
        setError(`Failed to load competitions: ${compResponse.data.message}`);
      }
    } catch (error) {
      console.error('Error loading competition:', error);
      setError(`Failed to load competition: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRounds = async (competitionId) => {
    try {
      console.log('Loading rounds for competition:', competitionId);
      const response = await api.post('/get-rounds', {
        competition_id: competitionId
      });

      if (response.data.return_code === 'SUCCESS') {
        console.log('Rounds loaded:', response.data.rounds);
        setRounds(response.data.rounds);
      } else {
        console.error('Failed to load rounds:', response.data.message);
        setRounds([]);
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
      setRounds([]);
    }
  };

  const handleCreateRound = async () => {
    if (!competition) return;
    
    try {
      // Set default lock time to 24 hours from now (admin can change later)
      const defaultLockTime = new Date();
      defaultLockTime.setHours(defaultLockTime.getHours() + 24);
      
      const response = await api.post('/create-round', {
        competition_id: competition.id,
        lock_time: defaultLockTime.toISOString()
      });

      if (response.data.return_code === 'SUCCESS') {
        setSuccess('Round created successfully! Add fixtures and the lock time will auto-adjust to 1hr before kickoffs.');
        setShowCreateRound(false);
        // Reload rounds to show the new one
        await loadRounds(competition.id);
        // Navigate to fixture entry for this round
        navigate(`/competition/${competition.id}/round/${response.data.round.id}/fixtures`);
      } else {
        setError(`Failed to create round: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error creating round:', error);
      setError(`Error creating round: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleLockUnlockCompetition = async () => {
    if (!competition) return;
    
    const newStatus = competition.status === 'LOCKED' ? 'UNLOCKED' : 'LOCKED';
    setIsChangingStatus(true);
    
    try {
      const response = await api.post('/lock-unlock-competition', {
        competition_id: competition.id,
        status: newStatus
      });

      if (response.data.return_code === 'SUCCESS') {
        setSuccess(`Competition ${newStatus.toLowerCase()} successfully!`);
        // Update local competition state
        setCompetition(prev => ({
          ...prev,
          status: newStatus
        }));
      } else {
        setError(`Failed to ${newStatus.toLowerCase()} competition: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error changing competition status:', error);
      setError(`Error changing competition status: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsChangingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Competition Not Found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {competition.name}
              </h1>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  competition.status === 'LOCKED' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {competition.status}
                </span>
                {competition.is_organiser && (
                  <button
                    onClick={handleLockUnlockCompetition}
                    disabled={isChangingStatus}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      competition.status === 'LOCKED'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    } ${isChangingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isChangingStatus 
                      ? 'Changing...' 
                      : competition.status === 'LOCKED' ? 'Unlock' : 'Lock'
                    }
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                Code: {competition.invite_code}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Error/Success Messages */}
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
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="text-sm text-gray-900">{competition.description || 'No description'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Team List</dt>
                      <dd className="text-sm text-gray-900">{competition.team_list_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Lives per Player</dt>
                      <dd className="text-sm text-gray-900">{competition.lives_per_player}</dd>
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
                      <dt className="text-sm font-medium text-gray-500">No Team Twice</dt>
                      <dd className="text-sm text-gray-900">{competition.no_team_twice ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Invite Code</dt>
                      <dd className="text-sm text-gray-900 font-mono">{competition.invite_code}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Rounds Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Rounds</h2>
                {competition.is_organiser && (
                  <button
                    onClick={handleCreateRound}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                  >
                    Create New Round
                  </button>
                )}
              </div>
              
              {rounds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No rounds created yet.</p>
                  {competition.is_organiser && (
                    <p className="text-sm mt-2">Click "Create New Round" to get started!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {rounds.map((round, index) => (
                    <div key={round.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Round {round.round_number}</h3>
                          <p className="text-sm text-gray-600">
                            {round.fixture_count || 0} fixtures
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/competition/${competition.id}/round/${round.id}/fixtures`)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                          >
                            Manage Fixtures
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}