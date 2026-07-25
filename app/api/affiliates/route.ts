import { createClient } from '@/lib/firebase-db/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { affiliateCode, email } = await request.json()

    // Generate unique code if not provided
    const code = affiliateCode || `${user.id.slice(0, 8).toUpperCase()}`

    // Check if code already exists
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id')
      .eq('code', code)
      .single()

    if (existing) {
      return Response.json({ error: 'Affiliate code already exists' }, { status: 400 })
    }

    // Create affiliate account
    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        code,
        commission_rate: 10.0, // Default 10% commission
        payout_email: email || user.email,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, affiliate: data }, { status: 201 })
  } catch (error) {
    console.error('Affiliate creation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get affiliate stats
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get affiliate account
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!affiliate) {
      return Response.json({ error: 'Affiliate account not found' }, { status: 404 })
    }

    // Get sales data
    const { data: sales } = await supabase
      .from('affiliate_sales')
      .select(`
        *,
        tickets(*),
        events(title, start_datetime)
      `)
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })

    // Calculate monthly earnings
    const now = new Date()
    const thisMonth = sales?.filter((s: any) => {
      const saleDate = new Date(s.created_at)
      return saleDate.getMonth() === now.getMonth() && 
             saleDate.getFullYear() === now.getFullYear()
    }) || []

    const monthlyEarnings = thisMonth.reduce((sum: number, s: any) => sum + (s.commission_amount || 0), 0)

    return Response.json({
      affiliate,
      sales: sales || [],
      stats: {
        totalSales: affiliate.total_sales,
        totalCommission: affiliate.total_commission,
        monthlyEarnings,
        referralUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tikem.co'}?ref=${affiliate.code}`
      }
    })
  } catch (error) {
    console.error('Affiliate stats error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
