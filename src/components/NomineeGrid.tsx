import React, { useState, useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, Filter, Sparkles, TrendingUp, Layers, Award } from 'lucide-react';
import { Nominee, CmsSettings } from '../types.js';
import { NomineeCard } from './NomineeCard.js';

gsap.registerPlugin(ScrollTrigger);

interface NomineeGridProps {
  nominees: Nominee[];
  cms: CmsSettings;
  onVote: (nominee: Nominee) => void;
}

export const NomineeGrid: React.FC<NomineeGridProps> = ({
  nominees,
  cms,
  onVote,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'votes' | 'name' | 'order'>('votes');
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    nominees.forEach((n) => set.add(n.category));
    return ['All', ...Array.from(set)];
  }, [nominees]);

  // Filter & Sort
  const filteredNominees = useMemo(() => {
    return nominees
      .filter((n) => {
        const matchesCategory = selectedCategory === 'All' || n.category === selectedCategory;
        const matchesSearch =
          n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.bio && n.bio.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'votes') return b.votes - a.votes;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return a.order - b.order;
      });
  }, [nominees, selectedCategory, searchQuery, sortBy]);

  // Find category leader
  const leaderId = useMemo(() => {
    if (nominees.length === 0) return null;
    const sorted = [...nominees].sort((a, b) => b.votes - a.votes);
    return sorted[0]?.id;
  }, [nominees]);

  // GSAP Staggered Scroll Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.nominee-card-item');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [selectedCategory, sortBy]);

  return (
    <section
      id="nominees-section"
      ref={sectionRef}
      className="relative bg-white py-10 sm:py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-200/60">
              <Award className="h-3.5 w-3.5 text-[#29B6F6]" />
              <span>{cms.votingBadgeText}</span>
            </div>
            <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {cms.heroHeadline || 'Official Nominees'}
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {cms.heroSubtext || 'Browse candidates, cast your verified vote, and receive your digital VIP pass.'}
            </p>
          </div>

          {/* Quick Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="nominee-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artist or category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pr-4 pl-9 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips & Sort Controls */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`category-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#29B6F6] text-white shadow-xs shadow-[#29B6F6]/30'
                      : 'border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              id="nominees-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 shadow-2xs cursor-pointer"
            >
              <option value="votes">🔥 Most Votes</option>
              <option value="name">🔤 Artist Name</option>
              <option value="order">⭐ Ballot Order</option>
            </select>
          </div>

        </div>

        {/* Nominee Grid */}
        <div
          ref={gridRef}
          id="nominees-card-grid"
          className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {filteredNominees.map((nominee) => (
            <NomineeCard
              key={nominee.id}
              nominee={nominee}
              onVote={onVote}
              voteButtonText={cms.voteButtonText}
              isLeading={nominee.id === leaderId}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredNominees.length === 0 && (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50/50 p-12 text-center">
            <Award className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-base font-bold text-slate-800">No Nominees Found</h3>
            <p className="mt-1 text-xs text-slate-500">
              No artists match "{searchQuery}" in category "{selectedCategory}".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-4 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        )}

      </div>
    </section>
  );
};
