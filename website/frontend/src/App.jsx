import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import NavBar from './components/NavBar'
import LoginPage from './pages/LoginPage'
import WeaponsPage from './pages/WeaponsPage'
import KnifePage from './pages/KnifePage'
import GlovesPage from './pages/GlovesPage'
import AgentsPage from './pages/AgentsPage'

function ProtectedRoute({ element }) {
  const { user } = useAuth()
  if (user === undefined) return (
    <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>
  )
  if (!user) return <Navigate to="/login" replace />
  return element
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-1">
              <Routes>
                <Route path="/login"  element={<LoginPage />} />
                <Route path="/"       element={<ProtectedRoute element={<WeaponsPage />} />} />
                <Route path="/knife"  element={<ProtectedRoute element={<KnifePage />} />} />
                <Route path="/gloves" element={<ProtectedRoute element={<GlovesPage />} />} />
                <Route path="/agents" element={<ProtectedRoute element={<AgentsPage />} />} />
                <Route path="*"       element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
