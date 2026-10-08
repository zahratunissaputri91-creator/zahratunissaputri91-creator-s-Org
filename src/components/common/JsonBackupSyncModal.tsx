import React, { useState, useRef } from 'react';
import { db } from '../../lib/storage';
import {
  Download,
  Upload,
  X,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Laptop
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (msg: string) => void;
}

export const JsonBackupSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
  const [exportStats, setExportStats] = useState<{ candidates: number; voters: number; votes: number } | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [jsonTextToImport, setJsonTextToImport] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Download File JSON
  const handleDownloadJson = () => {
    try {
      const { filename, jsonString, stats } = db.exportFullJsonBackup();
      setExportStats(stats);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotice({
        type: 'success',
        message: `File cadangan "${filename}" berhasil diunduh! (${stats.candidates} Paslon, ${stats.voters} DPT Siswa). Pindahkan file ini ke PC kedua melalui Flashdisk / WA Web.`
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: `Gagal membuat file export: ${err?.message || err}`
      });
    }
  };

  // Handle Pilih File JSON dari Komputer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setNotice(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = db.importFullJsonBackup(text);
        setIsProcessing(false);
        if (res.success) {
          setNotice({ type: 'success', message: res.message });
          if (onImportSuccess) onImportSuccess(res.message);
        } else {
          setNotice({ type: 'error', message: res.message });
        }
      } catch (err: any) {
        setIsProcessing(false);
        setNotice({ type: 'error', message: `Gagal membaca file: ${err?.message || err}` });
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setNotice({ type: 'error', message: 'Gagal membuka file dari komputer.' });
    };
    reader.readAsText(file);
    // Reset file input agar bisa upload file yang sama jika perlu
    e.target.value = '';
  };

  // Handle Paste Teks JSON secara manual
  const handleImportPastedJson = () => {
    if (!jsonTextToImport.trim()) {
      setNotice({ type: 'error', message: 'Silakan tempel (paste) kode JSON terlebih dahulu.' });
      return;
    }
    setIsProcessing(true);
    const res = db.importFullJsonBackup(jsonTextToImport);
    setIsProcessing(false);
    if (res.success) {
      setNotice({ type: 'success', message: res.message });
      setJsonTextToImport('');
      if (onImportSuccess) onImportSuccess(res.message);
    } else {
      setNotice({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Sinkronisasi Antar-PC via File JSON
              </h3>
              <p className="text-xs text-slate-500">
                Salin seluruh kandidat, foto, dan 251 DPT pemilih ke komputer lain dengan 1 file
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

        {/* Notifikasi Banner */}
        {notice && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${
              notice.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{notice.message}</span>
          </div>
        )}

        {/* Tabs Nav */}
        <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('EXPORT')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'EXPORT'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Di PC Pertama: Unduh JSON (Export)</span>
          </button>
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'IMPORT'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>2. Di PC Kedua: Masukkan JSON (Import)</span>
          </button>
        </div>

        {/* TAB 1: EXPORT DI PC PERTAMA */}
        {activeTab === 'EXPORT' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-2 text-indigo-950">
              <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                <Laptop className="w-4 h-4 text-indigo-600" />
                Langkah untuk PC Pertama (Yang Datanya Sudah Lengkap):
              </span>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Klik tombol di bawah untuk mengunduh satu file <strong>.json</strong> yang merangkum semua editan Anda: Calon Ketua OSIS & MPK (termasuk foto/poster), 251 siswa DPT (lengkap dengan token PIN dan kelas), serta nama sekolah.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 mx-auto flex items-center justify-center text-indigo-600">
                <FileJson className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">Unduh Cadangan Lengkap (.json)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  File ini langsung siap diimpor di PC kedua atau disimpan sebagai arsip pemilihan resmi.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan JSON Sekarang</span>
              </button>
            </div>

            <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
              💡 <strong>Tips Memindahkan File:</strong> Kirim file <code>backup_epilketos_*.json</code> ke PC kedua menggunakan flashdisk, WhatsApp Web, Telegram Web, atau Google Drive.
            </div>
          </div>
        )}

        {/* TAB 2: IMPORT DI PC KEDUA */}
        {activeTab === 'IMPORT' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2 text-emerald-950">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <Laptop className="w-4 h-4 text-emerald-600" />
                Langkah untuk PC Kedua:
              </span>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Buka aplikasi di PC kedua, lalu masukkan file <strong>.json</strong> yang tadi Anda unduh dari PC pertama. Data di PC kedua akan <strong>langsung sama persis seketika</strong> tanpa perlu internet atau konfigurasi tambahan!
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Tombol Unggah File */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 bg-slate-50 hover:bg-indigo-50/50 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl text-center cursor-pointer transition space-y-2 group"
            >
              <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 mx-auto flex items-center justify-center text-indigo-600 group-hover:scale-105 transition">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                Pilih & Masukkan File JSON dari Komputer
              </h4>
              <p className="text-[11px] text-slate-500">
                Klik di sini untuk memilih file <code>backup_epilketos_*.json</code>
              </p>
            </div>

            {/* Opsi Tambahan: Tempel Teks JSON */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="block font-bold text-slate-700 text-[11px]">
                Atau Tempel (Paste) Isi Teks JSON di Sini:
              </label>
              <textarea
                rows={4}
                value={jsonTextToImport}
                onChange={(e) => setJsonTextToImport(e.target.value)}
                placeholder='Tempelkan isi file JSON di sini (misal: {"version": "epilketos-v2.5", ...})'
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleImportPastedJson}
                disabled={isProcessing || !jsonTextToImport.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Proses & Terapkan Data JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
