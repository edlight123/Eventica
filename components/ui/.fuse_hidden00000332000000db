import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  hint,
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          className={`
            w-full px-4 py-3 rounded-xl border-2 transition-all
            text-base min-h-[44px]
            ${icon ? 'pl-10' : ''}
            ${error 
              ? 'border-error-500 focus:border-error-600 focus:ring-4 focus:ring-error-50' 
              : 'border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-50'
            }
            placeholder:text-gray-400
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1.5 text-sm text-error-600 font-medium">{error}</p>
      )}
      
      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextArea({
  label,
  error,
  hint,
  className = '',
  ...props
}: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <textarea
        className={`
          w-full px-4 py-3 rounded-xl border-2 transition-all
          text-base min-h-[100px]
          ${error 
            ? 'border-error-500 focus:border-error-600 focus:ring-4 focus:ring-error-50' 
            : 'border-gray-200 focus:border-brand-primary focus:ring-4 focus:ring-brand-50'
          }
          placeholder:text-gray-400
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <p className="mt-1.5 text-sm text-error-600 font-medium">{error}</p>
      )}
      
      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}
