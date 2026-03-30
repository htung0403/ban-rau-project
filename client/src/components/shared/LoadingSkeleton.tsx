import React from 'react';
import { clsx } from 'clsx';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  type?: 'table' | 'card' | 'form';
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5, columns = 5, type = 'table' }) => {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded-lg w-3/4" />
                <div className="h-3 bg-muted rounded-lg w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded-lg w-full" />
              <div className="h-3 bg-muted rounded-lg w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-muted rounded w-24" />
            <div className="h-10 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  // Table skeleton
  return (
    <div className="animate-pulse">
      <div className="border-b border-border">
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-3 bg-muted rounded flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={clsx('flex gap-4 px-4 py-4', i % 2 === 0 ? 'bg-white' : 'bg-muted/10')}>
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-4 bg-muted rounded flex-1" style={{ width: `${60 + Math.random() * 40}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
