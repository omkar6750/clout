import { useEffect } from 'react'
import { useChatStore } from './store/chatStore'
import { useAuthStore } from './store/auth'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import UserRoute from './router/UserRoute'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import ProtectedRoute from './router/ProtectedRoute'
function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  const connect = useChatStore((state) => state.connect)
  const disconnect = useChatStore((state) => state.disconnect)

  useEffect(() => {
    fetchMe()

    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public + user redirect */}
        <Route
          path="/auth"
          element={
            <UserRoute>
              <AuthPage />
            </UserRoute>
          }
        />

        {/* Protected Chat */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
