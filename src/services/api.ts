import { Nominee, CmsSettings, VipTicketData, AdminStats } from '../types.js';

export interface RequestCodeResponse {
  success: boolean;
  sessionId: string;
  expiresAt: number;
  simulated?: boolean;
  previewCode?: string;
  message: string;
  error?: string;
  alreadyVoted?: boolean;
}

export interface ConfirmCodeResponse {
  success: boolean;
  ticket: VipTicketData;
  nominee: Nominee;
  message: string;
  error?: string;
}

export const api = {
  // Public Endpoints
  async getNominees(): Promise<{ nominees: Nominee[] }> {
    const res = await fetch('/api/nominees');
    if (!res.ok) throw new Error('Failed to load nominees');
    return res.json();
  },

  async getCms(): Promise<{ cms: CmsSettings }> {
    const res = await fetch('/api/cms');
    if (!res.ok) throw new Error('Failed to load site configuration');
    return res.json();
  },

  async requestCode(data: {
    email: string;
    fullName: string;
    nomineeId: string;
    provider: string;
  }): Promise<RequestCodeResponse> {
    const res = await fetch('/api/verify/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to request verification code');
    }
    return json;
  },

  async confirmCode(sessionId: string, code: string): Promise<ConfirmCodeResponse> {
    const res = await fetch('/api/verify/confirm-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, code }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to verify code');
    }
    return json;
  },

  async getTicket(ticketId: string): Promise<{ ticket: VipTicketData }> {
    const res = await fetch(`/api/ticket/${ticketId}`);
    if (!res.ok) throw new Error('Ticket not found');
    return res.json();
  },

  // Admin Endpoints
  async checkAdminAuth(): Promise<boolean> {
    try {
      const token = localStorage.getItem('oscar_admin_token');
      const res = await fetch('/api/admin/check-auth', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      return !!data.isAuthenticated;
    } catch {
      return false;
    }
  },

  async adminLogin(password: string): Promise<{ success: boolean; token: string }> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');
    if (data.token) {
      localStorage.setItem('oscar_admin_token', data.token);
    }
    return data;
  },

  async adminLogout(): Promise<void> {
    const token = localStorage.getItem('oscar_admin_token');
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    localStorage.removeItem('oscar_admin_token');
  },

  async getAdminStats(): Promise<{ stats: AdminStats }> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch('/api/admin/stats', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch admin analytics');
    return res.json();
  },

  async getAllNomineesAdmin(): Promise<{ nominees: Nominee[] }> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch('/api/admin/nominees', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch nominees');
    return res.json();
  },

  async saveNominee(nominee: Partial<Nominee>): Promise<{ nominee: Nominee }> {
    const token = localStorage.getItem('oscar_admin_token');
    const url = nominee.id ? `/api/admin/nominees/${nominee.id}` : '/api/admin/nominees';
    const method = nominee.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(nominee),
    });
    if (!res.ok) throw new Error('Failed to save nominee');
    return res.json();
  },

  async deleteNominee(id: string): Promise<void> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch(`/api/admin/nominees/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to delete nominee');
  },

  async adjustVotes(id: string, payload: { delta?: number; exact?: number }): Promise<void> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch(`/api/admin/nominees/${id}/adjust-votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to adjust vote count');
  },

  async getAdminCms(): Promise<{ cms: CmsSettings }> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch('/api/admin/cms', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to load admin CMS settings');
    return res.json();
  },

  async updateCms(cms: Partial<CmsSettings>): Promise<{ cms: CmsSettings }> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch('/api/admin/cms', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(cms),
    });
    if (!res.ok) throw new Error('Failed to update CMS');
    return res.json();
  },

  async testSmtp(payload: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
    testRecipient: string;
  }): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch('/api/admin/test-smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'SMTP test failed');
    return data;
  },

  async changeAdminPassword(newPassword: string): Promise<void> {
    const token = localStorage.getItem('oscar_admin_token');
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) throw new Error('Failed to update admin password');
  },

  exportCsvUrl(): string {
    return '/api/admin/export-csv';
  },

  // Real-time SSE subscription
  subscribeToLiveUpdates(handlers: {
    onVoteUpdate?: (data: { nomineeId: string; nomineeName: string; newVoteCount: number; totalVotes: number }) => void;
    onNomineesUpdated?: (data: { nominees: Nominee[] }) => void;
    onCmsUpdated?: (data: { cms: CmsSettings }) => void;
  }): () => void {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('vote_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onVoteUpdate?.(data);
      } catch (err) {
        console.error('SSE vote_update error:', err);
      }
    });

    eventSource.addEventListener('nominees_updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onNomineesUpdated?.(data);
      } catch (err) {
        console.error('SSE nominees_updated error:', err);
      }
    });

    eventSource.addEventListener('cms_updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onCmsUpdated?.(data);
      } catch (err) {
        console.error('SSE cms_updated error:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  },
};
