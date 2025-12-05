import { useState, type FormEvent } from 'react'
import { login, signup } from '@/api/auth'
import GoogleLoginButton from '@/components/GoogleLoginBtn'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    userName: '',
  })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password })
      } else {
        await signup(form)
      }
      window.location.href = '/chat'
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resp = (error as any).response
        alert(resp?.data?.error || 'Failed')
      } else if (error instanceof Error) {
        alert(error.message)
      } else {
        alert('Failed')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div className="w-96 rounded bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">
          {isLogin ? 'Login' : 'Signup'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="First Name"
                className="w-full border p-2"
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-full border p-2"
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Username"
                className="w-full border p-2"
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button className="w-full rounded bg-blue-600 py-2 text-white">
            {isLogin ? 'Login' : 'Signup'}
          </button>
        </form>

        <GoogleLoginButton />

        <p className="mt-4 text-center">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            className="ml-2 text-blue-600"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Signup' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}
