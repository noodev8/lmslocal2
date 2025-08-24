import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const ApplyResults = () => {
  const { competitionId, roundId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [round, setRound] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [picks, setPicks] = useState([])
  const [fixtureResults, setFixtureResults] = useState({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await axios.get(`/competitions/${competitionId}/rounds/${roundId}/results`)
        
        if (response.data.return_code === 'SUCCESS') {
          setRound(response.data.round)
          setFixtures(response.data.fixtures)
          setPicks(response.data.picks)
          
          // Load existing results into state
          const existingResults = {}
          response.data.fixtures.forEach(fixture => {
            if (fixture.result) {
              // Convert stored result back to button format
              let buttonResult
              if (fixture.result === fixture.home_team_short) {
                buttonResult = 'home_win'
              } else if (fixture.result === fixture.away_team_short) {
                buttonResult = 'away_win'
              } else if (fixture.result === 'DRAW') {
                buttonResult = 'draw'
              }
              
              if (buttonResult) {
                existingResults[fixture.id] = buttonResult
              }
            }
          })
          setFixtureResults(existingResults)
        } else {
          setError(response.data.message || 'Failed to load results data')
        }
      } catch (error) {
        console.error('Failed to load results data:', error)
        setError(error.response?.data?.message || 'Failed to load results data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [competitionId, roundId])

  const handleFixtureResult = (fixtureId, result) => {
    setFixtureResults(prev => ({
      ...prev,
      [fixtureId]: result
    }))
  }

  const getPicksForFixture = (fixtureId) => {
    return picks.filter(pick => pick.fixture_id === parseInt(fixtureId))
  }

  const getResultPreview = (fixtureId, result) => {
    const fixturePicks = getPicksForFixture(fixtureId)
    const fixture = fixtures.find(f => f.id === parseInt(fixtureId))
    
    if (!fixture || !result) return { winners: 0, losers: 0, draws: 0 }

    let winners = 0, losers = 0, draws = 0

    fixturePicks.forEach(pick => {
      if (result === 'draw') {
        draws++
      } else if (
        (result === 'home_win' && pick.team === fixture.home_team) ||
        (result === 'away_win' && pick.team === fixture.away_team)
      ) {
        winners++
      } else {
        losers++
      }
    })

    return { winners, losers, draws }
  }

  const handleSaveResults = async () => {
    if (Object.keys(fixtureResults).length === 0) {
      setError('Please select results for at least one fixture')
      return
    }

    setSaving(true)
    setError('')

    try {
      const fixture_results = Object.entries(fixtureResults).map(([fixture_id, result]) => ({
        fixture_id: parseInt(fixture_id),
        result
      }))

      const response = await axios.post(`/competitions/${competitionId}/rounds/${roundId}/results`, {
        fixture_results
      })

      if (response.data.return_code === 'SUCCESS') {
        setSuccess(response.data.message)
        // Navigate back to manage rounds after 2 seconds
        setTimeout(() => {
          navigate(`/competitions/${competitionId}/rounds`)
        }, 2000)
      } else {
        setError(response.data.message || 'Failed to apply results')
      }
    } catch (error) {
      console.error('Failed to apply results:', error)
      setError(error.response?.data?.message || 'Failed to apply results')
    } finally {
      setSaving(false)
    }
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 font-medium">Loading results data...</span>
          </div>
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
              <span>Back to Manage Rounds</span>
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
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Apply Results</h1>
              <p className="text-gray-600">Round {round?.round_number} - Enter fixture results</p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
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

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Fixtures and Results */}
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Select Results for Each Fixture</h3>
          
          <div className="space-y-6">
            {fixtures.map((fixture) => {
              const fixturePicks = getPicksForFixture(fixture.id)
              const selectedResult = fixtureResults[fixture.id]
              const preview = getResultPreview(fixture.id, selectedResult)
              
              return (
                <div key={fixture.id} className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {fixture.home_team} vs {fixture.away_team}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Kickoff: {formatDateTime(fixture.kickoff_time)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {fixturePicks.length} player pick{fixturePicks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Result Selection Buttons */}
                  <div className="flex space-x-3 mb-4">
                    <button
                      onClick={() => handleFixtureResult(fixture.id, 'home_win')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                        selectedResult === 'home_win'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{fixture.home_team_short} Win</span>
                    </button>
                    
                    <button
                      onClick={() => handleFixtureResult(fixture.id, 'draw')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                        selectedResult === 'draw'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>Draw</span>
                    </button>
                    
                    <button
                      onClick={() => handleFixtureResult(fixture.id, 'away_win')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                        selectedResult === 'away_win'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{fixture.away_team_short} Win</span>
                    </button>
                  </div>

                  {/* Result Preview */}
                  {selectedResult && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200/50">
                      <h5 className="font-medium text-gray-900 mb-2">Impact Preview:</h5>
                      <div className="flex space-x-4 text-sm">
                        {preview.winners > 0 && (
                          <span className="text-green-600">✓ {preview.winners} winner{preview.winners !== 1 ? 's' : ''}</span>
                        )}
                        {preview.losers > 0 && (
                          <span className="text-red-600">✗ {preview.losers} loser{preview.losers !== 1 ? 's' : ''}</span>
                        )}
                        {preview.draws > 0 && (
                          <span className="text-yellow-600">≈ {preview.draws} draw{preview.draws !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Player Picks */}
                  {fixturePicks.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-700 mb-2">Player Picks:</h5>
                      <div className="flex flex-wrap gap-2">
                        {fixturePicks.map((pick) => (
                          <span
                            key={pick.id}
                            className={`px-3 py-1 text-xs rounded-full ${
                              selectedResult && (
                                (selectedResult === 'home_win' && pick.team === fixture.home_team) ||
                                (selectedResult === 'away_win' && pick.team === fixture.away_team)
                              )
                                ? 'bg-green-100 text-green-800'
                                : selectedResult === 'draw'
                                ? 'bg-yellow-100 text-yellow-800'
                                : selectedResult
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {pick.display_name}: {pick.team}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-3">
          <Link
            to={`/competitions/${competitionId}/rounds`}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
          >
            Cancel
          </Link>
          
          <button
            onClick={handleSaveResults}
            disabled={saving || Object.keys(fixtureResults).length === 0}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl shadow-lg transition-all flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Applying Results...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Apply Results ({Object.keys(fixtureResults).length})</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

export default ApplyResults