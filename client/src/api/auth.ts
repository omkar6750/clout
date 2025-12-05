import type { SignupData } from '@/api/auth'
import axios from 'axios'
axios.defaults.withCredentials = true

const API = `${import.meta.env.VITE_API_URL}/auth`

export const signup = (data: SignupData) => axios.post(`${API}/signup`, data)
export const login = (data: SignupData) => axios.post(`${API}/login`, data)

export const googleLogin = () => {
  window.location.href = `${API}/google`
}
