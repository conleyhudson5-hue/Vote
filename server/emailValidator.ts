// Server-side real email verification and anti-abuse validation

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

export interface ServerEmailValidationResult {
  isValid: boolean;
  error?: string;
  normalizedEmail?: string;
  domain?: string;
}

export function validateServerRealEmail(email: string): ServerEmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Valid email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Invalid email address syntax.' };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Email must contain exactly one @ symbol.' };
  }

  const [localPart, domain] = parts;

  if (localPart.length === 0 || localPart.length > 64) {
    return { isValid: false, error: 'Email username must be between 1 and 64 characters.' };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, error: 'Email username contains invalid consecutive or leading dots.' };
  }

  if (domain.length < 4 || domain.length > 253) {
    return { isValid: false, error: 'Email domain is invalid.' };
  }

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: 'Email domain must have a valid top-level domain.' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return { isValid: false, error: 'Email domain has an invalid TLD extension.' };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Disposable and throwaway email addresses are not permitted. Please provide a genuine email account to receive your verified ballot passcode.',
    };
  }

  return {
    isValid: true,
    normalizedEmail: cleanEmail,
    domain,
  };
}
