/**
 * Real-Time Multi-PC Synchronization Engine for E-Pilketos
 * SMAN 103 Jakarta
 * 
 * Menghubungkan semua PC (Bilik Suara, Admin, Panitia DPT, Proyektor Quick Count)
 * langsung ke Server Cloud Terpusat via Server-Sent Events (SSE) & REST Action Sync.
 */

export interface SyncStatus {
  isConnected: boolean;
  version: number;
  lastSyncedAt: string | null;
  deviceId: string;
  isSyncing: boolean;
  error?: string | null;
}

const STORAGE_KEYS = {
  SCHOOL: 'epilketos_school_v1',
  PERIODS: 'epilketos_periods_v1',
  CANDIDATES: 'epilketos_candidates_v1',
  VOTERS: 'epilketos_voters_v1',
  VOTES: 'epilketos_votes_v1',
  COMMITTEE: 'epilketos_committee_v1',
  AUDIT: 'epilketos_audit_v1',
  USERS: 'epilketos_users_v1',
  VERSION: 'epilketos_db_version_v1',
  DEVICE_ID: 'epilketos_device_id_v1'
};

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!id) {
    id = `pc-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
  }
  return id;
}

class ServerSyncManager {
  private status: SyncStatus = {
    isConnected: false,
    version: 0,
    lastSyncedAt: null,
    deviceId: getDeviceId(),
    isSyncing: false,
    error: null
  };

  private eventSource: EventSource | null = null;
  private pollInterval: any = null;
  private retryTimeout: any = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVersion = Number(localStorage.getItem(STORAGE_KEYS.VERSION) || '0');
      this.status.version = savedVersion;
    }
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Initial State Pull on Boot (Crucial for PC 2 / PC 3 to get latest data instantly)
    this.pullStateFromServer();

    // 2. Setup Server-Sent Events (SSE) for Real-Time Instant Broadcast
    this.setupSSE();

    // 3. Fallback Periodic Polling (every 2.5s) to guarantee zero desync
    this.pollInterval = setInterval(() => {
      this.checkVersionPoll();
    }, 2500);

    // 4. Also poll immediately when browser window/tab gains focus
    window.addEventListener('focus', () => {
      this.checkVersionPoll();
    });

    window.addEventListener('online', () => {
      this.setupSSE();
      this.pullStateFromServer();
    });
  }

  private setupSSE() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource('/api/db/events');

      this.eventSource.addEventListener('connected', (e: MessageEvent) => {
        this.status.isConnected = true;
        this.status.error = null;
        try {
          const data = JSON.parse(e.data);
          if (data.version && data.version > this.status.version) {
            this.pullStateFromServer();
          }
        } catch {}
        this.notifyStatusChange();
      });

      this.eventSource.addEventListener('state_updated', (e: MessageEvent) => {
        this.status.isConnected = true;
        try {
          const data = JSON.parse(e.data);
          // If server version is newer or delta arrived, pull latest state
          this.pullStateFromServer();
        } catch {
          this.pullStateFromServer();
        }
      });

      this.eventSource.onerror = () => {
        this.status.isConnected = false;
        this.notifyStatusChange();
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Retry connection in 3 seconds
        clearTimeout(this.retryTimeout);
        this.retryTimeout = setTimeout(() => {
          this.setupSSE();
        }, 3000);
      };
    } catch (err: any) {
      console.warn('SSE connection attempt failed, will rely on polling:', err);
      this.status.isConnected = false;
    }
  }

  private async checkVersionPoll() {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/db/version', { cache: 'no-store' });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      
      this.status.isConnected = true;
      if (data.version > this.status.version) {
        await this.pullStateFromServer();
      }
    } catch {
      // Offline or network error
    }
  }

  /**
   * Menarik seluruh data terbaru dari server dan meng-update localStorage & React state
   */
  public async pullStateFromServer(): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') return { success: false, message: 'SSR' };
    this.status.isSyncing = true;
    this.notifyStatusChange();

    try {
      const res = await fetch('/api/db/state', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();

      if (payload.success && payload.data) {
        const { school, periods, candidates, voters, votes, committee, auditLogs, users } = payload.data;

        if (school) localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(school));
        if (periods) localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(periods));
        if (candidates) localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
        if (voters) localStorage.setItem(STORAGE_KEYS.VOTERS, JSON.stringify(voters));
        if (votes) localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));
        if (committee) localStorage.setItem(STORAGE_KEYS.COMMITTEE, JSON.stringify(committee));
        if (auditLogs) localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
        if (users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        this.status.version = payload.version || (this.status.version + 1);
        this.status.lastSyncedAt = payload.updatedAt || new Date().toISOString();
        this.status.isConnected = true;
        this.status.isSyncing = false;
        this.status.error = null;

        localStorage.setItem(STORAGE_KEYS.VERSION, String(this.status.version));

        // Trigger React components to re-render across all views
        window.dispatchEvent(new CustomEvent('epilketos_state_change', {
          detail: { source: 'server_pull', version: this.status.version }
        }));

        this.notifyStatusChange();
        return {
          success: true,
          message: `Berhasil tersinkronisasi! (${candidates?.length || 0} Calon, ${voters?.length || 0} DPT, ${votes?.length || 0} Suara)`
        };
      }
      throw new Error('Format data tidak valid');
    } catch (err: any) {
      this.status.isSyncing = false;
      this.status.error = err?.message || 'Gagal terhubung ke server';
      this.notifyStatusChange();
      return { success: false, message: `Gagal menarik data: ${err?.message}` };
    }
  }

  /**
   * Mengirim aksi atomik ke server (misal: simpan paslon, tambah pemilih, coblos)
   */
  public async dispatchAction(type: string, payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/db/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const resJson = await res.json();
      if (resJson.version) {
        this.status.version = resJson.version;
        this.status.lastSyncedAt = resJson.updatedAt;
        localStorage.setItem(STORAGE_KEYS.VERSION, String(resJson.version));
      }
      this.status.isConnected = true;
      this.notifyStatusChange();
      return { success: true };
    } catch (err: any) {
      console.warn(`Action ${type} failed to sync to server:`, err);
      return { success: false, error: err?.message };
    }
  }

  /**
   * Mengunggah seluruh data lokal saat ini ke server (Full Push Override)
   */
  public async pushAllToServer(): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') return { success: false, message: 'SSR' };
    this.status.isSyncing = true;
    this.notifyStatusChange();

    try {
      const getParsed = (key: string) => {
        try {
          return JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          return null;
        }
      };

      const payload = {
        school: getParsed(STORAGE_KEYS.SCHOOL),
        periods: getParsed(STORAGE_KEYS.PERIODS),
        candidates: getParsed(STORAGE_KEYS.CANDIDATES),
        voters: getParsed(STORAGE_KEYS.VOTERS),
        votes: getParsed(STORAGE_KEYS.VOTES),
        committee: getParsed(STORAGE_KEYS.COMMITTEE),
        auditLogs: getParsed(STORAGE_KEYS.AUDIT),
        users: getParsed(STORAGE_KEYS.USERS)
      };

      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resJson = await res.json();

      this.status.version = resJson.version;
      this.status.lastSyncedAt = resJson.updatedAt;
      this.status.isSyncing = false;
      this.status.isConnected = true;
      localStorage.setItem(STORAGE_KEYS.VERSION, String(resJson.version));

      this.notifyStatusChange();
      return { success: true, message: 'Seluruh data berhasil diunggah dan disinkronkan ke semua PC!' };
    } catch (err: any) {
      this.status.isSyncing = false;
      this.status.error = err.message;
      this.notifyStatusChange();
      return { success: false, message: `Gagal mengunggah data: ${err.message}` };
    }
  }

  private notifyStatusChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('epilketos_sync_status_change', {
        detail: this.getStatus()
      }));
    }
  }
}

export const serverSync = new ServerSyncManager();
