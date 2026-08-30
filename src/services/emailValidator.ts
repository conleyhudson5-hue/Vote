// Comprehensive Real Email & Domain Verification Utility

// Common Disposable / Burner Email Domains Blacklist
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'sharklasers.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'getairmail.com',
  'throwawaymail.com',
  'fakemailgenerator.com',
  'dispostable.com',
  'crazymailing.com',
  'generator.email',
  'mohmal.com',
  'burnermail.io',
  'dropmail.me',
  'inboxkitten.com',
  'nada.ltd',
  'getnada.com',
  'maildrop.cc',
  'mytemp.email',
  'minuteinbox.com',
  'emailondeck.com',
  'tempail.com',
  'fakeinbox.com',
  'burnermail.com',
  'zillamail.com',
  'mailcatch.com',
  'tempmailaddress.com',
]);

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEmail?: string;
  domain?: string;
  suggestedProviderId?: string;
}

// Allowed domains per provider type
export const PROVIDER_DOMAINS: Record<string, string[]> = {
  gmail: ['gmail.com', 'googlemail.com'],
  outlook: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'windowslive.com', 'passport.com'],
  yahoo: ['yahoo.com', 'ymail.com', 'myyahoo.com', 'rocketmail.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.ca'],
  apple: ['icloud.com', 'me.com', 'mac.com'],
  proton: ['proton.me', 'protonmail.com', 'pm.me', 'protonmail.ch'],
  aol: ['aol.com', 'aim.com', 'love.com', 'wow.com', 'games.com'],
};

/**
 * Validates that an email is authentic, formatted correctly, uses a legitimate TLD,
 * is not from a disposable/burner service, and optionally matches the selected provider.
 */
export function validateRealEmail(email: string, providerId?: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Basic RFC 5322 regex validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email format (e.g. yourname@example.com).' };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Email address must contain exactly one @ symbol.' };
  }

  const [localPart, domain] = parts;

  // Local part constraints
  if (localPart.length === 0 || localPart.length > 64) {
    return { isValid: false, error: 'Email username must be between 1 and 64 characters.' };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, error: 'Email username contains invalid dot positioning.' };
  }

  // Domain constraints
  if (domain.length < 4 || domain.length > 253) {
    return { isValid: false, error: 'Email domain name is too short or too long.' };
  }

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: 'Email domain must include a top-level extension (e.g. .com).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return { isValid: false, error: 'Email has an invalid top-level domain extension.' };
  }

  // Check for dummy or placeholder names
  const dummyUsernames = ['test', 'fake', 'asdf', 'qwerty', '123456', 'anonymous', 'none', 'user', 'temp'];
  if (dummyUsernames.includes(localPart)) {
    return { isValid: false, error: 'Please use your real personal email address instead of a test placeholder.' };
  }

  // Check for disposable / burner domain blacklist
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Disposable and temporary email addresses are not permitted for verified ballot casting. Please use a real email provider.',
    };
  }

  // Detect which provider this domain actually belongs to
  let detectedProviderId = 'custom';
  for (const [pId, domList] of Object.entries(PROVIDER_DOMAINS)) {
    if (domList.includes(domain)) {
      detectedProviderId = pId;
      break;
    }
  }

  // If a specific provider was selected (and not "custom"), verify the domain matches or advise user
  if (providerId && providerId !== 'custom') {
    const allowed = PROVIDER_DOMAINS[providerId];
    if (allowed && !allowed.includes(domain)) {
      // Check if they typed a corporate/school email or another provider
      return {
        isValid: false,
        error: `The email domain "@${domain}" does not match the selected provider (${providerId.toUpperCase()}). Please enter a valid ${allowed.map(d => '@' + d).join(' or ')} address, or select "Other Webmail / Corporate".`,
        suggestedProviderId: detectedProviderId,
      };
    }
  }

  return {
    isValid: true,
    normalizedEmail: cleanEmail,
    domain,
    suggestedProviderId: detectedProviderId,
  };
}
