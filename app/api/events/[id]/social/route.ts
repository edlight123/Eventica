import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getEventSocialAttendance } from '@/lib/firestore/social'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
    }

    // Viewer is optional — anonymous users still see public attendees + count.
    const user = await getCurrentUser().catch(() => null)

    const social = await getEventSocialAttendance(id, user?.id || null)
    return NextResponse.json(social)
  } catch (error: any) {
    console.error('Error fetching event social attendance:', error)
    return NextResponse.json(
      { totalGoing: 0, viewerIsGoing: false, friendsGoing: [], publicGoing: [] },
      { status: 200 }
    )
  }
}
