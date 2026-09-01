import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { db, VerificationSession } from './db.js';
import { sendEmail, testSmtpConnection, buildSenderAddress, generateVerificationCodeEmailHtml, generateVipTicketEmailHtml } from './email.js';
import { validateServerRealEmail } from './emailValidator.js';
import { sseBroker } from './sse.js';
import { signToken, verifyToken, hashCode } from './session.js';

const ADMIN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;

interface AdminTokenPayload {
  role: 'admin';
  exp: number;
}

interface VerificationPayload {
  email: string;
  fullName: string;
  nomineeId: string;
  provider: string;
  ip: string;
  salt: string;
  codeHash: string;
  exp: number;
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function readAdminToken(req: express.Request): string | null {
  return (
    req.cookies?.admin_session ||
    (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null)
  );
}

function isAdminAuthenticated(req: express.Request): boolean {
  const result = verifyToken<AdminTokenPayload>(readAdminToken(req));
  return result.ok && result.payload.role === 'admin';
}

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }
  next();
}

/**
 * Builds the API app. Deliberately free of any `listen` call or Vite wiring so
 * the same routes can be mounted by the local dev server and by the Vercel
 * serverless handler.
 */
export function createApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now(), sseClients: sseBroker.getClientCount() });
  });

  // 2. Public Nominees
  app.get('/api/nominees', (req, res) => {
    res.json({ nominees: db.getNominees() });
  });

  // 3. Public CMS Settings
  app.get('/api/cms', (req, res) => {
    res.json({ cms: db.getPublicCms() });
  });

  // 4. SSE Stream for live vote updates
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sseBroker.addClient(clientId, res);
  });

  // 5. Verification: Request Code
  app.post('/api/verify/request-code', async (req, res) => {
    try {
      const { email, fullName, nomineeId, provider } = req.body;
      const ip = getClientIp(req);

      if (!email || !fullName || !nomineeId) {
        return res.status(400).json({ error: 'Please provide your full name, a valid email address, and select a nominee.' });
      }

      // Strict Real Email Authentication Verification
      const emailValidation = validateServerRealEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ error: emailValidation.error || 'Please provide a valid, real email address.' });
      }
      const verifiedEmail = emailValidation.normalizedEmail!;

      // Check Rate Limit (max 5 code requests per 10 mins per IP or email)
      const emailKey = `req_${verifiedEmail}`;
      const ipKey = `req_${ip}`;
      if (!db.checkRateLimit(emailKey, 5, 10 * 60 * 1000) || !db.checkRateLimit(ipKey, 15, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many verification requests. Please wait a few minutes before trying again.' });
      }

      // Check if user already voted
      if (db.hasUserVoted(verifiedEmail, nomineeId)) {
        return res.status(400).json({
          error: 'You have already submitted a verified vote with this email address. Each verified fan may only vote once.',
          alreadyVoted: true,
        });
      }

      const nominee = db.getNomineeById(nomineeId);
      if (!nominee) {
        return res.status(404).json({ error: 'Selected nominee not found.' });
      }

      // Create a stateless, signed verification session. Nothing is held in
      // process memory, so the confirm step succeeds on any serverless instance.
      const code = crypto.randomInt(100000, 1000000).toString();
      const salt = crypto.randomBytes(16).toString('hex');
      const expiresAt = Date.now() + VERIFICATION_TTL_MS;
      const sessionId = signToken(
        {
          email: verifiedEmail,
          fullName: fullName.trim(),
          nomineeId,
          provider: provider || 'Email',
          ip,
          salt,
          codeHash: hashCode(code, salt),
        },
        VERIFICATION_TTL_MS
      );

      // Send Verification Email via Dynamic SMTP / Resend / Simulator
      const cms = db.getCms();
      const emailHtml = generateVerificationCodeEmailHtml(code, cms, fullName.trim());
      const emailResult = await sendEmail(verifiedEmail, `${code} is your ${cms.brandName || 'Oscar Vote'} verification code`, emailHtml, cms);

      const delivered = emailResult.success && !emailResult.simulated;
      if (delivered) {
        console.log(`[Verification Code Sent] To: ${verifiedEmail} | Via: ${emailResult.via} | Message ID: ${emailResult.messageId}`);
      } else {
        console.error(`[Verification Code NOT Delivered] To: ${verifiedEmail} | Via: ${emailResult.via} | Reason: ${emailResult.error || 'unknown'}`);
      }

      return res.json({
        success: true,
        sessionId,
        expiresAt,
        simulated: !!emailResult.simulated,
        emailDeliveryFailed: !delivered,
        emailError: delivered ? undefined : emailResult.error,
        // The plaintext code is only returned when no provider is configured and
        // the send was simulated. Returning it after a real send would let any
        // caller skip email verification entirely.
        previewCode: emailResult.simulated ? code : undefined,
        message: delivered
          ? `A 6-digit verification code has been sent to ${verifiedEmail}.`
          : `Verification code prepared for ${verifiedEmail}.`,
      });
    } catch (err: any) {
      console.error('Error requesting verification code:', err);
      return res.status(500).json({ error: 'Internal server error while preparing verification code.' });
    }
  });

  // 6. Verification: Confirm Code & Cast Vote
  app.post('/api/verify/confirm-code', async (req, res) => {
    try {
      const { sessionId, code } = req.body;
      if (!sessionId || !code) {
        return res.status(400).json({ error: 'Session ID and 6-digit code are required.' });
      }

      const verification = verifyToken<VerificationPayload>(sessionId);
      if (!verification.ok) {
        return res.status(400).json({
          error: verification.error === 'Token has expired.'
            ? 'This verification code has expired. Please request a new code.'
            : 'Verification session not found. Please request a new code.',
        });
      }

      const payload = verification.payload;
      const submitted = Buffer.from(hashCode(String(code), payload.salt));
      const expected = Buffer.from(payload.codeHash);
      if (submitted.length !== expected.length || !crypto.timingSafeEqual(submitted, expected)) {
        return res.status(400).json({ error: 'Invalid verification code. Please check the code and try again.' });
      }

      const session = {
        email: payload.email,
        fullName: payload.fullName,
        nomineeId: payload.nomineeId,
        provider: payload.provider,
        ipAddress: payload.ip,
      } as VerificationSession;

      // Double-check duplicate vote
      if (db.hasUserVoted(session.email, session.nomineeId)) {
        return res.status(400).json({ error: 'A vote has already been recorded for this email.' });
      }

      // Record vote & generate VIP Ticket
      const { vote, ticket, nominee } = db.recordVote(session);

      // Broadcast live vote increment via SSE to all active clients
      sseBroker.broadcast('vote_update', {
        nomineeId: nominee.id,
        nomineeName: nominee.name,
        newVoteCount: nominee.votes,
        totalVotes: db.getAllVotes().length,
        timestamp: Date.now(),
      });

      // Send VIP Ticket Email via Dynamic SMTP / Resend / Simulator
      const cms = db.getCms();
      const ticketEmailHtml = generateVipTicketEmailHtml(ticket, cms);
      sendEmail(session.email, `🎬 Your Official Oscar VIP Commemorative Pass (${ticket.ticketId})`, ticketEmailHtml, cms)
        .then(res => console.log(`[Ticket Email Sent] To: ${session.email} | Via: ${res.via || 'auto'} | Result:`, res))
        .catch(err => console.error(`[Ticket Email Error] To: ${session.email}:`, err));

      return res.json({
        success: true,
        ticket,
        vote,
        nominee,
        message: 'Vote verified and recorded successfully! Your VIP Pass is ready.',
      });
    } catch (err: any) {
      console.error('Error confirming code:', err);
      return res.status(500).json({ error: err.message || 'Error confirming verification code.' });
    }
  });

  // 7. Get Ticket by ID
  app.get('/api/ticket/:ticketId', (req, res) => {
    const ticket = db.getTicketById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    return res.json({ ticket });
  });

  // 8. Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    if (!db.verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Incorrect admin password.' });
    }

    const token = signToken({ role: 'admin' }, ADMIN_TOKEN_TTL_MS);

    res.cookie('admin_session', token, {
      httpOnly: true,
      // Vercel always serves over HTTPS and rejects non-Secure cookies there,
      // while a Secure cookie would never be set over plain-HTTP localhost.
      secure: !!process.env.VERCEL,
      sameSite: 'lax',
      maxAge: ADMIN_TOKEN_TTL_MS,
    });

    return res.json({ success: true, token, message: 'Admin login successful.' });
  });

  // 9. Admin Logout
  app.post('/api/admin/logout', (req, res) => {
    // Signed tokens carry their own expiry and are not tracked server-side,
    // so logging out clears the cookie rather than revoking the token.
    res.clearCookie('admin_session');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });

  // 10. Check Admin Auth
  app.get('/api/admin/check-auth', (req, res) => {
    return res.json({ isAuthenticated: isAdminAuthenticated(req) });
  });

  // 11. Admin Dashboard Stats
  app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
    return res.json({ stats: db.getAdminStats() });
  });

  // 12. Admin Nominees List
  app.get('/api/admin/nominees', requireAdminAuth, (req, res) => {
    return res.json({ nominees: db.getAllNomineesForAdmin() });
  });

  // 13. Admin Create Nominee
  app.post('/api/admin/nominees', requireAdminAuth, (req, res) => {
    const nominee = db.saveNominee(req.body);
    sseBroker.broadcast('nominees_updated', { nominees: db.getNominees() });
    return res.json({ nominee });
  });

  // 14. Admin Edit Nominee
  app.put('/api/admin/nominees/:id', requireAdminAuth, (req, res) => {
    const nominee = db.saveNominee({ ...req.body, id: req.params.id });
    sseBroker.broadcast('nominees_updated', { nominees: db.getNominees() });
    return res.json({ nominee });
  });

  // 15. Admin Delete Nominee
  app.delete('/api/admin/nominees/:id', requireAdminAuth, (req, res) => {
    const deleted = db.deleteNominee(req.params.id);
    if (deleted) {
      sseBroker.broadcast('nominees_updated', { nominees: db.getNominees() });
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Nominee not found.' });
  });

  // 16. Admin Adjust / Reset Vote Counts
  app.post('/api/admin/nominees/:id/adjust-votes', requireAdminAuth, (req, res) => {
    const { delta, exact } = req.body;
    const nominee = db.adjustVoteCount(req.params.id, { delta, exact });
    if (!nominee) {
      return res.status(404).json({ error: 'Nominee not found.' });
    }
    sseBroker.broadcast('vote_update', {
      nomineeId: nominee.id,
      nomineeName: nominee.name,
      newVoteCount: nominee.votes,
      totalVotes: db.getAllVotes().length,
    });
    return res.json({ nominee });
  });

  // 17. Admin Get Full CMS (including SMTP settings)
  app.get('/api/admin/cms', requireAdminAuth, (req, res) => {
    return res.json({ cms: db.getCms() });
  });

  // 18. Admin Update CMS
  app.put('/api/admin/cms', requireAdminAuth, (req, res) => {
    const updatedCms = db.updateCms(req.body);
    sseBroker.broadcast('cms_updated', { cms: db.getPublicCms() });
    return res.json({ cms: updatedCms });
  });

  // 19. Admin Test SMTP Connection
  app.post('/api/admin/test-smtp', requireAdminAuth, async (req, res) => {
    try {
      const { host, port, secure, user, pass, fromName, fromEmail, testRecipient } = req.body;
      if (!host || !testRecipient) {
        return res.status(400).json({ error: 'SMTP Host and recipient email address are required.' });
      }

      // If password not passed in request body, retrieve stored password from DB
      const currentCms = db.getCms();
      const resolvedPass = (pass && pass !== '••••••••') ? pass : (currentCms.smtp?.pass || '');

      const result = await testSmtpConnection({
        enabled: true,
        host: host.trim(),
        port: Number(port) || 587,
        secure: !!secure,
        user: (user || '').trim(),
        pass: resolvedPass,
        fromName: fromName || currentCms.smtp?.fromName || 'Oscar Fan Vote',
        fromEmail: fromEmail || currentCms.smtp?.fromEmail || user || 'noreply@fanchoicevote.org',
      }, testRecipient);

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to connect to SMTP server.' });
      }

      return res.json({ success: true, message: `Test email successfully sent to ${testRecipient}! Message ID: ${result.messageId}` });
    } catch (err: any) {
      console.error('Error in test-smtp endpoint:', err);
      return res.status(500).json({ error: err.message || 'Internal server error while testing SMTP.' });
    }
  });

  // 19b. Admin Email Diagnostics - shows how the sender and credentials resolve
  // in the running environment, so misconfiguration is visible without guessing.
  app.get('/api/admin/email-diagnostics', requireAdminAuth, (req, res) => {
    const cms = db.getCms();
    const envKey = (process.env.RESEND_API_KEY || '').trim();
    const cmsPass = (cms.smtp?.pass || '').trim();
    const resolvedSender = buildSenderAddress(cms);
    const senderDomain = resolvedSender.split('@').pop()?.replace('>', '') || '';

    return res.json({
      resolvedSender,
      usingPlaceholderSender: resolvedSender.includes('onboarding@resend.dev'),
      senderDomain,
      resendApiKey: {
        fromEnv: envKey.startsWith('re_'),
        fromAdminPanel: cmsPass.startsWith('re_'),
        present: envKey.startsWith('re_') || cmsPass.startsWith('re_'),
      },
      envVars: {
        RESEND_API_KEY: envKey ? 'set' : 'missing',
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ? 'set' : 'missing',
        APP_SECRET: process.env.APP_SECRET ? 'set' : 'missing',
      },
      smtpFallback: {
        enabled: !!cms.smtp?.enabled,
        host: cms.smtp?.host || '(none)',
        port: cms.smtp?.port ?? null,
      },
      runtime: {
        serverless: !!process.env.VERCEL,
        // On Vercel the JSON store lives in a per-instance temp dir and is wiped
        // on cold start, so votes saved there are not durable.
        persistentStorage: !process.env.VERCEL,
      },
    });
  });

  // 20. Admin Export CSV
  app.get('/api/admin/export-csv', requireAdminAuth, (req, res) => {
    const votes = db.getAllVotes();
    const headers = ['Vote ID', 'Nominee Name', 'Category', 'Voter Name', 'Voter Email', 'Provider Label', 'Ticket ID', 'Timestamp', 'IP Address'];
    const rows = votes.map(v => [
      `"${v.id}"`,
      `"${v.nomineeName.replace(/"/g, '""')}"`,
      `"${v.category.replace(/"/g, '""')}"`,
      `"${v.fullName.replace(/"/g, '""')}"`,
      `"${v.email}"`,
      `"${v.provider}"`,
      `"${v.ticketId}"`,
      `"${v.createdAt}"`,
      `"${v.ipAddress || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="oscar_votes_export_${Date.now()}.csv"`);
    return res.send(csvContent);
  });

  // 19. Admin Change Password
  app.post('/api/admin/change-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    db.updateAdminPassword(newPassword);
    return res.json({ success: true, message: 'Admin password updated successfully.' });
  });

  return app;
}
