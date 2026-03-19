import React from 'react';
import { cn } from '../../lib/utils.js';

export function Badge({ className, ...props }) {
  return (
    <div
      className={cn('inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground', className)}
      {...props}
    />
  );
}
