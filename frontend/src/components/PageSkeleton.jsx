import React from 'react';

export default function PageSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-6">
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-border/60 rounded-md"></div>
          <div className="h-4 w-72 bg-border/40 rounded-md"></div>
        </div>
        <div className="h-9 w-28 bg-border/50 rounded-lg"></div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-surface rounded-card border border-border p-5 space-y-3">
            <div className="h-3 w-20 bg-border/50 rounded"></div>
            <div className="h-6 w-32 bg-border/60 rounded"></div>
            <div className="h-2.5 w-40 bg-border/30 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="h-96 bg-surface rounded-card border border-border p-6 space-y-4">
        <div className="h-5 w-44 bg-border/50 rounded"></div>
        <div className="h-4 w-full bg-border/30 rounded"></div>
        <div className="h-4 w-5/6 bg-border/30 rounded"></div>
        <div className="h-4 w-4/6 bg-border/30 rounded"></div>
        <div className="h-48 w-full bg-border/20 rounded-xl mt-6"></div>
      </div>
    </div>
  );
}
