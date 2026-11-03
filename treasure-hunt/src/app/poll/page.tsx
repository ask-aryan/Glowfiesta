import { redirect } from 'next/navigation'

export default function PollRedirectPage() {
  redirect('/vote')
}
