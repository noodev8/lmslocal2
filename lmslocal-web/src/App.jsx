import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import CreateCompetition from './pages/CreateCompetition'
import JoinCompetition from './pages/JoinCompetition'
import ManageRounds from './pages/ManageRounds'
import ManageFixtures from './pages/ManageFixtures'
import ApplyResults from './pages/ApplyResults'
import MakePick from './pages/MakePick'
import { AuthProvider, useAuth } from './context/AuthContext'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/" />
}

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? <Navigate to="/dashboard" /> : children
}

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            <Route 
              path="/forgot-password" 
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-competition" 
              element={
                <ProtectedRoute>
                  <CreateCompetition />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/join-competition" 
              element={
                <ProtectedRoute>
                  <JoinCompetition />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/competitions/:competitionId/rounds" 
              element={
                <ProtectedRoute>
                  <ManageRounds />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/competitions/:competitionId/rounds/:roundId/fixtures" 
              element={
                <ProtectedRoute>
                  <ManageFixtures />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/competitions/:competitionId/rounds/:roundId/results" 
              element={
                <ProtectedRoute>
                  <ApplyResults />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/competitions/:competitionId/rounds/:roundId/pick" 
              element={
                <ProtectedRoute>
                  <MakePick />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App