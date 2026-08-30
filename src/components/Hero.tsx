import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Award, ShieldCheck, Ticket, Sparkles, ChevronDown, CheckCircle2, Flame } from 'lucide-react';
import { CmsSettings } from '../types.js';

interface HeroProps {
  cms: CmsSettings;
  totalVotes: number;
  nomineeCount: number;
  onExploreNominees: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  cms,
  totalVotes,
  nomineeCount,
  onExploreNominees,
}) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const goldGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        badgeRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      )
        .fromTo(
          titleRef.current,
          { y: 30, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8 },
          '-=0.3'
        )
        .fromTo(
          subtextRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          '-=0.4'
        )
        .fromTo(
          ctaRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          '-=0.4'
        )
        .fromTo(
          statsRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.3'
        );

      // Subtle pulse on background gold glow
      if (goldGlowRef.current) {
        gsap.to(goldGlowRef.current, {
          scale: 1.15,
          opacity: 0.35,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, [cms.brandName, cms.heroHeadline]);

  return (
    <section
      id="hero-section"
      ref={heroRef}
      className="relative overflow-hidden border-b border-[#241E10] bg-[#0A0A0F] py-16 sm:py-24 lg:py-28"
    >
      {/* Cinematic Golden Glow and Ambient Stage Lights */}
      <div
        ref={goldGlowRef}
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#D4AF37]/25 via-[#99741B]/10 to-transparent blur-[120px]"
      />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-72 w-72 rounded-full bg-[#C9A227]/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-[#C9A227]/10 blur-[100px]" />

      {/* Decorative Grid Mesh */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#2A2312_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        
        {/* Verification Status Badge */}
        <div
          ref={badgeRef}
          id="hero-voting-badge"
          className="mx-auto mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#D4AF37]/40 bg-[#19150C]/90 px-4 py-1.5 shadow-lg shadow-[#D4AF37]/5 backdrop-blur"
        >
          <Award className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-xs font-bold tracking-widest text-[#F5E7B2] uppercase">
            {cms.votingBadgeText}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          <span className="text-xs text-[#A0A0B0]">{cms.eventDate}</span>
        </div>

        {/* Dynamic CMS Hero Headline */}
        <h1
          ref={titleRef}
          id="hero-main-title"
          className="mx-auto max-w-4xl font-serif text-4xl font-extrabold tracking-tight text-[#FFFFFF] sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="bg-gradient-to-r from-[#FFFFFF] via-[#F5E7B2] to-[#D4AF37] bg-clip-text text-transparent">
            {cms.heroHeadline}
          </span>
        </h1>

        {/* Dynamic CMS Hero Subtext */}
        <p
          ref={subtextRef}
          id="hero-subtext"
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#A0A0B0] sm:text-lg md:text-xl"
        >
          {cms.heroSubtext}
        </p>

        {/* Security & Authenticity Trust Bar */}
        <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-4 text-xs text-[#7A7A8C]">
          <div className="flex items-center gap-1.5 text-[#E6CA65]">
            <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
            <span>Cryptographic 1-Vote Integrity</span>
          </div>
          <span className="hidden text-[#333344] sm:inline">•</span>
          <div className="flex items-center gap-1.5 text-[#C0C0D0]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#4BB543]" />
            <span>Never asks for passwords</span>
          </div>
          <span className="hidden text-[#333344] sm:inline">•</span>
          <div className="flex items-center gap-1.5 text-[#C0C0D0]">
            <Ticket className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Instant Personalized VIP Ticket</span>
          </div>
        </div>

        {/* Action Button & Smooth Scroll Trigger */}
        <div
          ref={ctaRef}
          id="hero-action-buttons"
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <button
            id="hero-vote-cta-button"
            onClick={onExploreNominees}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-[#F5E7B2]/40 bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#99741B] px-8 py-3.5 text-sm font-extrabold tracking-wider text-[#0A0A0F] shadow-xl shadow-[#C9A227]/25 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-[#C9A227]/40 active:scale-95 sm:w-auto"
          >
            <Sparkles className="h-4 w-4 text-[#0A0A0F] transition-transform duration-300 group-hover:rotate-45" />
            <span className="uppercase">{cms.voteButtonText}</span>
            <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>

        {/* Live Metrics Row */}
        <div
          ref={statsRef}
          id="hero-metrics-container"
          className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <div className="rounded-xl border border-[#2B2415] bg-[#12110D]/80 p-4 backdrop-blur">
            <div className="flex items-center justify-center gap-1 text-xs font-semibold text-[#D4AF37] uppercase">
              <Flame className="h-3.5 w-3.5" />
              <span>Live Tally</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-[#FFFFFF] sm:text-3xl">
              {totalVotes.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#7A7A8C]">Verified Fan Votes</p>
          </div>

          <div className="rounded-xl border border-[#2B2415] bg-[#12110D]/80 p-4 backdrop-blur">
            <div className="text-xs font-semibold text-[#D4AF37] uppercase">Nominees</div>
            <div className="mt-1 font-mono text-2xl font-black text-[#FFFFFF] sm:text-3xl">
              {nomineeCount}
            </div>
            <p className="text-[11px] text-[#7A7A8C]">Active Categories</p>
          </div>

          <div className="rounded-xl border border-[#2B2415] bg-[#12110D]/80 p-4 backdrop-blur">
            <div className="text-xs font-semibold text-[#D4AF37] uppercase">VIP Passes</div>
            <div className="mt-1 font-mono text-2xl font-black text-[#F5E7B2] sm:text-3xl">
              {totalVotes.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#7A7A8C]">Issued to Inboxes</p>
          </div>

          <div className="rounded-xl border border-[#2B2415] bg-[#12110D]/80 p-4 backdrop-blur">
            <div className="text-xs font-semibold text-[#D4AF37] uppercase">Integrity</div>
            <div className="mt-1 font-mono text-2xl font-black text-[#4BB543] sm:text-3xl">
              100%
            </div>
            <p className="text-[11px] text-[#7A7A8C]">Email Code Verified</p>
          </div>
        </div>

      </div>
    </section>
  );
};
