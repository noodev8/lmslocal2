import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const CreateCompetition = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [teamLists, setTeamLists] = useState([])
  const [teamListsLoading, setTeamListsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_list_id: '',
    lives_per_player: 1,
    no_team_twice: true,
    organiser_joins_as_player: true
  })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [createdCompetition, setCreatedCompetition] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Load available team lists
  useEffect(() => {
    const loadTeamLists = async () => {
      try {
        const response = await axios.get('/competitions/team-lists')
        if (response.data.return_code === 'SUCCESS') {
          setTeamLists(response.data.team_lists)
          // Auto-select first team list if available
          if (response.data.team_lists.length > 0) {
            setFormData(prev => ({
              ...prev,
              team_list_id: response.data.team_lists[0].id
            }))
          }
        }
      } catch (error) {
        console.error('Failed to load team lists:', error)
        setGeneralError('Failed to load team lists. Please refresh and try again.')
      } finally {
        setTeamListsLoading(false)
      }
    }

    loadTeamLists()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Competition name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Competition name must be at least 3 characters'
    }

    if (!formData.team_list_id) {
      newErrors.team_list_id = 'Please select a team list'
    }

    if (formData.lives_per_player < 1 || formData.lives_per_player > 5) {
      newErrors.lives_per_player = 'Lives per player must be between 1 and 5'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGeneralError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/competitions/create', formData)
      
      if (response.data.return_code === 'SUCCESS') {
        // Show success modal with invite code
        setCreatedCompetition(response.data.competition)
        setShowSuccessModal(true)
      } else {
        setGeneralError(response.data.message || 'Failed to create competition')
      }
    } catch (error) {
      setGeneralError(
        error.response?.data?.message || 
        'Network error. Please check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (teamListsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 font-medium">Loading team lists...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            </div>
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
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Competition</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Set up a new Last Man Standing competition in just a few simple steps
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8 md:p-12">
          {generalError && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-700 font-medium">{generalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Competition Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Competition Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Premier League LMS 2025"
                className={`w-full px-4 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all focus:outline-none focus:ring-0 ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-primary-500'
                }`}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add a brief description of your competition..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all focus:outline-none focus:ring-0 focus:border-primary-500 resize-none"
              />
            </div>

            {/* Team List Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Team List *
              </label>
              <select
                name="team_list_id"
                value={formData.team_list_id}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all focus:outline-none focus:ring-0 ${
                  errors.team_list_id 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-primary-500'
                }`}
              >
                <option value="">Select a team list</option>
                {teamLists.map(teamList => (
                  <option key={teamList.id} value={teamList.id}>
                    {teamList.name} ({teamList.team_count} teams)
                  </option>
                ))}
              </select>
              {errors.team_list_id && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {errors.team_list_id}
                </p>
              )}
              {teamLists.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">No team lists available. Please contact support.</p>
              )}
            </div>

            {/* Game Rules */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Game Rules
              </h3>

              {/* Lives Per Player */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Lives per Player *
                </label>
                <select
                  name="lives_per_player"
                  value={formData.lives_per_player}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all focus:outline-none focus:ring-0 ${
                    errors.lives_per_player 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-primary-500'
                  }`}
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'life' : 'lives'} {num === 1 ? '(Classic LMS)' : '(More forgiving)'}
                    </option>
                  ))}
                </select>
                {errors.lives_per_player && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {errors.lives_per_player}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  How many wrong picks a player can make before being eliminated
                </p>
              </div>

              {/* No Team Twice Rule */}
              <div>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="no_team_twice"
                    checked={formData.no_team_twice}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      No Team Twice Rule (Recommended)
                    </div>
                    <p className="text-sm text-gray-600">
                      Players cannot pick the same team more than once during the competition
                    </p>
                  </div>
                </label>
              </div>

              {/* Organiser Participation */}
              <div>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="organiser_joins_as_player"
                    checked={formData.organiser_joins_as_player}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-primary-600 border-2 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      I want to participate as a player
                    </div>
                    <p className="text-sm text-gray-600">
                      Join the competition as a player, not just organize it
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link
                to="/dashboard"
                className="flex-1 btn-secondary text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Competition</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && createdCompetition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Competition Created!</h3>
              <p className="text-gray-600">Your competition "{createdCompetition.name}" has been created successfully.</p>
            </div>

            {/* Invite Code Section */}
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 mb-6 border border-primary-200/50">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-11.085 3h-2.915a1 1 0 110-2h2.915A6.6 6.6 0 017 9a6 6 0 1112 0c0 .75-.133 1.467-.378 2.135.312.47.378 1.056.378 1.615 0 .75-.133 1.467-.378 2.135A6.6 6.6 0 0115 16a2 2 0 01-2-2V7z" />
                </svg>
                Competition Invite Code
              </h4>
              <div className="bg-white rounded-lg p-4 border-2 border-dashed border-primary-300">
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-primary-700 mb-2 tracking-wider">
                    {createdCompetition.invite_code}
                  </div>
                  <p className="text-sm text-gray-600">Share this code with players to join your competition</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdCompetition.invite_code)
                  // Could add a toast notification here
                }}
                className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-medium px-4 py-3 rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Code</span>
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard', { 
                    state: { 
                      message: `Competition "${createdCompetition.name}" created successfully! Invite code: ${createdCompetition.invite_code}`,
                      type: 'success'
                    }
                  })
                }}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0" />
                </svg>
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateCompetition