import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ children }) {
  const { user, loading, initialized } = useAuthStore()
  const location = useLocation()

  if (!initialized || loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth/login" state={{ from: location }} replace />
  return children
}
