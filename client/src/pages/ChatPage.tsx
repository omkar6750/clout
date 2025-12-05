import { useAuthStore } from '@/store/auth'

export default function ChatPage() {
  const { user, logout } = useAuthStore()

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Welcome {user?.firstName} 👋</h1>

      <button
        onClick={logout}
        className="mt-4 rounded bg-black px-4 py-2 text-white"
      >
        Logout
      </button>

      <p className="mt-10">Chat UI will go here...</p>
    </div>
  )
}
