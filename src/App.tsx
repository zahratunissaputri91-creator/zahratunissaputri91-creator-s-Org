import React, { useState, useEffect } from 'react';
import { db } from './lib/storage';
import { cloudSync } from './lib/supabaseSync';
import { isSupabaseConfigured } from './lib/supabase';
import { UserRole, School, ElectionPeriod } from './types';
import { Header } from './components/common/Header';
import { QuickCountDashboard } from './components/public/QuickCountDashboard';
import { VotingBooth } from './components/voting/VotingBooth';
import { PanitiaDashboard } from './components/panitia/PanitiaDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PrdArchitectureModal } from './components/prd/PrdArchitectureModal';
import { ResetVotesModal } from './components/common/ResetVotesModal';
import { CloudSyncModal } from './components/common/CloudSyncModal';
import { BackupJsonModal } from './components/common/BackupJsonModal';
import { ShieldCheck, Vote, Heart, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('publik');
  const [school, setSchool] = useState<School>(db.getSchool());
  const [activePeriod, setActivePeriod] = useState<ElectionPeriod>(db.getActivePeriod());
  const [isPrdOpen, setIsPrdOpen] = useState(false);
  const [isResetVotesOpen, setIsResetVotesOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isBackupJsonOpen, setIsBackupJsonOpen] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const refreshState = () => {
    setSchool(db.getSchool());
    setActivePeriod(db.getActivePeriod());
  };

  useEffect(() => {
    refreshState();

    // OTOMATIS TARIK DARI SUPABASE CLOUD SAAT APLIKASI DIBUKA (PENTING UNTUK ANTAR-PC)
    const initCloudSync = async () => {
      if (isSupabaseConfigured()) {
        try {
          const res = await cloudSync.pullAll();
          if (res.success && (res.votersCount > 0 || res.candidatesCount > 0)) {
            refreshState();
            setSyncToast(`Data tersinkron dari Supabase Cloud (${res.votersCount} DPT, ${res.candidatesCount} Calon)`);
            setTimeout(() => setSyncToast(null), 4000);
          }
        } catch (err) {
          console.warn('Auto cloud pull on boot notice:', err);
        }
      }
    };
    initCloudSync();

    const handleStorageChange = () => refreshState();
    const handleConfigChange = () => {
      initCloudSync();
    };

    window.addEventListener('epilketos_state_change', handleStorageChange);
    window.addEventListener('epilketos_supabase_config_change', handleConfigChange);

    return () => {
      window.removeEventListener('epilketos_state_change', handleStorageChange);
      window.removeEventListener('epilketos_supabase_config_change', handleConfigChange);
    };
  }, []);

  const handleResetDemo = () => {
    db.resetToDefault();
    refreshState();
    setSyncToast('Database direset ke contoh default pabrik.');
    setTimeout(() => setSyncToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notifikasi Sinkronisasi */}
      {syncToast && (
        <div className="fixed top-14 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Header Bar - Hidden in student voting booth mode for clean dedicated kiosk */}
      {currentRole !== 'siswa' && (
        <Header
          school={school}
          activePeriod={activePeriod}
          currentRole={currentRole}
          onSelectRole={setCurrentRole}
          onOpenPrd={() => setIsPrdOpen(true)}
          onResetDemo={handleResetDemo}
          onOpenCloudSync={() => setIsCloudSyncOpen(true)}
          onOpenResetVotes={() => setIsResetVotesOpen(true)}
          onOpenBackupJson={() => setIsBackupJsonOpen(true)}
        />
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {currentRole === 'publik' && (
          <QuickCountDashboard
            onNavigateToBooth={() => setCurrentRole('siswa')}
            onNavigateToPrd={() => setIsPrdOpen(true)}
          />
        )}

        {currentRole === 'siswa' && (
          <VotingBooth
            onBackToHome={() => setCurrentRole('publik')}
          />
        )}

        {currentRole === 'panitia' && (
          <PanitiaDashboard
            onBackToHome={() => setCurrentRole('publik')}
          />
        )}

        {currentRole === 'admin' && (
          <AdminDashboard
            onBackToHome={() => setCurrentRole('publik')}
          />
        )}
      </main>

      {/* PRD & Architecture Modal */}
      {isPrdOpen && (
        <PrdArchitectureModal
          onClose={() => setIsPrdOpen(false)}
        />
      )}

      {/* Modal Kosongkan Kotak Suara (Reset Suara Testing) */}
      <ResetVotesModal
        isOpen={isResetVotesOpen}
        onClose={() => setIsResetVotesOpen(false)}
        onSuccess={(stats) => {
          refreshState();
          setSyncToast(`Kotak suara berhasil dikosongkan! (${stats.countVotesReset} suara dibersihkan, ${stats.countVotersReset} pemilih diaktifkan kembali).`);
          setTimeout(() => setSyncToast(null), 5000);
        }}
        periodId={activePeriod.id}
      />

      {/* Modal Sinkronisasi Supabase Cloud & Bagikan ke PC Lain */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onSyncCompleted={(msg) => {
          refreshState();
          setSyncToast(msg);
          setTimeout(() => setSyncToast(null), 4000);
        }}
      />

      {/* Modal Export & Import JSON Antar-PC */}
      <BackupJsonModal
        isOpen={isBackupJsonOpen}
        onClose={() => setIsBackupJsonOpen(false)}
        onDataRestored={(msg) => {
          refreshState();
          setSyncToast(msg);
          setTimeout(() => setSyncToast(null), 5000);
        }}
      />

      {/* Footer - Sembunyikan saat siswa di bilik suara untuk tampilan bersih tanpa menu distraksi */}
      {currentRole !== 'siswa' && (
        <footer className="no-print bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                <Vote className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-800">
                {school.name}
              </span>
              <span>•</span>
              <span>E-{school.type} Digital v2.4 Enterprise</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Asas LUBER-JURDIL Terjamin
              </span>
              <span>•</span>
              <button
                onClick={() => setIsPrdOpen(true)}
                className="hover:text-indigo-600 underline font-medium cursor-pointer"
              >
                Dokumen PRD & Skema Database
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
