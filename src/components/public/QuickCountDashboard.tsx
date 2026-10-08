import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { cloudSync } from '../../lib/supabaseSync';
import { isSupabaseConfigured } from '../../lib/supabase';
import { School, ElectionPeriod, Candidate, Voter, AnonymousVote, ElectionCategory } from '../../types';
import { CandidateDetailModal } from '../common/CandidateDetailModal';
import { ResetVotesModal } from '../common/ResetVotesModal';
import {
  Vote,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Video,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  Calendar,
  Building,
  Check,
  Layers,
  ShieldCheck,
  RotateCcw,
  Cloud
} from 'lucide-react';

interface Props {
  onNavigateToBooth: () => void;
  onNavigateToPrd: () => void;
}

export const QuickCountDashboard: React.FC<Props> = ({
  onNavigateToBooth,
  onNavigateToPrd
}) => {
  const [school, setSchool] = useState<School>(db.getSchool());
  const [activePeriod, setActivePeriod] = useState<ElectionPeriod>(db.getActivePeriod());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [votes, setVotes] = useState<AnonymousVote[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  
  // Category filter tab
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'OSIS' | 'MPK'>('ALL');

  // Reload data
  const loadData = () => {
    const curSchool = db.getSchool();
    const curPeriod = db.getActivePeriod();
    setSchool(curSchool);
    setActivePeriod(curPeriod);
    setCandidates(db.getCandidates(curPeriod.id));
    setVoters(db.getVoters(curPeriod.id));
    setVotes(db.getVotes(curPeriod.id));
    setLastRefreshed(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('epilketos_state_change', handleStorageChange);

    // Periodik tarik data dari Supabase Cloud agar live quick count antar-PC otomatis terupdate
    let pollTimer: any = null;
    if (isSupabaseConfigured()) {
      pollTimer = setInterval(() => {
        cloudSync.pullAll().then(res => {
          if (res.success) loadData();
        }).catch(() => {});
      }, 5000);
    }

    return () => {
      window.removeEventListener('epilketos_state_change', handleStorageChange);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  // Live simulation ticker
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const curPeriod = db.getActivePeriod();
      if (curPeriod.status !== 'aktif') return;

      const unvotedVoters = db.getVoters(curPeriod.id).filter(v => !v.hasVoted);
      const cands = db.getCandidates(curPeriod.id);
      if (unvotedVoters.length > 0 && cands.length > 0) {
        // pick random voter
        const randomVoter = unvotedVoters[Math.floor(Math.random() * unvotedVoters.length)];
        // pick random candidate for OSIS and MPK
        const osisCands = cands.filter(c => c.category === 'OSIS');
        const mpkCands = cands.filter(c => c.category === 'MPK');
        const randomOsis = osisCands[Math.floor(Math.random() * osisCands.length)];
        const randomMpk = mpkCands[Math.floor(Math.random() * mpkCands.length)];

        db.castVoteAtomic(curPeriod.id, randomVoter.id, {
          osisCandidateId: randomOsis?.id,
          mpkCandidateId: randomMpk?.id
        }, 'Simulasi-Bot');
        loadData();
      } else {
        setIsSimulating(false);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Overall Turnout Calculations (Students who voted)
  const totalDPT = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const unvotedCount = Math.max(0, totalDPT - votedCount);
  const participationRate = totalDPT > 0 ? ((votedCount / totalDPT) * 100).toFixed(1) : '0';

  // Split candidates by Category
  const osisCandidates = candidates.filter(c => c.category === 'OSIS');
  const mpkCandidates = candidates.filter(c => c.category === 'MPK');

  const osisVotes = votes.filter(v => v.category === 'OSIS');
  const mpkVotes = votes.filter(v => v.category === 'MPK');

  // Helper for computing category stats
  const getCategoryStats = (candList: Candidate[], voteList: AnonymousVote[]) => {
    const totalCatVotes = voteList.length;
    return candList.map(cand => {
      const count = voteList.filter(v => v.candidateId === cand.id).length;
      const percentage = totalCatVotes > 0 ? ((count / totalCatVotes) * 100).toFixed(1) : '0';
      return {
        ...cand,
        voteCount: count,
        percentage: Number(percentage)
      };
    }).sort((a, b) => b.voteCount - a.voteCount);
  };

  const osisStats = getCategoryStats(osisCandidates, osisVotes);
  const mpkStats = getCategoryStats(mpkCandidates, mpkVotes);

  const leadingOsis = osisStats.length > 0 && osisVotes.length > 0 ? osisStats[0] : null;
  const leadingMpk = mpkStats.length > 0 && mpkVotes.length > 0 ? mpkStats[0] : null;

  // Render a Category Quick Count Block
  const renderCategorySection = (
    title: string,
    categoryBadge: string,
    badgeColor: string,
    catList: Candidate[],
    statsList: ReturnType<typeof getCategoryStats>,
    voteList: AnonymousVote[],
    leadingCand: ReturnType<typeof getCategoryStats>[0] | null,
    themeBorder: string
  ) => {
    const totalCatVotes = voteList.length;

    return (
      <div className={`space-y-6 bg-white p-6 sm:p-8 rounded-3xl border-2 ${themeBorder} shadow-xs`}>
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${badgeColor}`}>
                {categoryBadge}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {catList.length} Pasangan Calon Terdaftar
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              Suara Sah Masuk: <span className="font-black text-indigo-700">{totalCatVotes}</span>
            </div>
            {leadingCand && leadingCand.voteCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl text-xs font-bold border border-amber-200">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Unggul: Paslon 0{leadingCand.ballotNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart Visualization (2 Cols: Bar + Donut) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart Visualization */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-4 pt-1">
              {catList.map((cand) => {
                const stat = statsList.find(s => s.id === cand.id);
                const count = stat?.voteCount || 0;
                const pct = stat?.percentage || 0;
                const isLeading = leadingCand?.id === cand.id && count > 0;

                return (
                  <div key={cand.id} className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                          cand.ballotNumber === 1
                            ? 'bg-indigo-600 text-white'
                            : cand.ballotNumber === 2
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}>
                          0{cand.ballotNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {cand.chairmanName} & {cand.viceChairmanName}
                            </h4>
                            {isLeading && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                                Memimpin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {cand.chairmanClass} & {cand.viceChairmanClass}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">
                          {pct}%
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          {count} Suara
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200/80 h-3.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          cand.ballotNumber === 1
                            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                            : cand.ballotNumber === 2
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                            : 'bg-gradient-to-r from-amber-400 to-amber-500'
                        }`}
                        style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Donut Chart Proportion */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between items-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sebaran Proporsi Suara
            </span>

            <div className="relative w-40 h-40 my-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#e2e8f0" strokeWidth="15" />
                {(() => {
                  let acc = 0;
                  const circ = 2 * Math.PI * 38;
                  const colors = ['#4f46e5', '#059669', '#d97706'];

                  if (totalCatVotes === 0) {
                    return (
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#e2e8f0" strokeWidth="15" strokeDasharray={`${circ} ${circ}`} />
                    );
                  }

                  return catList.map((cand, idx) => {
                    const stat = statsList.find(s => s.id === cand.id);
                    const pct = stat ? stat.percentage : 0;
                    const dash = (pct / 100) * circ;
                    const offset = -((acc / 100) * circ);
                    acc += pct;

                    return (
                      <circle
                        key={cand.id}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={colors[idx % colors.length]}
                        strokeWidth="15"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeDashoffset={offset}
                        className="transition-all duration-700 ease-out"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900">{totalCatVotes}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Suara Sah</span>
              </div>
            </div>

            <div className="w-full space-y-1.5 pt-2 border-t border-slate-200">
              {catList.map((c, idx) => {
                const stat = statsList.find(s => s.id === c.id);
                const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-500'];
                return (
                  <div key={c.id} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                      <span className="font-semibold text-slate-700">Paslon 0{c.ballotNumber}</span>
                    </div>
                    <span className="font-bold text-slate-900">{stat?.percentage}% ({stat?.voteCount})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Candidate Profile Cards Grid */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Profil Calon {categoryBadge}
          </h3>

          <div className={`grid grid-cols-1 ${catList.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
            {catList.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* Photo Area */}
                <div className="relative h-60 bg-slate-900 overflow-hidden">
                  <img
                    src={cand.photoUrl}
                    alt={`Paslon ${cand.ballotNumber}`}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  
                  {/* Ballot Number Badge */}
                  <div className="absolute top-3 left-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-slate-950 font-black rounded-xl shadow-md text-xs">
                      <span>NO.</span>
                      <span className="text-sm">0{cand.ballotNumber}</span>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 bg-white/90 text-slate-900 text-[10px] font-black rounded-lg">
                      {cand.category}
                    </span>
                  </div>

                  {/* Candidate names */}
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-black text-base leading-snug drop-shadow-sm">
                      {cand.chairmanName}
                    </h3>
                    <p className="text-xs text-indigo-200 font-medium">
                      Wakil: {cand.viceChairmanName}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium italic">
                      "{cand.tagline}"
                    </div>

                    <div>
                      <h5 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                        Visi Utama:
                      </h5>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {cand.vision}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                        Program Kerja:
                      </h5>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {cand.programs.slice(0, 2).map((p, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCandidate(cand)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Detail & Video Orasi</span>
                    </button>

                    <a
                      href={cand.videoUrl || 'https://www.youtube.com'}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                      title="Buka Video Kampanye YouTube"
                    >
                      <Video className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/50">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative p-6 sm:p-8 md:p-10 z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE QUICK COUNT DUA KATEGORI (KETUA OSIS & KETUA MPK)
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
              {activePeriod.periodName}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Building className="w-4 h-4 text-indigo-400" />
                {school.name} (NPSN: {school.npsn})
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Tahun Ajaran {activePeriod.academicYear}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                activePeriod.status === 'aktif'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                Status: {activePeriod.status}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-1">
              Pemilihan umum serentak dua kategori: <strong>3 Paslon Ketua OSIS</strong> dan <strong>2 Paslon Ketua MPK</strong>. 
              Pencatatan suara independen, aman, dan berstandar asas LUBER-JURDIL.
            </p>
          </div>

          {/* Action Callouts */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
            {activePeriod.status === 'aktif' && (
              <button
                onClick={onNavigateToBooth}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
              >
                <Vote className="w-5 h-5" />
                <span>Masuk Bilik Suara (Coblos OSIS & MPK)</span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSimulating
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                }`}
                title="Simulasi otomatis mencoblos kedua kategori secara berkala"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{isSimulating ? 'Hentikan Simulasi' : 'Uji Simulasi Live'}</span>
              </button>

              <button
                onClick={() => setIsResetModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Kosongkan seluruh suara testing agar kotak suara kembali 0"
              >
                <RotateCcw className="w-4 h-4 text-rose-300" />
                <span>Kosongkan Suara Testing</span>
              </button>

              <button
                onClick={onNavigateToPrd}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Buka Dokumen PRD & Arsitektur Keamanan"
              >
                <Info className="w-4 h-4" />
                <span>PRD & Schema</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Refresh Status Bar */}
        <div className="bg-slate-950/80 px-6 py-2.5 border-t border-indigo-900/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Koneksi Real-time Aktif</span>
            <span className="text-slate-600">•</span>
            <span>Update Terakhir: {lastRefreshed}</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total DPT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total DPT Siswa</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalDPT}</div>
            <p className="text-xs text-slate-500 mt-1">Daftar Pemilih Terdaftar</p>
          </div>
        </div>

        {/* Siswa Hadir / Memilih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Siswa Sudah Memilih</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{votedCount}</div>
            <p className="text-xs text-slate-500 mt-1">Menggunakan Hak Suara Bilik</p>
          </div>
        </div>

        {/* Belum Memilih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Belum Memilih</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{unvotedCount}</div>
            <p className="text-xs text-slate-500 mt-1">Sedang Mengantre / Belum Hadir</p>
          </div>
        </div>

        {/* Persentase Partisipasi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tingkat Partisipasi</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">{participationRate}%</div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Number(participationRate))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY SWITCHER TABS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span className="font-black text-slate-900 text-base">Pilih Tampilan Kategori Pemilihan:</span>
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Kategori (OSIS & MPK)
          </button>

          <button
            onClick={() => setCategoryFilter('OSIS')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'OSIS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Ketua OSIS (3 Paslon)</span>
          </button>

          <button
            onClick={() => setCategoryFilter('MPK')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'MPK'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Ketua MPK (2 Paslon)</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: PEMILIHAN KETUA OSIS */}
      {(categoryFilter === 'ALL' || categoryFilter === 'OSIS') && renderCategorySection(
        'Pemilihan Ketua & Wakil OSIS 2026/2027',
        'KETUA OSIS',
        'bg-indigo-100 text-indigo-800 border border-indigo-200',
        osisCandidates,
        osisStats,
        osisVotes,
        leadingOsis,
        'border-indigo-100'
      )}

      {/* SECTION 2: PEMILIHAN KETUA MPK */}
      {(categoryFilter === 'ALL' || categoryFilter === 'MPK') && renderCategorySection(
        'Pemilihan Ketua & Wakil MPK 2026/2027',
        'KETUA MPK',
        'bg-emerald-100 text-emerald-800 border border-emerald-200',
        mpkCandidates,
        mpkStats,
        mpkVotes,
        leadingMpk,
        'border-emerald-100'
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onVoteClick={() => {
            setSelectedCandidate(null);
            onNavigateToBooth();
          }}
          showVoteButton={activePeriod.status === 'aktif'}
        />
      )}

      {/* Modal Kosongkan Kotak Suara Uji Coba */}
      <ResetVotesModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onSuccess={(stats) => {
          loadData();
          setNotice(`Kotak suara berhasil dikosongkan! (${stats.countVotesReset} suara dibersihkan, ${stats.countVotersReset} pemilih diaktifkan kembali).`);
          setTimeout(() => setNotice(null), 5000);
        }}
        periodId={activePeriod.id}
      />

      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs border border-slate-700 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
};
