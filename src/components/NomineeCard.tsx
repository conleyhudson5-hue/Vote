import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Award, Flame, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { Nominee } from '../types.js';

interface NomineeCardProps {
  nominee: Nominee;
  onVote: (nominee: Nominee) => void;
  voteButtonText?: string;
  isLeading?: boolean;
}

export const NomineeCard: React.FC<NomineeCardProps> = ({
  nominee,
  onVote,
  voteButtonText = 'Vote',
  isLeading = false,
}) => {
  const [showBio, setShowBio] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      id={`nominee-card-${nominee.id}`}
      className="nominee-card-item group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
    >
      {/* Category Leader Pill */}
      {isLeading && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-[#29B6F6] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
          <Flame className="h-3 w-3 fill-current" />
          <span>Leader</span>
        </div>
      )}

      {/* Artist Image Canvas */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sky-400">
            <Award className="h-8 w-8 animate-pulse opacity-40" />
          </div>
        )}
        <img
          src={nominee.photoUrl}
          alt={nominee.name}
          onLoad={() => setImageLoaded(true)}
          className={`h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Subtle Bottom Fade on Image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
        
        {/* Category Pill Over Image */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-block rounded-lg border border-sky-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-sky-700 shadow-2xs backdrop-blur-md">
            {nominee.category}
          </span>
        </div>

        {/* Live Vote Counter Badge */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-[#29B6F6] animate-pulse" />
            <span className="text-[11px] font-medium text-slate-500">Live Votes</span>
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span
              key={nominee.votes}
              initial={{ scale: 1.2, color: '#29B6F6' }}
              animate={{ scale: 1, color: '#0F172A' }}
              transition={{ duration: 0.3 }}
              className="font-mono text-sm font-bold text-slate-900"
            >
              {nominee.votes.toLocaleString()}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Nominee Details & Lightweight Vote Button */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#0288D1] sm:text-lg">
            {nominee.name}
          </h3>

          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-2">
            {nominee.bio}
          </p>

          {nominee.bio && nominee.bio.length > 80 && (
            <button
              onClick={() => setShowBio(!showBio)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700"
            >
              <Info className="h-3 w-3" />
              <span>{showBio ? 'Less' : 'More info'}</span>
            </button>
          )}

          {showBio && (
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
              {nominee.bio}
            </div>
          )}
        </div>

        {/* Lightweight Button */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            id={`vote-btn-${nominee.id}`}
            onClick={() => onVote(nominee)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#29B6F6] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0288D1] active:scale-98"
          >
            <span>{voteButtonText}</span>
            <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        </div>

      </div>
    </div>
  );
};
