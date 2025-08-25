import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import api from '../services/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamLists, setTeamLists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    team_list_id: '',
    lives_per_player: 1,
    no_team_twice: true,
    organiser_joins_as_player: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authAPI.getCurrentUser();
    if (!currentUser || !authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    loadCompetitions();
  }, [navigate]);

  const loadCompetitions = async () => {
    try {
      const response = await api.post('/mycompetitions');
      if (response.data.return_code === 'SUCCESS') {
        setCompetitions(response.data.competitions);
      }
    } catch (error) {
      console.error('Error loading competitions:', error);
      setError(`Failed to load competitions: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/');
  };

  const loadTeamLists = async () => {
    try {
      console.log('Loading team lists...');
      const response = await api.get('/team-lists');
      console.log('Team lists response:', response.data);
      if (response.data.return_code === 'SUCCESS') {
        setTeamLists(response.data.team_lists);
      } else {
        setError(`Team lists error: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error loading team lists:', error);
      setError(`Team lists failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCreateCompetition = async () => {
    if (!createForm.name.trim() || !createForm.team_list_id) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      console.log('Creating competition with data:', createForm);
      const response = await api.post('/create-competition', createForm);
      console.log('Create competition response:', response.data);
      
      if (response.data.return_code === 'SUCCESS') {
        setSuccess('Competition created successfully!');
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          description: '',
          team_list_id: '',
          lives_per_player: 1,
          no_team_twice: true,
          organiser_joins_as_player: true
        });
        loadCompetitions(); // Refresh the competitions list
      } else {
        setError(`Creation failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Create competition error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Network error';
      const statusCode = error.response?.status || 'Unknown';
      setError(`Error ${statusCode}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = async () => {
    await loadTeamLists();
    setShowCreateModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                LMSLocal Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.display_name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
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
                <div>
                  <strong>Error:</strong> {error}
                </div>
                <button 
                  onClick={() => setError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <strong>Success:</strong> {success}
                </div>
                <button 
                  onClick={() => setSuccess('')}
                  className="text-green-400 hover:text-green-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to LMSLocal! 🎯
              </h2>
              <p className="text-gray-600">
                Your admin-first platform for running Last Man Standing competitions.
                Get started by creating your first competition or managing existing ones.
              </p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Side - Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Section */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
                    Your Statistics
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{competitions.length}</div>
                      <div className="text-sm text-gray-500">My Competitions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {competitions.reduce((total, comp) => total + comp.player_count, 0)}
                      </div>
                      <div className="text-sm text-gray-500">Total Players</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {competitions.filter(comp => comp.is_organiser).length}
                      </div>
                      <div className="text-sm text-gray-500">Competitions I Organise</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - My Competitions */}
            <div className="lg:col-span-1 order-first lg:order-last">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900">My Competitions</h3>
                    <button
                      onClick={openCreateModal}
                      className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm hover:bg-blue-700"
                    >
                      + Create New
                    </button>
                  </div>
                  
                  {competitions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">You haven't created any competitions yet.</p>
                      <p className="text-xs mt-2">Click "Create New Competition" to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {competitions.map(competition => (
                        <div key={competition.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <button 
                                onClick={() => navigate(`/competition/${competition.id}`)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 text-left"
                              >
                                {competition.name}
                              </button>
                              <div className="flex items-center space-x-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  competition.status === 'LOCKED' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {competition.status}
                                </span>
                                {competition.is_organiser && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    ORGANISER
                                  </span>
                                )}
                              </div>
                            </div>
                            {competition.description && (
                              <p className="text-gray-600 text-xs">{competition.description}</p>
                            )}
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>{competition.team_list_name}</div>
                              <div>{competition.player_count} players • {competition.lives_per_player} {competition.lives_per_player === 1 ? 'life' : 'lives'}</div>
                              <div>Code: {competition.invite_code}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Competition Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Competition</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Competition Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Premier League LMS 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows="2"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team List *
                  </label>
                  <select
                    value={createForm.team_list_id}
                    onChange={(e) => setCreateForm({...createForm, team_list_id: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a team list</option>
                    {teamLists.map(list => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.team_count} teams)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lives per Player
                  </label>
                  <select
                    value={createForm.lives_per_player}
                    onChange={(e) => setCreateForm({...createForm, lives_per_player: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1 Life</option>
                    <option value={2}>2 Lives</option>
                    <option value={3}>3 Lives</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createForm.no_team_twice}
                      onChange={(e) => setCreateForm({...createForm, no_team_twice: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">No team can be picked twice</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createForm.organiser_joins_as_player}
                      onChange={(e) => setCreateForm({...createForm, organiser_joins_as_player: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">I want to join as a player</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCompetition}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Competition'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}