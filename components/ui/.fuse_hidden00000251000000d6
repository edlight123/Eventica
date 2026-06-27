import React from 'react';

type CardVariant = 'default' | 'elevated' | 'glass' | 'bordered';

interface CardProps {
  variant?: CardVariant;
  hover?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white shadow-soft',
  elevated: 'bg-white shadow-medium',
  glass: 'bg-white/80 backdrop-blur-lg shadow-soft',
  bordered: 'bg-white border-2 border-gray-100',
};

export default function Card({
  variant = 'default',
  hover = false,
  children,
  className = '',
  onClick,
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl transition-all duration-300
        ${variantStyles[variant]}
        ${hover ? 'hover:shadow-hard hover:-translate-y-1 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
