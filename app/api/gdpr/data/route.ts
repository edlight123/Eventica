import { createClient } from '@/lib/firebase-db/server'

// Export user data (GDPR Article 15 - Right to access)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Gather all user data
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: tickets } = await supabase
      .from('tickets')
      .select('*, events(title, start_datetime)')
      .eq('attendee_id', user.id)

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)

    const { data: favorites } = await supabase
      .from('favorites')
      .select('*, events(title)')
      .eq('user_id', user.id)

    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, events(title)')
      .eq('user_id', user.id)

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const userData = {
      profile,
      tickets,
      events,
      favorites,
      reviews,
      preferences,
      exportDate: new Date().toISOString(),
      gdprCompliance: {
        rightToAccess: 'Article 15 GDPR',
        dataPortability: 'Article 20 GDPR'
      }
    }

    // Return as JSON download
    return new Response(JSON.stringify(userData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="eventica_data_export_${user.id}.json"`
      }
    })
  } catch (error) {
    console.error('Data export error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete user account and data (GDPR Article 17 - Right to erasure)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { confirmEmail } = await request.json()

    // Verify email matches
    if (confirmEmail !== user.email) {
      return Response.json({ error: 'Email confirmation does not match' }, { status: 400 })
    }

    // Check for upcoming events as organizer
    const { data: upcomingEvents } = await supabase
      .from('events')
      .select('id')
      .eq('organizer_id', user.id)
      .gte('start_datetime', new Date().toISOString())

    if (upcomingEvents && upcomingEvents.length > 0) {
      return Response.json({ 
        error: 'Cannot delete account with upcoming events. Please cancel or complete your events first.' 
      }, { status: 400 })
    }

    // Check for upcoming tickets
    const { data: upcomingTickets } = await supabase
      .from('tickets')
      .select('id, events(start_datetime)')
      .eq('attendee_id', user.id)
      .not('status', 'in', '(refunded,cancelled)')

    const hasUpcomingTickets = upcomingTickets?.some((t: any) => {
      const event = t.events as any
      return new Date(event.start_datetime) > new Date()
    })

    if (hasUpcomingTickets) {
      return Response.json({ 
        error: 'Cannot delete account with upcoming tickets. Please request refunds first.' 
      }, { status: 400 })
    }

    // Anonymize user data instead of hard delete (to preserve referential integrity)
    const anonymousEmail = `deleted_${user.id}@joineventica.com`
    
    await supabase
      .from('users')
      .update({
        email: anonymousEmail,
        full_name: 'Deleted User',
        phone: null,
        bio: null,
        avatar_url: null
      })
      .eq('id', user.id)

    // Delete sensitive data
    await supabase.from('user_preferences').delete().eq('user_id', user.id)
    await supabase.from('favorites').delete().eq('user_id', user.id)
    
    // Anonymize reviews (keep for platform integrity but remove personal info)
    await supabase
      .from('reviews')
      .update({ comment: '[Deleted by user]' })
      .eq('user_id', user.id)

    // Sign out user
    await supabase.auth.signOut()

    return Response.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
