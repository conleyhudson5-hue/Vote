import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { NomineeGrid } from './components/NomineeGrid.js';
import { VoteModal } from './components/VoteModal.js';
import { VipTicket } from './components/VipTicket.js';
import { AdminPanel } from './components/AdminPanel.js';
import { Footer } from './components/Footer.js';
import { Nominee, CmsSettings, VipTicketData } from './types.js';
import { api } from './services/api.js';
import { Sparkles } from 'lucide-react';

const DEFAULT_CMS: CmsSettings = {
  brandName: 'Official Fan Choice Vote',
  brandSubtitle: 'Annual Entertainment Awards • Verified Global Fan Choice',
  heroHeadline: 'Cast Your Official Vote',
  heroSubtext: 'Vote for your favorite nominated artists and instantly receive your verified digital VIP pass.',
  votingBadgeText: '2026 Live Balloting Open',
  voteButtonText: 'Vote',
  eventDate: 'Sunday, March 29, 2026',
  eventVenue: 'Grand Civic Arena • Live Broadcast',
  themePrimaryColor: '#29B6F6',
  themeSecondaryColor: '#FFFFFF',
  themeAccentColor: '#0288D1',
  ticketTitle: 'OFFICIAL VIP COMMEMORATIVE PASS',
  ticketSubtext: 'Fan Choice Awards • Verified Gold Member',
  footerText: '© 2026 Official Fan Choice Awards. Verified Balloting System with cryptographic voter integrity.',
  allowMultipleVotes: false,
};

export default function App() {
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [cms, setCms] = useState<CmsSettings>(DEFAULT_CMS);
  const [isLoading, setIsLoading] = useState(true);

  // Active Modals State
  const [selectedNomineeForVote, setSelectedNomineeForVote] = useState<Nominee | null>(null);
  const [activeTicket, setActiveTicket] = useState<VipTicketData | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Live Toast Notification
  const [liveToast, setLiveToast] = useState<{ message: string; visible: boolean } | null>(null);

  // Calculate total votes across all active nominees
  const totalVotes = nominees.reduce((sum, n) => sum + (n.votes || 0), 0);

  // Load initial data and handle Admin Route
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);

    const fetchData = async () => {
      try {
        const [nomRes, cmsRes] = await Promise.all([
          api.getNominees(),
          api.getCms(),
        ]);
        setNominees(nomRes.nominees || []);
        if (cmsRes.cms) {
          setCms(cmsRes.cms);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time live events (SSE)
    const unsubscribe = api.subscribeToLiveUpdates({
      onVoteUpdate: (data) => {
        setNominees((prev) =>
          prev.map((n) => (n.id === data.nomineeId ? { ...n, votes: data.newVoteCount } : n))
        );
        // Show subtle live activity ticker
        setLiveToast({
          message: `🔥 New verified vote recorded for ${data.nomineeName}!`,
          visible: true,
        });
        setTimeout(() => setLiveToast((t) => (t ? { ...t, visible: false } : null)), 3500);
      },
      onNomineesUpdated: (data) => {
        setNominees(data.nominees);
      },
      onCmsUpdated: (data) => {
        setCms(data.cms);
      },
    });

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/admin' || path.startsWith('/admin/')) {
      window.history.pushState({}, '', '/');
    } else if (hash === '#admin') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const handleOpenVoteModal = (nominee: Nominee) => {
    setSelectedNomineeForVote(nominee);
  };

  const handleVoteSuccess = (ticket: VipTicketData, nominee: Nominee) => {
    setSelectedNomineeForVote(null);
    setActiveTicket(ticket);
    // Optimistic vote count increment
    setNominees((prev) =>
      prev.map((n) => (n.id === nominee.id ? { ...n, votes: (n.votes || 0) + 1 } : n))
    );
  };

  const handleScrollToNominees = () => {
    const el = document.getElementById('nominees-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#29B6F6] selection:text-white font-sans antialiased">
      
      {/* Live Stream Ticker / Toast */}
      {liveToast && liveToast.visible && (
        <div
          id="live-vote-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-sky-200 bg-white/95 px-4 py-2.5 text-xs font-bold text-sky-900 shadow-xl shadow-sky-500/10 backdrop-blur-md animate-bounce"
        >
          <Sparkles className="h-4 w-4 text-[#29B6F6]" />
          <span>{liveToast.message}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        cms={cms}
        totalVotes={totalVotes}
        onScrollToNominees={handleScrollToNominees}
      />

      {/* Nominees Voting Grid (Direct Entry, No Hero Section) */}
      <main>
        <NomineeGrid
          nominees={nominees}
          cms={cms}
          onVote={handleOpenVoteModal}
        />
      </main>

      {/* Legitimate Vote Verification Modal */}
      <VoteModal
        nominee={selectedNomineeForVote}
        cms={cms}
        isOpen={!!selectedNomineeForVote}
        onClose={() => setSelectedNomineeForVote(null)}
        onVoteSuccess={handleVoteSuccess}
      />

      {/* VIP Pass Presentation Modal */}
      {activeTicket && (
        <VipTicket
          ticket={activeTicket}
          cms={cms}
          onClose={() => setActiveTicket(null)}
        />
      )}

      {/* Full Admin Management & CMS Portal on dedicated /admin route */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={handleCloseAdmin}
        cms={cms}
        onCmsUpdated={(newCms) => setCms(newCms)}
        onNomineesUpdated={(newNominees) => setNominees(newNominees)}
      />

      {/* Main Footer */}
      <Footer cms={cms} />

    </div>
  );
}
