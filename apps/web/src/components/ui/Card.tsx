import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#E2E8F0] shadow-xs rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
