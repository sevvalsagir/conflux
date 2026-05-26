import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useThemeStore } from './store'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { DashboardPage } from './pages/DashboardPage'
import { BaselinePage } from './pages/BaselinePage'
import { ChangeRequestsPage } from './pages/ChangeRequestsPage'
import { CRDetailPage } from './pages/CRDetailPage'
import { MembersPage } from './pages/MembersPage'
import { RoadmapPage } from './pages/RoadmapPage'
import { PageSpinner } from './components/ui/Spinner'

// Wraps protected routes — redirects to /login if not authenticated
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { token, fetchMe, isLoading } = useAuthStore()
  const { theme } = useThemeStore()

  // Apply theme class to <html> on mount and whenever theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // On app load, if we have a token, fetch the user profile
  useEffect(() => {
    if (token) fetchMe()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <PageSpinner />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />

        <Route path="/projects/:projectId/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/baseline" element={<ProtectedRoute><BaselinePage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/change-requests" element={<ProtectedRoute><ChangeRequestsPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/change-requests/:crId" element={<ProtectedRoute><CRDetailPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/roadmap" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={token ? '/projects' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
