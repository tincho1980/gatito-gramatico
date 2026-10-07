import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles =
    'font-heading font-bold rounded-2xl transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2';

  const variants = {
    primary:
      'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-200 border-b-4 border-pink-700 active:border-b-0 active:translate-y-1',
    secondary:
      'bg-indigo-400 hover:bg-indigo-500 text-white shadow-indigo-200 border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1',
    outline:
      'bg-white hover:bg-pink-50 text-pink-500 border-2 border-pink-200 hover:border-pink-300',
    danger:
      'bg-red-400 hover:bg-red-500 text-white shadow-red-200 border-b-4 border-red-700 active:border-b-0 active:translate-y-1',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-xl',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};
