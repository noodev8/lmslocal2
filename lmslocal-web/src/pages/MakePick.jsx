import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const MakePick = () => {
  const { competitionId, roundId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [pickData, setPickData] = useState({
    pick: null,
    fixtures: [],
    previous_picks: [],
    round: null
  })

  // Load pick data
  useEffect(() => {
    const loadPickData = async () => {
      try {
        const response = await axios.get(`/competitions/${competitionId}/rounds/${roundId}/pick`)
        if (response.data.return_code === 'SUCCESS') {
          setPickData(response.data)
        } else {
          setError(response.data.message || 'Failed to load pick data')
        }
      } catch (error) {
        console.error('Failed to load pick data:', error)
        setError(error.response?.data?.message || 'Failed to load pick data')
      } finally {
        setLoading(false)
      }
    }

    loadPickData()
  }, [competitionId, roundId])

  const handleMakePick = async (team, fixtureId) => {
    setError('')
    setSuccess('')
    setSaving(true)
    
    try {
      const response = await axios.post(`/competitions/${competitionId}/rounds/${roundId}/pick`, {
        team: team,
        fixture_id: fixtureId
      })

      if (response.data.return_code === 'SUCCESS') {
        setPickData({
          ...pickData,
          pick: response.data.pick
        })
        setSuccess(`Pick saved! You chose ${team}`)
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(response.data.message || 'Failed to save pick')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save pick')
    } finally {
      setSaving(false)
    }
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isTeamAvailable = (team) => {
    return !pickData.previous_picks.includes(team)
  }

  const isRoundLocked = () => {
    if (!pickData.round) return false
    const now = new Date()
    const lockTime = new Date(pickData.round.lock_time)
    return now >= lockTime
  }

  const isPickLocked = () => {
    return pickData.pick && pickData.pick.locked === true
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 font-medium">Loading pick options...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error && !pickData.round) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Pick</h3>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 004.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LMS Local</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Make Your Pick</h1>
              <p className="text-gray-600">
                Round {pickData.round?.round_number}
              </p>
              {pickData.round && (
                <p className="text-sm text-gray-500">
                  Lock time: {formatDateTime(pickData.round.lock_time)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current Pick */}
        {pickData.pick && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-green-700 font-medium">Current Pick: {pickData.pick.team}</p>
                <p className="text-green-600 text-sm">
                  {isPickLocked() ? 'Your pick is locked and cannot be changed' : isRoundLocked() ? 'Round is locked - pick cannot be changed' : 'You can change this pick until the round locks'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pick Locked Message */}
        {isPickLocked() && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-orange-700 font-medium">Your pick is locked and cannot be changed</p>
            </div>
          </div>
        )}

        {/* Round Locked Message */}
        {isRoundLocked() && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-gray-700 font-medium">This round is locked - picks cannot be changed</p>
            </div>
          </div>
        )}

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

        {/* Success Message */}
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

        {/* Previous Picks Info */}
        {pickData.previous_picks.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Previously Picked Teams (unavailable):</h3>
            <div className="flex flex-wrap gap-2">
              {pickData.previous_picks.map((team, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                >
                  {team}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fixtures */}
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Round Fixtures</h2>
            <div className="bg-gradient-to-r from-blue-100 to-green-100 px-4 py-2 rounded-full">
              <span className="text-sm font-medium text-gray-700">
                {pickData.fixtures.length} fixtures
              </span>
            </div>
          </div>

          {pickData.fixtures.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fixtures Yet</h3>
              <p className="text-gray-600 mb-4">Fixtures haven't been added for this round yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pickData.fixtures
                .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
                .map((fixture) => (
                <div key={fixture.id} className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <div className="text-sm text-gray-600 flex items-center justify-center mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDateTime(fixture.kickoff_time)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Home Team */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 mb-2">{fixture.home_team}</div>
                      {!isPickLocked() && (
                        <button
                          onClick={() => handleMakePick(fixture.home_team, fixture.id)}
                          disabled={saving || !isTeamAvailable(fixture.home_team) || isRoundLocked()}
                          className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                            pickData.pick?.team === fixture.home_team
                              ? 'bg-green-600 text-white'
                              : isTeamAvailable(fixture.home_team) && !isRoundLocked()
                              ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {saving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </div>
                          ) : pickData.pick?.team === fixture.home_team ? (
                            'Selected'
                          ) : isTeamAvailable(fixture.home_team) && !isRoundLocked() ? (
                            'Pick This Team'
                          ) : isRoundLocked() ? (
                            'Round Locked'
                          ) : (
                            'Already Picked'
                          )}
                        </button>
                      )}
                      {isPickLocked() && (
                        <div className={`w-full py-2 px-4 rounded-lg font-medium text-center ${
                          pickData.pick?.team === fixture.home_team
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {pickData.pick?.team === fixture.home_team ? 'Selected' : fixture.home_team}
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 mb-2">{fixture.away_team}</div>
                      {!isPickLocked() && (
                        <button
                          onClick={() => handleMakePick(fixture.away_team, fixture.id)}
                          disabled={saving || !isTeamAvailable(fixture.away_team) || isRoundLocked()}
                          className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                            pickData.pick?.team === fixture.away_team
                              ? 'bg-green-600 text-white'
                              : isTeamAvailable(fixture.away_team) && !isRoundLocked()
                              ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {saving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </div>
                          ) : pickData.pick?.team === fixture.away_team ? (
                            'Selected'
                          ) : isTeamAvailable(fixture.away_team) && !isRoundLocked() ? (
                            'Pick This Team'
                          ) : isRoundLocked() ? (
                            'Round Locked'
                          ) : (
                            'Already Picked'
                          )}
                        </button>
                      )}
                      {isPickLocked() && (
                        <div className={`w-full py-2 px-4 rounded-lg font-medium text-center ${
                          pickData.pick?.team === fixture.away_team
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {pickData.pick?.team === fixture.away_team ? 'Selected' : fixture.away_team}
                        </div>
                      )}
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

export default MakePick