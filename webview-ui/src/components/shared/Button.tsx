import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'button'
      : `button button--${variant}`;

  return (
    <button
      type="button"
      className={`${variantClass}${loading ? ' button--loading' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="button__spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}
