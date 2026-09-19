// API Client for VoteWeb Backend
// Backend: Railway (vote-main-production.up.railway.app)
// Uses session cookies + CSRF tokens for authentication

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

class ApiClient {
  private csrfToken: string | null = null;

  async getCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;

    try {
      const res = await fetch(`${API_BASE}/auth/csrf`, {
        credentials: 'include'
      });
      const data = await res.json();
      this.csrfToken = (data.data?.csrfToken as string) || '';
      // Also set cookie client-side so backend can validate X-CSRF-Token header
      // (the proxy may not forward Set-Cookie from the backend).
      if (this.csrfToken && typeof document !== 'undefined') {
        document.cookie = `cv_csrf=${encodeURIComponent(this.csrfToken)}; path=/; SameSite=Lax; max-age=3600`;
      }
      return this.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      return '';
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add CSRF token for state-changing requests
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
      const csrf = await this.getCsrfToken();
      if (csrf) {
        headers['X-CSRF-Token'] = csrf;
      }

      // Session binding token (required by the backend for authenticated
      // writes when a session cookie is present). Loaded lazily so we never
      // import this module on the server.
      if (typeof window !== "undefined") {
        const token = window.sessionStorage.getItem("campusvote_binding_token");
        if (token) {
          headers['X-Session-Binding'] = token;
        }
      }
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(data.message || data.error?.message || data.error || `HTTP ${res.status}`, res.status);
    }

    return data.data || data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth
  async login(identifier: string, password: string, role: string) {
    return this.post('/auth/login', { userIdentifier: identifier, password, role });
  }

  async getMe() {
    return this.get('/auth/me');
  }

  async logout() {
    return this.post('/auth/logout', {});
  }

  // Students
  async getStudentProfile() {
    return this.get('/students/profile');
  }

  async getActiveElections() {
    return this.get('/elections/active');
  }

  // Admin
  async getAdminDashboard() {
    return this.get('/admin/dashboard');
  }

  async getAdminStudents() {
    return this.get('/admin/students');
  }

  async getAdminElections() {
    return this.get('/admin/elections');
  }

  async getAdminCandidates() {
    return this.get('/admin/candidates');
  }

  async getAdminPositions() {
    return this.get('/admin/positions');
  }

  async getAdminAnnouncements() {
    return this.get('/admin/announcements');
  }

  async getAdminReports() {
    return this.get('/admin/reports');
  }

  async getAdminResults() {
    return this.get('/admin/results');
  }

  // Candidates
  async getCandidateApplication() {
    return this.get('/candidate-application/my');
  }

  async submitCandidateApplication(data: unknown) {
    return this.post('/candidate-application', data);
  }

  // Elections
  async getElections() {
    return this.get('/elections');
  }

  async getElectionPositions(electionId: number) {
    return this.get(`/elections/${electionId}/positions`);
  }

  async castVote(electionId: number, positionId: number, candidateId: number) {
    return this.post('/votes', { electionId, positionId, candidateId });
  }

  // Notifications
  async getNotifications() {
    return this.get('/notifications');
  }

  async markNotificationRead(id: number) {
    return this.patch(`/notifications/${id}`, { isRead: true });
  }

  // Receipts
  async getReceipt(hash: string) {
    return this.get(`/receipts/${hash}`);
  }

  // Results
  async getResults(electionId?: number) {
    const endpoint = electionId ? `/results/${electionId}` : '/results';
    return this.get(endpoint);
  }

  // Support
  async createSupportRequest(data: unknown) {
    return this.post('/support', data);
  }

  async getSupportRequests() {
    return this.get('/support');
  }
}

export const api = new ApiClient();
export default api;
