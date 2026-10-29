import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()
  if (!session.userId) redirect('/login')
  if (session.role === 'ORGANIZER') redirect('/organizer')
  if (session.role === 'TEAM') redirect('/player')
  redirect('/login')
}
