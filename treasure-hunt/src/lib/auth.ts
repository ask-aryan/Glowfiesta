import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from './session'
import { NextResponse } from 'next/server'

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions)
}

export async function requireOrganizer() {
  const session = await getSession()
  if (!session.userId || session.role !== 'ORGANIZER') {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session, error: null }
}

export async function requireTeam() {
  const session = await getSession()
  if (!session.userId || session.role !== 'TEAM' || !session.teamId) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session, error: null }
}
