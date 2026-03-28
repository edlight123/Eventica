import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminStorage } from '@/lib/firebase/admin'
import { createClient } from '@/lib/firebase-db/server'

/**
 * Upload event photo
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string
    const caption = formData.get('caption') as string | null

    if (!file || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Upload to Firebase Storage
    let photoUrl: string
    try {
      const bucket = adminStorage.bucket()
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const storagePath = `event-photos/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const fileRef = bucket.file(storagePath)
      await fileRef.save(buffer, {
        contentType: file.type || 'image/jpeg',
        metadata: { cacheControl: 'public, max-age=31536000' },
      })
      await fileRef.makePublic()
      photoUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`
    } catch (storageError) {
      console.error('Firebase Storage upload error:', storageError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const supabase = await createClient()

    // Verify event exists
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Create photo record
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { error: insertError } = await supabase.from('event_photos').insert({
      id: photoId,
      event_id: eventId,
      uploaded_by: user.id,
      photo_url: photoUrl,
      caption: caption || null,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Error creating photo record:', insertError)
      return NextResponse.json(
        { error: 'Failed to save photo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, photoId, photoUrl })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
