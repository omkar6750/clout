import axios from 'axios'

// 1. Define the interface directly here (and export it if other files need it)
export interface SignupData {
  email: string
  password: string
  firstName: string
  lastName: string
  userName: string
}

// 2. Define a specific type for Login (usually just email/pass)
export interface LoginData {
  email: string
  password: string
}

axios.defaults.withCredentials = true

const API = `${import.meta.env.VITE_API_URL}/auth`

// 3. Use the types defined above
export const signup = (data: SignupData) => axios.post(`${API}/signup`, data)
export const login = (data: LoginData) => axios.post(`${API}/login`, data)

export const googleLogin = () => {
  window.location.href = `${API}/google`
}
