import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

const ManageFixtures = () => {
  const { competitionId, roundId } = useParams()
  const [competition, setCompetition] = useState(null)
  const [round, setRound] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fixtureToDelete, setFixtureToDelete] = useState(null)
  const [showEditRound, setShowEditRound] = useState(false)
  const [editRoundLoading, setEditRoundLoading] = useState(false)
  const [editRoundData, setEditRoundData] = useState({
    lock_time: ''
  })
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [formData, setFormData] = useState({
    home_team_id: '',
    away_team_id: '',
    kickoff_time: ''
  })

  // Load competition, round, and fixtures
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load competition details
        const compResponse = await axios.get('/competitions/my-competitions')
        if (compResponse.data.return_code === 'SUCCESS') {
          const comp = compResponse.data.competitions.find(c => c.id === parseInt(competitionId))
          if (comp) {
            setCompetition(comp)
          } else {
            setError('Competition not found')
            return
          }
        }

        // Load rounds to get round details
        const roundsResponse = await axios.get(`/competitions/${competitionId}/rounds`)
        if (roundsResponse.data.return_code === 'SUCCESS') {
          const roundData = roundsResponse.data.rounds.find(r => r.id === parseInt(roundId))
          if (roundData) {
            setRound(roundData)
            
            // Block access if round is OPEN
            if (roundData.status === 'OPEN') {
              setError('Cannot modify fixtures for an open round. Please close the round first.')
              return
            }
          } else {
            setError('Round not found')
            return
          }
        }

        // Load teams
        const teamsResponse = await axios.get(`/competitions/${competitionId}/teams`)
        if (teamsResponse.data.return_code === 'SUCCESS') {
          setTeams(teamsResponse.data.teams)
        }

        // Load fixtures
        const fixturesResponse = await axios.get(`/competitions/${competitionId}/rounds/${roundId}/fixtures`)
        if (fixturesResponse.data.return_code === 'SUCCESS') {
          setFixtures(fixturesResponse.data.fixtures)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setError(error.response?.data?.message || 'Failed to load fixture data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [competitionId, roundId])

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCreateFixture = async (e) => {
    e.preventDefault()
    setError('')
    setWarning('')
    
    if (!formData.home_team_id || !formData.away_team_id || !formData.kickoff_time) {
      setError('Home team, away team, and kickoff time are required')
      return
    }

    if (formData.home_team_id === formData.away_team_id) {
      setError('Home team and away team must be different')
      return
    }

    setCreateLoading(true)
    try {
      const response = await axios.post(`/competitions/${competitionId}/rounds/${roundId}/fixtures`, formData)

      if (response.data.return_code === 'SUCCESS') {
        // Show warning if present
        if (response.data.warning) {
          setWarning(response.data.warning)
          setTimeout(() => setWarning(''), 8000) // Clear after 8 seconds
        }
        
        // Refresh fixtures to get the new fixture with team names
        const fixturesResponse = await axios.get(`/competitions/${competitionId}/rounds/${roundId}/fixtures`)
        if (fixturesResponse.data.return_code === 'SUCCESS') {
          setFixtures(fixturesResponse.data.fixtures)
        }
        setShowCreateForm(false)
        setFormData({
          home_team_id: '',
          away_team_id: '',
          kickoff_time: ''
        })
      } else {
        setError(response.data.message || 'Failed to create fixture')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create fixture')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteFixture = async () => {
    if (!fixtureToDelete) return
    
    setError('')
    setDeleteLoading(true)
    try {
      const response = await axios.delete(`/competitions/${competitionId}/rounds/${roundId}/fixtures/${fixtureToDelete.id}`)

      if (response.data.return_code === 'SUCCESS') {
        // Remove the fixture from the list
        setFixtures(fixtures.filter(f => f.id !== fixtureToDelete.id))
        setShowDeleteConfirm(false)
        setFixtureToDelete(null)
      } else {
        setError(response.data.message || 'Failed to delete fixture')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete fixture')
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmDelete = (fixture) => {
    setFixtureToDelete(fixture)
    setShowDeleteConfirm(true)
  }

  const handleEditRound = () => {
    if (round) {
      const lockTime = new Date(round.lock_time)
      setEditRoundData({
        lock_time: lockTime.toISOString().slice(0, 16) // Format for datetime-local input
      })
      setShowEditRound(true)
    }
  }

  const handleUpdateRound = async (e) => {
    e.preventDefault()
    setError('')
    setWarning('')
    
    if (!editRoundData.lock_time) {
      setError('Lock time is required')
      return
    }

    setEditRoundLoading(true)
    try {
      const response = await axios.put(`/competitions/${competitionId}/rounds/${roundId}`, {
        lock_time: new Date(editRoundData.lock_time).toISOString()
      })

      if (response.data.return_code === 'SUCCESS') {
        // Show warning if present
        if (response.data.warning) {
          setWarning(response.data.warning)
          setTimeout(() => setWarning(''), 8000) // Clear after 8 seconds
        }
        
        // Update the round state
        setRound({
          ...round,
          lock_time: response.data.round.lock_time
        })
        setShowEditRound(false)
      } else {
        setError(response.data.message || 'Failed to update round')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update round')
    } finally {
      setEditRoundLoading(false)
    }
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDefaultKickoffTime = () => {
    const roundLockTime = new Date(round?.lock_time || new Date())
    // Default to 1 hour before lock time
    roundLockTime.setHours(roundLockTime.getHours() - 1)
    return roundLockTime.toISOString().slice(0, 16) // Format for datetime-local input
  }

  // Get teams that are already used in fixtures
  const getUsedTeamNames = () => {
    const usedNames = new Set()
    fixtures.forEach(fixture => {
      if (fixture.home_team_name) usedNames.add(fixture.home_team_name)
      if (fixture.away_team_name) usedNames.add(fixture.away_team_name)
    })
    return usedNames
  }

  // Filter available teams (exclude already used teams and opposing team selection)
  const getAvailableTeams = (excludeTeamId) => {
    const usedTeamNames = getUsedTeamNames()
    return teams.filter(team => {
      // Exclude the selected opposing team
      if (team.id === parseInt(excludeTeamId)) return false
      // Exclude teams already used in fixtures
      if (usedTeamNames.has(team.name)) return false
      return true
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 font-medium">Loading fixtures...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error && (!competition || !round)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/dashboard" className="btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to={`/competitions/${competitionId}/rounds`}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Rounds</span>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LMS Local</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Fixtures</h1>
              <p className="text-gray-600">
                {competition?.name} - Round {round?.round_number}
              </p>
              {round && (
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-500">
                    Lock time: {formatDateTime(round.lock_time)}
                  </p>
                  <button
                    onClick={handleEditRound}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit lock time"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Warning Message */}
        {warning && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-yellow-700 font-medium">{warning}</p>
            </div>
          </div>
        )}

        {/* Add Fixture Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm)
              if (!showCreateForm && round) {
                setFormData({ 
                  ...formData, 
                  kickoff_time: getDefaultKickoffTime() 
                })
              }
            }}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Fixture</span>
          </button>
        </div>

        {/* Create Fixture Form */}
        {showCreateForm && (
          <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Fixture</h3>
            <form onSubmit={handleCreateFixture} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Home Team *
                  </label>
                  <select
                    name="home_team_id"
                    value={formData.home_team_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:border-primary-500 transition-all"
                    required
                  >
                    <option value="">Select home team</option>
                    {getAvailableTeams(formData.away_team_id).map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Away Team *
                  </label>
                  <select
                    name="away_team_id"
                    value={formData.away_team_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:border-primary-500 transition-all"
                    required
                  >
                    <option value="">Select away team</option>
                    {getAvailableTeams(formData.home_team_id).map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Kickoff Time *
                </label>
                <input
                  type="datetime-local"
                  name="kickoff_time"
                  value={formData.kickoff_time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:border-primary-500 transition-all"
                  required
                />
                <p className="mt-1 text-sm text-gray-600">
                  When the match kicks off
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add Fixture</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({
                      home_team_id: '',
                      away_team_id: '',
                      kickoff_time: ''
                    })
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Fixtures List */}
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Round Fixtures</h2>
            <div className="bg-gradient-to-r from-blue-100 to-green-100 px-4 py-2 rounded-full">
              <span className="text-sm font-medium text-gray-700">
                {fixtures.length} fixtures
              </span>
            </div>
          </div>

          {fixtures.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fixtures Yet</h3>
              <p className="text-gray-600 mb-4">Add your first fixture to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fixtures
                .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
                .map((fixture) => (
                <div key={fixture.id} className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl p-6 hover:bg-white/90 transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-4 mb-2">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{fixture.home_team_name}</div>
                          </div>
                          <div className="text-2xl font-bold text-gray-400">vs</div>
                          <div className="text-left">
                            <div className="text-lg font-bold text-gray-900">{fixture.away_team_name}</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center justify-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDateTime(fixture.kickoff_time)}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => confirmDelete(fixture)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete fixture"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Fixture</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the fixture between{' '}
                <span className="font-semibold">{fixtureToDelete?.home_team_name}</span> and{' '}
                <span className="font-semibold">{fixtureToDelete?.away_team_name}</span>?
                <br />
                <span className="text-sm">This action cannot be undone.</span>
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setFixtureToDelete(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFixture}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Round Modal */}
      {showEditRound && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Edit Round Lock Time</h3>
              <p className="text-gray-600 text-sm">
                Round {round?.round_number} - {competition?.name}
              </p>
            </div>
            
            <form onSubmit={handleUpdateRound} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Lock Time *
                </label>
                <input
                  type="datetime-local"
                  value={editRoundData.lock_time}
                  onChange={(e) => setEditRoundData({ ...editRoundData, lock_time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 transition-all"
                  required
                />
                <p className="mt-1 text-sm text-gray-600">
                  When predictions for this round will be locked
                </p>
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRound(false)
                    setEditRoundData({ lock_time: '' })
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editRoundLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2"
                >
                  {editRoundLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageFixtures