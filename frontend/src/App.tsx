import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useThemeStore } from './store'
import { PageSpinner } from './components/ui/Spinner'

// ── Lazy-loaded pages (each becomes its own JS chunk) ──────────────────────
const LoginPage          = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage       = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ProjectsPage       = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const BaselinePage       = lazy(() => import('./pages/BaselinePage').then(m => ({ default: m.BaselinePage })))
const ChangeRequestsPage = lazy(() => import('./pages/ChangeRequestsPage').then(m => ({ default: m.ChangeRequestsPage })))
const CRDetailPage       = lazy(() => import('./pages/CRDetailPage').then(m => ({ default: m.CRDetailPage })))
const MembersPage        = lazy(() => import('./pages/MembersPage').then(m => ({ default: m.MembersPage })))
const RoadmapPage        = lazy(() => import('./pages/RoadmapPage').then(m => ({ default: m.RoadmapPage })))
const ChatPage           = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })))
const MeetingsPage       = lazy(() => import('./pages/MeetingsPage').then(m => ({ default: m.MeetingsPage })))
const NotificationsPage  = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))

// ── Fallback while a page chunk is loading ────────────────────────────────
function PageFallback() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <PageSpinner />
    </div>
  )
}

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
    return <PageFallback />
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />

          <Route path="/projects/:projectId/dashboard"            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/baseline"             element={<ProtectedRoute><BaselinePage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/change-requests"      element={<ProtectedRoute><ChangeRequestsPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/change-requests/:crId" element={<ProtectedRoute><CRDetailPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/roadmap"              element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/members"              element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/chat"                 element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/meetings"             element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/notifications"        element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to={token ? '/projects' : '/login'} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
