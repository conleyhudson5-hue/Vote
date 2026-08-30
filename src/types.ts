export interface Nominee {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  bio: string;
  votes: number;
  active: boolean;
  order: number;
}

export interface VoteRecord {
  id: string;
  nomineeId: string;
  nomineeName: string;
  category: string;
  email: string;
  fullName: string;
  provider: string;
  ticketId: string;
  createdAt: string;
  ipAddress?: string;
}

export interface VipTicketData {
  ticketId: string;
  fullName: string;
  email: string;
  provider: string;
  nomineeId: string;
  nomineeName: string;
  category: string;
  seatNumber: string;
  accessTier: string;
  issuedAt: string;
  qrCodeUrl?: string;
  verificationHash: string;
}

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface CmsSettings {
  brandName: string;
  brandSubtitle: string;
  heroHeadline: string;
  heroSubtext: string;
  votingBadgeText: string;
  voteButtonText: string;
  eventDate: string;
  eventVenue: string;
  themePrimaryColor: string;
  themeSecondaryColor: string;
  themeAccentColor: string;
  ticketTitle: string;
  ticketSubtext: string;
  footerText: string;
  allowMultipleVotes: boolean;
  smtp?: SmtpSettings;
}

export interface EmailProviderOption {
  id: string;
  name: string;
  domainHint: string;
  iconName: string;
  badgeColor: string;
}

export interface AdminStats {
  totalVotes: number;
  totalNominees: number;
  uniqueVoters: number;
  codeRequests: number;
  conversionRate: number;
  votesByCategory: { category: string; count: number }[];
  votesByNominee: { name: string; votes: number; category: string }[];
  recentVotes: VoteRecord[];
}
