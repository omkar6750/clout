export default function GoogleLoginButton() {
  const googleUrl = `${import.meta.env.VITE_API_URL}/auth/google`

  return (
    <button
      onClick={() => (window.location.href = googleUrl)}
      className="w-full rounded bg-red-500 px-4 py-2 text-white"
    >
      Login with Google
    </button>
  )
}
