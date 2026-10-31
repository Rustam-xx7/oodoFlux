import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'info' | 'neutral';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const variantStyles = {
    success:
      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/5',
    warning:
      'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-amber-500/5',
    info: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-indigo-500/5',
    neutral:
      'bg-slate-500/10 text-slate-300 border border-slate-500/20 shadow-slate-500/5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide uppercase ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
