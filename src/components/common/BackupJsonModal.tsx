import React, { useState, useRef } from 'react';
import { db } from '../../lib/storage';
import {
  Download,
  Upload,
  X,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Laptop
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: (msg: string) => void;
}

export const BackupJsonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    details?: string;
  }>({ type: null, message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. EKSPOR FILE JSON
  const handleExportJson = () => {
    try {
      const data = db.exportFullBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `epilketos-backup-lengkap-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({
        type: 'success',
        message: 'File .json berhasil diunduh ke komputer ini!',
        details: `Berisi ${data.candidates.length} Calon/Foto dan ${data.voters.length} DPT Siswa.`
      });
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: 'Gagal mengekspor file backup: ' + (err?.message || err)
      });
    }
  };

  // 2. IMPOR FILE JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus({ type: null, message: '' });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = event.target?.result as string;
        const parsed = JSON.parse(rawContent);

        const res = db.importFullBackup(parsed);
        setIsProcessing(false);

        if (res.success) {
          setImportStatus({
            type: 'success',
            message: 'Data Berhasil Disinkronkan!',
            details: res.message
          });
          if (onDataRestored) {
            onDataRestored(res.message);
          }
        } else {
          setImportStatus({
            type: 'error',
            message: 'Gagal mengimpor file:',
            details: res.message
          });
        }
      } catch (err: any) {
        setIsProcessing(false);
        setImportStatus({
          type: 'error',
          message: 'Format file tidak valid!',
          details: 'Pastikan file yang dipilih adalah file .json hasil ekspor dari aplikasi ini.'
        });
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setImportStatus({
        type: 'error',
        message: 'Gagal membaca file dari komputer.'
      });
    };

    reader.readAsText(file);
    // Reset value so user can select the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const school = db.getSchool();
  const cands = db.getCandidates();
  const voters = db.getVoters();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Export & Import Data (.JSON)
              </h3>
              <p className="text-xs text-slate-500">
                Pindahkan seluruh editan (251 DPT, Kandidat & Foto) antar PC secara instan 100% Berhasil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {importStatus.type && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 text-xs animate-in fade-in ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{importStatus.message}</p>
              {importStatus.details && (
                <p className="text-[11px] mt-0.5 opacity-90">{importStatus.details}</p>
              )}
            </div>
          </div>
        )}

        {/* Step Guide Cara Pakai */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4.5 space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Laptop className="w-4 h-4" />
            <span>CARA MEMINDAHKAN DATA DARI PC PERTAMA KE PC KEDUA:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-200">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <span className="font-black text-white flex items-center gap-1.5 text-xs">
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">1</span>
                Di PC Pertama:
              </span>
              <p className="text-slate-300 leading-relaxed">
                Klik tombol <strong>"Unduh / Export File .JSON"</strong> di bawah. File data lengkap Anda akan tersimpan di laptop.
              </p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
              <span className="font-black text-white flex items-center gap-1.5 text-xs">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">2</span>
                Di PC Kedua:
              </span>
              <p className="text-slate-300 leading-relaxed">
                Buka aplikasi di PC kedua, klik <strong>"Pilih File & Impor (.JSON)"</strong>. Data 251 DPT & Calon langsung persis sama!
              </p>
            </div>
          </div>
        </div>

        {/* Dua Tombol Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tombol Export */}
          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                Langkah 1: Export Data
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Unduh seluruh data editan saat ini ({cands.length} calon, {voters.length} DPT siswa, profil {school.name}) menjadi 1 file .json.
              </p>
            </div>
            <button
              onClick={handleExportJson}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh / Export File .JSON</span>
            </button>
          </div>

          {/* Tombol Import */}
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                Langkah 2: Import Data
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Pilih file .json dari PC pertama. Sistem akan menimpa data lokal dengan data terbaru dari file tersebut.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="modal-json-file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isProcessing ? 'Memproses...' : 'Pilih File & Impor (.JSON)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ringkasan Data Saat Ini */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Status Data Saat Ini: <strong>{cands.length} Calon</strong> • <strong>{voters.length} DPT Siswa</strong></span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{school.academicYearDefault || '2026/2027'}</span>
        </div>
      </div>
    </div>
  );
};
