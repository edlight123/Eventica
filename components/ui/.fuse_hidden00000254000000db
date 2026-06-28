import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'vip' | 'trending' | 'new';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// One accent only: brand teal. Variants stay distinguishable via fill vs. soft
// treatment (and semantic tokens for success/warning/error), not extra hues.
const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm',
  secondary: 'bg-brand-50 text-brand-700 border border-brand-100',
  success: 'bg-success-50 text-success-700 border border-success-200',
  warning: 'bg-warning-50 text-warning-700 border border-warning-200',
  error: 'bg-error-50 text-error-700 border border-error-200',
  neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
  vip: 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md',
  trending: 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm',
  new: 'bg-success-50 text-success-700 border border-success-200',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs rounded-md',
  md: 'px-3 py-1 text-sm rounded-lg',
  lg: 'px-4 py-1.5 text-base rounded-xl',
};

export default function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
