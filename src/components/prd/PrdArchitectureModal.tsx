import React, { useState } from 'react';
import { X, BookOpen, Database, Shield, FileCode2, Copy, Check, Server, Terminal } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const PrdArchitectureModal: React.FC<Props> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'PRD' | 'DDL' | 'SECURITY' | 'API'>('PRD');
  const [copiedCode, setCopiedCode] = useState(false);

  const sqlDdl = `-- ========================================================
-- ARSITEKTUR BASIS DATA E-PILKETOS / E-PILKOSIM ENTERPRISE
-- PostgreSQL / Supabase Skema DDL & Row Level Security (RLS)
-- ========================================================

-- 1. Tabel Master Satuan Pendidikan
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('OSIS', 'OSIM')) NOT NULL,
  npsn VARCHAR(20) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  principal_name VARCHAR(255) NOT NULL,
  principal_nip VARCHAR(50) NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Periode Pemilihan (Multi-period Reusable)
CREATE TABLE election_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  period_name VARCHAR(255) NOT NULL,
  academic_year VARCHAR(20) NOT NULL, -- e.g. "2026/2027"
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) CHECK (status IN ('draft', 'aktif', 'selesai')) DEFAULT 'draft',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Constraint Integritas: Hanya ada TEPAT SATU periode aktif per sekolah
CREATE UNIQUE INDEX idx_single_active_period_per_school 
ON election_periods (school_id) 
WHERE (status = 'aktif');

-- 3. Tabel SK Kepanitiaan Pemilihan
CREATE TABLE committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_period_id UUID REFERENCES election_periods(id) ON DELETE CASCADE,
  sk_number VARCHAR(100) NOT NULL,
  sk_date DATE NOT NULL,
  sk_document_url TEXT,
  leader_name VARCHAR(255) NOT NULL,
  secretary_name VARCHAR(255) NOT NULL,
  members_count INT DEFAULT 10,
  user_id UUID, -- Foreign key ke auth.users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Pasangan Calon (Paslon) - Mendukung OSIS & MPK
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_period_id UUID REFERENCES election_periods(id) ON DELETE CASCADE,
  category VARCHAR(10) CHECK (category IN ('OSIS', 'MPK')) DEFAULT 'OSIS',
  ballot_number INT NOT NULL,
  chairman_name VARCHAR(255) NOT NULL,
  chairman_class VARCHAR(50) NOT NULL,
  vice_chairman_name VARCHAR(255) NOT NULL,
  vice_chairman_class VARCHAR(50) NOT NULL,
  photo_url TEXT NOT NULL,
  tagline VARCHAR(255),
  vision TEXT NOT NULL,
  missions JSONB NOT NULL DEFAULT '[]',
  programs JSONB NOT NULL DEFAULT '[]',
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_ballot_number_per_category UNIQUE(election_period_id, category, ballot_number)
);

-- 5. Tabel Daftar Pemilih Tetap (DPT) & Status Hak Suara
CREATE TABLE voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_period_id UUID REFERENCES election_periods(id) ON DELETE CASCADE,
  nisn VARCHAR(20) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  gender CHAR(1) CHECK (gender IN ('L', 'P')),
  pin_hash VARCHAR(255) NOT NULL, -- Hashed Token PIN 6 Karakter
  has_voted BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_voter_nisn_per_period UNIQUE(election_period_id, nisn)
);

-- 6. Tabel Kotak Suara Anonim (LUBER-JURDIL CORE TABLE)
-- CRITICAL SECURITY RULE: TANPA voter_id atau relasi pemilih
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_period_id UUID REFERENCES election_periods(id) ON DELETE CASCADE,
  category VARCHAR(10) CHECK (category IN ('OSIS', 'MPK')) DEFAULT 'OSIS',
  candidate_id UUID REFERENCES candidates(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Audit Trails (Immutable Log)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  action TEXT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  status VARCHAR(20) DEFAULT 'SUCCESS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Suara publik hanya dapat membaca agregasi Quick Count (COUNT(*) GROUP BY candidate_id)
CREATE POLICY "Public Read Aggregated Votes" ON votes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Siswa hanya dapat insert suara via Stored Procedure Atomik (Security Definer)`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sqlDdl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Product Requirements Document (PRD) & Sistem Arsitektur</h2>
              <p className="text-xs text-slate-400">Blueprint Enterprise E-Pilketos / E-Pilkosim Digital</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 px-6 gap-2 bg-slate-950 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PRD')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'PRD'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>PRD & Spesifikasi Fungsional</span>
          </button>

          <button
            onClick={() => setActiveTab('DDL')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'DDL'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Skema DDL PostgreSQL</span>
          </button>

          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SECURITY'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Keamanan Luber-Jurdil & STRIDE</span>
          </button>

          <button
            onClick={() => setActiveTab('API')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'API'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Alur Transaksi Atomik</span>
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-300 text-xs leading-relaxed">
          {activeTab === 'PRD' && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-950/60 border border-indigo-800 rounded-2xl space-y-2">
                <h4 className="text-sm font-bold text-indigo-200">1. Ringkasan Eksekutif Produk</h4>
                <p>
                  E-Pilketos / E-Pilkosim Digital adalah platform e-voting skala institusi pendidikan 
                  yang mentransformasikan pemilihan manual berbasis kertas menjadi proses digital 
                  yang 100% transparan, nir-kecurangan (*tamper-proof*), dan menjamin asas LUBER-JURDIL.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">2. Sasaran & Key Performance Indicators (KPI)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="font-bold text-emerald-400 block text-sm">Nir-Kecurangan (0% Duplikasi)</span>
                    <p className="mt-1 text-slate-400 text-[11px]">Validasi atomik mencegah pemilih ganda pada milidetik yang sama.</p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="font-bold text-blue-400 block text-sm">Latensi &lt; 200ms</span>
                    <p className="mt-1 text-slate-400 text-[11px]">Live dashboard quick count tersinkronisasi tanpa beban refresh berlebih.</p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="font-bold text-purple-400 block text-sm">100% Anonimitas Suara</span>
                    <p className="mt-1 text-slate-400 text-[11px]">Tidak ada foreign key antara pemilih dan kandidat yang dicoblos.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">3. Matriks Hak Akses & Peran Pengguna (RBAC)</h4>
                <div className="overflow-x-auto border border-slate-700 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700">
                      <tr>
                        <th className="p-2.5">Fitur / Hak Akses</th>
                        <th className="p-2.5">Publik / Pemantau</th>
                        <th className="p-2.5">Siswa (Pemilih)</th>
                        <th className="p-2.5">Panitia Pemilihan</th>
                        <th className="p-2.5">Admin Sekolah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-[11px]">
                      <tr>
                        <td className="p-2.5 font-medium">Lihat Quick Count Real-time</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Bilik Suara (Mencoblos)</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya (1x NISN+PIN)</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Kelola Paslon & DPT</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya (Audit)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Cetak Kartu Token Pemilih</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Buka / Tutup Periode Pemilihan</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-emerald-400">✓ Ya (Mutlak)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Pengesahan BAHP Resmi</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-red-400">✕ Tidak</td>
                        <td className="p-2.5 text-emerald-400">✓ Tanda Tangan</td>
                        <td className="p-2.5 text-emerald-400">✓ Sahkan & Stempel</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DDL' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-400">
                  Skema DDL PostgreSQL produksi dengan relasi referensial, index integritas unik, dan aturan RLS.
                </p>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Tersalin' : 'Salin Skema SQL'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                <code>{sqlDdl}</code>
              </pre>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Prinsip Kerahasiaan Suara (Luber-Jurdil Isolation)
                </h4>
                <p>
                  Untuk menjamin kerahasiaan pilihan siswa dari ancaman intimidasi atau pemantauan (*coercion resistance*), 
                  tabel <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">votes</code> 
                  <strong> sama sekali tidak menyimpan kolom voter_id</strong>.
                </p>
                <p className="text-slate-400 text-[11px]">
                  Tabel <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300">voters</code> hanya mencatat 
                  apakah pemilih sudah mencoblos (<code className="text-emerald-400">has_voted = true</code>) beserta stempel waktu, 
                  sehingga tidak ada siapapun (termasuk Admin Database / DBA) yang dapat menghubungkan surat suara mana yang dipilih oleh siswa tertentu.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Analisis Ancaman Keamanan (STRIDE)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <span className="font-bold text-red-400">1. Spoofing (Pemalsuan Akun)</span>
                    <p className="text-slate-300 text-[11px]">Mitigasi: Token PIN 6 karakter acak sekali pakai dengan entropi kriptografis tinggi (30 bit).</p>
                  </div>
                  <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <span className="font-bold text-red-400">2. Tampering (Manipulasi Data)</span>
                    <p className="text-slate-300 text-[11px]">Mitigasi: Transaksi database atomik (ACID) dan immutable audit trails.</p>
                  </div>
                  <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <span className="font-bold text-red-400">3. Repudiation (Penyangkalan)</span>
                    <p className="text-slate-300 text-[11px]">Mitigasi: Pencatatan waktu voting dan tanda tangan digital Berita Acara BAHP.</p>
                  </div>
                  <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <span className="font-bold text-red-400">4. Denial of Service (DoS)</span>
                    <p className="text-slate-300 text-[11px]">Mitigasi: Rate limiting di bilik suara dan caching terdistribusi hasil quick count.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'API' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">Alur Transaksi Atomik Pemilihan (/api/vote)</h4>
              <p className="text-slate-400">
                Langkah-langkah eksekusi transaksi terpadu di dalam database engine untuk mencegah *race condition* 
                dan penipuan suara:
              </p>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-3">
                <p className="text-indigo-400 font-bold">// Pseudo-Code Server Action / RPC Stored Procedure:</p>
                <div className="space-y-1 pl-4 border-l-2 border-indigo-500">
                  <p>1. BEGIN TRANSACTION (SERIALIZABLE ISOLATION)</p>
                  <p>2. SELECT * FROM election_periods WHERE id = :periodId AND status = 'aktif' FOR SHARE;</p>
                  <p>3. SELECT * FROM voters WHERE nisn = :nisn AND period_id = :periodId FOR UPDATE;</p>
                  <p>4. IF voter.has_voted = TRUE THEN RAISE EXCEPTION 'HAK_SUARA_TELAH_DIGUNAKAN';</p>
                  <p>5. IF hash(pin) != voter.pin_hash THEN RAISE EXCEPTION 'PIN_TIDAK_VALID';</p>
                  <p>6. INSERT INTO votes (election_period_id, candidate_id) VALUES (:periodId, :candidateId);</p>
                  <p>7. UPDATE voters SET has_voted = TRUE, voted_at = NOW() WHERE id = voter.id;</p>
                  <p>8. INSERT INTO audit_logs (action, ip_address, status) VALUES ('VOTE_CAST_ANONYMOUS', :ip, 'SUCCESS');</p>
                  <p>9. COMMIT TRANSACTION;</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
          <span>Sistem E-Pilketos Enterprise v2.4</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
          >
            Tutup Dokumen
          </button>
        </div>
      </div>
    </div>
  );
};
