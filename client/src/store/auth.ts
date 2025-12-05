import { create } from 'zustand'
import axios from 'axios'
import type { User } from '@/types/chat'

axios.defaults.withCredentials = true

interface AuthStore {
  user: User | null
  loading: boolean

  fetchMe: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`)
      console.log('Fetched user:', res.data.user)
      set({ user: res.data.user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  logout: async () => {
    await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`)
    set({ user: null })
  },
}))
