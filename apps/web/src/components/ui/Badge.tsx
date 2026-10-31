import React from 'react';

export type BadgeVariant =
  | 'active'
  | 'paused'
  | 'overdue'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    // Soft Semantic Status Badges
    active: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    success: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    paused: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]',
    warning: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]',
    overdue: 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]',
    danger: 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]',
    // Brand & Utility Badges
    brand: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
    info: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
    neutral: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-2xs ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
