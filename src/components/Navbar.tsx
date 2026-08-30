import React from 'react';
import { Award, ShieldCheck, Lock, HelpCircle, Radio, CheckCircle2 } from 'lucide-react';
import { CmsSettings } from '../types.js';

interface NavbarProps {
  cms: CmsSettings;
  totalVotes: number;
  onScrollToNominees: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cms,
  totalVotes,
  onScrollToNominees,
}) => {
  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all duration-300"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Brand & Logo matching reference image style (Sky Blue circle with white icon) */}
        <div
          id="navbar-brand-button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex cursor-pointer items-center gap-3"
        >
          {/* Logo badge with vibrant sky blue and white circle */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#29B6F6] shadow-sm shadow-[#29B6F6]/30 transition-transform duration-300 group-hover:scale-105">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#29B6F6]">
              <HelpCircle className="h-4 w-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                {cms.brandName}
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              {cms.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Live Vote Tracker & Lightweight Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          
          {/* Live Status Chip */}
          <div
            id="live-ballot-indicator"
            className="hidden items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1.5 text-xs text-sky-800 md:flex"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#29B6F6] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#29B6F6]"></span>
            </span>
            <span className="font-medium">Live Stream</span>
            <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-sky-700 shadow-2xs border border-sky-100">
              {totalVotes.toLocaleString()} votes
            </span>
          </div>

          {/* Quick Lightweight Action Button */}
          <button
            id="nav-ballot-cta"
            onClick={onScrollToNominees}
            className="flex items-center gap-1.5 rounded-xl bg-[#29B6F6] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-[#29B6F6]/25 transition-all hover:bg-[#0288D1] active:scale-98 sm:text-xs"
          >
            <span>Cast Ballot</span>
          </button>
        </div>

      </div>
    </header>
  );
};
