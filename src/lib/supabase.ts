import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const STORAGE_KEY_SUPABASE = 'epilketos_supabase_config_v1';

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: '',
  anonKey: '',
  isEnabled: false
};

export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') return DEFAULT_SUPABASE_CONFIG;
  try {
    // 1. Cek parameter URL (Tautan Bagikan Antar-PC: ?sb_url=...&sb_key=...)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const urlFromParam = urlParams.get('sb_url') || hashParams.get('sb_url');
    const keyFromParam = urlParams.get('sb_key') || hashParams.get('sb_key');

    if (urlFromParam && keyFromParam) {
      const decodedUrl = decodeURIComponent(urlFromParam);
      const decodedKey = decodeURIComponent(keyFromParam);
      const newCfg: SupabaseConfig = {
        url: decodedUrl,
        anonKey: decodedKey,
        isEnabled: true
      };
      localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(newCfg));
      // Dispatch event segera
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('epilketos_supabase_config_change', { detail: newCfg }));
      }, 50);
      // Bersihkan param dari URL tanpa reload agar rapi
      if (window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      return newCfg;
    }

    // 2. Cek localStorage browser lokal
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) return parsed;
    }

    // 3. Cek Environment Variables (Vite default)
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    if (envUrl && envKey) {
      return { url: envUrl, anonKey: envKey, isEnabled: true };
    }

    return DEFAULT_SUPABASE_CONFIG;
  } catch {
    return DEFAULT_SUPABASE_CONFIG;
  }
}

export function saveSupabaseConfig(cfg: SupabaseConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent('epilketos_supabase_config_change', { detail: cfg }));
  } catch (err) {
    console.error('Failed to save Supabase config:', err);
  }
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.isEnabled && cfg.url && cfg.anonKey);
}

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.isEnabled || !cfg.url || !cfg.anonKey) {
    cachedClient = null;
    return null;
  }

  const keyString = `${cfg.url}:${cfg.anonKey}`;
  if (cachedClient && cachedKey === keyString) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: false
      }
    });
    cachedKey = keyString;
    return cachedClient;
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

/**
 * Tes koneksi ke instance Supabase user
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL Supabase dan Anon Key wajib diisi.' };
  }

  try {
    const testClient = createClient(url, anonKey, { auth: { persistSession: false } });
    // Tes query sederhana ke tabel schools atau query auth
    const { error } = await testClient.from('schools').select('id').limit(1);
    
    if (error) {
      // Jika tabel belum ada, beri tahu bahwa koneksi berhasil namun tabel belum dibuat
      if (error.code === '42P01' || error.message.includes('relation "schools" does not exist')) {
        return {
          success: true,
          message: 'Koneksi ke project Supabase BERHASIL! (Catatan: Tabel database belum dibuat, silakan jalankan SQL Schema di tab SQL Editor Supabase).'
        };
      }
      return { success: false, message: `Error koneksi Supabase (${error.code || 'API'}): ${error.message}` };
    }

    return { success: true, message: 'Koneksi Supabase aktif & tabel terverifikasi dengan sempurna!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal terhubung: ${msg}` };
  }
}

/**
 * Script DDL SQL Resmi untuk dibuat di Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- E-PILKETOS & E-PILKOSIM SMAN 103 JAKARTA - SUPABASE POSTGRESQL SCHEMA
-- Jalankan skrip ini pada menu "SQL Editor" -> "New Query" di Supabase
-- ====================================================================

-- 1. TABEL SATUAN PENDIDIKAN / SEKOLAH
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'OSIS',
  npsn TEXT NOT NULL,
  address TEXT,
  principal_name TEXT,
  principal_nip TEXT,
  logo_url TEXT,
  academic_year_default TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PERIODE PEMILIHAN DINAMIS
CREATE TABLE IF NOT EXISTS election_periods (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'aktif', 'selesai')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 3. TABEL KANDIDAT / PASLON (2 KATEGORI: OSIS & MPK)
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  election_period_id TEXT REFERENCES election_periods(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('OSIS', 'MPK')),
  ballot_number INT NOT NULL,
  chairman_name TEXT NOT NULL,
  chairman_class TEXT NOT NULL,
  vice_chairman_name TEXT NOT NULL,
  vice_chairman_class TEXT NOT NULL,
  photo_url TEXT,
  tagline TEXT,
  vision TEXT,
  missions JSONB DEFAULT '[]'::jsonb,
  programs JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL DAFTAR PEMILIH TETAP (DPT) & TOKEN PIN
CREATE TABLE IF NOT EXISTS voters (
  id TEXT PRIMARY KEY,
  election_period_id TEXT REFERENCES election_periods(id) ON DELETE CASCADE,
  nisn TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('L', 'P')),
  pin TEXT NOT NULL,
  has_voted BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(election_period_id, nisn)
);

-- 5. TABEL KOTAK SUARA ANONIM (LUBER-JURDIL: MEMISAHKAN IDENTITAS PEMILIH)
CREATE TABLE IF NOT EXISTS anonymous_votes (
  id TEXT PRIMARY KEY,
  election_period_id TEXT REFERENCES election_periods(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('OSIS', 'MPK')),
  candidate_id TEXT REFERENCES candidates(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  device_fingerprint TEXT
);

-- 6. TABEL SURAT KEPUTUSAN & PANITIA PEMILIHAN
CREATE TABLE IF NOT EXISTS committees (
  id TEXT PRIMARY KEY,
  election_period_id TEXT REFERENCES election_periods(id) ON DELETE CASCADE,
  sk_number TEXT NOT NULL,
  sk_date DATE NOT NULL,
  leader_name TEXT NOT NULL,
  secretary_name TEXT NOT NULL,
  members_count INT DEFAULT 15,
  contact_email TEXT,
  username TEXT NOT NULL,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL PENGGUNA SISTEM (SUPERADMIN, PANITIA, OPERATOR, PENGAWAS)
CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'panitia', 'operator', 'pengawas')),
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  phone_number TEXT
);

-- 8. TABEL AUDIT TRAILS (LOG KEAMANAN SISTEM)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  status TEXT NOT NULL,
  details TEXT
);

-- INDEX UNTUK PERFORMA TINGGI
CREATE INDEX IF NOT EXISTS idx_voters_period ON voters(election_period_id);
CREATE INDEX IF NOT EXISTS idx_voters_nisn ON voters(nisn);
CREATE INDEX IF NOT EXISTS idx_candidates_period ON candidates(election_period_id, category);
CREATE INDEX IF NOT EXISTS idx_anonymous_votes_period ON anonymous_votes(election_period_id, category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- AKTIFKAN ROW LEVEL SECURITY (RLS) JIKA DIBUTUHKAN
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES: IZINKAN AKSES PUBLIK (ANON) UNTUK APLIKASI WEB E-PILKETOS
CREATE POLICY "Public Read Schools" ON schools FOR SELECT USING (true);
CREATE POLICY "Public Read Periods" ON election_periods FOR SELECT USING (true);
CREATE POLICY "Public Read Candidates" ON candidates FOR SELECT USING (true);
CREATE POLICY "Public Read Voters" ON voters FOR SELECT USING (true);
CREATE POLICY "Public Read Votes" ON anonymous_votes FOR SELECT USING (true);
CREATE POLICY "Public Read Committee" ON committees FOR SELECT USING (true);
CREATE POLICY "Public Read Users" ON system_users FOR SELECT USING (true);
CREATE POLICY "Public Read Logs" ON audit_logs FOR SELECT USING (true);

-- IZINKAN WRITE DARI APLIKASI
CREATE POLICY "Public Insert Votes" ON anonymous_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Voters" ON voters FOR UPDATE USING (true);
CREATE POLICY "Public Manage All Anonymous Votes" ON anonymous_votes FOR ALL USING (true);
CREATE POLICY "Public Delete Anonymous Votes" ON anonymous_votes FOR DELETE USING (true);
CREATE POLICY "Public Manage All Schools" ON schools FOR ALL USING (true);
CREATE POLICY "Public Manage All Periods" ON election_periods FOR ALL USING (true);
CREATE POLICY "Public Manage All Candidates" ON candidates FOR ALL USING (true);
CREATE POLICY "Public Manage All Voters" ON voters FOR ALL USING (true);
CREATE POLICY "Public Manage All Committees" ON committees FOR ALL USING (true);
CREATE POLICY "Public Manage All Users" ON system_users FOR ALL USING (true);
CREATE POLICY "Public Manage All Logs" ON audit_logs FOR ALL USING (true);
`;
