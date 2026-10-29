import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: number
  role?: 'ORGANIZER' | 'TEAM'
  teamId?: number
  username?: string
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'th_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}
