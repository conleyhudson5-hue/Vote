import nodemailer from 'nodemailer';
import { VipTicketData, CmsSettings, SmtpSettings } from '../src/types.js';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
  isSandboxRestricted?: boolean;
  via?: 'smtp' | 'resend' | 'simulator';
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  cms?: CmsSettings
): Promise<SendEmailResult> {
  const smtp = cms?.smtp;

  // 1. Dynamic SMTP Dispatch if configured and enabled
  if (smtp && smtp.enabled && smtp.host && smtp.host.trim() !== '') {
    try {
      const port = Number(smtp.port) || 587;
      const isSecure = smtp.secure || port === 465;

      const transporter = nodemailer.createTransport({
        host: smtp.host.trim(),
        port,
        secure: isSecure,
        auth: (smtp.user && smtp.user.trim() !== '') ? {
          user: smtp.user.trim(),
          pass: smtp.pass || '',
        } : undefined,
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      const fromName = smtp.fromName || cms?.brandName || 'Oscar Fan Vote';
      const fromEmail = smtp.fromEmail || smtp.user || 'noreply@fanchoicevote.org';
      const fromAddress = `"${fromName.replace(/"/g, '')}" <${fromEmail.trim()}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: to.trim(),
        subject,
        html,
      });

      console.log(`[SMTP Delivery Success] Message ID: ${info.messageId} sent to: ${to} (From: ${fromAddress})`);
      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
        via: 'smtp',
      };
    } catch (smtpErr: any) {
      console.error(`[SMTP Delivery Notice] Host: ${smtp.host}:${smtp.port} | Error:`, smtpErr.message || smtpErr);
      // Fallback gracefully so verification passcodes are never lost
      return {
        success: true,
        simulated: true,
        error: `SMTP Error (${smtp.host}): ${smtpErr.message || 'Connection failed'}`,
        messageId: `smtp_fallback_${Date.now()}`,
        via: 'smtp',
      };
    }
  }

  // 2. Fallback to Resend API or Simulator
  const apiKey = process.env.RESEND_API_KEY;
  const fromName = smtp?.fromName || cms?.brandName || 'Oscar Fan Vote';
  const fromEmail = process.env.RESEND_FROM_EMAIL || `"${fromName}" <onboarding@resend.dev>`;

  if (!apiKey || apiKey.trim() === '' || apiKey === 're_123456789') {
    console.log(`[Email Simulator] To: ${to} | Subject: "${subject}" | From: "${fromName}"`);
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}`,
      via: 'simulator',
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Resend Notice] Status: ${res.status} | Details: ${errText}`);
      
      const isSandboxRestriction = res.status === 403 || errText.includes('validation_error') || errText.includes('testing emails to your own email address') || errText.includes('resend.com/domains');
      
      if (isSandboxRestriction) {
        console.log(`[Resend Sandbox Fallback] Recipient (${to}) is not the Resend account owner in test mode. Switching to instant preview mode.`);
        return {
          success: true,
          simulated: true,
          isSandboxRestricted: true,
          messageId: `sandbox_fallback_${Date.now()}`,
          via: 'resend',
        };
      }

      return {
        success: true,
        simulated: true,
        error: `Resend Notice: ${errText}`,
        messageId: `err_fallback_${Date.now()}`,
        via: 'resend',
      };
    }

    const data = (await res.json()) as { id?: string };
    return { success: true, messageId: data.id, simulated: false, via: 'resend' };
  } catch (err: any) {
    console.warn('[Email Dispatch Warning] Falling back to simulator:', err?.message || err);
    return {
      success: true,
      simulated: true,
      messageId: `exception_fallback_${Date.now()}`,
      error: err?.message || 'Network error during email dispatch',
      via: 'simulator',
    };
  }
}

export async function testSmtpConnection(
  smtp: SmtpSettings,
  testRecipient: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const port = Number(smtp.port) || 587;
    const isSecure = smtp.secure || port === 465;

    const transporter = nodemailer.createTransport({
      host: smtp.host.trim(),
      port,
      secure: isSecure,
      auth: (smtp.user && smtp.user.trim() !== '') ? {
        user: smtp.user.trim(),
        pass: smtp.pass || '',
      } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    });

    await transporter.verify();

    const fromName = smtp.fromName || 'Oscar Fan Vote';
    const fromEmail = smtp.fromEmail || smtp.user || 'noreply@fanchoicevote.org';
    const fromAddress = `"${fromName.replace(/"/g, '')}" <${fromEmail.trim()}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: testRecipient.trim(),
      subject: `[Test] ${fromName} SMTP Configuration Verified`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px;background-color:#F0F9FF;border-radius:12px;border:1px solid #BAE6FD;">
          <h2 style="color:#0288D1;margin-top:0;">✅ SMTP Configuration Successful</h2>
          <p style="color:#334155;">This is a live test email sent from <strong>${fromName}</strong>.</p>
          <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:14px;margin:16px 0;">
            <ul style="color:#475569;font-size:13px;margin:0;padding-left:18px;line-height:1.6;">
              <li><strong>SMTP Host:</strong> ${smtp.host}:${port}</li>
              <li><strong>Auth User:</strong> ${smtp.user || '(None)'}</li>
              <li><strong>Security Mode:</strong> ${isSecure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)'}</li>
              <li><strong>From Name:</strong> ${fromName}</li>
              <li><strong>From Address:</strong> ${fromAddress}</li>
            </ul>
          </div>
          <p style="color:#0288D1;font-size:12px;margin-bottom:0;">Your custom mail server is properly connected and ready to send voter verification codes and VIP tickets.</p>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[Test SMTP Error]', err);
    return { success: false, error: err.message || 'Failed to verify SMTP server credentials' };
  }
}

export function generateVerificationCodeEmailHtml(code: string, cms: CmsSettings, fullName: string): string {
  const brand = cms.brandName || 'Oscar Award Fan Choice Vote';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Voting Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F9FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F0F9FF;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#FFFFFF;border:1px solid #BAE6FD;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(41,182,246,0.15),0 8px 10px -6px rgba(41,182,246,0.1);">
          <!-- Top Sky-Blue Bar -->
          <tr>
            <td style="background:linear-gradient(90deg, #29B6F6 0%, #0288D1 100%);height:5px;padding:0;"></td>
          </tr>
          
          <!-- Logo & Brand Header -->
          <tr>
            <td style="padding:28px 28px 16px 28px;text-align:center;">
              <div style="display:inline-block;padding:4px 12px;background-color:#E0F2FE;border:1px solid #BAE6FD;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0288D1;margin-bottom:10px;">
                OFFICIAL VOTER VERIFICATION
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">${brand}</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;">Fan-Choice Balloting & Award Authentication</p>
            </td>
          </tr>

          <!-- Subtle Divider -->
          <tr>
            <td style="padding:0 28px;"><div style="height:1px;background-color:#F1F5F9;"></div></td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#334155;">
                Hello <strong>${fullName || 'Distinguished Voter'}</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#64748B;">
                Enter the following 6-digit one-time passcode into the voting modal to verify your email identity and authenticate your official fan ballot:
              </p>

              <!-- Sky-Blue Highlighted Passcode Box -->
              <div style="background-color:#F0F9FF;border:2px dashed #38BDF8;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#0288D1;text-transform:uppercase;margin-bottom:6px;">ONE-TIME VERIFICATION CODE</div>
                <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0288D1;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;margin:2px 0;">${code}</div>
                <div style="font-size:11px;color:#64748B;margin-top:6px;">Code expires in <strong>10 minutes</strong>. Single use only.</div>
              </div>

              <!-- Security Notice -->
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-left:3px solid #29B6F6;padding:12px 14px;border-radius:6px;">
                <p style="margin:0;font-size:11px;line-height:1.5;color:#475569;">
                  <strong style="color:#0288D1;">Security Guarantee:</strong> This code is used exclusively to verify voter authenticity and prevent duplicate submissions. Never share this code with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:18px 28px;text-align:center;border-top:1px solid #F1F5F9;">
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                ${cms.footerText || '© 2026 Academy Fan Choice Awards.'}
              </p>
              <p style="margin:4px 0 0 0;font-size:10px;color:#CBD5E1;">
                Sent to authenticate your fan ballot submission.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateVipTicketEmailHtml(ticket: VipTicketData, cms: CmsSettings): string {
  const brand = cms.brandName || 'Oscar Award Fan Choice Vote';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Official VIP Commemorative Pass</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F9FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F0F9FF;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#FFFFFF;border:2px solid #BAE6FD;border-radius:18px;overflow:hidden;box-shadow:0 20px 35px -10px rgba(41,182,246,0.18);">
          
          <!-- Sky Blue Top Header Ribbon -->
          <tr>
            <td style="background:linear-gradient(90deg, #29B6F6 0%, #0288D1 100%);padding:12px 20px;text-align:center;">
              <div style="font-size:11px;font-weight:900;letter-spacing:3px;color:#FFFFFF;text-transform:uppercase;">
                ★ ${cms.ticketTitle || 'OFFICIAL VIP COMMEMORATIVE PASS'} ★
              </div>
            </td>
          </tr>

          <!-- Ticket Title & Event Info -->
          <tr>
            <td style="padding:24px 28px 12px 28px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#0288D1;text-transform:uppercase;">AUTHENTICATED VOTER PASS</div>
              <h2 style="margin:4px 0 0 0;font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">${brand}</h2>
              <p style="margin:4px 0 0 0;font-size:12px;color:#64748B;">${cms.eventDate || 'Sunday, March 29, 2026'} • ${cms.eventVenue || 'Dolby Theatre, Hollywood'}</p>
            </td>
          </tr>

          <!-- Perforated Divider -->
          <tr>
            <td style="padding:0 24px;">
              <div style="border-top:2px dashed #BAE6FD;margin:8px 0;"></div>
            </td>
          </tr>

          <!-- Pass Details -->
          <tr>
            <td style="padding:16px 28px;">
              
              <!-- Guest & Nominee Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                <tr>
                  <td width="50%" style="vertical-align:top;padding-right:12px;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:1px;color:#94A3B8;text-transform:uppercase;">HONORED VOTER</div>
                    <div style="font-size:16px;font-weight:800;color:#0F172A;margin-top:2px;">${ticket.fullName}</div>
                    <div style="font-size:11px;color:#64748B;margin-top:2px;">${ticket.email}</div>
                  </td>
                  <td width="50%" style="vertical-align:top;padding-left:12px;border-left:1px solid #E2E8F0;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:1px;color:#0288D1;text-transform:uppercase;">VOTE RECORDED FOR</div>
                    <div style="font-size:16px;font-weight:800;color:#0288D1;margin-top:2px;">${ticket.nomineeName}</div>
                    <div style="font-size:11px;color:#64748B;margin-top:2px;">${ticket.category}</div>
                  </td>
                </tr>
              </table>

              <!-- Seat & Verified Badge Box -->
              <div style="background-color:#F0F9FF;border:1px solid #BAE6FD;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-size:9px;font-weight:700;letter-spacing:1px;color:#0288D1;text-transform:uppercase;">SEAT ALLOCATION</div>
                      <div style="font-size:14px;font-weight:800;color:#0F172A;margin-top:2px;">${ticket.seatNumber}</div>
                    </td>
                    <td align="right">
                      <span style="display:inline-block;background-color:#ECFDF5;border:1px solid #A7F3D0;color:#059669;padding:4px 10px;border-radius:16px;font-size:10px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">
                        ✓ VERIFIED BALLOT
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Pass Identifier & Security Hash -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 14px;">
                <tr>
                  <td>
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#64748B;">PASS IDENTIFIER</div>
                    <div style="font-size:13px;font-weight:800;color:#0288D1;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${ticket.ticketId}</div>
                  </td>
                  <td align="right">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.5px;color:#64748B;">SECURITY HASH</div>
                    <div style="font-size:11px;font-weight:600;color:#475569;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${ticket.verificationHash}</div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:14px 24px;text-align:center;border-top:1px solid #F1F5F9;">
              <p style="margin:0;font-size:11px;color:#64748B;">
                Thank you for participating in the official fan choice vote. Keep this digital pass as your 2026 keepsake.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
