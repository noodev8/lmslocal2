import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import api from '../services/api';

export default function RoundFixtures() {
  const { competitionId, roundId } = useParams();
  const navigate = useNavigate();
  const [fixtures, setFixtures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [competitionName, setCompetitionName] = useState('');
  const [roundNumber, setRoundNumber] = useState('');
  const [teams, setTeams] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [newFixture, setNewFixture] = useState({
    home_team_id: '',
    away_team_id: '',
    kickoff_time: ''
  });

  // Get teams that are not already used in fixtures
  const getUsedTeamIds = () => {
    const used = new Set();
    fixtures.forEach(fixture => {
      // Convert team names back to IDs by matching with teams array
      const homeTeam = teams.find(t => t.name === fixture.home_team);
      const awayTeam = teams.find(t => t.name === fixture.away_team);
      
      if (homeTeam) used.add(homeTeam.id);
      if (awayTeam) used.add(awayTeam.id);
    });
    return used;
  };

  const getAvailableTeams = () => {
    const usedTeamIds = getUsedTeamIds();
    return teams.filter(team => !usedTeamIds.has(team.id));
  };

  useEffect(() => {
    const currentUser = authAPI.getCurrentUser();
    if (!currentUser || !authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadData();
  }, [competitionId, roundId, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load competition name and teams
      const compResponse = await api.post('/mycompetitions');
      if (compResponse.data.return_code === 'SUCCESS') {
        const comp = compResponse.data.competitions.find(c => c.id === parseInt(competitionId));
        if (comp) {
          setCompetitionName(comp.name);
          
          console.log('Competition team_list_id:', comp.team_list_id);
          
          // Load teams for this competition's team list
          if (comp.team_list_id) {
            const teamsResponse = await api.post('/get-teams', {
              team_list_id: comp.team_list_id
            });
            
            if (teamsResponse.data.return_code === 'SUCCESS') {
              console.log('Loaded teams:', teamsResponse.data.teams);
              setTeams(teamsResponse.data.teams);
            } else {
              console.log('Failed to load teams:', teamsResponse.data.message);
              setTeams([]);
            }
          } else {
            console.log('No team_list_id found for competition');
            setTeams([]);
          }
        }
      }

      // Load rounds to get round number
      const roundsResponse = await api.post('/get-rounds', {
        competition_id: parseInt(competitionId)
      });

      if (roundsResponse.data.return_code === 'SUCCESS') {
        const round = roundsResponse.data.rounds.find(r => r.id === parseInt(roundId));
        if (round) {
          setRoundNumber(round.round_number);
        }
      }

      // Load fixtures
      const fixturesResponse = await api.post('/get-fixtures', {
        round_id: parseInt(roundId)
      });

      if (fixturesResponse.data.return_code === 'SUCCESS') {
        setFixtures(fixturesResponse.data.fixtures);
        console.log('Loaded fixtures:', fixturesResponse.data.fixtures);
      } else {
        console.warn('No fixtures found:', fixturesResponse.data.message);
        setFixtures([]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Failed to load data: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFixture = async () => {
    if (!newFixture.home_team_id || !newFixture.away_team_id || !newFixture.kickoff_time) {
      setError('Please fill in all fields');
      return;
    }

    if (newFixture.home_team_id === newFixture.away_team_id) {
      setError('Home and away teams cannot be the same');
      return;
    }

    try {
      const response = await api.post('/add-fixture', {
        competition_id: parseInt(competitionId),
        round_id: parseInt(roundId),
        home_team_id: parseInt(newFixture.home_team_id),
        away_team_id: parseInt(newFixture.away_team_id),
        kickoff_time: newFixture.kickoff_time
      });

      if (response.data.return_code === 'SUCCESS') {
        setSuccess('Fixture added successfully!');
        setShowAddForm(false);
        setNewFixture({ home_team_id: '', away_team_id: '', kickoff_time: '' });
        setError('');
        
        // Reload fixtures to show the new one
        loadData();
      } else {
        setError(`Failed to add fixture: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error adding fixture:', error);
      setError(`Failed to add fixture: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditFixture = (fixture) => {
    setEditingFixture({
      ...fixture,
      kickoff_time: new Date(fixture.kickoff_time).toISOString().slice(0, 16)
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFixture.kickoff_time) {
      setError('Kickoff time is required');
      return;
    }

    try {
      const response = await api.post('/modify-fixture', {
        fixture_id: editingFixture.id,
        kickoff_time: editingFixture.kickoff_time
      });

      if (response.data.return_code === 'SUCCESS') {
        setSuccess('Fixture updated successfully!');
        setEditingFixture(null);
        setError('');
        
        // Reload fixtures to show the updated time
        loadData();
      } else {
        setError(`Failed to update fixture: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error updating fixture:', error);
      setError(`Failed to update fixture: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingFixture(null);
    setError('');
  };

  const handleSetResult = async (fixtureId, result) => {
    try {
      const response = await api.post('/set-fixture-result', {
        fixture_id: fixtureId,
        result: result
      });

      if (response.data.return_code === 'SUCCESS') {
        setSuccess('Result set successfully!');
        setError('');
        
        // Reload fixtures to show the updated result
        loadData();
      } else {
        setError(`Failed to set result: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error setting result:', error);
      setError(`Failed to set result: ${error.response?.data?.message || error.message}`);
    }
  };

  if (isLoading) {
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/competition/${competitionId}`)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Competition
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {competitionName} - Round {roundNumber} Fixtures
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <strong>Success:</strong> {success}
            </div>
          )}

          {/* Fixtures Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Fixtures</h2>
                <button
                  onClick={() => {
                    // Set default to next Saturday at 3pm
                    const defaultTime = new Date();
                    const daysUntilSaturday = (6 - defaultTime.getDay()) % 7 || 7;
                    defaultTime.setDate(defaultTime.getDate() + daysUntilSaturday);
                    defaultTime.setHours(15, 0, 0, 0);
                    
                    setNewFixture({ 
                      home_team_id: '', 
                      away_team_id: '', 
                      kickoff_time: defaultTime.toISOString().slice(0, 16)
                    });
                    setShowAddForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  Add Fixture
                </button>
              </div>
              
              {fixtures.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No fixtures added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fixtures.map((fixture) => (
                    <div key={fixture.id} className="border border-gray-200 rounded-lg p-4">
                      {editingFixture && editingFixture.id === fixture.id ? (
                        // Edit mode
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900">
                              {fixture.home_team} vs {fixture.away_team}
                            </h3>
                            <span className="text-sm text-gray-500">
                              ({fixture.home_team_short} vs {fixture.away_team_short})
                            </span>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Kickoff Time
                            </label>
                            <input
                              type="datetime-local"
                              value={editingFixture.kickoff_time}
                              onChange={(e) => setEditingFixture({...editingFixture, kickoff_time: e.target.value})}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>

                          {fixture.result && (
                            <p className="text-sm font-medium text-green-600">
                              Result: {fixture.result}
                            </p>
                          )}
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900">
                                {fixture.home_team} vs {fixture.away_team}
                              </h3>
                              <span className="text-sm text-gray-500">
                                ({fixture.home_team_short} vs {fixture.away_team_short})
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Kickoff: {new Date(fixture.kickoff_time).toLocaleString()}
                            </p>
                            {fixture.result && (
                              <p className="text-sm font-medium text-green-600 mt-1">
                                Result: {fixture.result}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditFixture(fixture)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Edit Time
                              </button>
                            </div>
                            
                            {/* Result Setting Buttons */}
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleSetResult(fixture.id, 'home_win')}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                title={`${fixture.home_team_short} Win`}
                              >
                                {fixture.home_team_short}
                              </button>
                              <button
                                onClick={() => handleSetResult(fixture.id, 'draw')}
                                className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                                title="Draw"
                              >
                                Draw
                              </button>
                              <button
                                onClick={() => handleSetResult(fixture.id, 'away_win')}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                title={`${fixture.away_team_short} Win`}
                              >
                                {fixture.away_team_short}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Fixture Form */}
          {showAddForm && (
            <div className="bg-white shadow rounded-lg mt-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Fixture</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Home Team
                    </label>
                    <select
                      value={newFixture.home_team_id}
                      onChange={(e) => setNewFixture({...newFixture, home_team_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select home team</option>
                      {getAvailableTeams().map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Away Team
                    </label>
                    <select
                      value={newFixture.away_team_id}
                      onChange={(e) => setNewFixture({...newFixture, away_team_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select away team</option>
                      {getAvailableTeams().filter(team => team.id != newFixture.home_team_id).map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kickoff Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newFixture.kickoff_time}
                      onChange={(e) => setNewFixture({...newFixture, kickoff_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewFixture({ home_team_id: '', away_team_id: '', kickoff_time: '' });
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFixture}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Fixture
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}