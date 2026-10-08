import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured
} from '../../lib/supabase';
import { cloudSync } from '../../lib/supabaseSync';
import { serverSync, SyncStatus } from '../../lib/serverSync';
import { SupabaseConfig } from '../../types';
import {
  Cloud,
  X,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Download,
  Upload,
  Radio,
  Server,
  Zap,
  HelpCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted?: (msg: string) => void;
}

export const CloudSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSyncCompleted
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());
  const [activeTab, setActiveTab] = useState<'SERVER' | 'SUPABASE'>('SERVER');
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<SyncStatus>(serverSync.getStatus());
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({
    loading: false
  });
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const appUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  useEffect(() => {
    if (isOpen) {
      setServerStatus(serverSync.getStatus());
      setConfig(getSupabaseConfig());
      if (appUrl) {
        QRCode.toDataURL(appUrl, { width: 220, margin: 2 })
          .then(url => setQrCodeDataUrl(url))
          .catch(() => {});
      }
    }
  }, [isOpen, appUrl]);

  useEffect(() => {
    const handleStatusUpdate = (e: any) => {
      if (e.detail) setServerStatus(e.detail);
    };
    window.addEventListener('epilketos_sync_status_change', handleStatusUpdate);
    return () => {
      window.removeEventListener('epilketos_sync_status_change', handleStatusUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!appUrl) return;
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handlePullServerData = async () => {
    setIsPulling(true);
    setNotice('Sedang menarik data terbaru dari Server Pusat...');
    const res = await serverSync.pullStateFromServer();
    setIsPulling(false);
    setNotice(res.message);
    if (res.success && onSyncCompleted) onSyncCompleted(res.message);
    setTimeout(() => setNotice(null), 4000);
  };

  const handlePushServerData = async () => {
    setIsPushing(true);
    setNotice('Sedang mengunggah data lokal ke Server Pusat...');
    const res = await serverSync.pushAllToServer();
    setIsPushing(false);
    setNotice(res.message);
    if (res.success && onSyncCompleted) onSyncCompleted(res.message);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleTestSupabase = async () => {
    setTestStatus({ loading: true });
    const res = await testSupabaseConnection(config.url, config.anonKey);
    setTestStatus({ loading: false, success: res.success, message: res.message });
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(config);
    setNotice('Konfigurasi Supabase eksternal berhasil disimpan!');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm bg-emerald-100 text-emerald-700">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Sinkronisasi Real-Time Antar-PC
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Sistem database pusat terpadu: perubahan data otomatis tersinkron ke semua PC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice alert */}
        {notice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-2.5 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{notice}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('SERVER')}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'SERVER'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Sinkron Otomatis (Server Pusat)</span>
          </button>
          <button
            onClick={() => setActiveTab('SUPABASE')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'SUPABASE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Supabase Eksternal (Opsional)</span>
          </button>
        </div>

        {/* TAB 1: SERVER CENTRAL SYNC (INSTANT OUT OF THE BOX) */}
        {activeTab === 'SERVER' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Status Card */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                    Koneksi Server Pusat: AKTIF & TERHUBUNG
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-lg">
                  Versi DB: #{serverStatus.version || 1}
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                Setiap kali Anda menekan tombol <strong className="text-emerald-950 font-bold">Simpan Paslon, Import DPT, Ganti Periode, atau Coblos Suara</strong>, data langsung tersimpan ke server dan <strong className="text-emerald-950 font-bold">otomatis muncul di semua PC/laptop lain</strong> tanpa perlu pengaturan manual!
              </p>
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-700">
                <span>Perangkat ini: <strong>{serverStatus.deviceId}</strong></span>
                <span>Waktu Sync: <strong>{serverStatus.lastSyncedAt ? new Date(serverStatus.lastSyncedAt).toLocaleTimeString('id-ID') : 'Baru saja'}</strong></span>
              </div>
            </div>

            {/* Bagikan Tautan ke PC Lain */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  Tautan Aplikasi untuk Laptop/PC Lain (Bilik Suara, Panitia, Proyektor)
                </h4>
              </div>
              <p className="text-[11px] text-slate-600">
                Buka tautan ini di PC/laptop lain. Semua PC yang membuka tautan ini langsung terhubung ke database yang sama:
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="flex-1 bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                </button>
              </div>

              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                    <img src={qrCodeDataUrl} alt="QR Code Link" className="w-24 h-24" />
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1 text-center sm:text-left">
                    <p className="font-bold text-slate-700">Scan QR Code dengan Smartphone/Tablet</p>
                    <p>Bisa digunakan panitia atau pengawas untuk memantau Quick Count dan DPT langsung dari HP.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Sync Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handlePullServerData}
                disabled={isPulling}
                className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Download className={`w-3.5 h-3.5 text-indigo-600 ${isPulling ? 'animate-bounce' : ''}`} />
                <span>{isPulling ? 'Menarik data...' : 'Tarik Data Terbaru Sekarang'}</span>
              </button>

              <button
                type="button"
                onClick={handlePushServerData}
                disabled={isPushing}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Upload className={`w-3.5 h-3.5 ${isPushing ? 'animate-bounce' : ''}`} />
                <span>{isPushing ? 'Mengunggah...' : 'Unggah Ulang Seluruh Data'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SUPABASE EKSTERNAL (OPSIONAL) */}
        {activeTab === 'SUPABASE' && (
          <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Pengaturan Supabase Cloud Eksternal (Opsional):</p>
              <p>
                Jika Anda memiliki project Supabase pribadi di supabase.com, Anda dapat memasukkan Project URL & Anon Key di bawah ini untuk cadangan cloud sekunder.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project URL Supabase
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Anon Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.anonKey}
                  onChange={(e) => setConfig({ ...config, anonKey: e.target.value.trim() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="enableSupabase"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="enableSupabase" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Aktifkan koneksi Supabase Cloud sekunder
                </label>
              </div>
            </div>

            {testStatus.message && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{testStatus.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={testStatus.loading || !config.url || !config.anonKey}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                {testStatus.loading ? 'Menguji...' : 'Tes Koneksi'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>E-Pilketos & E-Pilkosim Digital SMAN 103 Jakarta</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
