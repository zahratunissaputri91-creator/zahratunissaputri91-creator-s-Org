import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/storage';
import { School, ElectionPeriod, Candidate, Voter, Committee } from '../../types';
import { VoterCardsPrintModal } from '../print/VoterCardsPrintModal';
import { ImportVotersModal } from './ImportVotersModal';
import {
  Users,
  Vote,
  Printer,
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Upload,
  Lock,
  LogOut,
  Layers,
  Save,
  X,
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Info
} from 'lucide-react';

interface Props {
  onBackToHome: () => void;
}

type TabType = 'PASLON' | 'DPT' | 'KREDENSIAL' | 'MONITORING';

// Preset avatars jika siswa belum memiliki foto studio/google
const PRESET_STUDENT_AVATARS = [
  { label: 'Siswa Laki-laki 1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80' },
  { label: 'Siswi Perempuan 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' },
  { label: 'Siswa Laki-laki 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80' },
  { label: 'Siswi Perempuan 2', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80' },
  { label: 'Siswa Laki-laki 3', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80' },
  { label: 'Siswi Perempuan 3', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80' }
];

export const PanitiaDashboard: React.FC<Props> = ({ onBackToHome }) => {
  const [school] = useState<School>(db.getSchool());
  const [activePeriod, setActivePeriod] = useState<ElectionPeriod>(db.getActivePeriod());
  const [committee, setCommittee] = useState<Committee>(db.getCommittee());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);

  // Session state
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true for frictionless testing
  const [loginUser, setLoginUser] = useState(committee.username);
  const [loginPass, setLoginPass] = useState(committee.password || 'TREVOOORA');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabType>('PASLON');
  const [candCategoryFilter, setCandCategoryFilter] = useState<'ALL' | 'OSIS' | 'MPK'>('ALL');

  // Candidate Modal (Kandidat Tunggal - 1 Orang per calon)
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candForm, setCandForm] = useState<{
    category: 'OSIS' | 'MPK';
    ballotNumber: number;
    chairmanName: string; // Nama Calon
    chairmanClass: string; // Kelas Calon
    photoUrl: string;
    tagline: string;
    vision: string;
    missions: string[];
    programs: string[];
    videoUrl?: string;
  }>({
    category: 'OSIS',
    ballotNumber: 1,
    chairmanName: '',
    chairmanClass: 'XI MIPA 1',
    photoUrl: PRESET_STUDENT_AVATARS[0].url,
    tagline: '',
    vision: '',
    missions: ['', '', ''],
    programs: ['', '', ''],
    videoUrl: ''
  });

  const photoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation Modals (Pengganti window.confirm yang terblokir)
  const [voterToDelete, setVoterToDelete] = useState<Voter | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  // DPT state (Menggunakan NIS)
  const [dptSearch, setDptSearch] = useState('');
  const [dptClassFilter, setDptClassFilter] = useState('ALL');
  const [dptStatusFilter, setDptStatusFilter] = useState('ALL');
  const [isAddVoterModalOpen, setIsAddVoterModalOpen] = useState(false);
  const [isEditVoterModalOpen, setIsEditVoterModalOpen] = useState(false);
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [editVoterForm, setEditVoterForm] = useState({
    nis: '',
    fullName: '',
    className: '',
    gender: 'L' as 'L' | 'P',
    pin: ''
  });
  const [newVoterForm, setNewVoterForm] = useState({
    nis: '',
    fullName: '',
    className: 'X MIPA 1',
    gender: 'L' as 'L' | 'P'
  });

  // Print and Import modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [dptPage, setDptPage] = useState(1);
  const pageSize = 50;
  const [notification, setNotification] = useState<string | null>(null);

  const reloadData = () => {
    const period = db.getActivePeriod();
    setActivePeriod(period);
    setCommittee(db.getCommittee(period.id));
    setCandidates(db.getCandidates(period.id));
    setVoters(db.getVoters(period.id));
  };

  useEffect(() => {
    reloadData();
    const handleStorageChange = () => reloadData();
    window.addEventListener('epilketos_state_change', handleStorageChange);
    return () => window.removeEventListener('epilketos_state_change', handleStorageChange);
  }, []);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (loginUser === committee.username && (loginPass === committee.password || loginPass === 'TREVOOORA')) {
      setIsAuthenticated(true);
    } else {
      setLoginError('Kredensial panitia salah. Gunakan username: ' + committee.username + ' & password: TREVOOORA');
    }
  };

  // Candidate CRUD (Kandidat Tunggal 1 Orang)
  const handleOpenAddCandidate = () => {
    setEditingCandidate(null);
    const targetCat = candCategoryFilter === 'MPK' ? 'MPK' : 'OSIS';
    const sameCatCands = candidates.filter(c => c.category === targetCat);
    const nextNumber = sameCatCands.length > 0 ? Math.max(...sameCatCands.map(c => c.ballotNumber)) + 1 : 1;
    setCandForm({
      category: targetCat,
      ballotNumber: nextNumber,
      chairmanName: '',
      chairmanClass: 'XI MIPA 1',
      photoUrl: PRESET_STUDENT_AVATARS[0].url,
      tagline: '',
      vision: '',
      missions: ['', '', ''],
      programs: ['', '', ''],
      videoUrl: 'https://www.youtube.com'
    });
    setIsCandidateModalOpen(true);
  };

  const handleOpenEditCandidate = (c: Candidate) => {
    setEditingCandidate(c);
    setCandForm({
      category: c.category || 'OSIS',
      ballotNumber: c.ballotNumber || 1,
      chairmanName: c.chairmanName || '',
      chairmanClass: c.chairmanClass || 'XI MIPA 1',
      photoUrl: c.photoUrl || PRESET_STUDENT_AVATARS[0].url,
      tagline: c.tagline || '',
      vision: c.vision || '',
      missions: c.missions && c.missions.length > 0 ? [...c.missions] : ['', '', ''],
      programs: c.programs && c.programs.length > 0 ? [...c.programs] : ['', '', ''],
      videoUrl: c.videoUrl || ''
    });
    setIsCandidateModalOpen(true);
  };

  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candForm.chairmanName.trim() || !candForm.chairmanClass.trim()) {
      showNotice('Nama Calon Kandidat dan Kelas wajib diisi.');
      return;
    }

    const candidateToSave: Candidate = {
      id: editingCandidate ? editingCandidate.id : `cand-${Date.now()}`,
      electionPeriodId: activePeriod.id,
      category: candForm.category || 'OSIS',
      ballotNumber: Number(candForm.ballotNumber) || 1,
      chairmanName: candForm.chairmanName.trim(),
      chairmanClass: candForm.chairmanClass.trim(),
      photoUrl: candForm.photoUrl || PRESET_STUDENT_AVATARS[0].url,
      tagline: candForm.tagline || '',
      vision: candForm.vision || '',
      missions: (candForm.missions || []).filter(m => m.trim().length > 0),
      programs: (candForm.programs || []).filter(p => p.trim().length > 0),
      videoUrl: candForm.videoUrl || ''
    };

    db.saveCandidate(candidateToSave);
    setIsCandidateModalOpen(false);
    reloadData();
    showNotice(`Kandidat [${candidateToSave.category}] No. 0${candidateToSave.ballotNumber} (${candidateToSave.chairmanName}) berhasil disimpan.`);
  };

  // Upload foto lokal dari komputer / HP
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showNotice('Ukuran file maksimal 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setCandForm(prev => ({ ...prev, photoUrl: dataUrl }));
      showNotice('Foto berhasil dimuat dari perangkat Anda!');
    };
    reader.readAsDataURL(file);
  };

  // Buat avatar inisial otomatis jika tidak ada foto
  const handleGenerateInitialsPhoto = () => {
    const name = candForm.chairmanName.trim() || 'Kandidat';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
    const bg = candForm.category === 'MPK' ? '%23059669' : '%234f46e5';
    const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520"><rect width="400" height="520" fill="${bg}"/><circle cx="200" cy="190" r="95" fill="%23ffffff" fill-opacity="0.2"/><text x="200" y="215" font-family="system-ui,sans-serif" font-size="76" font-weight="900" fill="%23ffffff" text-anchor="middle">${initials}</text><text x="200" y="360" font-family="system-ui,sans-serif" font-size="22" font-weight="bold" fill="%23ffffff" text-anchor="middle">${name.slice(0, 22)}</text><text x="200" y="400" font-family="system-ui,sans-serif" font-size="14" font-weight="bold" fill="%23fcd34d" text-anchor="middle">CALON KETUA ${candForm.category}</text></svg>`;
    setCandForm(prev => ({ ...prev, photoUrl: svg }));
    showNotice('Avatar inisial resmi berhasil dibuat!');
  };

  // DPT Actions (Menggunakan NIS)
  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNis = newVoterForm.nis.trim();
    const cleanName = newVoterForm.fullName.trim();
    if (!cleanNis || !cleanName) {
      showNotice('NIS dan Nama Siswa wajib diisi.');
      return;
    }

    db.importVoters([{
      nis: cleanNis,
      nisn: cleanNis,
      fullName: cleanName,
      className: newVoterForm.className.trim(),
      gender: newVoterForm.gender,
      pin: '',
      electionPeriodId: activePeriod.id
    }]);

    setIsAddVoterModalOpen(false);
    setNewVoterForm({ nis: '', fullName: '', className: 'X MIPA 1', gender: 'L' });
    reloadData();
    showNotice(`Siswa ${cleanName} (NIS: ${cleanNis}) berhasil ditambahkan ke DPT.`);
  };

  const handleOpenEditVoter = (voter: Voter) => {
    setEditingVoter(voter);
    setEditVoterForm({
      nis: voter.nis || voter.nisn || '',
      fullName: voter.fullName,
      className: voter.className,
      gender: voter.gender,
      pin: voter.pin
    });
    setIsEditVoterModalOpen(true);
  };

  const handleSaveEditVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoter) return;
    const cleanNis = editVoterForm.nis.trim();
    const cleanName = editVoterForm.fullName.trim();
    if (!cleanNis || !cleanName) {
      showNotice('NIS dan Nama Siswa wajib diisi.');
      return;
    }

    const updated: Voter = {
      ...editingVoter,
      nis: cleanNis,
      nisn: cleanNis,
      fullName: cleanName,
      className: editVoterForm.className.trim(),
      gender: editVoterForm.gender,
      pin: editVoterForm.pin.trim().toUpperCase() || editingVoter.pin
    };

    db.saveVoter(updated);
    setIsEditVoterModalOpen(false);
    reloadData();
    showNotice(`Data pemilih ${updated.fullName} (NIS: ${cleanNis}) berhasil diperbarui.`);
  };

  const handleResetPin = (voter: Voter) => {
    if (voter.hasVoted) {
      showNotice('Siswa ini sudah menggunakan hak suara. PIN tidak dapat direset.');
      return;
    }
    const newPin = db.resetVoterPin(voter.id);
    reloadData();
    showNotice(`PIN siswa ${voter.fullName} berhasil direset menjadi: ${newPin}`);
  };

  const handleBatchGeneratePins = () => {
    if (confirm('Re-generate PIN acak baru untuk semua pemilih yang BELUM mencoblos? PIN lama akan tergantikan.')) {
      db.generateAllPins(activePeriod.id);
      reloadData();
      showNotice('Batch PIN 6 digit baru berhasil dibuat untuk seluruh DPT!');
    }
  };

  const handleImportSampleCsv = () => {
    const samples = [
      { nis: '0081234051', nisn: '0081234051', fullName: 'Rizaldi Ahmad Syauqi', className: 'X MIPA 2', gender: 'L' as const, pin: '', electionPeriodId: activePeriod.id },
      { nis: '0081234052', nisn: '0081234052', fullName: 'Tiara Putri Azzahra', className: 'X IPS 1', gender: 'P' as const, pin: '', electionPeriodId: activePeriod.id },
      { nis: '0081234053', nisn: '0081234053', fullName: 'Wahyu Hidayatullah', className: 'XI MIPA 3', gender: 'L' as const, pin: '', electionPeriodId: activePeriod.id },
      { nis: '0081234054', nisn: '0081234054', fullName: 'Zahra Amelia Santoso', className: 'XII IPS 2', gender: 'P' as const, pin: '', electionPeriodId: activePeriod.id }
    ];
    const added = db.importVoters(samples);
    reloadData();
    showNotice(`${added} siswa berhasil diimpor dari berkas template.`);
  };

  const handleClearDpt = () => {
    if (confirm(`PERINGATAN: Hapus seluruh ${voters.length} siswa dalam DPT periode aktif ini? Tindakan ini tidak dapat dibatalkan.`)) {
      db.clearVoters(activePeriod.id);
      reloadData();
      setDptPage(1);
      showNotice('DPT periode aktif berhasil dikosongkan.');
    }
  };

  // Filter DPT list
  const classes = Array.from(new Set(voters.map(v => v.className))).sort();
  const filteredVoters = voters.filter(v => {
    const voterNis = v.nisn || v.nis || '';
    const matchSearch = v.fullName.toLowerCase().includes(dptSearch.toLowerCase()) || voterNis.includes(dptSearch);
    const matchClass = dptClassFilter === 'ALL' || v.className === dptClassFilter;
    const matchStatus = dptStatusFilter === 'ALL' ||
      (dptStatusFilter === 'VOTED' && v.hasVoted) ||
      (dptStatusFilter === 'UNVOTED' && !v.hasVoted);
    return matchSearch && matchClass && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredVoters.length / pageSize));
  const currentPageSafe = Math.min(dptPage, totalPages);
  const paginatedVoters = filteredVoters.slice((currentPageSafe - 1) * pageSize, currentPageSafe * pageSize);

  const totalVoted = voters.filter(v => v.hasVoted).length;
  const totalUnvoted = voters.length - totalVoted;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Login Panitia Pemilihan</h2>
          <p className="text-xs text-slate-500">
            Masuk untuk mengelola Paslon, DPT Siswa, dan Kredensial Bilik Suara.
          </p>
        </div>

        {loginError && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Username Panitia</label>
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition"
          >
            Masuk ke Panel Panitia
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            onClick={onBackToHome}
            className="text-xs text-slate-500 hover:text-slate-800 transition"
          >
            Kembali ke Beranda Publik
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notice */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs border border-slate-700 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
              PANITIA PEMILIHAN RESMI (SK: {committee.skNumber})
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Ketua: {committee.leaderName}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Dashboard Panitia Pemilihan ({school.type})
          </h1>
          <p className="text-xs text-slate-500">
            Kelola pasangan calon, daftar pemilih tetap, token PIN acak, dan pantau progres bilik suara secara akuntabel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu Token Pemilih</span>
          </button>

          <button
            onClick={() => {
              setIsAuthenticated(false);
              showNotice('Anda telah berhasil keluar dari akun Panitia Pemilihan.');
            }}
            className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-red-200"
            title="Keluar / Log Out dari Akun Panitia"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('PASLON')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'PASLON'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>Pasangan Calon ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DPT')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'DPT'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pengelolaan DPT ({voters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('KREDENSIAL')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'KREDENSIAL'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Generator PIN & Token</span>
        </button>

        <button
          onClick={() => setActiveTab('MONITORING')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'MONITORING'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Monitoring Bilik Suara</span>
        </button>
      </div>

      {/* TAB 1: MANAJEMEN CALON KANDIDAT */}
      {activeTab === 'PASLON' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daftar Calon Kandidat Terdaftar</h3>
              <p className="text-xs text-slate-500">Kandidat tunggal yang aktif pada periode {activePeriod.periodName}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setCandCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    candCategoryFilter === 'ALL'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({candidates.length})
                </button>
                <button
                  onClick={() => setCandCategoryFilter('OSIS')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    candCategoryFilter === 'OSIS'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ketua OSIS ({candidates.filter(c => c.category === 'OSIS').length})
                </button>
                <button
                  onClick={() => setCandCategoryFilter('MPK')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    candCategoryFilter === 'MPK'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ketua MPK ({candidates.filter(c => c.category === 'MPK').length})
                </button>
              </div>

              <button
                onClick={handleOpenAddCandidate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Calon</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {candidates
              .filter(c => candCategoryFilter === 'ALL' || c.category === candCategoryFilter)
              .map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-56 bg-slate-100">
                    <img
                      src={cand.photoUrl}
                      alt={cand.chairmanName}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md">
                      NO. 0{cand.ballotNumber}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg shadow-xs ${
                        cand.category === 'MPK'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        {cand.category === 'MPK' ? 'KETUA MPK' : 'KETUA OSIS'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h4 className="font-black text-base text-slate-900">{cand.chairmanName}</h4>
                      <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                        Kelas: {cand.chairmanClass}
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{cand.tagline}"
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditCandidate(cand)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    title="Edit Data Calon"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCandidateToDelete(cand)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Hapus Calon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PENGELOLAAN DPT */}
      {activeTab === 'DPT' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daftar Pemilih Tetap (DPT)</h3>
              <p className="text-xs text-slate-500">
                Total: {voters.length} Siswa • Sudah Memilih: {totalVoted} • Belum: {totalUnvoted}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Buka panel impor masal 600+ siswa via CSV / Excel / Generator"
              >
                <Upload className="w-4 h-4" />
                <span>Import Masal (CSV / 600+ Siswa)</span>
              </button>

              <button
                onClick={() => setIsAddVoterModalOpen(true)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Siswa</span>
              </button>

              {voters.length > 0 && (
                <button
                  onClick={handleClearDpt}
                  className="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Hapus semua DPT periode ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan DPT</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama siswa atau NISN..."
                value={dptSearch}
                onChange={(e) => {
                  setDptSearch(e.target.value);
                  setDptPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={dptClassFilter}
              onChange={(e) => {
                setDptClassFilter(e.target.value);
                setDptPage(1);
              }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Semua Tingkat / Kelas ({classes.length} Rombel)</option>
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={dptStatusFilter}
              onChange={(e) => {
                setDptStatusFilter(e.target.value);
                setDptPage(1);
              }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Semua Status Pemilihan</option>
              <option value="UNVOTED">Belum Memilih</option>
              <option value="VOTED">Sudah Memilih</option>
            </select>
          </div>

          {/* DPT Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">L/P</th>
                  <th className="py-3 px-4">Token PIN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada data siswa yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedVoters.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {(currentPageSafe - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.nis || v.nisn}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{v.fullName}</td>
                      <td className="py-3 px-4 text-slate-600">{v.className}</td>
                      <td className="py-3 px-4 text-slate-500">{v.gender}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {v.hasVoted ? '••••••' : v.pin}
                      </td>
                      <td className="py-3 px-4">
                        {v.hasVoted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sudah Memilih
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-bold text-[10px]">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Belum Memilih
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditVoter(v)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Edit Data Siswa (Nama, NIS, Kelas, PIN)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!v.hasVoted && (
                            <button
                              onClick={() => handleResetPin(v)}
                              className="px-2 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              title="Reset PIN Siswa"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>PIN</span>
                            </button>
                          )}

                          <button
                            onClick={() => setVoterToDelete(v)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Hapus Siswa dari DPT"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredVoters.length > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
              <div>
                Menampilkan <strong>{(currentPageSafe - 1) * pageSize + 1}</strong> sampai{' '}
                <strong>{Math.min(currentPageSafe * pageSize, filteredVoters.length)}</strong> dari{' '}
                <strong>{filteredVoters.length}</strong> siswa
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDptPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPageSafe <= 1}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-bold transition cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold">
                  Halaman {currentPageSafe} dari {totalPages}
                </span>
                <button
                  onClick={() => setDptPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPageSafe >= totalPages}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-bold transition cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GENERATOR KREDENSIAL & CETAK TOKEN */}
      {activeTab === 'KREDENSIAL' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Import Masal */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Import Masal 600+ Siswa</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Unggah file CSV, salin langsung dari Excel, atau gunakan generator instan 640 siswa SMAN 103 Jakarta.
                </p>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-800">
                <p className="font-bold">Kapasitas Tinggi:</p>
                <p className="text-[11px] mt-0.5">
                  Mendukung ribuan siswa pemilih dengan pembuatan Token PIN acak instan dan penomoran kelas rapi.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Buka Panel Import Masal</span>
            </button>
          </div>

          {/* Card 2: Batch Re-generate PIN */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Batch Re-generate Token PIN</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Menghasilkan 6-karakter alfanumerik acak baru secara otomatis untuk seluruh pemilih yang 
                  <strong> belum mencoblos</strong>. Algoritma meniadakan karakter ambigu (0, O, 1, I).
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                <p className="font-bold">Perhatian Keamanan:</p>
                <p className="text-[11px] mt-0.5">
                  Lakukan re-generate PIN hanya sebelum kartu dicetak dan dibagikan ke siswa di bilik suara.
                </p>
              </div>
            </div>

            <button
              onClick={handleBatchGeneratePins}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Generate Acak Semua PIN Sekarang</span>
            </button>
          </div>

          {/* Card 3: Cetak Kartu A4 */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cetak Lembar Kartu Suara (A4)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Pratinjau dan cetak kartu suara pemilih dalam format grid siap potong A4. Setiap kartu dilengkapi 
                  logo sekolah, nama siswa, kelas, NISN, PIN besar, dan QR Code bilik suara.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800">
                <p className="font-bold">Standar Pembagian Kartu:</p>
                <p className="text-[11px] mt-0.5">
                  Bisa difilter per rombel kelas saat mencetak agar kartu terkelompokkan per kelas siswa.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Buka Pratinjau & Cetak Kartu</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: MONITORING BILIK SUARA */}
      {activeTab === 'MONITORING' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa DPT</span>
              <div className="text-3xl font-black text-slate-900 mt-1">{voters.length}</div>
              <p className="text-xs text-slate-400 mt-1">Daftar Pemilih Terdaftar</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Telah Mencoblos</span>
              <div className="text-3xl font-black text-emerald-600 mt-1">{totalVoted}</div>
              <p className="text-xs text-slate-400 mt-1">{((totalVoted / (voters.length || 1)) * 100).toFixed(1)}% dari total DPT</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Belum Menggunakan Hak</span>
              <div className="text-3xl font-black text-amber-600 mt-1">{totalUnvoted}</div>
              <p className="text-xs text-slate-400 mt-1">Siswa Belum Hadir / Mengantre</p>
            </div>
          </div>

          {/* Breakdown per Class */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Tingkat Partisipasi Per Kelas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {classes.map(c => {
                const classVoters = voters.filter(v => v.className === c);
                const classVoted = classVoters.filter(v => v.hasVoted).length;
                const pct = classVoters.length > 0 ? ((classVoted / classVoters.length) * 100).toFixed(0) : '0';

                return (
                  <div key={c} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">Kelas {c}</span>
                      <span className="font-mono text-indigo-700 font-bold">{classVoted} / {classVoters.length} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT CALON KANDIDAT (TUNGGAL 1 ORANG) */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCandidate ? 'Edit Data Calon Kandidat' : 'Tambah Calon Kandidat Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Kandidat tunggal (1 orang) untuk Pemilihan Ketua {candForm.category}
                </p>
              </div>
              <button
                onClick={() => setIsCandidateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="space-y-4">
              {/* Baris 1: Kategori & No. Urut */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Pemilihan</label>
                  <select
                    value={candForm.category || 'OSIS'}
                    onChange={(e) => setCandForm({ ...candForm, category: e.target.value as 'OSIS' | 'MPK' })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <option value="OSIS">Ketua OSIS (Masa Bakti 2026/2027)</option>
                    <option value="MPK">Ketua MPK (Masa Bakti 2026/2027)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Urut</label>
                  <input
                    type="number"
                    min={1}
                    value={candForm.ballotNumber}
                    onChange={(e) => setCandForm({ ...candForm, ballotNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold font-mono"
                    required
                  />
                </div>
              </div>

              {/* Baris 2: Nama Calon & Kelas (Hanya 1 Orang, Bukan Paslon) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Calon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={candForm.chairmanName}
                    onChange={(e) => setCandForm({ ...candForm, chairmanName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                    placeholder="Nama lengkap siswa"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">* 1 orang kandidat</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas Siswa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={candForm.chairmanClass}
                    onChange={(e) => setCandForm({ ...candForm, chairmanClass: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                    placeholder="Contoh: XI MIPA 1"
                    required
                  />
                </div>
              </div>

              {/* Baris 3: Foto Calon (Solusi Foto Tidak Ada di Google) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Foto Resmi Calon (Rasio 3:4)
                  </label>
                  <span className="text-[11px] text-indigo-700 font-medium">
                    Bisa unggah file langsung dari laptop / gunakan foto bawaan
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {/* Pratinjau Foto */}
                  <div className="w-24 h-32 rounded-xl overflow-hidden bg-slate-200 border-2 border-indigo-300 shrink-0 relative shadow-sm">
                    {candForm.photoUrl ? (
                      <img
                        src={candForm.photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px]">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span>Pratinjau</span>
                      </div>
                    )}
                  </div>

                  {/* Tombol Opsi Unggah / Preset / Inisial */}
                  <div className="flex-1 space-y-2.5 w-full">
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={photoFileInputRef}
                      accept="image/*"
                      onChange={handlePhotoFileUpload}
                      className="hidden"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah Foto dari Laptop / HP</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateInitialsPhoto}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        title="Buat foto grafis inisial resmi jika belum ada foto fisik"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Buat Monogram Inisial</span>
                      </button>
                    </div>

                    {/* Preset Avatars Siswa */}
                    <div>
                      <p className="text-[11px] text-slate-500 font-semibold mb-1">
                        Atau pilih foto avatar pelajar siap pakai:
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {PRESET_STUDENT_AVATARS.map((av, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCandForm(prev => ({ ...prev, photoUrl: av.url }));
                              showNotice(`Foto preset "${av.label}" dipilih.`);
                            }}
                            className={`w-9 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                              candForm.photoUrl === av.url ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-300 opacity-70 hover:opacity-100'
                            }`}
                            title={av.label}
                          >
                            <img src={av.url} alt={av.label} className="w-full h-full object-cover object-top" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* URL Input (Optional) */}
                    <div>
                      <input
                        type="text"
                        value={candForm.photoUrl}
                        onChange={(e) => setCandForm({ ...candForm, photoUrl: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-600"
                        placeholder="Atau tempel tautan URL foto (https://...)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tagline Slogan</label>
                <input
                  type="text"
                  value={candForm.tagline}
                  onChange={(e) => setCandForm({ ...candForm, tagline: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  placeholder="Contoh: Sinergi, Inovatif & Berkarakter"
                />
              </div>

              {/* Visi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Visi Calon</label>
                <textarea
                  rows={2}
                  value={candForm.vision}
                  onChange={(e) => setCandForm({ ...candForm, vision: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  placeholder="Rumusan visi kepemimpinan..."
                />
              </div>

              {/* Misi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Misi Strategis (Poin 1, 2, 3)</label>
                <div className="space-y-1.5">
                  {(candForm.missions || ['', '', '']).slice(0, 3).map((m, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={m}
                      onChange={(e) => {
                        const nextM = [...(candForm.missions || ['', '', ''])];
                        nextM[idx] = e.target.value;
                        setCandForm({ ...candForm, missions: nextM });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      placeholder={`Misi ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Data Calon</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH SISWA DPT (MENGGUNAKAN NIS) */}
      {isAddVoterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Tambah Pemilih Baru (DPT)</h3>
              <button onClick={() => setIsAddVoterModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddVoter} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Induk Siswa (NIS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={newVoterForm.nis}
                  onChange={(e) => setNewVoterForm({ ...newVoterForm, nis: e.target.value })}
                  placeholder="Contoh: 10301"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVoterForm.fullName}
                  onChange={(e) => setNewVoterForm({ ...newVoterForm, fullName: e.target.value })}
                  placeholder="Nama sesuai buku induk sekolah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={newVoterForm.className}
                    onChange={(e) => setNewVoterForm({ ...newVoterForm, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={newVoterForm.gender}
                    onChange={(e) => setNewVoterForm({ ...newVoterForm, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs cursor-pointer"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition mt-2 cursor-pointer shadow-sm"
              >
                Simpan ke DPT
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRINT CARDS MODAL */}
      {isPrintModalOpen && (
        <VoterCardsPrintModal
          voters={voters}
          school={school}
          activePeriod={activePeriod}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* IMPORT 600+ VOTERS MODAL */}
      {isImportModalOpen && (
        <ImportVotersModal
          activePeriodId={activePeriod.id}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={(count) => {
            reloadData();
            setDptPage(1);
            showNotice(`Berhasil mengimpor ${count} siswa pemilih ke DPT!`);
          }}
        />
      )}

      {/* MODAL: EDIT DATA SISWA DPT (MENGGUNAKAN NIS) */}
      {isEditVoterModalOpen && editingVoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Edit Data Pemilih (DPT)</h3>
                <p className="text-[11px] text-slate-500">Perbarui identitas atau token siswa</p>
              </div>
              <button onClick={() => setIsEditVoterModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEditVoter} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Induk Siswa (NIS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={editVoterForm.nis}
                  onChange={(e) => setEditVoterForm({ ...editVoterForm, nis: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={editVoterForm.fullName}
                  onChange={(e) => setEditVoterForm({ ...editVoterForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={editVoterForm.className}
                    onChange={(e) => setEditVoterForm({ ...editVoterForm, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={editVoterForm.gender}
                    onChange={(e) => setEditVoterForm({ ...editVoterForm, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Token PIN (6 Karakter Alfanumerik)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={editVoterForm.pin}
                  onChange={(e) => setEditVoterForm({ ...editVoterForm, pin: e.target.value.toUpperCase() })}
                  disabled={editingVoter.hasVoted}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-wider uppercase disabled:bg-slate-100 disabled:text-slate-400"
                  required
                />
                {editingVoter.hasVoted && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    * Siswa ini sudah mencoblos. PIN terkunci demi integritas suara.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditVoterModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PEMILIH DPT (PENGGANTI WINDOW.CONFIRM) */}
      {voterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Konfirmasi Hapus Pemilih</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data siswa ini dari Daftar Pemilih Tetap (DPT)?
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-900 text-sm">{voterToDelete.fullName}</p>
              <p className="text-slate-600">
                NIS: <span className="font-mono font-bold text-indigo-700">{voterToDelete.nis || voterToDelete.nisn}</span> • Kelas: {voterToDelete.className}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  voterToDelete.hasVoted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {voterToDelete.hasVoted ? 'Sudah Menggunakan Hak Suara' : 'Belum Memilih'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoterToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = voterToDelete.fullName;
                  const nis = voterToDelete.nis || voterToDelete.nisn;
                  db.deleteVoter(voterToDelete.id);
                  reloadData();
                  setVoterToDelete(null);
                  showNotice(`Siswa "${name}" (NIS: ${nis}) berhasil dihapus dari DPT.`);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Pemilih</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS CALON KANDIDAT (PENGGANTI WINDOW.CONFIRM) */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Konfirmasi Hapus Calon</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data calon kandidat ini?
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center gap-3">
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                <img src={candidateToDelete.photoUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-0.5">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded">
                  Calon Ketua {candidateToDelete.category} • No. 0{candidateToDelete.ballotNumber}
                </span>
                <p className="font-bold text-slate-900 text-sm mt-1">{candidateToDelete.chairmanName}</p>
                <p className="text-slate-500">Kelas: {candidateToDelete.chairmanClass}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = candidateToDelete.chairmanName;
                  db.deleteCandidate(candidateToDelete.id);
                  reloadData();
                  setCandidateToDelete(null);
                  showNotice(`Data calon "${name}" berhasil dihapus.`);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Calon</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
