'use client'
import { useRouter } from 'next/navigation'
import { startNav } from './NavigationLoader'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    startNav()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
      Logout
    </button>
  )
}
