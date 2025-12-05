import { useAuthStore } from '@/store/auth'
import type { JSX } from 'react'
import { Navigate } from 'react-router-dom'

export default function UserRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuthStore()

  if (loading) return <div>Loading...</div>
  if (user) return <Navigate to="/chat" />

  return children
}
