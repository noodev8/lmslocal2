import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [competitions, setCompetitions] = useState([])
  const [competitionsLoading, setCompetitionsLoading] = useState(true)
  const [activeRounds, setActiveRounds] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  // Handle success message from create competition
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the message after a delay
      setTimeout(() => setSuccessMessage(''), 5000)
      // Clear navigation state
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Load user's competitions and active rounds
  useEffect(() => {
    const loadCompetitions = async () => {
      try {
        const response = await axios.get('/competitions/my-competitions')
        if (response.data.return_code === 'SUCCESS') {
          const competitions = response.data.competitions
          setCompetitions(competitions)
          
          // Load active rounds for each competition (only for players)
          const roundsPromises = competitions.map(async (competition) => {
            if (!competition.is_organiser) {
              try {
                const roundsResponse = await axios.get(`/competitions/${competition.id}/active-rounds`)
                if (roundsResponse.data.return_code === 'SUCCESS') {
                  return { competitionId: competition.id, rounds: roundsResponse.data.rounds }
                }
              } catch (error) {
                console.error(`Failed to load active rounds for competition ${competition.id}:`, error)
              }
            }
            return { competitionId: competition.id, rounds: [] }
          })
          
          const roundsResults = await Promise.all(roundsPromises)
          const activeRoundsMap = {}
          roundsResults.forEach(({ competitionId, rounds }) => {
            activeRoundsMap[competitionId] = rounds
          })
          setActiveRounds(activeRoundsMap)
        }
      } catch (error) {
        console.error('Failed to load competitions:', error)
      } finally {
        setCompetitionsLoading(false)
      }
    }

    loadCompetitions()
  }, [])

  const handleLogout = () => {
    logout()
  }

  const getOrganiserBadge = () => {
    return (
      <span className="px-3 py-1 text-xs font-medium rounded-full flex items-center space-x-1 bg-blue-100 text-blue-800">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Organiser</span>
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">LMS Local</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, <span className="font-semibold text-gray-900">{user?.display_name || 'User'}</span></span>
              <Link
                to="/profile"
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl shadow-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Manage your Last Man Standing competitions</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Create Competition Card */}
          <Link to="/create-competition" className="group bg-white/90 backdrop-blur-md border border-white/20 hover:border-primary-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 p-6 block">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Create Competition</h3>
                <p className="text-sm text-gray-600">Start a new Last Man Standing competition</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Join Competition Card */}
          <Link to="/join-competition" className="group bg-white/90 backdrop-blur-md border border-white/20 hover:border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 p-6 block">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M8 6v10a2 2 0 002 2h4a2 2 0 002-2V6" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Join Competition</h3>
                <p className="text-sm text-gray-600">Enter with your invite code</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Current Competitions */}
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Your Competitions</h3>
              <p className="text-gray-600">Competitions you've created or joined</p>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full">
              <span className="text-sm font-medium text-gray-700">
                {competitionsLoading ? 'Loading...' : `${competitions.length} total`}
              </span>
            </div>
          </div>
          
          {/* Competition List */}
          <div className="space-y-4">
            {competitionsLoading ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">Loading Competitions...</h4>
              </div>
            ) : competitions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">No Competitions Yet</h4>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Ready to get started? Create your first competition and watch the excitement unfold!</p>
                <Link to="/create-competition" className="bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 inline-block">
                  Create Competition
                </Link>
              </div>
            ) : (
              competitions.map((competition) => (
                <div key={competition.id} className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl p-6 hover:bg-white/90 hover:shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{competition.name}</h4>
                        {competition.is_organiser && getOrganiserBadge()}
                      </div>
                      {competition.description && (
                        <p className="text-gray-600 text-sm mb-2">{competition.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{competition.player_count} players</span>
                        <span>•</span>
                        <span>Using {competition.team_list_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Show invite code only for organisers */}
                  {competition.is_organiser && (
                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-3 mb-4 border border-primary-200/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-primary-700 block mb-1">Invite Code</span>
                          <span className="text-sm font-mono font-bold text-primary-800">{competition.invite_code}</span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(competition.invite_code)
                          }}
                          className="px-2 py-1 text-xs bg-white hover:bg-gray-50 text-primary-700 rounded-md border border-primary-200 hover:border-primary-300 transition-all flex items-center space-x-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show player status for players */}
                  {!competition.is_organiser && competition.player_status && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 mb-4 border border-green-200/50">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-green-700 block">Status:</span>
                        <span className="text-sm font-semibold text-green-800 capitalize">{competition.player_status}</span>
                        {competition.lives_remaining !== null && (
                          <>
                            <span className="text-green-600">•</span>
                            <span className="text-sm text-green-700">{competition.lives_remaining} lives remaining</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {/* Show pick buttons for players only */}
                      {!competition.is_organiser && activeRounds[competition.id] && activeRounds[competition.id].length > 0 && (
                        <div className="flex space-x-1">
                          {activeRounds[competition.id].map((round) => (
                            <Link
                              key={round.id}
                              to={`/competitions/${competition.id}/rounds/${round.id}/pick`}
                              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center space-x-1 ${
                                round.has_pick
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {round.has_pick ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Round {round.round_number}</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span>Pick Round {round.round_number}</span>
                                </>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Show admin buttons only for organisers */}
                      {competition.is_organiser && (
                        <Link
                          to={`/competitions/${competition.id}/rounds`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center space-x-1 hover:space-x-2 transition-all"
                        >
                          <span>Manage Rounds</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard