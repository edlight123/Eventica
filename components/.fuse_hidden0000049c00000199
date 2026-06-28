'use client'

import MobileBottomNav from './MobileBottomNav'

interface MobileNavWrapperProps {
  user?: {
    id: string
    email: string
    role: 'attendee' | 'organizer'
  } | null
  isAdmin?: boolean
}

export default function MobileNavWrapper({ user, isAdmin = false }: MobileNavWrapperProps) {
  return (
    <MobileBottomNav 
      isLoggedIn={!!user}
      isOrganizer={user?.role === 'organizer'}
      isAdmin={isAdmin}
    />
  )
}
