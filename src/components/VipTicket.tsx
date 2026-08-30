import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Award,
  Download,
  Printer,
  CheckCircle2,
  Sparkles,
  Share2,
  X,
  Mail,
  ShieldCheck,
  Calendar,
  MapPin,
  PartyPopper,
} from 'lucide-react';
import { VipTicketData, CmsSettings } from '../types.js';

interface VipTicketProps {
  ticket: VipTicketData;
  cms: CmsSettings;
  onClose: () => void;
}

export const VipTicket: React.FC<VipTicketProps> = ({ ticket, cms, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Trigger high-energy celebratory confetti sequence upon viewing the VIP Ticket
  const triggerConfettiCelebration = () => {
    // 1. Center explosion
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#29B6F6', '#0288D1', '#BAE6FD', '#F59E0B', '#FBBF24', '#FFFFFF'],
      disableForReducedMotion: true,
    });

    // 2. Left cannon flare
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.05, y: 0.7 },
        colors: ['#29B6F6', '#0288D1', '#38BDF8', '#F59E0B', '#FFFFFF'],
        disableForReducedMotion: true,
      });
    }, 200);

    // 3. Right cannon flare
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 0.95, y: 0.7 },
        colors: ['#29B6F6', '#0288D1', '#38BDF8', '#F59E0B', '#FFFFFF'],
        disableForReducedMotion: true,
      });
    }, 400);
  };

  useEffect(() => {
    // Fire confetti when viewing VIP ticket
    triggerConfettiCelebration();

    // Generate QR Code data URL
    const qrData = JSON.stringify({
      id: ticket.ticketId,
      voter: ticket.fullName,
      email: ticket.email,
      nominee: ticket.nomineeName,
      hash: ticket.verificationHash,
    });

    QRCode.toDataURL(qrData, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [ticket]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `I voted for ${ticket.nomineeName} in the ${cms.brandName}!`,
          text: `Here is my official VIP Commemorative Pass (${ticket.ticketId}). Cast your ballot now!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `I voted for ${ticket.nomineeName} in the ${cms.brandName}! Pass ID: ${ticket.ticketId}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      id="vip-ticket-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 sm:p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        id="vip-ticket-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative my-auto w-full max-w-2xl py-2"
      >
        {/* Celebratory Banner Above Ticket */}
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold tracking-wide text-sky-800 uppercase border border-sky-200 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-[#29B6F6]" />
            <span className="truncate">VIP Commemorative Pass</span>
          </div>

          {/* Top Quick Dismiss on Mobile & Desktop */}
          <button
            id="close-vip-ticket-top-button"
            type="button"
            onClick={onClose}
            aria-label="Close VIP Pass"
            className="flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 active:scale-95"
          >
            <X className="h-4 w-4" />
            <span className="text-xs">Close</span>
          </button>
        </div>

        {/* Crisp White VIP Ticket Canvas */}
        <div
          ref={ticketRef}
          id="official-vip-ticket-container"
          className="relative overflow-hidden rounded-2xl border-2 border-sky-300 bg-white p-5 shadow-xl shadow-sky-500/10 sm:p-7"
        >
          {/* Top Sky-Blue Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-[#29B6F6] to-[#0288D1]" />

          {/* Ticket Header Bar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 text-left sm:flex-row sm:items-center sm:justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#29B6F6] border border-sky-100 shadow-2xs">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-widest text-[#0288D1] uppercase truncate">
                  {cms.ticketTitle || 'OFFICIAL VIP PASS'}
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 truncate">
                  {cms.brandName}
                </h3>
              </div>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-1.5 self-start sm:self-auto sm:text-right">
              <div className="text-[9px] font-bold tracking-wider text-sky-800 uppercase">
                PASS IDENTIFIER
              </div>
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                {ticket.ticketId}
              </div>
            </div>
          </div>

          {/* Ticket Body: Two-Column Layout */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            
            {/* Left: Voter & Nominee Highlights */}
            <div className="space-y-3 sm:col-span-2">
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50/60 p-2.5 border border-slate-100 sm:bg-transparent sm:p-0 sm:border-0">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    HONORED VOTER
                  </span>
                  <div className="mt-0.5 text-sm sm:text-base font-bold text-slate-900 break-words">
                    {ticket.fullName}
                  </div>
                  <div className="text-xs text-slate-500 break-all">{ticket.email}</div>
                </div>

                <div className="rounded-xl bg-sky-50/40 p-2.5 border border-sky-100 sm:bg-transparent sm:p-0 sm:border-0">
                  <span className="text-[10px] font-bold tracking-wider text-[#0288D1] uppercase">
                    VOTE RECORDED FOR
                  </span>
                  <div className="mt-0.5 text-sm sm:text-base font-extrabold text-slate-900 break-words">
                    {ticket.nomineeName}
                  </div>
                  <div className="text-xs text-sky-700 font-medium">{ticket.category}</div>
                </div>
              </div>

              {/* Seating Allocation Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                      CEREMONY SEAT ALLOCATION
                    </span>
                    <div className="mt-0.5 text-xs font-bold text-slate-900">
                      {ticket.seatNumber}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                    ★ Verified Ballot
                  </span>
                </div>
              </div>

              {/* Event Location & Date */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#29B6F6] shrink-0" />
                  <span>{cms.eventDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#29B6F6] shrink-0" />
                  <span>{cms.eventVenue}</span>
                </div>
              </div>

            </div>

            {/* Right: Scannable QR Code & Authenticity Seal */}
            <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center gap-3">
              <div className="shrink-0">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Ticket QR Code"
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs"
                  />
                ) : (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 animate-pulse rounded-lg bg-slate-200" />
                )}
              </div>
              <div className="text-left sm:text-center min-w-0 flex-1">
                <div className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                  DIGITAL AUTHENTICITY
                </div>
                <div className="text-[9px] font-mono text-slate-400 break-all mt-0.5">
                  {ticket.verificationHash}
                </div>
              </div>
            </div>

          </div>

          {/* Perforated Bottom Bar */}
          <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
            <div className="flex flex-col items-center justify-between gap-1.5 text-center sm:flex-row sm:text-left">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Single authentic ballot recorded in secure database.</span>
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                Issued: {new Date(ticket.issuedAt).toLocaleString()}
              </div>
            </div>
          </div>

        </div>

        {/* Action Controls & Bottom Close Button */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-1">
          <button
            id="retrigger-confetti-button"
            type="button"
            onClick={triggerConfettiCelebration}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800 shadow-2xs hover:bg-sky-100 active:scale-98 transition-colors"
          >
            <PartyPopper className="h-4 w-4 text-[#29B6F6]" />
            <span>Celebrate! 🎉</span>
          </button>

          <button
            id="print-ticket-button"
            type="button"
            onClick={handlePrint}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#29B6F6] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#0288D1] active:scale-98"
          >
            <Printer className="h-4 w-4" />
            <span>PRINT / SAVE PDF</span>
          </button>

          <button
            id="share-ticket-button"
            type="button"
            onClick={handleShare}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-98"
          >
            <Share2 className="h-4 w-4 text-[#29B6F6]" />
            <span>{copied ? 'Link Copied!' : 'Share Pass'}</span>
          </button>

          <button
            id="done-ticket-button"
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 active:scale-98"
          >
            <X className="h-4 w-4" />
            <span>Done / Return Home</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};
