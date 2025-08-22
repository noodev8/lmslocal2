import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Configure axios defaults
  axios.defaults.baseURL = 'http://localhost:3015'

  // Check for existing token on app start
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const tokenExpiry = localStorage.getItem('token_expiry')
    
    if (token && tokenExpiry) {
      const now = new Date().getTime()
      const expiry = parseInt(tokenExpiry)
      
      if (now < expiry) {
        // Token is still valid
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        // Set user from stored data or make API call to verify
        const userData = localStorage.getItem('user_data')
        if (userData) {
          setUser(JSON.parse(userData))
        }
      } else {
        // Token expired, clean up
        logout()
      }
    }
    
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', {
        email,
        password
      })

      if (response.data.return_code === 'SUCCESS') {
        const { token, user: userData } = response.data
        
        // Calculate expiry (7 days from now)
        const expiryTime = new Date().getTime() + (7 * 24 * 60 * 60 * 1000)
        
        // Store token and user data
        localStorage.setItem('auth_token', token)
        localStorage.setItem('token_expiry', expiryTime.toString())
        localStorage.setItem('user_data', JSON.stringify(userData))
        
        // Set axios header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        setUser(userData)
        return { success: true }
      } else {
        return { success: false, error: response.data.message || 'Login failed' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Network error' 
      }
    }
  }

  const register = async (displayName, email, password) => {
    try {
      const response = await axios.post('/auth/register', {
        display_name: displayName,
        email,
        password
      })

      if (response.data.return_code === 'SUCCESS') {
        return { success: true, message: response.data.message }
      } else {
        return { success: false, error: response.data.message || 'Registration failed' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Network error' 
      }
    }
  }

  const updateProfile = async (displayName) => {
    try {
      const response = await axios.post('/auth/update-profile', {
        display_name: displayName
      })

      if (response.data.return_code === 'SUCCESS') {
        const updatedUser = { ...user, display_name: displayName }
        setUser(updatedUser)
        localStorage.setItem('user_data', JSON.stringify(updatedUser))
        return { success: true }
      } else {
        return { success: false, error: response.data.message || 'Update failed' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Network error' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('token_expiry')
    localStorage.removeItem('user_data')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    updateProfile,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}