import React from 'react';
import { cn } from '../lib/utils';

export function Card({ children, className, elevated = false, interactive = false, ...props }) {
  const baseClass = elevated ? 'card-elevated' : 'card';
  const interactiveClass = interactive ? 'card-interactive' : '';

  return (
    <div className={cn(baseClass, interactiveClass, className)} {...props}>
      {children}
    </div>
  );
}

export function Section({ title, description, children, className = '' }) {
  return (
    <section className={cn('section', className)}>
      {title && (
        <div className="mb-4">
          <h2 className="text-h4 text-neutral-900">{title}</h2>
          {description && <p className="text-body-sm text-neutral-600 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function CardMetric({ label, icon: Icon, value, valueSize = 'lg' }) {
  const valueSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className="min-w-0 rounded-lg bg-neutral-50 px-3 py-3 border border-neutral-200">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-neutral-500 shrink-0" />}
        <p className="text-xs font-bold text-neutral-600">{label}</p>
      </div>
      <p className={cn('mt-1 break-words font-bold text-neutral-900', valueSizeClasses[valueSize])}>
        {value}
      </p>
    </div>
  );
}
