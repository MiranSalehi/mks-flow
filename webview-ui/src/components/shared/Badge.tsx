import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const className =
    variant === 'default' ? 'badge' : `badge badge--${variant}`;
  return <span className={className}>{children}</span>;
}
