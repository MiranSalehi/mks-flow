import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'button'
      : `button button--${variant}`;

  return (
    <button type="button" className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
