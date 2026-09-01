import React from 'react';

export const NomineeCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => {
  return (
    <div
      id={`nominee-skeleton-${index}`}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
    >
      {/* Skeleton Image Frame */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100">
        {/* Shimmer gradient pulse */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 via-slate-100 to-slate-200 animate-pulse" />

        {/* Category Pill Skeleton */}
        <div className="absolute top-3 left-3 z-10">
          <div className="h-6 w-24 rounded-lg bg-white/80 shadow-2xs backdrop-blur-xs animate-pulse" />
        </div>

        {/* Live Vote Counter Skeleton at bottom of photo */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-sky-300 animate-pulse" />
            <div className="h-3 w-16 rounded-md bg-slate-200 animate-pulse" />
          </div>
          <div className="h-4 w-10 rounded-md bg-slate-300 animate-pulse" />
        </div>
      </div>

      {/* Card Content Skeleton */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          {/* Nominee Name Skeleton */}
          <div className="h-5 w-3/4 rounded-lg bg-slate-200 animate-pulse" />

          {/* Bio Skeleton Lines */}
          <div className="mt-3 space-y-1.5">
            <div className="h-3 w-full rounded-md bg-slate-100 animate-pulse" />
            <div className="h-3 w-4/5 rounded-md bg-slate-100 animate-pulse" />
          </div>
        </div>

        {/* Card Footer Button Skeleton */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
          <div className="h-3 w-14 rounded-md bg-slate-100 animate-pulse" />
          <div className="h-8 w-20 rounded-xl bg-sky-100/90 border border-sky-200/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
