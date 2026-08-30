import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Nominee, VoteRecord, VipTicketData, CmsSettings, AdminStats } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface VerificationSession {
  id: string;
  email: string;
  fullName: string;
  nomineeId: string;
  provider: string;
  hashedCode: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
  createdAt: number;
  ipAddress: string;
  plainCodeForDev?: string;
}

export interface AdminUser {
  username: string;
  passwordHash: string;
  salt: string;
}

export interface AppDatabase {
  nominees: Nominee[];
  votes: VoteRecord[];
  tickets: VipTicketData[];
  cms: CmsSettings;
  admin: AdminUser;
}

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
  smtp: {
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'Oscar Fan Vote',
    fromEmail: 'onboarding@resend.dev',
  },
};

const DEFAULT_NOMINEES: Nominee[] = [
  {
    id: 'nom_1',
    name: 'Cillian Murphy',
    category: 'Best Actor in a Leading Role',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    bio: 'Renowned for his haunting, mesmerizing portrayal capturing intensity, historical gravity, and profound human vulnerability.',
    votes: 1420,
    active: true,
    order: 1,
  },
  {
    id: 'nom_2',
    name: 'Emma Stone',
    category: 'Best Actress in a Leading Role',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    bio: 'A fearless, transformative tour de force performance that shattered conventional boundaries with electric comedic audacity.',
    votes: 1890,
    active: true,
    order: 2,
  },
  {
    id: 'nom_3',
    name: 'Christopher Nolan',
    category: 'Best Directing',
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80',
    bio: 'Master of non-linear cinematic scale and IMAX visceral immersion, delivering an epic historical masterwork.',
    votes: 2150,
    active: true,
    order: 3,
  },
  {
    id: 'nom_4',
    name: 'Lily Gladstone',
    category: 'Best Actress in a Leading Role',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    bio: 'Commanding the screen with extraordinary poise, quiet power, and unforgettable emotional authenticity.',
    votes: 1675,
    active: true,
    order: 4,
  },
  {
    id: 'nom_5',
    name: 'Timothée Chalamet',
    category: 'Best Actor in a Leading Role',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    bio: 'An electrifying metamorphosis into legendary icons, blending dramatic precision with captivating screen presence.',
    votes: 1980,
    active: true,
    order: 5,
  },
  {
    id: 'nom_6',
    name: 'Ludwig Göransson',
    category: 'Best Original Score',
    photoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    bio: 'Revolutionary acoustic and orchestral textures that pulse with dread, beauty, and symphonic quantum resonance.',
    votes: 1340,
    active: true,
    order: 6,
  },
  {
    id: 'nom_7',
    name: 'Zendaya',
    category: 'Best Actress in a Leading Role',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    bio: 'Captivating fierce athleticism and psychological friction with magnetic, uncompromising screen command.',
    votes: 2210,
    active: true,
    order: 7,
  },
  {
    id: 'nom_8',
    name: 'Robert Downey Jr.',
    category: 'Best Actor in a Supporting Role',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    bio: 'A masterclass in quiet political cunning, wounded pride, and chilling bureaucratic venom.',
    votes: 1785,
    active: true,
    order: 8,
  }
];

function hashString(str: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(str).digest('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

class Database {
  private data: AppDatabase;
  private verificationCodes: Map<string, VerificationSession> = new Map();
  private rateLimitMap: Map<string, { count: number; firstRequest: number }> = new Map();

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): AppDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          nominees: parsed.nominees || DEFAULT_NOMINEES,
          votes: parsed.votes || [],
          tickets: parsed.tickets || [],
          cms: {
            ...DEFAULT_CMS,
            ...(parsed.cms || {}),
            smtp: {
              ...DEFAULT_CMS.smtp!,
              ...((parsed.cms && parsed.cms.smtp) || {}),
            },
            themePrimaryColor: '#29B6F6',
            themeSecondaryColor: '#FFFFFF',
            themeAccentColor: '#0288D1',
          },
          admin: parsed.admin || this.createDefaultAdmin(),
        };
      }
    } catch (e) {
      console.error('Error loading db file, initializing defaults:', e);
    }
    return {
      nominees: DEFAULT_NOMINEES,
      votes: [],
      tickets: [],
      cms: DEFAULT_CMS,
      admin: this.createDefaultAdmin(),
    };
  }

  private createDefaultAdmin(): AdminUser {
    const salt = generateSalt();
    const defaultPassword = process.env.ADMIN_PASSWORD || 'oscar2026admin';
    return {
      username: 'admin',
      salt,
      passwordHash: hashString(defaultPassword, salt),
    };
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error persisting database:', e);
    }
  }

  // Rate Limiting
  checkRateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(key);
    if (!entry) {
      this.rateLimitMap.set(key, { count: 1, firstRequest: now });
      return true;
    }
    if (now - entry.firstRequest > windowMs) {
      this.rateLimitMap.set(key, { count: 1, firstRequest: now });
      return true;
    }
    if (entry.count >= limit) {
      return false;
    }
    entry.count += 1;
    return true;
  }

  // Verification codes
  createVerificationSession(params: {
    email: string;
    fullName: string;
    nomineeId: string;
    provider: string;
    ipAddress: string;
  }): { code: string; sessionId: string; expiresAt: number } {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = generateSalt();
    const hashedCode = hashString(code, salt);
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const session: VerificationSession = {
      id: sessionId,
      email: params.email.trim().toLowerCase(),
      fullName: params.fullName.trim(),
      nomineeId: params.nomineeId,
      provider: params.provider || 'Email',
      hashedCode,
      salt,
      expiresAt,
      attempts: 0,
      consumed: false,
      createdAt: Date.now(),
      ipAddress: params.ipAddress,
      plainCodeForDev: code,
    };

    this.verificationCodes.set(sessionId, session);
    // Cleanup old sessions
    for (const [sId, sess] of this.verificationCodes.entries()) {
      if (sess.expiresAt < Date.now() - 3600000) {
        this.verificationCodes.delete(sId);
      }
    }

    return { code, sessionId, expiresAt };
  }

  getVerificationSession(sessionId: string): VerificationSession | undefined {
    return this.verificationCodes.get(sessionId);
  }

  verifyCode(sessionId: string, codeInput: string): { success: boolean; error?: string; session?: VerificationSession } {
    const session = this.verificationCodes.get(sessionId);
    if (!session) {
      return { success: false, error: 'Verification session not found or expired. Please request a new code.' };
    }
    if (session.consumed) {
      return { success: false, error: 'This verification code has already been used.' };
    }
    if (Date.now() > session.expiresAt) {
      return { success: false, error: 'This verification code has expired. Please request a new code.' };
    }
    if (session.attempts >= 5) {
      return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
    }

    session.attempts += 1;
    const computedHash = hashString(codeInput.trim(), session.salt);
    if (computedHash !== session.hashedCode) {
      const remaining = 5 - session.attempts;
      return { success: false, error: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
    }

    session.consumed = true;
    return { success: true, session };
  }

  // Voting
  hasUserVoted(email: string, nomineeId?: string): boolean {
    const normalized = email.trim().toLowerCase();
    if (this.data.cms.allowMultipleVotes) {
      // Check if voted for this specific nominee
      return nomineeId ? this.data.votes.some(v => v.email === normalized && v.nomineeId === nomineeId) : false;
    }
    // Strictly 1 vote per verified email across the campaign
    return this.data.votes.some(v => v.email === normalized);
  }

  recordVote(session: VerificationSession): { vote: VoteRecord; ticket: VipTicketData; nominee: Nominee } {
    const nominee = this.data.nominees.find(n => n.id === session.nomineeId);
    if (!nominee) {
      throw new Error('Nominee not found');
    }

    // Increment votes
    nominee.votes = (nominee.votes || 0) + 1;

    const voteId = `vote_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const ticketId = `OSCAR-VIP-${Math.floor(10000 + Math.random() * 90000)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    
    // Assign random VIP Box & Seat
    const boxes = ['Grand Box A', 'Orchestra Gold', 'Mezzanine Diamond', 'Director Lounge', 'Stage Front Tier'];
    const randomBox = boxes[Math.floor(Math.random() * boxes.length)];
    const seatNumber = `${randomBox} • Row ${String.fromCharCode(65 + Math.floor(Math.random() * 6))} • Seat ${Math.floor(1 + Math.random() * 30)}`;

    const vote: VoteRecord = {
      id: voteId,
      nomineeId: nominee.id,
      nomineeName: nominee.name,
      category: nominee.category,
      email: session.email,
      fullName: session.fullName,
      provider: session.provider,
      ticketId,
      createdAt: new Date().toISOString(),
      ipAddress: session.ipAddress,
    };

    const ticket: VipTicketData = {
      ticketId,
      fullName: session.fullName,
      email: session.email,
      provider: session.provider,
      nomineeId: nominee.id,
      nomineeName: nominee.name,
      category: nominee.category,
      seatNumber,
      accessTier: 'Gold VIP Passholder',
      issuedAt: new Date().toISOString(),
      verificationHash: crypto.createHash('sha256').update(`${ticketId}:${session.email}:${nominee.id}`).digest('hex').substring(0, 16),
    };

    this.data.votes.unshift(vote);
    this.data.tickets.unshift(ticket);
    this.persist();

    return { vote, ticket, nominee };
  }

  // Nominees
  getNominees(): Nominee[] {
    return this.data.nominees.filter(n => n.active).sort((a, b) => a.order - b.order);
  }

  getAllNomineesForAdmin(): Nominee[] {
    return this.data.nominees.sort((a, b) => a.order - b.order);
  }

  getNomineeById(id: string): Nominee | undefined {
    return this.data.nominees.find(n => n.id === id);
  }

  saveNominee(nominee: Partial<Nominee> & { id?: string }): Nominee {
    if (nominee.id) {
      const index = this.data.nominees.findIndex(n => n.id === nominee.id);
      if (index !== -1) {
        this.data.nominees[index] = {
          ...this.data.nominees[index],
          ...nominee,
        };
        this.persist();
        return this.data.nominees[index];
      }
    }
    const newNominee: Nominee = {
      id: `nom_${Date.now()}`,
      name: nominee.name || 'New Artist',
      category: nominee.category || 'Best Actor',
      photoUrl: nominee.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      bio: nominee.bio || '',
      votes: nominee.votes || 0,
      active: nominee.active !== undefined ? nominee.active : true,
      order: nominee.order || this.data.nominees.length + 1,
    };
    this.data.nominees.push(newNominee);
    this.persist();
    return newNominee;
  }

  deleteNominee(id: string): boolean {
    const initialLen = this.data.nominees.length;
    this.data.nominees = this.data.nominees.filter(n => n.id !== id);
    if (this.data.nominees.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  adjustVoteCount(nomineeId: string, deltaOrExact: { delta?: number; exact?: number }): Nominee | null {
    const nominee = this.data.nominees.find(n => n.id === nomineeId);
    if (!nominee) return null;
    if (deltaOrExact.exact !== undefined) {
      nominee.votes = Math.max(0, deltaOrExact.exact);
    } else if (deltaOrExact.delta !== undefined) {
      nominee.votes = Math.max(0, (nominee.votes || 0) + deltaOrExact.delta);
    }
    this.persist();
    return nominee;
  }

  // CMS
  getCms(): CmsSettings {
    return this.data.cms;
  }

  getPublicCms(): CmsSettings {
    // Strip raw password from public endpoints for security
    const cms = { ...this.data.cms };
    if (cms.smtp) {
      cms.smtp = {
        ...cms.smtp,
        pass: cms.smtp.pass ? '••••••••' : '',
      };
    }
    return cms;
  }

  updateCms(newSettings: Partial<CmsSettings>): CmsSettings {
    let updatedSmtp = this.data.cms.smtp;
    if (newSettings.smtp) {
      // If pass is masked or empty, retain existing password
      const newPass = (newSettings.smtp.pass && newSettings.smtp.pass !== '••••••••')
        ? newSettings.smtp.pass
        : (this.data.cms.smtp?.pass || '');

      updatedSmtp = {
        ...(this.data.cms.smtp || DEFAULT_CMS.smtp!),
        ...newSettings.smtp,
        pass: newPass,
      };
    }

    this.data.cms = {
      ...this.data.cms,
      ...newSettings,
      smtp: updatedSmtp,
    };
    this.persist();
    return this.data.cms;
  }

  // Admin Auth
  verifyAdminPassword(password: string): boolean {
    const hash = hashString(password, this.data.admin.salt);
    return hash === this.data.admin.passwordHash;
  }

  updateAdminPassword(newPassword: string): void {
    const salt = generateSalt();
    this.data.admin = {
      username: 'admin',
      salt,
      passwordHash: hashString(newPassword, salt),
    };
    this.persist();
  }

  // Analytics
  getAdminStats(): AdminStats {
    const totalVotes = this.data.votes.length;
    const uniqueVoters = new Set(this.data.votes.map(v => v.email)).size;
    const codeRequests = this.verificationCodes.size + totalVotes;
    const conversionRate = codeRequests > 0 ? Math.min(100, Math.round((totalVotes / Math.max(codeRequests, 1)) * 100)) : 0;

    const catMap: Record<string, number> = {};
    for (const nom of this.data.nominees) {
      catMap[nom.category] = (catMap[nom.category] || 0) + (nom.votes || 0);
    }
    const votesByCategory = Object.entries(catMap).map(([category, count]) => ({ category, count }));

    const votesByNominee = this.data.nominees.map(n => ({
      name: n.name,
      votes: n.votes || 0,
      category: n.category,
    })).sort((a, b) => b.votes - a.votes);

    return {
      totalVotes,
      totalNominees: this.data.nominees.length,
      uniqueVoters,
      codeRequests,
      conversionRate,
      votesByCategory,
      votesByNominee,
      recentVotes: this.data.votes.slice(0, 50),
    };
  }

  getAllVotes(): VoteRecord[] {
    return this.data.votes;
  }

  getTicketById(ticketId: string): VipTicketData | undefined {
    return this.data.tickets.find(t => t.ticketId === ticketId);
  }
}

export const db = new Database();
