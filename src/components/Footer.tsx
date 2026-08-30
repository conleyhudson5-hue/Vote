import React from 'react';
import { Award, ShieldCheck, Lock } from 'lucide-react';
import { CmsSettings } from '../types.js';

interface FooterProps {
  cms: CmsSettings;
}

export const Footer: React.FC<FooterProps> = ({ cms }) => {
  return (
    <footer id="main-footer" className="border-t border-slate-100 bg-white py-8 text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-[#29B6F6] border border-sky-100">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800">
                {cms.brandName}
              </span>
              <p className="text-[11px] text-slate-400">{cms.brandSubtitle}</p>
            </div>
          </div>

          {/* Security & Authenticity Trust */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-sky-700 font-medium">
              <ShieldCheck className="h-4 w-4 text-[#29B6F6]" />
              <span>Verified Voter Authentication</span>
            </div>
          </div>

        </div>

        {/* Bottom Legal Notice */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          <p>{cms.footerText}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Fan-voting platform powered by verified one-time email confirmation & real-time streams.
          </p>
        </div>
      </div>
    </footer>
  );
};
