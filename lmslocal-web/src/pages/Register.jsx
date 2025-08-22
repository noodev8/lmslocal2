import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    // Capitalize first letter for display name
    const processedValue = name === 'displayName' && value.length > 0 
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : value

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    if (generalError) {
      setGeneralError('')
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters long'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    const result = await register(formData.displayName, formData.email, formData.password)
    
    if (result.success) {
      setSuccess(true)
    } else {
      setGeneralError(result.error)
    }
    
    setLoading(false)
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    setResendMessage('')
    
    try {
      const response = await axios.post('/auth/resend-verification', {
        email: formData.email
      })

      if (response.data.return_code === 'SUCCESS') {
        setResendMessage('Verification email sent successfully!')
      } else {
        setResendMessage(response.data.message || 'Failed to resend verification email')
      }
    } catch (error) {
      setResendMessage('Failed to resend verification email')
    }
    
    setResendLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary-900 mb-2">LMS Local</h1>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your account has been created. Please check your email to verify your account before logging in.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Registered email: <strong>{formData.email}</strong>
              </p>

              {resendMessage && (
                <div className={`mb-4 p-3 rounded-lg ${resendMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <p className="text-sm">{resendMessage}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleBackToLogin}
                  className="w-full btn-primary"
                >
                  Continue to Login
                </button>
                
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {resendLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-900 mb-2">LMS Local</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600">Join our Last Man Standing competitions</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {generalError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{generalError}</p>
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                className={`input-field ${errors.displayName ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter your display name"
              />
              {errors.displayName && <p className="form-error">{errors.displayName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${errors.email ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={`input-field ${errors.password ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter your password (min 8 characters)"
              />
              {errors.password && <p className="form-error">{errors.password}</p>}
              <p className="text-sm text-gray-500 mt-1">Password must be at least 8 characters long</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register