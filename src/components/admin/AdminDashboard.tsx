import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import {
  School,
  ElectionPeriod,
  Committee,
  AuditLog,
  Candidate,
  AnonymousVote,
  Voter,
  SystemUser,
  SystemUserRole,
  SupabaseConfig
} from '../../types';
import { BahpPrintModal } from '../print/BahpPrintModal';
import { ResetVotesModal } from '../common/ResetVotesModal';
import { cloudSync } from '../../lib/supabaseSync';
import QRCode from 'qrcode';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  getSupabaseClient
} from '../../lib/supabase';
import {
  ShieldAlert,
  Building,
  Calendar,
  FileText,
  Award,
  Plus,
  Play,
  Square,
  CheckCircle,
  RotateCcw,
  Search,
  Lock,
  Download,
  Printer,
  UserCheck,
  UserPlus,
  Edit2,
  Trash2,
  LogOut,
  Database,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  Cloud,
  CheckCircle2,
  ShieldCheck,
  X
} from 'lucide-react';

interface Props {
  onBackToHome: () => void;
}

type AdminTab = 'INSTITUSI' | 'PERIODE' | 'PANITIA' | 'USERS' | 'DATABASE' | 'AUDIT' | 'BAHP';

export const AdminDashboard: React.FC<Props> = ({ onBackToHome }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true for smooth testing
  const [loginUsername, setLoginUsername] = useState('admin103');
  const [loginPassword, setLoginPassword] = useState('ADMIN103_SUPER');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Core Data
  const [school, setSchool] = useState<School>(db.getSchool());
  const [periods, setPeriods] = useState<ElectionPeriod[]>(db.getPeriods());
  const [activePeriod, setActivePeriod] = useState<ElectionPeriod>(db.getActivePeriod());
  const [committee, setCommittee] = useState<Committee>(db.getCommittee());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(db.getAuditLogs());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<AnonymousVote[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(db.getUsers());

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('INSTITUSI');

  // School & Committee Form
  const [schoolForm, setSchoolForm] = useState<School>(school);
  const [committeeForm, setCommitteeForm] = useState<Committee>(committee);

  // Period Modals & Forms
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false);
  const [isEditPeriodModalOpen, setIsEditPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<ElectionPeriod | null>(null);
  const [newPeriodForm, setNewPeriodForm] = useState({
    periodName: 'Pemilihan Ketua OSIS dan Ketua MPK Periode 2026/2027',
    academicYear: '2026/2027',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    status: 'draft' as const,
    description: 'Periode pemilihan baru'
  });

  // User Management State & Modals
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'operator' as SystemUserRole,
    password: '',
    phoneNumber: ''
  });
  const [editUserForm, setEditUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'operator' as SystemUserRole,
    password: '',
    phoneNumber: '',
    isActive: true
  });

  // Supabase Configuration State
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfig>(getSupabaseConfig());
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });
  const [isCopiedSql, setIsCopiedSql] = useState(false);
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [isPullingFromSupabase, setIsPullingFromSupabase] = useState(false);
  const [isResetVotesModalOpen, setIsResetVotesModalOpen] = useState(false);
  const [isResetDbModalOpen, setIsResetDbModalOpen] = useState(false);
  const [qrCodeShareUrl, setQrCodeShareUrl] = useState('');
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Other Modals
  const [isBahpModalOpen, setIsBahpModalOpen] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const reloadAll = () => {
    const curSchool = db.getSchool();
    const curPeriods = db.getPeriods();
    const curActive = db.getActivePeriod();
    const curCommittee = db.getCommittee(curActive.id);
    setSchool(curSchool);
    setSchoolForm(curSchool);
    setPeriods(curPeriods);
    setActivePeriod(curActive);
    setCommittee(curCommittee);
    setCommitteeForm(curCommittee);
    setAuditLogs(db.getAuditLogs());
    setCandidates(db.getCandidates(curActive.id));
    setVotes(db.getVotes(curActive.id));
    setVoters(db.getVoters(curActive.id));
    setSystemUsers(db.getUsers());
    setSupabaseConfigState(getSupabaseConfig());
  };

  useEffect(() => {
    reloadAll();
    const handleStorageChange = () => reloadAll();
    window.addEventListener('epilketos_state_change', handleStorageChange);
    return () => window.removeEventListener('epilketos_state_change', handleStorageChange);
  }, []);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3800);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const users = db.getUsers();
    const foundAdmin = users.find(
      u => u.username === loginUsername && (u.role === 'admin' || u.role === 'panitia')
    );

    if (
      (loginUsername === 'admin103' && loginPassword === 'ADMIN103_SUPER') ||
      (foundAdmin && foundAdmin.password === loginPassword)
    ) {
      setIsAuthenticated(true);
      notify(`Selamat datang, ${foundAdmin ? foundAdmin.fullName : 'Superadmin Sekolah'}!`);
    } else {
      setLoginError('Kredensial Superadmin tidak valid. Gunakan username: admin103 dan password: ADMIN103_SUPER');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    notify('Anda telah berhasil keluar (Log Out) dari Panel Admin.');
  };

  // Save School
  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSchool(schoolForm);
    reloadAll();
    notify('Konfigurasi satuan pendidikan berhasil diperbarui.');
  };

  // Save Committee
  const handleSaveCommittee = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateCommittee(committeeForm);
    reloadAll();
    notify('Data SK dan Akun Panitia berhasil diperbarui.');
  };

  // Period Actions
  const handleActivatePeriod = (id: string, name: string) => {
    if (confirm(`Aktifkan "${name}" sebagai periode pemilihan utama? Periode aktif lain akan otomatis dinonaktifkan.`)) {
      db.setActivePeriod(id);
      reloadAll();
      notify(`Periode "${name}" sekarang berstatus AKTIF.`);
    }
  };

  const handleClosePeriod = (id: string, name: string) => {
    if (confirm(`Tutup pemungutan suara untuk periode "${name}"? Siswa tidak akan dapat mencoblos lagi pada periode ini.`)) {
      db.closePeriod(id);
      reloadAll();
      notify(`Pemungutan suara periode "${name}" telah RESMI DITUTUP.`);
    }
  };

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    db.createPeriod({
      schoolId: school.id,
      periodName: newPeriodForm.periodName,
      academicYear: newPeriodForm.academicYear,
      startDate: newPeriodForm.startDate,
      endDate: newPeriodForm.endDate,
      status: newPeriodForm.status,
      description: newPeriodForm.description
    });
    setIsNewPeriodModalOpen(false);
    reloadAll();
    notify('Periode pemilihan baru berhasil dibuat.');
  };

  const handleOpenEditPeriod = (p: ElectionPeriod) => {
    setEditingPeriod(p);
    setIsEditPeriodModalOpen(true);
  };

  const handleSaveEditPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod) return;
    db.updatePeriod(editingPeriod);
    setIsEditPeriodModalOpen(false);
    reloadAll();
    notify(`Periode "${editingPeriod.periodName}" berhasil diperbarui.`);
  };

  const handleDeletePeriod = (p: ElectionPeriod) => {
    if (p.status === 'aktif') {
      alert('Tidak dapat menghapus periode yang sedang berstatus AKTIF. Ubah status periode terlebih dahulu.');
      return;
    }
    if (confirm(`Hapus periode pemilihan "${p.periodName}" (Tahun ${p.academicYear})?`)) {
      try {
        db.deletePeriod(p.id);
        reloadAll();
        notify(`Periode "${p.periodName}" berhasil dihapus.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(msg);
      }
    }
  };

  // User Management Actions
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.fullName.trim() || !newUserForm.password.trim()) {
      alert('Username, Nama Lengkap, dan Password wajib diisi.');
      return;
    }

    const cleanUsername = newUserForm.username.trim().toLowerCase();
    const existing = systemUsers.find(u => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      alert(`Username "${cleanUsername}" sudah digunakan oleh pengguna lain.`);
      return;
    }

    const newUser: SystemUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      fullName: newUserForm.fullName.trim(),
      email: newUserForm.email.trim() || `${cleanUsername}@sman103jakarta.sch.id`,
      role: newUserForm.role,
      password: newUserForm.password.trim(),
      phoneNumber: newUserForm.phoneNumber.trim(),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    db.saveUser(newUser);
    setIsNewUserModalOpen(false);
    setNewUserForm({
      username: '',
      fullName: '',
      email: '',
      role: 'operator',
      password: '',
      phoneNumber: ''
    });
    reloadAll();
    notify(`Pengguna baru ${newUser.fullName} (${newUser.role.toUpperCase()}) berhasil ditambahkan.`);
  };

  const handleOpenEditUser = (u: SystemUser) => {
    setEditingUser(u);
    setEditUserForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      password: u.password || '',
      phoneNumber: u.phoneNumber || '',
      isActive: u.isActive
    });
    setIsEditUserModalOpen(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUser: SystemUser = {
      ...editingUser,
      fullName: editUserForm.fullName.trim(),
      email: editUserForm.email.trim(),
      role: editUserForm.role,
      password: editUserForm.password.trim() || editingUser.password,
      phoneNumber: editUserForm.phoneNumber.trim(),
      isActive: editUserForm.isActive
    };

    db.saveUser(updatedUser);
    setIsEditUserModalOpen(false);
    reloadAll();
    notify(`Data pengguna "${updatedUser.username}" berhasil diperbarui.`);
  };

  const handleDeleteUser = (u: SystemUser) => {
    if (u.username === 'admin103') {
      alert('Akun Superadmin Utama (admin103) tidak dapat dihapus demi keamanan sistem.');
      return;
    }
    if (confirm(`Yakin ingin menghapus akun pengguna "${u.fullName}" (${u.username})?`)) {
      try {
        db.deleteUser(u.id);
        reloadAll();
        notify(`Akun ${u.username} berhasil dihapus.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(msg);
      }
    }
  };

  const handleToggleUserStatus = (u: SystemUser) => {
    try {
      db.toggleUserStatus(u.id);
      reloadAll();
      notify(`Status akun ${u.username} diubah menjadi ${!u.isActive ? 'AKTIF' : 'NONAKTIF'}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    }
  };

  // Supabase Actions
  const handleTestSupabase = async () => {
    setSupabaseTestStatus({ loading: true });
    const res = await testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey);
    setSupabaseTestStatus({
      loading: false,
      success: res.success,
      message: res.message
    });
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(supabaseConfig);
    notify('Konfigurasi database Supabase Cloud berhasil disimpan!');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 3000);
    notify('Skrip SQL DDL Supabase berhasil disalin ke clipboard!');
  };

  const handleSyncToSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      alert('Supabase belum aktif atau URL/Anon Key belum lengkap.');
      return;
    }

    setIsSyncingToSupabase(true);
    try {
      // 1. Sync School
      await client.from('schools').upsert({
        id: school.id,
        name: school.name,
        type: school.type,
        npsn: school.npsn,
        address: school.address,
        principal_name: school.principalName,
        principal_nip: school.principalNip,
        logo_url: school.logoUrl,
        academic_year_default: school.academicYearDefault
      });

      // 2. Sync Active Period
      await client.from('election_periods').upsert(
        periods.map(p => ({
          id: p.id,
          school_id: p.schoolId,
          period_name: p.periodName,
          academic_year: p.academicYear,
          start_date: p.startDate,
          end_date: p.endDate,
          status: p.status,
          description: p.description
        }))
      );

      // 3. Sync Candidates
      if (candidates.length > 0) {
        await client.from('candidates').upsert(
          candidates.map(c => ({
            id: c.id,
            election_period_id: c.electionPeriodId,
            category: c.category,
            ballot_number: c.ballotNumber,
            chairman_name: c.chairmanName,
            chairman_class: c.chairmanClass,
            vice_chairman_name: c.viceChairmanName,
            vice_chairman_class: c.viceChairmanClass,
            photo_url: c.photoUrl,
            tagline: c.tagline,
            vision: c.vision,
            missions: c.missions,
            programs: c.programs,
            video_url: c.videoUrl
          }))
        );
      }

      // 4. Sync Voters
      if (voters.length > 0) {
        await client.from('voters').upsert(
          voters.map(v => ({
            id: v.id,
            election_period_id: v.electionPeriodId,
            nisn: v.nisn,
            full_name: v.fullName,
            class_name: v.className,
            gender: v.gender,
            pin: v.pin,
            has_voted: v.hasVoted,
            voted_at: v.votedAt
          }))
        );
      }

      // 5. Sync Users
      await client.from('system_users').upsert(
        systemUsers.map(u => ({
          id: u.id,
          username: u.username,
          full_name: u.fullName,
          email: u.email,
          role: u.role,
          password: u.password,
          is_active: u.isActive,
          phone_number: u.phoneNumber
        }))
      );

      notify(`Berhasil sinkronisasi: ${voters.length} Pemilih, ${candidates.length} Paslon, dan ${systemUsers.length} Pengguna ke Supabase Cloud!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Gagal sinkronisasi data ke Supabase: ${msg}`);
    } finally {
      setIsSyncingToSupabase(false);
    }
  };

  // QR Code generator untuk link bagikan ke PC lain
  useEffect(() => {
    if (supabaseConfig.isEnabled && supabaseConfig.url && supabaseConfig.anonKey) {
      const link = cloudSync.getShareableConnectLink();
      if (link) {
        QRCode.toDataURL(link, { width: 200, margin: 2 })
          .then(url => setQrCodeShareUrl(url))
          .catch(() => {});
      }
    }
  }, [supabaseConfig]);

  const handlePullFromSupabase = async () => {
    setIsPullingFromSupabase(true);
    try {
      const res = await cloudSync.pullAll();
      reloadAll();
      notify(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Gagal menarik data dari Supabase: ${msg}`);
    } finally {
      setIsPullingFromSupabase(false);
    }
  };

  const handleConfirmResetDatabase = () => {
    db.resetToDefault();
    reloadAll();
    setIsResetDbModalOpen(false);
    notify('Database berhasil direset ke setelan awal pabrik.');
  };

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(l =>
    l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    l.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
    l.ipAddress.includes(auditSearch)
  );

  // Filter users
  const filteredUsers = systemUsers.filter(u => {
    const matchSearch =
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  // Render Login Form if logged out
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 animate-in fade-in">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Login Superadmin Sekolah</h2>
          <p className="text-xs text-slate-500">
            Akses otoritas tinggi untuk manajemen institusi, periode, panitia, pengguna, dan database cloud.
          </p>
        </div>

        {loginError && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Username Superadmin</label>
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              * Kredensial default: <code className="font-bold text-purple-700">admin103</code> / <code className="font-bold text-purple-700">ADMIN103_SUPER</code>
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Masuk ke Panel Superadmin</span>
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            onClick={onBackToHome}
            className="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            ← Kembali ke Beranda Publik
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs border border-slate-700 animate-in slide-in-from-bottom">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              PANEL OTORITAS TINGGI (SUPERADMIN SEKOLAH)
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Kepsek: {school.principalName}</span>
            {supabaseConfig.isEnabled && supabaseConfig.url && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                <Cloud className="w-3 h-3 text-emerald-600" />
                Supabase Cloud Aktif
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Manajemen Institusi & Pengesahan Pemilihan
          </h1>
          <p className="text-xs text-slate-500">
            Kendali penuh atas tahun pemilihan multi-periode, pengesahan SK Panitia, manajemen hak akses user (CRUD), dan integrasi database Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsBahpModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Cetak Berita Acara (BAHP)</span>
          </button>

          <button
            onClick={() => setIsResetVotesModalOpen(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-rose-200 shadow-xs"
            title="Kosongkan seluruh suara uji coba agar hasil kembali 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kosongkan Suara Testing</span>
          </button>

          <button
            onClick={() => setIsResetDbModalOpen(true)}
            className="px-3 py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Reset database ke data awal contoh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          {/* Prominent Log Out button for Admin */}
          <button
            onClick={handleLogout}
            className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-red-200 shadow-xs"
            title="Keluar / Log Out dari Sesi Admin Sekolah"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('INSTITUSI')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'INSTITUSI'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Konfigurasi Satuan Pendidikan</span>
        </button>

        <button
          onClick={() => setActiveTab('PERIODE')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'PERIODE'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Manajemen Periode ({periods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PANITIA')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'PANITIA'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>SK & Akun Panitia</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'USERS'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Manajemen User (CRUD) ({systemUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DATABASE')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'DATABASE'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database Supabase Cloud</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'AUDIT'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Audit Trails ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BAHP')}
          className={`py-3 px-4 rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'BAHP'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Pengesahan Hasil (BAHP)</span>
        </button>
      </div>

      {/* TAB 1: KONFIGURASI INSTITUSI */}
      {activeTab === 'INSTITUSI' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Identitas Sekolah / Madrasah</h3>
            <p className="text-xs text-slate-500">
              Pengaturan ini akan digunakan pada kop surat, kartu pemilih, dan dokumen Berita Acara resmi.
            </p>
          </div>

          <form onSubmit={handleSaveSchool} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Kepengurusan
                </label>
                <select
                  value={schoolForm.type}
                  onChange={(e) => setSchoolForm({ ...schoolForm, type: e.target.value as 'OSIS' | 'OSIM' })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="OSIS">OSIS (Organisasi Siswa Intra Sekolah)</option>
                  <option value="OSIM">OSIM (Organisasi Siswa Intra Madrasah)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NPSN Institusi
                </label>
                <input
                  type="text"
                  value={schoolForm.npsn}
                  onChange={(e) => setSchoolForm({ ...schoolForm, npsn: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap Sekolah / Madrasah
              </label>
              <input
                type="text"
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Lengkap Satuan Pendidikan
              </label>
              <textarea
                rows={2}
                value={schoolForm.address}
                onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kepala Sekolah / Madrasah
                </label>
                <input
                  type="text"
                  value={schoolForm.principalName}
                  onChange={(e) => setSchoolForm({ ...schoolForm, principalName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={schoolForm.principalNip}
                  onChange={(e) => setSchoolForm({ ...schoolForm, principalNip: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Simpan Perubahan Institusi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MANAJEMEN PERIODE DINAMIS (CRUD) */}
      {activeTab === 'PERIODE' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Arsitektur Multi-Periode Dinamis (CRUD)</h3>
              <p className="text-xs text-slate-500">
                Sistem dirancang dapat digunakan kembali setiap tahun. Hanya 1 periode yang berstatus aktif dalam satu waktu.
              </p>
            </div>

            <button
              onClick={() => setIsNewPeriodModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Periode Baru</span>
            </button>
          </div>

          <div className="space-y-4">
            {periods.map((p) => {
              const isActive = p.status === 'aktif';
              const isClosed = p.status === 'selesai';

              return (
                <div
                  key={p.id}
                  className={`p-6 rounded-3xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : isClosed
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-xs font-mono text-slate-500">ID: {p.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-bold text-indigo-700">Tahun {p.academicYear}</span>
                    </div>

                    <h4 className="text-lg font-black text-slate-900">{p.periodName}</h4>
                    <p className="text-xs text-slate-500">{p.description}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Jadwal: {new Date(p.startDate).toLocaleDateString()} s/d {new Date(p.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                    <button
                      onClick={() => handleOpenEditPeriod(p)}
                      className="px-3 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Edit Nama / Tahun / Jadwal Periode"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {!isActive && (
                      <button
                        onClick={() => handleActivatePeriod(p.id, p.periodName)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Aktifkan</span>
                      </button>
                    )}

                    {isActive && (
                      <button
                        onClick={() => handleClosePeriod(p.id, p.periodName)}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Tutup Pemungutan</span>
                      </button>
                    )}

                    {!isActive && (
                      <button
                        onClick={() => handleDeletePeriod(p)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="Hapus Periode Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SK & AKUN PANITIA */}
      {activeTab === 'PANITIA' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-slate-900">Surat Keputusan (SK) & Kredensial Panitia</h3>
            <p className="text-xs text-slate-500">
              Otorisasi panitia pemilihan OSIS/MPK resmi yang bertugas mengelola DPT dan bilik suara.
            </p>
          </div>

          <form onSubmit={handleSaveCommittee} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SK Kepala Sekolah</label>
                <input
                  type="text"
                  value={committeeForm.skNumber}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, skNumber: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pengesahan SK</label>
                <input
                  type="date"
                  value={committeeForm.skDate}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, skDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ketua Panitia Pemilihan</label>
                <input
                  type="text"
                  value={committeeForm.leaderName}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, leaderName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sekretaris Panitia</label>
                <input
                  type="text"
                  value={committeeForm.secretaryName}
                  onChange={(e) => setCommitteeForm({ ...committeeForm, secretaryName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
              <span className="font-bold text-indigo-900 text-xs">Akun Login Akses Panel Panitia:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Username Panitia</label>
                  <input
                    type="text"
                    value={committeeForm.username}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, username: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Password Panitia</label>
                  <input
                    type="text"
                    value={committeeForm.password || 'TREVOOORA'}
                    onChange={(e) => setCommitteeForm({ ...committeeForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Perbarui SK & Akun Panitia
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MANAJEMEN USER / PENGGUNA (CRUD) */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Manajemen Pengguna Sistem (CRUD User)</h3>
              <p className="text-xs text-slate-500">
                Kelola hak akses Superadmin Sekolah, Panitia Pemilihan, Operator Bilik Suara, dan Pengawas/Saksi.
              </p>
            </div>

            <button
              onClick={() => setIsNewUserModalOpen(true)}
              className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah User Baru</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama pengguna, username, atau email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Semua Tingkat Hak Akses / Role</option>
              <option value="admin">Superadmin Sekolah</option>
              <option value="panitia">Panitia Pemilihan</option>
              <option value="operator">Operator Bilik Suara</option>
              <option value="pengawas">Pengawas / Saksi Pemilihan</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role / Hak Akses</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Kontak / Email</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada pengguna yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {u.id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-900">
                        @{u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'panitia'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : u.role === 'operator'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Klik untuk ubah status aktif/nonaktif"
                        >
                          {u.isActive ? '● Aktif' : '○ Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-medium">{u.email}</div>
                        {u.phoneNumber && (
                          <div className="text-[11px] text-slate-400 font-mono">{u.phoneNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Edit Data User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.username !== 'admin103' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Hapus Akun User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DATABASE SUPABASE CLOUD INTEGRATION */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6">
          {/* Penjelasan Masalah Penyimpanan Statis vs Dinamis */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-indigo-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  PEMAHAMAN ARSITEKTUR PENYIMPANAN DATA
                </span>
                <h3 className="text-lg sm:text-xl font-black">
                  Mengapa Data Sebelumnya Hilang Saat Laptop Dimatikan?
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 space-y-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Mode Awal (Browser LocalStorage Sandbox):
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Secara default dalam preview web builder AI Studio, data disimpan di memori browser lokal (*browser localStorage sandbox* di dalam iframe). Ketika laptop dimatikan, browser menutup sesi atau merestart partisi isolasi domain, sehingga data tersimpan kembali ke data inisial bawaan (*initial demo data*).
                </p>
              </div>

              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 space-y-2">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Solusi Permanen (Supabase Cloud PostgreSQL):
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Dengan mengaktifkan **Supabase Cloud**, seluruh data (Sekolah, Paslon, 600+ DPT Siswa, Token PIN, dan Suara Bilik) tersimpan di server PostgreSQL terenkripsi di cloud. Data menjadi **100% permanen**, tidak akan pernah hilang meskipun laptop dimatikan, dan dapat diakses bersamaan oleh puluhan laptop panitia dan bilik suara!
                </p>
              </div>
            </div>
          </div>

          {/* Form Konfigurasi Supabase */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfigurasi Koneksi Supabase Project</h3>
                <p className="text-xs text-slate-500">
                  Dapatkan URL dan Anon Key gratis dari dashboard project Anda di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">supabase.com</a>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isCopiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedSql ? 'Tersalin!' : 'Salin Skrip SQL Schema'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 max-w-3xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://yourprojectid.supabase.co"
                  value={supabaseConfig.url}
                  onChange={(e) => setSupabaseConfigState({ ...supabaseConfig, url: e.target.value.trim() })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Anon (Public) API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseConfig.anonKey}
                  onChange={(e) => setSupabaseConfigState({ ...supabaseConfig, anonKey: e.target.value.trim() })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supabaseConfig.isEnabled}
                    onChange={(e) => setSupabaseConfigState({ ...supabaseConfig, isEnabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Aktifkan Penyimpanan Supabase Cloud PostgreSQL</span>
                </label>
              </div>

              {/* Status Test Box */}
              {supabaseTestStatus.message && (
                <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
                  supabaseTestStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {supabaseTestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{supabaseTestStatus.message}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={supabaseTestStatus.loading || !supabaseConfig.url || !supabaseConfig.anonKey}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${supabaseTestStatus.loading ? 'animate-spin' : ''}`} />
                  <span>{supabaseTestStatus.loading ? 'Menguji...' : 'Uji Koneksi Supabase'}</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Simpan Konfigurasi Supabase</span>
                </button>

                {supabaseConfig.isEnabled && supabaseConfig.url && (
                  <>
                    <button
                      type="button"
                      onClick={handleSyncToSupabase}
                      disabled={isSyncingToSupabase}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                      title="Unggah data DPT dan Calon lokal ke Supabase Cloud"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingToSupabase ? 'animate-spin' : ''}`} />
                      <span>{isSyncingToSupabase ? 'Menyinkronkan...' : 'Unggah Data ke Supabase (Push)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePullFromSupabase}
                      disabled={isPullingFromSupabase}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                      title="Tarik data DPT, Calon, dan Suara terbaru dari Supabase Cloud ke browser ini"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isPullingFromSupabase ? 'animate-spin' : ''}`} />
                      <span>{isPullingFromSupabase ? 'Mengunduh...' : 'Tarik Data dari Cloud (Pull)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsResetVotesModalOpen(true)}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Kosongkan seluruh suara uji coba di Supabase dan lokal"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      <span>Kosongkan Suara Testing</span>
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>

          {/* Bagikan Tautan Koneksi Antar-PC (Bilik Suara & Layar Proyektor) */}
          {supabaseConfig.isEnabled && supabaseConfig.url && (
            <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>Bagikan Tautan Koneksi ke Laptop Bilik Suara / PC 2</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Gunakan tautan atau QR Code ini agar laptop bilik suara langsung terhubung ke Supabase Cloud otomatis tanpa perlu ketik API Key manual.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Tautan Cepat Langsung Terhubung (Bilik Suara):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={cloudSync.getShareableConnectLink()}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const link = cloudSync.getShareableConnectLink();
                        navigator.clipboard.writeText(link);
                        setCopiedShareLink(true);
                        notify('Tautan koneksi berhasil disalin ke clipboard!');
                        setTimeout(() => setCopiedShareLink(false), 2500);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      {copiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedShareLink ? 'Tersalin!' : 'Salin Tautan'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    💡 Cara Penggunaan: Buka browser di PC Bilik Suara / PC 2, paste tautan ini, dan tekan Enter. PC tersebut akan langsung terhubung ke database Supabase yang sama secara otomatis!
                  </p>
                </div>

                {qrCodeShareUrl && (
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-emerald-200 shadow-xs">
                    <img src={qrCodeShareUrl} alt="QR Code Bilik Suara" className="w-28 h-28 rounded-lg" />
                    <span className="text-[10px] font-bold text-slate-500 mt-1">Scan via Tablet / HP</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3 Langkah Mudah Mengaktifkan Supabase */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>3 Langkah Cepat Mengaktifkan Supabase Permanen:</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">1</span>
                <p className="font-bold text-slate-900">Buat Project Gratis di Supabase</p>
                <p className="text-slate-500 text-[11px]">Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">supabase.com</a>, daftar, lalu klik "New Project" (pilih Region terdekat: Singapore).</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">2</span>
                <p className="font-bold text-slate-900">Jalankan Skrip SQL Schema</p>
                <p className="text-slate-500 text-[11px]">Klik tombol hitam <strong>"Salin Skrip SQL Schema"</strong> di atas, buka menu <strong>SQL Editor</strong> di Supabase, paste, lalu klik <strong>Run</strong>.</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">3</span>
                <p className="font-bold text-slate-900">Salin URL & API Key ke Sini</p>
                <p className="text-slate-500 text-[11px]">Buka Project Settings di Supabase &rarr; API, salin <strong>Project URL</strong> dan <strong>anon key</strong> ke form di atas, centang aktifkan, lalu klik Simpan.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAILS */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Catatan Jejak Audit (Audit Trails)</h3>
              <p className="text-xs text-slate-500">
                Setiap tindakan penting oleh Admin, Panitia, Siswa, dan Sistem dicatat otomatis.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari audit log..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Aktor</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Aktivitas / Log</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.slice(0, 25).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800">{log.actor}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] uppercase font-bold">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">{log.action}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{log.ipAddress}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: PENGESAHAN HASIL (BAHP) */}
      {activeTab === 'BAHP' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Penerbitan Berita Acara Hasil Pemilihan (BAHP)</h3>
              <p className="text-xs text-slate-500">
                Dokumen yuridis formal yang mengesahkan pemenang pemilihan Ketua OSIS & MPK dengan tanda tangan Kepala Sekolah.
              </p>
            </div>

            <button
              onClick={() => setIsBahpModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Buka Pratinjau & Cetak BAHP</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold uppercase">Status Periode</span>
              <div className="text-2xl font-black text-indigo-700 uppercase mt-1">{activePeriod.status}</div>
              <p className="text-xs text-slate-400 mt-1">{activePeriod.periodName}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold uppercase">Pengesahan Kepala Sekolah</span>
              <div className="text-sm font-black text-emerald-700 mt-1">SIAP DISAHKAN & DITANDATANGANI</div>
              <p className="text-xs text-slate-400 mt-1">{school.principalName}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUAT PERIODE BARU */}
      {isNewPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Buat Periode Pemilihan Baru</h3>
              <button onClick={() => setIsNewPeriodModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Periode</label>
                <input
                  type="text"
                  value={newPeriodForm.periodName}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, periodName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  value={newPeriodForm.academicYear}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, academicYear: e.target.value })}
                  placeholder="2027/2028"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  value={newPeriodForm.description}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPeriodModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PERIODE */}
      {isEditPeriodModalOpen && editingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Periode Pemilihan</h3>
              <button onClick={() => setIsEditPeriodModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPeriod} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Periode</label>
                <input
                  type="text"
                  value={editingPeriod.periodName}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, periodName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={editingPeriod.academicYear}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Periode</label>
                  <select
                    value={editingPeriod.status}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, status: e.target.value as 'draft' | 'aktif' | 'selesai' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="draft">Draft (Persiapan)</option>
                    <option value="aktif">Aktif (Sedang Berjalan)</option>
                    <option value="selesai">Selesai (Diarsipkan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Periode</label>
                <textarea
                  rows={2}
                  value={editingPeriod.description || ''}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditPeriodModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH USER BARU (CRUD) */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Tambah Akun Pengguna Baru</h3>
              <button onClick={() => setIsNewUserModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username Unik</label>
                  <input
                    type="text"
                    placeholder="operator_bilik2"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Hak Akses</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as SystemUserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="operator">Operator Bilik</option>
                    <option value="panitia">Panitia Pemilihan</option>
                    <option value="pengawas">Pengawas / Saksi</option>
                    <option value="admin">Superadmin Sekolah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  placeholder="Minimal 6 karakter"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="budi@sman103jakarta.sch.id"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor HP / WhatsApp</label>
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={newUserForm.phoneNumber}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER (CRUD) */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Edit Akun Pengguna</h3>
                <p className="text-[11px] text-slate-500">@{editingUser.username}</p>
              </div>
              <button onClick={() => setIsEditUserModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editUserForm.fullName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Hak Akses</label>
                  <select
                    value={editUserForm.role}
                    disabled={editingUser.username === 'admin103'}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as SystemUserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold disabled:bg-slate-100"
                  >
                    <option value="operator">Operator Bilik</option>
                    <option value="panitia">Panitia Pemilihan</option>
                    <option value="pengawas">Pengawas / Saksi</option>
                    <option value="admin">Superadmin Sekolah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={editUserForm.isActive ? 'true' : 'false'}
                    disabled={editingUser.username === 'admin103'}
                    onChange={(e) => setEditUserForm({ ...editUserForm, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold disabled:bg-slate-100"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ganti Password (Kosongkan jika tetap)</label>
                <input
                  type="text"
                  placeholder="Masukkan password baru"
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor HP</label>
                <input
                  type="text"
                  value={editUserForm.phoneNumber}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BAHP PRINT MODAL */}
      {isBahpModalOpen && (
        <BahpPrintModal
          school={school}
          activePeriod={activePeriod}
          candidates={candidates}
          votes={votes}
          voters={voters}
          committee={committee}
          onClose={() => setIsBahpModalOpen(false)}
        />
      )}

      {/* MODAL RESET SUARA TESTING (KOSONGKAN KOTAK SUARA) */}
      <ResetVotesModal
        isOpen={isResetVotesModalOpen}
        onClose={() => setIsResetVotesModalOpen(false)}
        onSuccess={(stats) => {
          reloadAll();
          notify(`Kotak suara berhasil dikosongkan! (${stats.countVotesReset} suara dibersihkan, ${stats.countVotersReset} pemilih diaktifkan kembali).`);
        }}
        periodId={activePeriod.id}
      />

      {/* MODAL KONFIRMASI RESET TOTAL DATABASE DEFAULT (PENGGANTI WINDOW.CONFIRM) */}
      {isResetDbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Reset Total ke Setelan Awal Pabrik?</h3>
              <p className="text-xs text-slate-500">
                Peringatan: Seluruh data perubahan (DPT yang diinput, kandidat baru, suara) akan dikembalikan ke data awal contoh.
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <p className="font-bold">Tips:</p>
              <p className="text-[11px] mt-0.5">
                Jika Anda hanya ingin menghapus hasil coblosan testing tanpa menghapus DPT siswa dan Calon, gunakan tombol <strong>"Kosongkan Suara Testing"</strong> saja.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetDbModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDatabase}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ya, Reset Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
