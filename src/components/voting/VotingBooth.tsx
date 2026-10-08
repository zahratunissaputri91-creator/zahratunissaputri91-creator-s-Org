import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { db } from '../../lib/storage';
import { School, ElectionPeriod, Candidate, Voter } from '../../types';
import {
  Vote,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Maximize2,
  Lock,
  ArrowRight,
  Eye,
  LogOut,
  ChevronLeft,
  Building,
  Calendar
} from 'lucide-react';
import { CandidateDetailModal } from '../common/CandidateDetailModal';

interface Props {
  onBackToHome: () => void;
}

type BoothStep = 'AUTH' | 'BALLOT_OSIS' | 'BALLOT_MPK' | 'CONFIRM' | 'SUCCESS';

export const VotingBooth: React.FC<Props> = ({ onBackToHome }) => {
  const [school, setSchool] = useState<School>(db.getSchool());
  const [activePeriod, setActivePeriod] = useState<ElectionPeriod>(db.getActivePeriod());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);

  // Step state
  const [step, setStep] = useState<BoothStep>('AUTH');

  // Auth inputs - Menggunakan NIS (Nomor Induk Siswa)
  const [nis, setNis] = useState('');
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentVoter, setCurrentVoter] = useState<Voter | null>(null);

  // Voting ballot selection (2 Kategori Kandidat Tunggal: OSIS & MPK)
  const [selectedOsis, setSelectedOsis] = useState<Candidate | null>(null);
  const [selectedMpk, setSelectedMpk] = useState<Candidate | null>(null);
  const [previewCandidate, setPreviewCandidate] = useState<Candidate | null>(null);

  // Success countdown
  const [countdown, setCountdown] = useState(5);
  const [terminalId] = useState('Bilik-Suara-01');

  // Load latest data
  const refreshData = () => {
    setSchool(db.getSchool());
    const period = db.getActivePeriod();
    setActivePeriod(period);
    setCandidates(db.getCandidates(period.id));
    setVoters(db.getVoters(period.id));
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Countdown timer on SUCCESS step
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'SUCCESS') {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 }
        });
      } catch {
        // Safe fallback
      }

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleResetBooth();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  const handleResetBooth = () => {
    setStep('AUTH');
    setNis('');
    setPin('');
    setAuthError(null);
    setCurrentVoter(null);
    setSelectedOsis(null);
    setSelectedMpk(null);
    setCountdown(5);
    refreshData();
  };

  // Submit Auth menggunakan NIS dan Token PIN
  const handleAuthenticate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);

    if (!nis.trim() || !pin.trim()) {
      setAuthError('Harap masukkan NIS dan 6-digit Token PIN Anda.');
      return;
    }

    if (activePeriod.status !== 'aktif') {
      setAuthError('Sesi pemilihan saat ini belum dibuka atau telah selesai.');
      return;
    }

    const cleanNis = nis.trim();
    const cleanPin = pin.trim().toUpperCase();

    // Check voter in active period (mendukung pencocokan NIS atau NISN)
    const found = voters.find(
      v =>
        v.electionPeriodId === activePeriod.id &&
        ((v.nis && v.nis.trim() === cleanNis) || (v.nisn && v.nisn.trim() === cleanNis))
    );

    if (!found) {
      setAuthError('NIS tidak terdaftar dalam Daftar Pemilih Tetap (DPT) periode ini.');
      return;
    }

    if (found.pin.toUpperCase() !== cleanPin) {
      setAuthError('Token PIN yang Anda masukkan salah. Silakan periksa kembali kartu pemilih Anda.');
      return;
    }

    if (found.hasVoted) {
      setAuthError(
        `Hak suara atas nama ${found.fullName} telah digunakan pada ${
          found.votedAt ? new Date(found.votedAt).toLocaleTimeString() : 'sesi ini'
        }.`
      );
      return;
    }

    // Success authentication -> Start with OSIS Ballot (Category 1)
    setCurrentVoter(found);
    setStep('BALLOT_OSIS');
  };

  // Selection handlers
  const handleSelectOsis = (cand: Candidate) => {
    setSelectedOsis(cand);
    setStep('BALLOT_MPK');
  };

  const handleSelectMpk = (cand: Candidate) => {
    setSelectedMpk(cand);
    setStep('CONFIRM');
  };

  // Atomic vote commit for both OSIS and MPK
  const handleCommitVote = () => {
    if (!currentVoter || !selectedOsis || !selectedMpk) return;

    const res = db.castVoteAtomic(
      activePeriod.id,
      currentVoter.id,
      {
        osisCandidateId: selectedOsis.id,
        mpkCandidateId: selectedMpk.id
      },
      terminalId
    );

    if (res.success) {
      setStep('SUCCESS');
    } else {
      alert(res.message);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Filter kandidat per kategori (Kandidat Tunggal)
  const osisCandidates = candidates.filter(c => c.category === 'OSIS');
  const mpkCandidates = candidates.filter(c => c.category === 'MPK');

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Kiosk Dedicated Header (Sederhana & Bersih) */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-md">
            <Vote className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-sm text-slate-100">BILIK SUARA ELEKTRONIK</span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-xs text-slate-400 hidden sm:inline">{terminalId}</span>
            </div>
            <p className="text-xs text-slate-400">
              {school.name} • Tahun Ajaran {activePeriod.academicYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFullscreen}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            title="Layar Penuh Kiosk"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onBackToHome}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Kembali ke Beranda Publik"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>

      {/* STEP 1: AUTHENTICATION SCREEN (Sederhana, Bersih & Terpusat - Tanpa Menu Uji Demo) */}
      {step === 'AUTH' && (
        <div className="max-w-md mx-auto my-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Masuk ke Bilik Suara
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Masukkan <strong>NIS</strong> (Nomor Induk Siswa) dan <strong>Token PIN</strong> yang tertera pada kartu pemilih Anda.
            </p>
          </div>

          {authError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Akses Ditolak</p>
                <p className="mt-0.5">{authError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Induk Siswa (NIS)
              </label>
              <input
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                placeholder="Masukkan NIS Anda (contoh: 10301)"
                maxLength={12}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Token PIN Pemilih (6 Karakter)
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="Contoh: A7K92M"
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-base tracking-widest uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                * Satu Token PIN berlaku sekaligus untuk memilih Ketua OSIS dan Ketua MPK.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer text-sm active:scale-95"
            >
              <span>Buka Surat Suara Digital</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Sistem Enkripsi Aktif
            </span>
            <span>Asas Luber-Jurdil 100%</span>
          </div>
        </div>
      )}

      {/* STEP 2: SURAT SUARA KATEGORI 1 - KETUA OSIS (3 KANDIDAT TUNGGAL) */}
      {step === 'BALLOT_OSIS' && currentVoter && (
        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-indigo-200 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black">
                TAHAP 1 DARI 2
              </span>
              <span className="font-bold text-slate-900">Pemilihan Calon Ketua OSIS</span>
            </div>
            <span className="text-slate-500 font-medium hidden sm:inline">
              Pemilih: <strong>{currentVoter.fullName}</strong> (NIS: {currentVoter.nis || currentVoter.nisn} • {currentVoter.className})
            </span>
          </div>

          {/* Ballot Header Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 border border-indigo-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                1
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-indigo-300">
                  SURAT SUARA ELEKTRONIK
                </span>
                <h2 className="text-xl font-black text-white">
                  Pilih 1 (Satu) Calon Ketua OSIS
                </h2>
                <p className="text-xs text-slate-300">
                  Tersedia 3 Kandidat Calon Resmi Ketua OSIS Periode {activePeriod.academicYear}.
                </p>
              </div>
            </div>

            <span className="px-3.5 py-1.5 bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-sm">
              {osisCandidates.length} Kandidat Tersedia
            </span>
          </div>

          {/* 3 OSIS Candidates Grid (Kandidat Tunggal) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {osisCandidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-md hover:border-indigo-600 transition-all flex flex-col justify-between group"
              >
                {/* Ballot Number Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                    Kandidat OSIS
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
                    0{cand.ballotNumber}
                  </div>
                </div>

                {/* Candidate Photo */}
                <div className="relative h-64 bg-slate-100 overflow-hidden">
                  <img
                    src={cand.photoUrl}
                    alt={`Kandidat 0${cand.ballotNumber}`}
                    className="w-full h-full object-cover object-top group-hover:scale-102 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-transparent to-transparent" />

                  <button
                    onClick={() => setPreviewCandidate(cand)}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visi & Misi</span>
                  </button>

                  {/* Keterangan Nama dan Kelas Tunggal */}
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h4 className="font-black text-lg drop-shadow-sm leading-snug">
                      {cand.chairmanName}
                    </h4>
                    <p className="text-xs text-indigo-200 font-semibold mt-0.5">
                      Kelas: {cand.chairmanClass}
                    </p>
                  </div>
                </div>

                {/* Content & Action */}
                <div className="p-5 space-y-4 bg-slate-50/70 border-t border-slate-100 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-slate-600 italic">
                    "{cand.tagline}"
                  </div>

                  <button
                    onClick={() => handleSelectOsis(cand)}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Vote className="w-4 h-4" />
                    <span>PILIH KANDIDAT 0{cand.ballotNumber}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleResetBooth}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Batal & Kembali ke Layar Awal
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SURAT SUARA KATEGORI 2 - KETUA MPK (2 KANDIDAT TUNGGAL) */}
      {step === 'BALLOT_MPK' && currentVoter && selectedOsis && (
        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-emerald-200 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-black">
                TAHAP 2 DARI 2
              </span>
              <span className="font-bold text-slate-900">Pemilihan Calon Ketua MPK</span>
            </div>
            <button
              onClick={() => setStep('BALLOT_OSIS')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali Ubah Pilihan OSIS</span>
            </button>
          </div>

          {/* Ballot Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                2
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                  SURAT SUARA ELEKTRONIK
                </span>
                <h2 className="text-xl font-black text-white">
                  Pilih 1 (Satu) Calon Ketua MPK
                </h2>
                <p className="text-xs text-slate-300">
                  Tersedia 2 Kandidat Calon Resmi Ketua MPK Periode {activePeriod.academicYear}.
                </p>
              </div>
            </div>

            <span className="px-3.5 py-1.5 bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-sm">
              {mpkCandidates.length} Kandidat Tersedia
            </span>
          </div>

          {/* 2 MPK Candidates Grid (Kandidat Tunggal) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {mpkCandidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-md hover:border-emerald-600 transition-all flex flex-col justify-between group"
              >
                {/* Ballot Number Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                    Kandidat MPK
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
                    0{cand.ballotNumber}
                  </div>
                </div>

                {/* Candidate Photo */}
                <div className="relative h-64 bg-slate-100 overflow-hidden">
                  <img
                    src={cand.photoUrl}
                    alt={`Kandidat MPK 0${cand.ballotNumber}`}
                    className="w-full h-full object-cover object-top group-hover:scale-102 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-transparent to-transparent" />

                  <button
                    onClick={() => setPreviewCandidate(cand)}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visi & Misi</span>
                  </button>

                  {/* Keterangan Nama dan Kelas Tunggal */}
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h4 className="font-black text-lg drop-shadow-sm leading-snug">
                      {cand.chairmanName}
                    </h4>
                    <p className="text-xs text-emerald-200 font-semibold mt-0.5">
                      Kelas: {cand.chairmanClass}
                    </p>
                  </div>
                </div>

                {/* Content & Action */}
                <div className="p-5 space-y-4 bg-slate-50/70 border-t border-slate-100 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-slate-600 italic">
                    "{cand.tagline}"
                  </div>

                  <button
                    onClick={() => handleSelectMpk(cand)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Vote className="w-4 h-4" />
                    <span>PILIH KANDIDAT 0{cand.ballotNumber}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setStep('BALLOT_OSIS')}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Kembali ke Pemilihan Ketua OSIS
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION MODAL DUA KANDIDAT TUNGGAL */}
      {step === 'CONFIRM' && selectedOsis && selectedMpk && currentVoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 text-center">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <Vote className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                Konfirmasi Pilihan Suara Anda
              </h3>
              <p className="text-xs text-slate-500">
                Periksa kembali pilihan Anda sebelum dikirimkan ke kotak suara elektronik:
              </p>
            </div>

            {/* Dua Pilihan Berdampingan (Kandidat Tunggal) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* Pilihan OSIS */}
              <div className="p-4 bg-indigo-50/70 rounded-2xl border-2 border-indigo-200 space-y-3">
                <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black uppercase">
                  Pilihan Ketua OSIS
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-18 rounded-xl overflow-hidden shrink-0 border border-slate-300">
                    <img src={selectedOsis.photoUrl} alt={selectedOsis.chairmanName} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 px-1 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded">
                      0{selectedOsis.ballotNumber}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{selectedOsis.chairmanName}</h5>
                    <p className="text-[11px] text-slate-500 font-semibold">Kelas: {selectedOsis.chairmanClass}</p>
                    <span className="text-[10px] text-indigo-700 font-bold block mt-1">No. Urut 0{selectedOsis.ballotNumber}</span>
                  </div>
                </div>
              </div>

              {/* Pilihan MPK */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-200 space-y-3">
                <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black uppercase">
                  Pilihan Ketua MPK
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-18 rounded-xl overflow-hidden shrink-0 border border-slate-300">
                    <img src={selectedMpk.photoUrl} alt={selectedMpk.chairmanName} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 px-1 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded">
                      0{selectedMpk.ballotNumber}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{selectedMpk.chairmanName}</h5>
                    <p className="text-[11px] text-slate-500 font-semibold">Kelas: {selectedMpk.chairmanClass}</p>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">No. Urut 0{selectedMpk.ballotNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 text-left">
              <p className="font-semibold text-slate-900">Perhatian:</p>
              <p className="text-[11px] mt-0.5">
                Setelah tombol konfirmasi ditekan, suara Anda langsung dicatat secara anonim ke dalam basis data kotak suara dan token PIN akan hangus otomatis.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setStep('BALLOT_OSIS')}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Ubah Pilihan
              </button>
              <button
                onClick={handleCommitVote}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Ya, Coblos Kedua Kategori Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS SCREEN (TINTA DIGITAL & AUTO LOGOUT) */}
      {step === 'SUCCESS' && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl max-w-xl mx-auto text-center space-y-6 animate-in zoom-in-95 duration-300">
          {/* Digital Purple Ink Graphic */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-purple-600/20 animate-ping opacity-50" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-purple-800 via-indigo-900 to-purple-600 text-white flex flex-col items-center justify-center shadow-xl border-4 border-white">
              <span className="text-3xl">🗳️</span>
              <span className="text-[10px] font-black uppercase tracking-wider mt-1">SAH</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
              SUARA ANDA TELAH BERHASIL DICATAT
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Terima Kasih Telah Menggunakan Hak Suara!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Hak suara Anda untuk <strong>Ketua OSIS</strong> dan <strong>Ketua MPK</strong> telah dicatat secara terpisah dan anonim demi menjaga asas LUBER-JURDIL.
            </p>
          </div>

          {/* Countdown & Reset Booth */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium">
              Bilik suara akan dialihkan kembali dalam:
            </span>
            <span className="font-mono text-base font-black text-indigo-700 bg-white px-3 py-1 rounded-xl border border-slate-200">
              {countdown} detik
            </span>
          </div>

          <div>
            <button
              onClick={handleResetBooth}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Selesai Lebih Cepat (Pemilih Berikutnya)</span>
            </button>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {previewCandidate && (
        <CandidateDetailModal
          candidate={previewCandidate}
          onClose={() => setPreviewCandidate(null)}
          showVoteButton={false}
        />
      )}
    </div>
  );
};
