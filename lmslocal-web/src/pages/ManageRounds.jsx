import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const ManageRounds = () => {
  const { competitionId } = useParams()
  const navigate = useNavigate()
  const [competition, setCompetition] = useState(null)
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [roundsLoading, setRoundsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    lock_time: ''
  })
  const [statusLoading, setStatusLoading] = useState({})
  const [calculateLoading, setCalculateLoading] = useState({})

  // Load competition details and rounds
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

        // Load rounds
        const roundsResponse = await axios.get(`/competitions/${competitionId}/rounds`)
        if (roundsResponse.data.return_code === 'SUCCESS') {
          setRounds(roundsResponse.data.rounds)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setError(error.response?.data?.message || 'Failed to load competition data')
      } finally {
        setLoading(false)
        setRoundsLoading(false)
      }
    }

    loadData()
  }, [competitionId])

  // Reload data when component becomes visible again (after navigation)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading && !roundsLoading) {
        // Reload rounds data when window regains focus
        const reloadRounds = async () => {
          try {
            const roundsResponse = await axios.get(`/competitions/${competitionId}/rounds`)
            if (roundsResponse.data.return_code === 'SUCCESS') {
              setRounds(roundsResponse.data.rounds)
            }
          } catch (error) {
            console.error('Failed to reload rounds:', error)
          }
        }
        reloadRounds()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [competitionId, loading, roundsLoading])

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCreateRound = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.lock_time) {
      setError('Lock time is required')
      return
    }

    setCreateLoading(true)
    try {
      const response = await axios.post(`/competitions/${competitionId}/rounds`, {
        lock_time: formData.lock_time
      })

      if (response.data.return_code === 'SUCCESS') {
        // Add new round to list
        setRounds([...rounds, response.data.round])
        setShowCreateForm(false)
        setFormData({ lock_time: '' })
      } else {
        setError(response.data.message || 'Failed to create round')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create round')
    } finally {
      setCreateLoading(false)
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

  const handleRoundStatusChange = async (roundId, newStatus) => {
    setStatusLoading(prev => ({ ...prev, [roundId]: true }))
    setError('')
    
    try {
      const response = await axios.patch(`/competitions/${competitionId}/rounds/${roundId}/status`, {
        status: newStatus
      })

      if (response.data.return_code === 'SUCCESS') {
        // Update round status in the list
        setRounds(prevRounds => 
          prevRounds.map(round => 
            round.id === roundId 
              ? { ...round, status: newStatus }
              : round
          )
        )
      } else {
        setError(response.data.message || 'Failed to change round status')
      }
    } catch (error) {
      console.error('Failed to change round status:', error)
      setError(error.response?.data?.message || 'Failed to change round status')
    } finally {
      setStatusLoading(prev => ({ ...prev, [roundId]: false }))
    }
  }

  const handleCalculateWinners = async (roundId) => {
    setCalculateLoading(prev => ({ ...prev, [roundId]: true }))
    setError('')
    
    try {
      const response = await axios.post(`/competitions/${competitionId}/rounds/${roundId}/calculate-winners`)

      if (response.data.return_code === 'SUCCESS') {
        // Show success message with results
        const results = response.data.results
        alert(`Winners calculated successfully!\n\nResults:\n- Winners: ${results.winners}\n- Losers: ${results.losers}\n- Draws: ${results.draws}\n- Total: ${results.total}`)
        
        // Optionally reload rounds to update any status changes
        loadRounds()
      } else {
        setError(response.data.message || 'Failed to calculate winners')
      }
    } catch (error) {
      console.error('Failed to calculate winners:', error)
      setError(error.response?.data?.message || 'Failed to calculate winners')
    } finally {
      setCalculateLoading(prev => ({ ...prev, [roundId]: false }))
    }
  }

  const getDefaultLockTime = () => {
    const now = new Date()
    now.setDate(now.getDate() + 7) // Default to next week
    now.setHours(14, 0, 0, 0) // 2 PM
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 font-medium">Loading competition...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error && !competition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Competition</h3>
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
              to="/dashboard"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Dashboard</span>
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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Rounds</h1>
              <p className="text-gray-600">{competition?.name}</p>
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

        {/* Create Round Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm)
              if (!showCreateForm) {
                setFormData({ lock_time: getDefaultLockTime() })
              }
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Round</span>
          </button>
        </div>

        {/* Create Round Form */}
        {showCreateForm && (
          <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Round {rounds.length + 1}</h3>
            <form onSubmit={handleCreateRound} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Lock Time (When picks close) *
                </label>
                <input
                  type="datetime-local"
                  name="lock_time"
                  value={formData.lock_time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:border-primary-500 transition-all"
                  required
                />
                <p className="mt-1 text-sm text-gray-600">
                  Players must submit their picks before this time
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Round</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({ lock_time: '' })
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rounds List */}
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Competition Rounds</h2>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full">
              <span className="text-sm font-medium text-gray-700">
                {roundsLoading ? 'Loading...' : `${rounds.length} rounds`}
              </span>
            </div>
          </div>

          {roundsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading rounds...</p>
            </div>
          ) : rounds.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rounds Yet</h3>
              <p className="text-gray-600 mb-4">Create your first round to start adding fixtures</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rounds.map((round) => (
                <div key={round.id} className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl p-6 hover:bg-white/90 transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Round {round.round_number}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Lock time: {formatDateTime(round.lock_time)}
                        </p>
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {round.fixture_count} fixtures
                        </p>
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Created: {formatDateTime(round.created_at)}
                        </p>
                        <div className="flex items-center mt-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            round.status === 'OPEN' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {round.status || 'CLOSED'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link
                        to={`/competitions/${competitionId}/rounds/${round.id}/fixtures`}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Manage Fixtures</span>
                      </Link>
                      
                      {/* Show Apply Results button only for CLOSED rounds with fixtures */}
                      {round.status === 'CLOSED' && round.fixture_count > 0 && (
                        <Link
                          to={`/competitions/${competitionId}/rounds/${round.id}/results`}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span>Apply Results</span>
                        </Link>
                      )}
                      
                      {/* Show Calculate Winners button for CLOSED rounds with fixtures */}
                      {round.status === 'CLOSED' && round.fixture_count > 0 && (
                        <button
                          onClick={() => handleCalculateWinners(round.id)}
                          disabled={calculateLoading[round.id]}
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
                        >
                          {calculateLoading[round.id] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Calculating...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 00-2-2m0 0V9a2 2 0 012-2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 00-2-2" />
                              </svg>
                              <span>Calculate Winners</span>
                            </>
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRoundStatusChange(round.id, round.status === 'OPEN' ? 'CLOSED' : 'OPEN')}
                        disabled={statusLoading[round.id]}
                        className={`font-medium px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                          statusLoading[round.id] 
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : round.status === 'OPEN'
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d={round.status === 'OPEN' 
                                  ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                                } />
                        </svg>
                        <span>
                          {statusLoading[round.id] 
                            ? 'Updating...' 
                            : round.status === 'OPEN' ? 'Close Round' : 'Open Round'
                          }
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ManageRounds