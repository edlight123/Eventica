import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-brand-primary to-brand-600 
    text-white shadow-md hover:shadow-glow
    hover:from-brand-600 hover:to-brand-700
    active:scale-95
  `,
  secondary: `
    bg-gradient-to-r from-brand-500 to-brand-600 
    text-white shadow-md hover:shadow-glow
    hover:from-brand-600 hover:to-brand-700
    active:scale-95
  `,
  outline: `
    border-2 border-brand-primary text-brand-primary
    hover:bg-brand-50 hover:border-brand-600
    active:bg-brand-100
  `,
  ghost: `
    text-brand-primary hover:bg-brand-50
    active:bg-brand-100 active:scale-98
  `,
  danger: `
    bg-gradient-to-r from-error-500 to-error-600
    text-white shadow-md
    hover:from-error-600 hover:to-error-700
    active:scale-95
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-sm rounded-lg min-h-[40px]',
  md: 'px-5 py-3 text-base rounded-xl min-h-[44px]',
  lg: 'px-6 py-3.5 text-lg rounded-xl min-h-[48px]',
  xl: 'px-8 py-4 text-xl rounded-2xl min-h-[56px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
