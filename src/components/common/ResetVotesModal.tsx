import React, { useState } from 'react';
import { db } from '../../lib/storage';
import { cloudSync } from '../../lib/supabaseSync';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  RotateCcw,
  AlertTriangle,
  X,
  CheckCircle2,
  Cloud,
  ShieldCheck,
  Vote,
  Users
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (stats: { countVotesReset: number; countVotersReset: number }) => void;
  periodId?: string;
}

export const ResetVotesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  periodId
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  if (!isOpen) return null;

  const targetPeriodId = periodId || db.getActivePeriod().id;
  const activePeriod = db.getActivePeriod();
  const currentVotes = db.getVotes(targetPeriodId);
  const currentVoters = db.getVoters(targetPeriodId);
  const votedCount = currentVoters.filter(v => v.hasVoted).length;
  const isCloudActive = isSupabaseConfigured();

  const handleExecuteReset = async () => {
    setIsProcessing(true);
    try {
      // 1. Reset di penyimpanan lokal
      const stats = db.resetVotesOnly(targetPeriodId);

      // 2. Kosongkan di Supabase Cloud jika terhubung
      if (isCloudActive) {
        await cloudSync.clearVotes(targetPeriodId);
      }

      setIsProcessing(false);
      onClose();
      if (onSuccess) {
        onSuccess(stats);
      }
    } catch (err) {
      console.error('Error resetting votes:', err);
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-sm">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Kosongkan Kotak Suara (Reset Suara)
              </h3>
              <p className="text-xs text-slate-500">
                Pembersihan hasil uji coba / testing pemilihan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Summary */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Vote className="w-3.5 h-3.5 text-indigo-600" />
              Suara Masuk
            </span>
            <div className="text-xl font-black text-rose-600">
              {currentVotes.length} Suara
            </div>
            <p className="text-[10px] text-slate-400">Akan dikosongkan ke 0</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Siswa Sudah Memilih
            </span>
            <div className="text-xl font-black text-slate-800">
              {votedCount} Siswa
            </div>
            <p className="text-[10px] text-slate-400">Hak pilih diaktifkan lagi</p>
          </div>
        </div>

        {/* Info & Guarantees */}
        <div className="space-y-2.5 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Gunakan Khusus Selesai Testing Aplikasi:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Fitur ini dirancang agar Anda dapat menguji bilik suara & quick count sepuasnya, kemudian mengosongkan suara kembali sebelum hari H pemilihan resmi dibuka.
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Jaminan Keamanan Data (Tidak Terhapus):</span>
            </div>
            <ul className="text-[11px] space-y-0.5 text-emerald-800 list-disc list-inside">
              <li>Daftar Pemilih Tetap (DPT) & PIN siswa <strong>TETAP AMAN 100%</strong></li>
              <li>Data Kandidat (Nama, Foto, Visi Misi) <strong>TETAP AMAN 100%</strong></li>
              <li>Konfigurasi Institusi Sekolah & SK Panitia <strong>TETAP AMAN 100%</strong></li>
            </ul>
          </div>

          {isCloudActive && (
            <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 border border-slate-200">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Supabase Cloud Terdeteksi: Kotak suara di server cloud juga akan dikosongkan otomatis.</span>
            </div>
          )}
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            checked={confirmedCheck}
            onChange={(e) => setConfirmedCheck(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
          />
          <span className="font-semibold leading-tight">
            Saya mengerti dan ingin mengosongkan kotak suara {activePeriod.periodName} agar kembali nol (0).
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={!confirmedCheck || isProcessing}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Mengosongkan Kotak Suara...' : 'Ya, Kosongkan Suara Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
