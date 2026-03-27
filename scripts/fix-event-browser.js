/**
 * Run this in browser console while logged in as admin on joineventica.com
 * to fix ticket tiers for event P7wuJ16W1eZ2MdZl0SHK
 */

async function fixTicketTiers() {
  try {
    console.log('Fixing ticket tiers for event P7wuJ16W1eZ2MdZl0SHK...')
    
    const response = await fetch('/api/admin/fix-ticket-tiers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: 'P7wuJ16W1eZ2MdZl0SHK'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Migration successful!')
      console.log(`Total tiers: ${result.total}`)
      console.log(`Fixed: ${result.fixed}`)
      console.log(`Skipped: ${result.skipped}`)
      console.log('Fixed tiers:', result.fixedTiers)
      
      alert(`Successfully fixed ${result.fixed} ticket tiers! Refresh the event page.`)
    } else {
      console.error('❌ Migration failed:', result.error)
      alert(`Migration failed: ${result.error}`)
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Error running migration. Check console for details.')
  }
}

// Run the migration
fixTicketTiers()
