import React, { useState, useEffect } from 'react';
import { School, ElectionPeriod, UserRole } from '../../types';
import { getSupabaseConfig, isSupabaseConfigured } from '../../lib/supabase';
import { db } from '../../lib/storage';
import { cloudSync } from '../../lib/supabaseSync';
import { serverSync, SyncStatus } from '../../lib/serverSync';
import { CloudSyncModal } from './CloudSyncModal';
import { ResetVotesModal } from './ResetVotesModal';
import {
  Vote,
  TrendingUp,
  Users,
  ShieldAlert,
  FileCode2,
  Building,
  RotateCcw,
  Cloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  Download,
  Zap,
  Laptop
} from 'lucide-react';

interface Props {
  school: School;
  activePeriod: ElectionPeriod;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onOpenPrd: () => void;
  onResetDemo: () => void;
  onOpenCloudSync?: () => void;
  onOpenResetVotes?: () => void;
}

export const Header: React.FC<Props> = ({
  school,
  activePeriod,
  currentRole,
  onSelectRole,
  onOpenPrd,
  onResetDemo,
  onOpenCloudSync,
  onOpenResetVotes
}) => {
  const [supabaseActive, setSupabaseActive] = useState(false);
  const [serverStatus, setServerStatus] = useState<SyncStatus>(serverSync.getStatus());
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isResetOptionsOpen, setIsResetOptionsOpen] = useState(false);
  const [isResetVotesModalOpen, setIsResetVotesModalOpen] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  const checkBackupAndCloud = () => {
    const cfg = getSupabaseConfig();
    setSupabaseActive(cfg.isEnabled && Boolean(cfg.url && cfg.anonKey));
    setHasBackup(db.hasPreResetBackup());
    setServerStatus(serverSync.getStatus());
  };

  useEffect(() => {
    checkBackupAndCloud();
    const handleStatus = (e: any) => {
      if (e.detail) setServerStatus(e.detail);
    };
    window.addEventListener('epilketos_supabase_config_change', checkBackupAndCloud);
    window.addEventListener('epilketos_state_change', checkBackupAndCloud);
    window.addEventListener('epilketos_sync_status_change', handleStatus);
    return () => {
      window.removeEventListener('epilketos_supabase_config_change', checkBackupAndCloud);
      window.removeEventListener('epilketos_state_change', checkBackupAndCloud);
      window.removeEventListener('epilketos_sync_status_change', handleStatus);
    };
  }, []);

  const handleRestorePreReset = () => {
    const res = db.restorePreResetBackup();
    if (res.success) {
      setRestoreNotice(res.message);
      setIsResetOptionsOpen(false);
      setTimeout(() => setRestoreNotice(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const handlePullFromCloud = async () => {
    const res = await cloudSync.pullAll();
    if (res.success) {
      setRestoreNotice(res.message);
      setIsResetOptionsOpen(false);
      setTimeout(() => setRestoreNotice(null), 4000);
    } else {
      alert(res.message);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        {/* Top micro announcement bar */}
        <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">SISTEM E-PILKETOS / E-PILKOSIM DIGITAL RESMI</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-slate-300">{school.name}</span>
            <button
              onClick={() => onOpenCloudSync ? onOpenCloudSync() : setIsCloudModalOpen(true)}
              className="ml-2 px-2.5 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-md font-mono text-[10px] border border-emerald-700 flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Realtime Multi-PC Sync aktif! Perubahan otomatis tersinkron ke semua PC lain."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-PC Sync: Aktif</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenPrd}
              className="text-indigo-300 hover:text-white flex items-center gap-1 font-semibold transition cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Dokumen PRD & Schema</span>
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setIsResetOptionsOpen(true)}
              className="text-slate-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
              title="Pilihan reset suara / pemulihan cadangan data"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset & Pemulihan</span>
            </button>
          </div>
        </div>

        {/* Notice toast if restored */}
        {restoreNotice && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{restoreNotice}</span>
            </div>
          </div>
        )}

        {/* Main navigation container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div 
              onClick={() => onSelectRole('publik')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 text-base tracking-tight">
                    E-OSIS & MPK
                  </span>
                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded uppercase">
                    Digital
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">
                  {school.name}
                </p>
              </div>
            </div>

            {/* Cloud & Period Pill */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenCloudSync ? onOpenCloudSync() : setIsCloudModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                title="Sinkronisasi Antar-PC Aktif! Klik untuk melihat status & tautan berbagi."
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sinkron Antar-PC (Aktif)</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-700">{activePeriod.academicYear}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">({activePeriod.status})</span>
              </div>
            </div>
          </div>

          {/* Role switcher navigation buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto max-w-full">
            <button
              onClick={() => onSelectRole('publik')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentRole === 'publik'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Quick Count</span>
            </button>

            <button
              onClick={() => onSelectRole('siswa')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentRole === 'siswa'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Bilik Suara (Siswa)</span>
            </button>

            <button
              onClick={() => onSelectRole('panitia')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentRole === 'panitia'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Panitia (DPT)</span>
            </button>

            <button
              onClick={() => onSelectRole('admin')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentRole === 'admin'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Sekolah</span>
            </button>
          </div>
        </div>
      </header>

      {/* CLOUD SYNC MODAL */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onSyncCompleted={(msg) => {
          setRestoreNotice(msg);
          setTimeout(() => setRestoreNotice(null), 4000);
        }}
      />

      {/* RESET VOTES ONLY MODAL */}
      <ResetVotesModal
        isOpen={isResetVotesModalOpen}
        onClose={() => setIsResetVotesModalOpen(false)}
        periodId={activePeriod.id}
        onSuccess={(stats) => {
          setRestoreNotice(`Kotak suara berhasil dikosongkan! (${stats.countVotesReset} suara dibersihkan, ${stats.countVotersReset} status pemilih dikembalikan).`);
          setTimeout(() => setRestoreNotice(null), 4000);
        }}
      />

      {/* MODAL PILIHAN RESET & PEMULIHAN DATA */}
      {isResetOptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Menu Reset & Pemulihan Data
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih tindakan yang sesuai dengan kebutuhan Anda
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetOptionsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tombol 1: Kosongkan Kotak Suara Saja (Paling Aman untuk Testing) */}
            <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-800 uppercase flex items-center gap-1.5">
                  <Vote className="w-4 h-4 text-rose-600" />
                  Pilihan Aman: Reset Suara Uji Coba Saja
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-200 text-rose-900 rounded-full">
                  Direkomendasikan
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hanya mengosongkan suara yang sudah masuk dan mengembalikan status DPT menjadi <strong>Belum Memilih</strong>. Data Calon, DPT siswa, dan nama sekolah <strong>100% AMAN tidak akan terhapus</strong>.
              </p>
              <button
                onClick={() => {
                  setIsResetOptionsOpen(false);
                  setIsResetVotesModalOpen(true);
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Buka Menu Kosongkan Kotak Suara</span>
              </button>
            </div>

            {/* Tombol 2: Pemulihan jika kepencet reset demo sebelumnya */}
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-2">
              <span className="text-xs font-black text-indigo-800 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Kepencet Reset Demo? Pulihkan Data Anda!
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jika sebelumnya Anda sudah banyak mengedit namun tidak sengaja menekan tombol reset, Anda dapat memulihkannya kembali dari cadangan otomatis atau dari Supabase Cloud.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleRestorePreReset}
                  disabled={!hasBackup}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Pulihkan snapshot lokal sesaat sebelum reset demo dipencet"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan Cadangan Lokal</span>
                </button>

                <button
                  onClick={handlePullFromCloud}
                  disabled={!supabaseActive}
                  className="py-2.5 px-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Tarik seluruh data Paslon & DPT dari Supabase Cloud"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tarik dari Supabase Cloud</span>
                </button>
              </div>
            </div>

            {/* Tombol 3: Reset Total Pabrik */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Reset Total Pabrik (Demo Bawaan)
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mengembalikan seluruh data institusi, paslon, dan pemilih ke data demo bawaan sistem. <em>(Sistem akan otomatis menyimpan cadangan sebelum reset agar dapat di-undo).</em>
              </p>
              <button
                onClick={() => {
                  if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh aplikasi ke data awal pabrik? Sistem akan menyimpan snapshot cadangan sebelum mereset.')) {
                    setIsResetOptionsOpen(false);
                    onResetDemo();
                    setRestoreNotice('Aplikasi direset ke setelan pabrik. Snapshot cadangan berhasil disimpan jika ingin dipulihkan.');
                    setTimeout(() => setRestoreNotice(null), 5000);
                  }
                }}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Reset Total ke Setelan Pabrik</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
