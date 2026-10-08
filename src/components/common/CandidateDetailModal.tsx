import React from 'react';
import { Candidate } from '../../types';
import { X, Award, CheckCircle, Video, BookOpen, Sparkles } from 'lucide-react';

interface Props {
  candidate: Candidate | null;
  onClose: () => void;
  onVoteClick?: (candidate: Candidate) => void;
  showVoteButton?: boolean;
}

export const CandidateDetailModal: React.FC<Props> = ({
  candidate,
  onClose,
  onVoteClick,
  showVoteButton = false
}) => {
  if (!candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-xl shadow-md">
              0{candidate.ballotNumber}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold leading-tight">Profil Lengkap Paslon #{candidate.ballotNumber}</h2>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                  candidate.category === 'MPK'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {candidate.category === 'MPK' ? 'KETUA MPK' : 'KETUA OSIS'}
                </span>
              </div>
              <p className="text-xs text-indigo-200">{candidate.tagline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-slate-800">
          {/* Candidate Card Banner */}
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="relative w-44 h-56 shrink-0 rounded-xl overflow-hidden shadow-lg border-2 border-indigo-200 bg-slate-200">
              <img
                src={candidate.photoUrl}
                alt={`Paslon ${candidate.ballotNumber}`}
                className="w-full h-full object-cover object-top"
              />
              <span className="absolute top-2 left-2 px-2.5 py-1 bg-amber-400 text-slate-900 text-xs font-black rounded-md shadow-sm">
                NO. 0{candidate.ballotNumber}
              </span>
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <span className={`text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
                  candidate.category === 'MPK'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  Pasangan Calon Ketua & Wakil {candidate.category === 'MPK' ? 'MPK' : 'OSIS'}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {candidate.chairmanName}
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Calon Ketua {candidate.category === 'MPK' ? 'MPK' : 'OSIS'} • Kelas: {candidate.chairmanClass}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-lg font-bold text-slate-900">
                  {candidate.viceChairmanName}
                </h4>
                <p className="text-sm font-medium text-slate-500">
                  Calon Wakil Ketua {candidate.category === 'MPK' ? 'MPK' : 'OSIS'} • Kelas: {candidate.viceChairmanClass}
                </p>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium italic">
                "{candidate.tagline}"
              </div>
            </div>
          </div>

          {/* Visi */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-base">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Visi Utama</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-700">
              {candidate.vision}
            </div>
          </div>

          {/* Misi */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-base">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Misi Strategis</span>
            </div>
            <ul className="space-y-2">
              {candidate.missions.map((misi, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{misi}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Program Kerja Unggulan */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-base">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Program Kerja Unggulan</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {candidate.programs.map((prog, idx) => (
                <div key={idx} className="p-3 bg-gradient-to-br from-indigo-50/80 to-slate-50 rounded-xl border border-indigo-100 text-xs text-slate-800 font-medium">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] mb-2">
                    {idx + 1}
                  </div>
                  {prog}
                </div>
              ))}
            </div>
          </div>

          {/* Video Kampanye / Orasi */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-base">
              <Video className="w-5 h-5 text-red-600" />
              <span>Video Kampanye & Orasi Publik</span>
            </div>
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-white">Saksikan Paparan Debat & Visi Paslon</p>
                <p className="text-[11px] text-slate-400">Durasi orasi resmi: 05 Menit 30 Detik</p>
              </div>
              <a
                href={candidate.videoUrl || 'https://www.youtube.com'}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-sm"
              >
                <Video className="w-4 h-4" />
                Tonton di YouTube
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
          >
            Tutup
          </button>
          {showVoteButton && onVoteClick && (
            <button
              onClick={() => onVoteClick(candidate)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Pilih Paslon 0{candidate.ballotNumber} Sekarang
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
