'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase/client'

export default function MobileAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      // Get the current user's token
      const user = auth.currentUser
      
      if (user) {
        const token = await user.getIdToken()
        
        // Redirect back to mobile app with the token
        const deepLink = `eventica://auth/callback?token=${token}&userId=${user.uid}`
        
        // Try to open the deep link
        window.location.href = deepLink
        
        // Show a message if the redirect doesn't work
        setTimeout(() => {
          document.body.innerHTML = `
            <div style="text-align: center; padding: 40px; font-family: system-ui;">
              <h1>✅ Signed In!</h1>
              <p>Return to the Eventica mobile app.</p>
              <p style="margin-top: 20px;">
                <a href="${deepLink}" style="color: #8B5CF6; text-decoration: none; font-weight: 600;">
                  Tap here to open the app
                </a>
              </p>
            </div>
          `
        }, 1000)
      } else {
        // Not signed in, redirect to login
        router.push('/auth/login?redirect=/auth/mobile-callback')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'system-ui' }}>
      <h2>Completing sign-in...</h2>
      <p>You will be redirected to the app shortly.</p>
    </div>
  )
}
