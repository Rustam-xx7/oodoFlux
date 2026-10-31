import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 relative overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
