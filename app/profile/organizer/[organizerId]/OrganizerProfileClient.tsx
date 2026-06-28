'use client'

import FollowButton from '@/components/FollowButton'
import ConnectButton from '@/components/connections/ConnectButton'
import EventCard from '@/components/EventCard'
import { Shield, Calendar, Users, Star, Instagram, Music2, Twitter, Facebook } from 'lucide-react'
import { socialUrlFor, type SocialLinks, type FriendshipState } from '@/types/social'

interface OrganizerProfileClientProps {
  organizer: {
    id: string
    full_name: string
    email: string
    is_verified: boolean
    created_at: string
  }
  upcomingEvents: any[]
  pastEvents: any[]
  followerCount: number
  totalEvents: number
  totalTicketsSold: number
  isFollowing: boolean
  userId?: string
  socialLinks?: SocialLinks
  bio?: string
  friendshipState?: FriendshipState
  isAuthenticated?: boolean
}

const SOCIAL_META: Array<{ key: keyof SocialLinks; Icon: typeof Instagram; label: string }> = [
  { key: 'instagram', Icon: Instagram, label: 'Instagram' },
  { key: 'tiktok', Icon: Music2, label: 'TikTok' },
  { key: 'twitter', Icon: Twitter, label: 'X' },
  { key: 'facebook', Icon: Facebook, label: 'Facebook' },
]

export default function OrganizerProfileClient({
  organizer,
  upcomingEvents,
  pastEvents,
  followerCount,
  totalEvents,
  totalTicketsSold,
  isFollowing,
  userId,
  socialLinks = {},
  bio = '',
  friendshipState = 'none',
  isAuthenticated = false,
}: OrganizerProfileClientProps) {
  const socialEntries = SOCIAL_META.filter(({ key }) => (socialLinks?.[key] || '').trim())
  return (
    <>
      {/* ORGANIZER HERO SECTION */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 lg:py-24">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 bg-[#0a0a0a] rounded-xl md:rounded-2xl flex items-center justify-center text-brand-600 font-bold text-4xl md:text-5xl shadow-hard flex-shrink-0">
              {organizer.full_name[0].toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white line-clamp-2">
                  {organizer.full_name}
                </h1>
                {organizer.is_verified && (
                  <div className="flex items-center gap-1 bg-[#0a0a0a] text-brand-300 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[11px] md:text-sm font-semibold flex-shrink-0">
                    <Shield className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Verified</span>
                    <span className="sm:hidden">✓</span>
                  </div>
                )}
              </div>

              {/* Stats - horizontal scroll on mobile */}
              <div className="flex items-center gap-4 md:gap-6 text-white/90 mb-4 md:mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <span className="font-semibold text-sm md:text-base">{totalEvents || 0}</span>
                  <span className="text-[13px] md:text-base">Events</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                  <Users className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <span className="font-semibold text-sm md:text-base">{followerCount || 0}</span>
                  <span className="text-[13px] md:text-base">Followers</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                  <Star className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <span className="font-semibold text-sm md:text-base">{totalTicketsSold}</span>
                  <span className="text-[13px] md:text-base">Sold</span>
                </div>
              </div>

              {/* Bio */}
              {bio.trim() && (
                <p className="text-white/90 text-sm md:text-base mb-4 max-w-2xl line-clamp-3 whitespace-pre-line">
                  {bio}
                </p>
              )}

              {/* Social links */}
              {socialEntries.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {socialEntries.map(({ key, Icon, label }) => (
                    <a
                      key={key}
                      href={socialUrlFor(key, socialLinks[key] as string)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {userId && userId !== organizer.id && (
                <div className="flex items-center gap-3 flex-wrap">
                  <ConnectButton
                    targetUserId={organizer.id}
                    initialState={friendshipState}
                    isAuthenticated={isAuthenticated}
                  />
                  <FollowButton organizerId={organizer.id} userId={userId} initialIsFollowing={isFollowing} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EVENTS SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* Upcoming Events */}
        <section className="mb-10 md:mb-16">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Upcoming Events</h2>
              <p className="text-[13px] md:text-base text-white/65 mt-1">
                {upcomingEvents?.length || 0} event{(upcomingEvents?.length || 0) !== 1 ? 's' : ''} coming soon
              </p>
            </div>
          </div>

          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {upcomingEvents.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="bg-[#0a0a0a] rounded-xl md:rounded-2xl shadow-soft border border-white/10 p-8 md:p-12 text-center">
              <Calendar className="w-12 h-12 md:w-16 md:h-16 text-white/40 mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">No Upcoming Events</h3>
              <p className="text-[13px] md:text-base text-white/65">
                This organizer doesn&apos;t have any upcoming events at the moment.
              </p>
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastEvents && pastEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Past Events</h2>
                <p className="text-[13px] md:text-base text-white/65 mt-1">
                  Previous events organized by {organizer.full_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {pastEvents.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
