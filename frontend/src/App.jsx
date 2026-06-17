import { Routes, Route, Navigate } from 'react-router-dom'
import { api } from './api'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Lesson from './pages/Lesson'
import Practice from './pages/Practice'
import Review from './pages/Review'
import Progress from './pages/Progress'

function ProtectedRoute({ children }) {
  if (!api.isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/lesson/:day" element={
          <ProtectedRoute>
            <Lesson />
          </ProtectedRoute>
        } />
        <Route path="/practice/:phraseId" element={
          <ProtectedRoute>
            <Practice />
          </ProtectedRoute>
        } />
        <Route path="/review" element={
          <ProtectedRoute>
            <Review />
          </ProtectedRoute>
        } />
        <Route path="/progress" element={
          <ProtectedRoute>
            <Progress />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}

export default App
