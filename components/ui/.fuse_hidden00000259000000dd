import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export default function Skeleton({ 
  className = '', 
  variant = 'rectangular' 
}: SkeletonProps) {
  const baseStyles = `
    animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200
    bg-[length:1000px_100%]
  `;
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      aria-label="Loading..."
    />
  );
}

// Pre-built skeleton components for common patterns
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-6 space-y-4">
      <Skeleton className="w-full h-48" />
      <Skeleton className="w-3/4 h-6" />
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-full h-4" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-8" />
        <Skeleton className="w-20 h-8" />
      </div>
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <Skeleton className="w-full h-56" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="w-16 h-6" />
          <Skeleton className="w-16 h-6" />
        </div>
        <Skeleton className="w-full h-6" />
        <Skeleton className="w-2/3 h-4" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="w-24 h-8" />
          <Skeleton className="w-20 h-8" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => {
        return (
          <div key={i} className="flex items-center gap-4">
            <Skeleton variant="circular" className="w-12 h-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-1/2 h-3" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
