declare module '@/api/auth' {
  import type { AxiosResponse } from 'axios'

  export type SignupData = {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
    userName?: string
  }

  export const signup: (data: SignupData) => Promise<AxiosResponse<any>>
  export const login: (data: {
    email: string
    password: string
  }) => Promise<AxiosResponse<any>>
  export const googleLogin: () => void
}
