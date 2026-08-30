import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Lock,
  X,
  LayoutDashboard,
  Users,
  Settings,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Save,
  Download,
  Search,
  Key,
  Flame,
  Award,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Mail,
  Server,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Nominee, CmsSettings, AdminStats, VoteRecord, SmtpSettings } from '../types.js';
import { api } from '../services/api.js';
import { ImageUploadInput } from './ImageUploadInput.js';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cms: CmsSettings;
  onCmsUpdated: (cms: CmsSettings) => void;
  onNomineesUpdated: (nominees: Nominee[]) => void;
}

const SKY_PALETTE = ['#29B6F6', '#0288D1', '#03A9F4', '#4FC3F7', '#81D4FA', '#0277BD', '#01579B', '#B3E5FC'];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  cms,
  onCmsUpdated,
  onNomineesUpdated,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'nominees' | 'cms' | 'smtp' | 'voters' | 'security'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [nomineesList, setNomineesList] = useState<Nominee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Nominee Edit/Create State
  const [editingNominee, setEditingNominee] = useState<Partial<Nominee> | null>(null);
  const [isNomineeModalOpen, setIsNomineeModalOpen] = useState(false);

  // CMS Form State
  const [cmsForm, setCmsForm] = useState<CmsSettings>({
    ...cms,
    smtp: cms.smtp || {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromName: 'Oscar Fan Vote',
      fromEmail: 'onboarding@resend.dev',
    },
  });
  const [cmsSaveMessage, setCmsSaveMessage] = useState<string | null>(null);

  // SMTP Settings State
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState('veo198262@gmail.com');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [smtpSaveMessage, setSmtpSaveMessage] = useState<string | null>(null);

  // Voter Logs State
  const [voterSearch, setVoterSearch] = useState('');

  // Visualization & Chart View State
  const [chartView, setChartView] = useState<'bar' | 'pie' | 'both'>('both');
  const [chartCategory, setChartCategory] = useState<string>('all');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<string | null>(null);

  // Check auth on open
  useEffect(() => {
    if (isOpen) {
      api.checkAdminAuth().then((authed) => {
        setIsAuthenticated(authed);
        if (authed) {
          loadAdminData();
        }
      });
      setCmsForm({
        ...cms,
        smtp: cms.smtp || {
          enabled: false,
          host: '',
          port: 587,
          secure: false,
          user: '',
          pass: '',
          fromName: 'Oscar Fan Vote',
          fromEmail: 'onboarding@resend.dev',
        },
      });
    }
  }, [isOpen, cms]);

  const loadAdminData = async () => {
    setIsLoadingData(true);
    try {
      const [statsRes, nomRes, cmsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAllNomineesAdmin(),
        api.getAdminCms(),
      ]);
      setStats(statsRes.stats);
      setNomineesList(nomRes.nominees);
      if (cmsRes.cms) {
        setCmsForm(cmsRes.cms);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await api.adminLogin(passwordInput);
      setIsAuthenticated(true);
      setPasswordInput('');
      loadAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Incorrect admin password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.adminLogout();
    setIsAuthenticated(false);
    onClose();
  };

  // Nominee CRUD
  const handleSaveNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNominee || !editingNominee.name) return;

    try {
      await api.saveNominee(editingNominee);
      setIsNomineeModalOpen(false);
      setEditingNominee(null);
      const res = await api.getAllNomineesAdmin();
      setNomineesList(res.nominees);
      onNomineesUpdated(res.nominees);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to save nominee');
    }
  };

  const handleDeleteNominee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this nominee?')) return;
    try {
      await api.deleteNominee(id);
      const res = await api.getAllNomineesAdmin();
      setNomineesList(res.nominees);
      onNomineesUpdated(res.nominees);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete nominee');
    }
  };

  const handleAdjustVotes = async (id: string, delta?: number, exact?: number) => {
    try {
      await api.adjustVotes(id, { delta, exact });
      const res = await api.getAllNomineesAdmin();
      setNomineesList(res.nominees);
      onNomineesUpdated(res.nominees);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust vote count');
    }
  };

  // CMS Save
  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateCms(cmsForm);
      onCmsUpdated(res.cms);
      setCmsSaveMessage('✨ Content & theme updated instantly on the public app!');
      setTimeout(() => setCmsSaveMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update CMS settings');
    }
  };

  // SMTP Presets & Operations
  const applySmtpPreset = (presetKey: string) => {
    const currentSmtp: SmtpSettings = cmsForm.smtp || {
      enabled: true,
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromName: 'Oscar Fan Vote',
      fromEmail: 'noreply@fanchoicevote.org',
    };

    if (presetKey === 'gmail') {
      setCmsForm({
        ...cmsForm,
        smtp: {
          ...currentSmtp,
          enabled: true,
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          fromName: currentSmtp.fromName || 'Oscar Fan Vote',
        },
      });
    } else if (presetKey === 'mailgun') {
      setCmsForm({
        ...cmsForm,
        smtp: {
          ...currentSmtp,
          enabled: true,
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          fromName: currentSmtp.fromName || 'Oscar Fan Vote',
        },
      });
    } else if (presetKey === 'sendgrid') {
      setCmsForm({
        ...cmsForm,
        smtp: {
          ...currentSmtp,
          enabled: true,
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          user: 'apikey',
          fromName: currentSmtp.fromName || 'Oscar Fan Vote',
        },
      });
    } else if (presetKey === 'brevo') {
      setCmsForm({
        ...cmsForm,
        smtp: {
          ...currentSmtp,
          enabled: true,
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          fromName: currentSmtp.fromName || 'Oscar Fan Vote',
        },
      });
    }
  };

  const handleTestSmtp = async () => {
    if (!cmsForm.smtp?.host) {
      setSmtpTestResult({ success: false, message: 'Please enter an SMTP Server Host before testing.' });
      return;
    }
    if (!testRecipientEmail || !testRecipientEmail.includes('@')) {
      setSmtpTestResult({ success: false, message: 'Please specify a valid test recipient email address.' });
      return;
    }

    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtp({
        host: cmsForm.smtp.host,
        port: Number(cmsForm.smtp.port) || 587,
        secure: !!cmsForm.smtp.secure,
        user: cmsForm.smtp.user || '',
        pass: cmsForm.smtp.pass || '',
        fromName: cmsForm.smtp.fromName || 'Oscar Fan Vote',
        fromEmail: cmsForm.smtp.fromEmail || cmsForm.smtp.user || 'noreply@fanchoicevote.org',
        testRecipient: testRecipientEmail,
      });
      setSmtpTestResult({ success: true, message: res.message });
    } catch (err: any) {
      setSmtpTestResult({ success: false, message: err.message || 'SMTP Connection failed' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateCms(cmsForm);
      onCmsUpdated(res.cms);
      setSmtpSaveMessage('✨ SMTP credentials and email delivery configuration saved securely!');
      setTimeout(() => setSmtpSaveMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save SMTP settings');
    }
  };

  // Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordChangeMsg('Password must be at least 6 characters');
      return;
    }
    try {
      await api.changeAdminPassword(newPassword);
      setPasswordChangeMsg('✅ Admin password updated successfully!');
      setNewPassword('');
      setTimeout(() => setPasswordChangeMsg(null), 4000);
    } catch (err: any) {
      setPasswordChangeMsg(`Error: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="admin-panel-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6"
    >
      <motion.div
        id="admin-panel-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Top Sky Blue Trim */}
        <div className="h-1 w-full bg-[#29B6F6]" />

        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-[#29B6F6] border border-sky-100 shadow-xs">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Award Administration & CMS Portal
              </h2>
              <p className="text-xs text-slate-500">
                Configure nominees, live CMS branding, and monitor verified balloting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                id="admin-logout-button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              id="close-admin-panel-button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Auth Gate if not logged in */}
        {!isAuthenticated ? (
          <div className="flex flex-1 items-center justify-center p-6 bg-slate-50/50">
            <form
              onSubmit={handleLogin}
              className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-[#29B6F6] border border-sky-100">
                  <Key className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">Admin Login</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the administrator passcode to access management controls.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Admin Password
                  </label>
                  <input
                    id="admin-password-input"
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Default: oscar2026admin"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Tip: Default configured password is <code className="text-sky-700 font-semibold">oscar2026admin</code>
                  </p>
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  id="admin-submit-login-button"
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-xl bg-[#29B6F6] py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0288D1] active:scale-98 disabled:opacity-50"
                >
                  {isLoggingIn ? 'Authenticating...' : 'Enter Admin Portal'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Dashboard */
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            
            {/* Sidebar Navigation */}
            <div className="w-full border-b border-slate-100 bg-slate-50/70 p-3 md:w-60 md:border-r md:border-b-0 md:p-4">
              <nav className="flex flex-row gap-1.5 md:flex-col">
                <button
                  id="admin-tab-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all md:flex-none ${
                    activeTab === 'dashboard'
                      ? 'border border-sky-200 bg-sky-50 text-sky-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 text-[#29B6F6]" />
                  <span>Overview & Charts</span>
                </button>

                <button
                  id="admin-tab-nominees"
                  onClick={() => setActiveTab('nominees')}
                  className={`flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all md:flex-none ${
                    activeTab === 'nominees'
                      ? 'border border-sky-200 bg-sky-50 text-sky-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Award className="h-4 w-4 text-[#29B6F6]" />
                  <span>Nominee Manager</span>
                </button>

                <button
                  id="admin-tab-cms"
                  onClick={() => setActiveTab('cms')}
                  className={`flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all md:flex-none ${
                    activeTab === 'cms'
                      ? 'border border-sky-200 bg-sky-50 text-sky-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Settings className="h-4 w-4 text-[#29B6F6]" />
                  <span>CMS Branding & Text</span>
                </button>

                <button
                  id="admin-tab-smtp"
                  onClick={() => setActiveTab('smtp')}
                  className={`flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all md:flex-none ${
                    activeTab === 'smtp'
                      ? 'border border-sky-200 bg-sky-50 text-sky-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Mail className="h-4 w-4 text-[#29B6F6]" />
                  <span>SMTP & Email Service</span>
                </button>

                <button
                  id="admin-tab-voters"
                  onClick={() => setActiveTab('voters')}
                  className={`flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all md:flex-none ${
                    activeTab === 'voters'
                      ? 'border border-sky-200 bg-sky-50 text-sky-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#29B6F6]" />
                  <span>Voters & CSV</span>
                </button>

                <button
                  id="admin-tab-security"
                  onClick={() => setActiveTab('security')}
                  className={`flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all md:flex-none ${
                    activeTab === 'security'
                      ? 'border border-sky-200 bg-sky-50 text-sky-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Key className="h-4 w-4 text-[#29B6F6]" />
                  <span>Security</span>
                </button>
              </nav>
            </div>

            {/* Main Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
              
              {/* TAB 1: DASHBOARD & CHARTS */}
              {activeTab === 'dashboard' && stats && (
                <div className="space-y-6">
                  
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <span className="text-xs text-slate-500 font-medium">Total Verified Votes</span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-slate-900">
                        {stats.totalVotes.toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <span className="text-xs text-slate-500 font-medium">Unique Voters</span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-[#0288D1]">
                        {stats.uniqueVoters.toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <span className="text-xs text-slate-500 font-medium">Conversion Rate</span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-600">
                        {stats.conversionRate}%
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <span className="text-xs text-slate-500 font-medium">Active Nominees</span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-[#29B6F6]">
                        {stats.totalNominees}
                      </div>
                    </div>
                  </div>

                  {/* Recharts Analytics: Vote Distribution across Nominees */}
                  {(() => {
                    // Extract unique categories for filtering
                    const availableCategories = Array.from(
                      new Set(stats.votesByNominee.map((item) => item.category).filter(Boolean))
                    );

                    // Filter nominees based on selected category
                    const filteredNominees = stats.votesByNominee.filter(
                      (item) => chartCategory === 'all' || item.category === chartCategory
                    );

                    // Calculate total votes in current filtered view
                    const filteredTotalVotes = filteredNominees.reduce((acc, curr) => acc + curr.votes, 0);

                    // Pie chart data formatted
                    const pieData = filteredNominees.map((item) => ({
                      name: item.name,
                      value: item.votes,
                      category: item.category,
                      percent: filteredTotalVotes > 0 ? ((item.votes / filteredTotalVotes) * 100).toFixed(1) : '0',
                    }));

                    return (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        {/* Chart Header & Controls */}
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">
                                Nominee Vote Distribution
                              </h3>
                              <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-[#0288D1] border border-sky-200">
                                Live Data
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              Real-time distribution of verified ballots across official award nominees
                            </p>
                          </div>

                          {/* Chart Controls: Filter & View Switcher */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Category Filter */}
                            {availableCategories.length > 1 && (
                              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs">
                                <Filter className="h-3.5 w-3.5 text-slate-400" />
                                <select
                                  value={chartCategory}
                                  onChange={(e) => setChartCategory(e.target.value)}
                                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                                >
                                  <option value="all">All Categories ({stats.votesByNominee.length})</option>
                                  {availableCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* View Switcher: Bar / Donut / Both */}
                            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs">
                              <button
                                type="button"
                                onClick={() => setChartView('bar')}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                  chartView === 'bar'
                                    ? 'bg-white text-[#0288D1] shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <BarChart3 className="h-3.5 w-3.5" />
                                <span>Bar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setChartView('pie')}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                  chartView === 'pie'
                                    ? 'bg-white text-[#0288D1] shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <PieChartIcon className="h-3.5 w-3.5" />
                                <span>Share</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setChartView('both')}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                  chartView === 'both'
                                    ? 'bg-white text-[#0288D1] shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <span>All</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Charts Area */}
                        <div className={`mt-4 grid gap-6 ${chartView === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                          {/* 1. Bar Chart Visualization */}
                          {(chartView === 'bar' || chartView === 'both') && (
                            <div className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Vote Count by Nominee
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {filteredNominees.length} Nominees
                                </span>
                              </div>
                              <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={filteredNominees} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                    <XAxis
                                      dataKey="name"
                                      stroke="#94A3B8"
                                      fontSize={11}
                                      tickLine={false}
                                      interval={0}
                                      angle={-25}
                                      textAnchor="end"
                                      height={50}
                                    />
                                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          const percent = filteredTotalVotes > 0 ? ((data.votes / filteredTotalVotes) * 100).toFixed(1) : '0';
                                          return (
                                            <div className="rounded-xl border border-sky-200 bg-white p-3 shadow-md">
                                              <div className="font-bold text-slate-900 text-xs">{data.name}</div>
                                              <div className="text-[11px] text-slate-500">{data.category}</div>
                                              <div className="mt-1.5 flex items-center gap-2">
                                                <span className="font-mono text-sm font-extrabold text-[#0288D1]">
                                                  {data.votes.toLocaleString()} votes
                                                </span>
                                                <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-[#0288D1]">
                                                  {percent}%
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar
                                      dataKey="votes"
                                      fill="#29B6F6"
                                      radius={[6, 6, 0, 0]}
                                      animationDuration={800}
                                    >
                                      {filteredNominees.map((_, index) => (
                                        <Cell
                                          key={`bar-cell-${index}`}
                                          fill={SKY_PALETTE[index % SKY_PALETTE.length]}
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* 2. Donut / Pie Share Visualization */}
                          {(chartView === 'pie' || chartView === 'both') && (
                            <div className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Ballot Share Distribution (%)
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {filteredTotalVotes.toLocaleString()} Total
                                </span>
                              </div>
                              <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={50}
                                      outerRadius={80}
                                      paddingAngle={3}
                                      dataKey="value"
                                      animationDuration={800}
                                    >
                                      {pieData.map((_, index) => (
                                        <Cell
                                          key={`pie-cell-${index}`}
                                          fill={SKY_PALETTE[index % SKY_PALETTE.length]}
                                        />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="rounded-xl border border-sky-200 bg-white p-3 shadow-md">
                                              <div className="font-bold text-slate-900 text-xs">{data.name}</div>
                                              <div className="text-[11px] text-slate-500">{data.category}</div>
                                              <div className="mt-1 flex items-center justify-between gap-3">
                                                <span className="font-mono text-xs text-slate-700 font-semibold">
                                                  {data.value.toLocaleString()} votes
                                                </span>
                                                <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-[#0288D1]">
                                                  {data.percent}%
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Legend
                                      verticalAlign="bottom"
                                      height={36}
                                      formatter={(value) => (
                                        <span className="text-[10px] font-medium text-slate-600 truncate max-w-[90px] inline-block align-middle">
                                          {value}
                                        </span>
                                      )}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Top Nominees Progress Breakdown */}
                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                            Nominee Leaderboard Breakdown
                          </h4>
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredNominees.slice(0, 6).map((item, idx) => {
                              const share = filteredTotalVotes > 0 ? ((item.votes / filteredTotalVotes) * 100).toFixed(1) : '0';
                              const color = SKY_PALETTE[idx % SKY_PALETTE.length];
                              return (
                                <div
                                  key={item.name}
                                  className="rounded-xl border border-slate-200 bg-white p-3 hover:border-sky-300 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="font-bold text-xs text-slate-900 truncate">
                                        {item.name}
                                      </span>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
                                      {item.votes.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                    <span className="truncate">{item.category}</span>
                                    <span className="font-semibold text-[#0288D1]">{share}%</span>
                                  </div>
                                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${Math.min(100, Math.max(2, parseFloat(share)))}%`,
                                        backgroundColor: color,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Recent Activity Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900">Recent Verified Ballots</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400">
                            <th className="pb-2">Voter</th>
                            <th className="pb-2">Nominee</th>
                            <th className="pb-2">Pass ID</th>
                            <th className="pb-2">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stats.recentVotes.slice(0, 8).map((v) => (
                            <tr key={v.id} className="text-slate-600">
                              <td className="py-2.5 font-medium text-slate-900">{v.fullName}</td>
                              <td className="py-2.5 text-[#0288D1] font-semibold">{v.nomineeName}</td>
                              <td className="py-2.5 font-mono text-slate-500">{v.ticketId}</td>
                              <td className="py-2.5 text-slate-400">
                                {new Date(v.createdAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: NOMINEE MANAGER */}
              {activeTab === 'nominees' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Nominee Management</h3>
                      <p className="text-xs text-slate-500">Add, edit artist details, adjust or reset live vote counts</p>
                    </div>
                    <button
                      id="admin-add-nominee-btn"
                      onClick={() => {
                        setEditingNominee({
                          name: '',
                          category: 'Best Actor in a Leading Role',
                          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
                          bio: '',
                          votes: 0,
                          active: true,
                          order: nomineesList.length + 1,
                        });
                        setIsNomineeModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[#29B6F6] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0288D1]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Nominee</span>
                    </button>
                  </div>

                  {/* Nominees Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                          <th className="p-3">Artist</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Live Votes</th>
                          <th className="p-3">Vote Controls</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {nomineesList.map((nom) => (
                          <tr key={nom.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={nom.photoUrl}
                                  alt={nom.name}
                                  className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                                />
                                <div>
                                  <div className="font-bold text-slate-900">{nom.name}</div>
                                  <div className="text-[10px] text-slate-400">ID: {nom.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sky-800 font-medium">{nom.category}</td>
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {nom.votes.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleAdjustVotes(nom.id, 10)}
                                  className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-1 text-[10px] font-semibold text-sky-800 hover:bg-sky-100"
                                >
                                  +10
                                </button>
                                <button
                                  onClick={() => handleAdjustVotes(nom.id, 100)}
                                  className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-1 text-[10px] font-semibold text-sky-800 hover:bg-sky-100"
                                >
                                  +100
                                </button>
                                <button
                                  onClick={() => handleAdjustVotes(nom.id, undefined, 0)}
                                  className="rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                                >
                                  Reset
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingNominee(nom);
                                    setIsNomineeModalOpen(true);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteNominee(nom.id)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* TAB 3: CMS BRANDING & TEXT EDITOR */}
              {activeTab === 'cms' && (
                <form onSubmit={handleSaveCms} className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Content Management System (CMS)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Edit all front-end titles, branding, and ticket templates in real-time.
                      </p>
                    </div>
                    <button
                      id="save-cms-changes-button"
                      type="submit"
                      className="flex items-center gap-1.5 rounded-xl bg-[#29B6F6] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0288D1]"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save All Changes</span>
                    </button>
                  </div>

                  {cmsSaveMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{cmsSaveMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    
                    {/* Brand Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Brand Name / Event Title
                      </label>
                      <input
                        type="text"
                        value={cmsForm.brandName}
                        onChange={(e) => setCmsForm({ ...cmsForm, brandName: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                      <span className="text-[10px] text-slate-400">e.g. Oscar Award Vote or Best Artists of the Year</span>
                    </div>

                    {/* Brand Subtitle */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Brand Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={cmsForm.brandSubtitle}
                        onChange={(e) => setCmsForm({ ...cmsForm, brandSubtitle: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    {/* Voting Badge & Button Text */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Voting Status Badge Text
                      </label>
                      <input
                        type="text"
                        value={cmsForm.votingBadgeText}
                        onChange={(e) => setCmsForm({ ...cmsForm, votingBadgeText: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Vote Button Label
                      </label>
                      <input
                        type="text"
                        value={cmsForm.voteButtonText}
                        onChange={(e) => setCmsForm({ ...cmsForm, voteButtonText: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    {/* Event Date & Venue */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Ceremony Event Date
                      </label>
                      <input
                        type="text"
                        value={cmsForm.eventDate}
                        onChange={(e) => setCmsForm({ ...cmsForm, eventDate: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Ceremony Venue
                      </label>
                      <input
                        type="text"
                        value={cmsForm.eventVenue}
                        onChange={(e) => setCmsForm({ ...cmsForm, eventVenue: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    {/* Ticket Title & Template */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        VIP Ticket Header Title
                      </label>
                      <input
                        type="text"
                        value={cmsForm.ticketTitle}
                        onChange={(e) => setCmsForm({ ...cmsForm, ticketTitle: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    {/* Footer Text */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Footer Notice
                      </label>
                      <input
                        type="text"
                        value={cmsForm.footerText}
                        onChange={(e) => setCmsForm({ ...cmsForm, footerText: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                  </div>
                </form>
              )}

              {/* TAB: SMTP & EMAIL SERVICE */}
              {activeTab === 'smtp' && (
                <div className="space-y-6">
                  {/* Top Bar with Title & Save */}
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-[#29B6F6]" />
                        <span>SMTP Credentials & Email Service</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Configure dynamic outbound SMTP credentials to send verification codes and VIP tickets.
                      </p>
                    </div>

                    <button
                      id="save-smtp-settings-btn"
                      onClick={handleSaveSmtp}
                      className="flex items-center gap-2 rounded-xl bg-[#29B6F6] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0288D1] active:scale-98 transition-all"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save SMTP Settings</span>
                    </button>
                  </div>

                  {/* Save feedback banner */}
                  {smtpSaveMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 animate-fadeIn">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{smtpSaveMessage}</span>
                    </div>
                  )}

                  {/* Quick Preset Buttons */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold text-slate-700">Quick Provider Presets</span>
                      <span className="text-[11px] text-slate-400">Click to autofill recommended server host & port</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => applySmtpPreset('gmail')}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-semibold text-slate-800 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
                      >
                        <div className="font-bold text-slate-900">Gmail SMTP</div>
                        <div className="text-[10px] text-slate-500 font-mono">smtp.gmail.com:587</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applySmtpPreset('brevo')}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-semibold text-slate-800 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
                      >
                        <div className="font-bold text-slate-900">Brevo (Sendinblue)</div>
                        <div className="text-[10px] text-slate-500 font-mono">smtp-relay.brevo.com:587</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applySmtpPreset('sendgrid')}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-semibold text-slate-800 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
                      >
                        <div className="font-bold text-slate-900">SendGrid</div>
                        <div className="text-[10px] text-slate-500 font-mono">smtp.sendgrid.net:587</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applySmtpPreset('mailgun')}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-semibold text-slate-800 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
                      >
                        <div className="font-bold text-slate-900">Mailgun</div>
                        <div className="text-[10px] text-slate-500 font-mono">smtp.mailgun.org:587</div>
                      </button>
                    </div>
                  </div>

                  {/* Main Form Fields */}
                  <form onSubmit={handleSaveSmtp} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    
                    {/* Enable SMTP Switch */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[#0288D1]">
                          <Server className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Enable Custom Dynamic SMTP Delivery</div>
                          <div className="text-[11px] text-slate-500">
                            When enabled, the application dispatches all verification codes and VIP tickets through your configured SMTP server.
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          id="smtp-enabled-toggle"
                          type="checkbox"
                          checked={cmsForm.smtp?.enabled || false}
                          onChange={(e) =>
                            setCmsForm({
                              ...cmsForm,
                              smtp: {
                                ...(cmsForm.smtp || {
                                  enabled: false,
                                  host: '',
                                  port: 587,
                                  secure: false,
                                  user: '',
                                  pass: '',
                                  fromName: 'Oscar Fan Vote',
                                  fromEmail: 'noreply@fanchoicevote.org',
                                }),
                                enabled: e.target.checked,
                              },
                            })
                          }
                          className="peer sr-only"
                        />
                        <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#29B6F6] peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      
                      {/* Host */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          SMTP Host <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="smtp-host-input"
                          type="text"
                          required
                          value={cmsForm.smtp?.host || ''}
                          onChange={(e) =>
                            setCmsForm({
                              ...cmsForm,
                              smtp: {
                                ...(cmsForm.smtp || {
                                  enabled: true,
                                  host: '',
                                  port: 587,
                                  secure: false,
                                  user: '',
                                  pass: '',
                                  fromName: 'Oscar Fan Vote',
                                  fromEmail: 'noreply@fanchoicevote.org',
                                }),
                                host: e.target.value,
                              },
                            })
                          }
                          placeholder="e.g. smtp.gmail.com, smtp.mailgun.org"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                      </div>

                      {/* Port & Secure */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Port <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="smtp-port-input"
                            type="number"
                            required
                            value={cmsForm.smtp?.port || 587}
                            onChange={(e) =>
                              setCmsForm({
                                ...cmsForm,
                                smtp: {
                                  ...(cmsForm.smtp || {
                                    enabled: true,
                                    host: '',
                                    port: 587,
                                    secure: false,
                                    user: '',
                                    pass: '',
                                    fromName: 'Oscar Fan Vote',
                                    fromEmail: 'noreply@fanchoicevote.org',
                                  }),
                                  port: Number(e.target.value) || 587,
                                },
                              })
                            }
                            placeholder="587"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Encryption
                          </label>
                          <select
                            id="smtp-secure-select"
                            value={cmsForm.smtp?.secure ? 'ssl' : 'tls'}
                            onChange={(e) =>
                              setCmsForm({
                                ...cmsForm,
                                smtp: {
                                  ...(cmsForm.smtp || {
                                    enabled: true,
                                    host: '',
                                    port: 587,
                                    secure: false,
                                    user: '',
                                    pass: '',
                                    fromName: 'Oscar Fan Vote',
                                    fromEmail: 'noreply@fanchoicevote.org',
                                  }),
                                  secure: e.target.value === 'ssl',
                                },
                              })
                            }
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                          >
                            <option value="tls">STARTTLS (587)</option>
                            <option value="ssl">SSL / TLS (465)</option>
                          </select>
                        </div>
                      </div>

                      {/* Username */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          SMTP Username / Email
                        </label>
                        <input
                          id="smtp-user-input"
                          type="text"
                          value={cmsForm.smtp?.user || ''}
                          onChange={(e) =>
                            setCmsForm({
                              ...cmsForm,
                              smtp: {
                                ...(cmsForm.smtp || {
                                  enabled: true,
                                  host: '',
                                  port: 587,
                                  secure: false,
                                  user: '',
                                  pass: '',
                                  fromName: 'Oscar Fan Vote',
                                  fromEmail: 'noreply@fanchoicevote.org',
                                }),
                                user: e.target.value,
                              },
                            })
                          }
                          placeholder="e.g. apikey or user@domain.com"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          SMTP Password / App Key
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            id="smtp-pass-input"
                            type={showSmtpPassword ? 'text' : 'password'}
                            value={cmsForm.smtp?.pass || ''}
                            onChange={(e) =>
                              setCmsForm({
                                ...cmsForm,
                                smtp: {
                                  ...(cmsForm.smtp || {
                                    enabled: true,
                                    host: '',
                                    port: 587,
                                    secure: false,
                                    user: '',
                                    pass: '',
                                    fromName: 'Oscar Fan Vote',
                                    fromEmail: 'noreply@fanchoicevote.org',
                                  }),
                                  pass: e.target.value,
                                },
                              })
                            }
                            placeholder="Enter password or app-specific key..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 pr-10 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">
                          For Gmail, use a 16-character <em>App Password</em> generated in Google Account settings.
                        </p>
                      </div>

                      {/* From Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Sender From Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="smtp-from-name-input"
                          type="text"
                          required
                          value={cmsForm.smtp?.fromName || 'Oscar Fan Vote'}
                          onChange={(e) =>
                            setCmsForm({
                              ...cmsForm,
                              smtp: {
                                ...(cmsForm.smtp || {
                                  enabled: true,
                                  host: '',
                                  port: 587,
                                  secure: false,
                                  user: '',
                                  pass: '',
                                  fromName: 'Oscar Fan Vote',
                                  fromEmail: 'noreply@fanchoicevote.org',
                                }),
                                fromName: e.target.value,
                              },
                            })
                          }
                          placeholder="e.g. Oscar Fan Vote"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                      </div>

                      {/* From Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Sender From Email Address
                        </label>
                        <input
                          id="smtp-from-email-input"
                          type="email"
                          value={cmsForm.smtp?.fromEmail || ''}
                          onChange={(e) =>
                            setCmsForm({
                              ...cmsForm,
                              smtp: {
                                ...(cmsForm.smtp || {
                                  enabled: true,
                                  host: '',
                                  port: 587,
                                  secure: false,
                                  user: '',
                                  pass: '',
                                  fromName: 'Oscar Fan Vote',
                                  fromEmail: 'noreply@fanchoicevote.org',
                                }),
                                fromEmail: e.target.value,
                              },
                            })
                          }
                          placeholder="e.g. vote@fanchoicevote.org or your username"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                      </div>

                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="flex items-center gap-2 rounded-xl bg-[#29B6F6] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0288D1] transition-all"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save SMTP Credentials</span>
                      </button>
                    </div>
                  </form>

                  {/* Live Connection & Dispatch Tester */}
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-[#0288D1]">
                        <Send className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Send Live Test Email</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 mb-3">
                      Verify your dynamic SMTP credentials and test end-to-end delivery right now.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id="smtp-test-recipient-input"
                        type="email"
                        value={testRecipientEmail}
                        onChange={(e) => setTestRecipientEmail(e.target.value)}
                        placeholder="Recipient test email (e.g. veo198262@gmail.com)"
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                      <button
                        id="smtp-send-test-btn"
                        type="button"
                        disabled={isTestingSmtp}
                        onClick={handleTestSmtp}
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 active:scale-98 disabled:opacity-50 transition-all"
                      >
                        {isTestingSmtp ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Testing Connection...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Live Test Email</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Test result status banner */}
                    {smtpTestResult && (
                      <div
                        className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                          smtpTestResult.success
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-red-200 bg-red-50 text-red-900'
                        }`}
                      >
                        {smtpTestResult.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <span className="font-medium">{smtpTestResult.message}</span>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 4: VOTERS & CSV EXPORT */}
              {activeTab === 'voters' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Verified Voter Records</h3>
                      <p className="text-xs text-slate-500">Audit log of verified ballots and issued VIP passes</p>
                    </div>

                    <a
                      id="export-voters-csv-btn"
                      href={api.exportCsvUrl()}
                      download
                      className="flex items-center gap-2 rounded-xl bg-[#29B6F6] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0288D1]"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Verified Votes (CSV)</span>
                    </a>
                  </div>

                  <div className="relative">
                    <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={voterSearch}
                      onChange={(e) => setVoterSearch(e.target.value)}
                      placeholder="Search voter by name, email, or nominee..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                          <th className="p-3">Voter Name</th>
                          <th className="p-3">Verified Email</th>
                          <th className="p-3">Provider</th>
                          <th className="p-3">Nominee Voted For</th>
                          <th className="p-3">VIP Ticket ID</th>
                          <th className="p-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(stats?.recentVotes || [])
                          .filter(
                            (v) =>
                              v.fullName.toLowerCase().includes(voterSearch.toLowerCase()) ||
                              v.email.toLowerCase().includes(voterSearch.toLowerCase()) ||
                              v.nomineeName.toLowerCase().includes(voterSearch.toLowerCase()) ||
                              v.ticketId.toLowerCase().includes(voterSearch.toLowerCase())
                          )
                          .map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-900">{v.fullName}</td>
                              <td className="p-3 text-slate-500">{v.email}</td>
                              <td className="p-3">
                                <span className="rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                                  {v.provider}
                                </span>
                              </td>
                              <td className="p-3 text-[#0288D1] font-semibold">{v.nomineeName}</td>
                              <td className="p-3 font-mono text-slate-600">{v.ticketId}</td>
                              <td className="p-3 text-slate-400">
                                {new Date(v.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* TAB 5: SECURITY */}
              {activeTab === 'security' && (
                <div className="max-w-md space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Admin Security</h3>
                    <p className="text-xs text-slate-500">Update your admin control panel access password</p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter at least 6 characters..."
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    {passwordChangeMsg && (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                        {passwordChangeMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="rounded-xl bg-[#29B6F6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0288D1]"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        )}

      </motion.div>

      {/* Nominee Add/Edit Sub-Modal */}
      {isNomineeModalOpen && editingNominee && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Sub-modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-[#0288D1] border border-sky-100">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {editingNominee.id ? 'Edit Nominee Details' : 'Add New Nominee'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Configure artist profile, category, and portrait image
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNomineeModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sub-modal Body */}
            <form onSubmit={handleSaveNominee} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Artist / Nominee Name *</label>
                <input
                  type="text"
                  required
                  value={editingNominee.name || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, name: e.target.value })}
                  placeholder="e.g. Cillian Murphy, Lily Gladstone"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Category *</label>
                <input
                  type="text"
                  required
                  value={editingNominee.category || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, category: e.target.value })}
                  placeholder="e.g. Best Actor in a Leading Role"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Device File Select & Image Upload Input */}
              <ImageUploadInput
                label="Nominee Portrait Image"
                value={editingNominee.photoUrl || ''}
                onChange={(newPhoto) => setEditingNominee({ ...editingNominee, photoUrl: newPhoto })}
                required={true}
                helpText="Select a photo from your computer or phone (JPG, PNG, WebP) or switch to link."
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700">Biography / Work Description</label>
                <textarea
                  rows={3}
                  value={editingNominee.bio || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, bio: e.target.value })}
                  placeholder="Short bio or film title..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Initial Vote Count</label>
                <input
                  type="number"
                  min="0"
                  value={editingNominee.votes || 0}
                  onChange={(e) => setEditingNominee({ ...editingNominee, votes: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNomineeModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#29B6F6] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0288D1] active:scale-98 transition-all"
                >
                  Save Nominee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
