'use client'

import { useEffect, useState } from 'react'

interface ConfettiProps {
  duration?: number
  onComplete?: () => void
}

export default function Confetti({ duration = 3000, onComplete }: ConfettiProps) {
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(false)
      onComplete?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  if (!isActive) return null

  // Generate random confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ['#14b8a6', '#0d9488', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'][Math.floor(Math.random() * 6)],
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 opacity-0 animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-10%',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      
      <style jsx>{`
        @keyframes confetti {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg);
          }
        }
        
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  )
}
