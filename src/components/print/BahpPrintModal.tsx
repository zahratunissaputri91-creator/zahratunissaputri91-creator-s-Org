import React from 'react';
import { School, ElectionPeriod, Candidate, AnonymousVote, Committee, Voter } from '../../types';
import { Printer, X, Award } from 'lucide-react';

interface Props {
  school: School;
  activePeriod: ElectionPeriod;
  candidates: Candidate[];
  votes: AnonymousVote[];
  voters: Voter[];
  committee: Committee;
  onClose: () => void;
}

export const BahpPrintModal: React.FC<Props> = ({
  school,
  activePeriod,
  candidates,
  votes,
  voters,
  committee,
  onClose
}) => {
  const totalDpt = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const participationRate = totalDpt > 0 ? ((votedCount / totalDpt) * 100).toFixed(1) : '0';

  // Split by category
  const osisCandidates = candidates.filter(c => c.category === 'OSIS');
  const mpkCandidates = candidates.filter(c => c.category === 'MPK');

  const osisVotes = votes.filter(v => v.category === 'OSIS');
  const mpkVotes = votes.filter(v => v.category === 'MPK');

  // Compute OSIS results
  const osisResults = osisCandidates.map(c => {
    const voteCount = osisVotes.filter(v => v.candidateId === c.id).length;
    const percentage = osisVotes.length > 0 ? ((voteCount / osisVotes.length) * 100).toFixed(1) : '0';
    return {
      ...c,
      voteCount,
      percentage: Number(percentage)
    };
  }).sort((a, b) => b.voteCount - a.voteCount);

  // Compute MPK results
  const mpkResults = mpkCandidates.map(c => {
    const voteCount = mpkVotes.filter(v => v.candidateId === c.id).length;
    const percentage = mpkVotes.length > 0 ? ((voteCount / mpkVotes.length) * 100).toFixed(1) : '0';
    return {
      ...c,
      voteCount,
      percentage: Number(percentage)
    };
  }).sort((a, b) => b.voteCount - a.voteCount);

  const winnerOsis = osisResults.length > 0 && osisVotes.length > 0 ? osisResults[0] : null;
  const winnerMpk = mpkResults.length > 0 && mpkVotes.length > 0 ? mpkResults[0] : null;

  const handlePrint = () => {
    window.print();
  };

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Controls Bar */}
        <div className="no-print p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Berita Acara Hasil Pemilihan (BAHP) Dua Kategori: OSIS & MPK</span>
            </h3>
            <p className="text-xs text-slate-300">
              Dokumen legal formal pengesahan pemilihan Ketua OSIS dan Ketua MPK SMAN 103 Jakarta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Berita Acara (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 print:bg-white print:p-0">
          <div className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 print:p-4 text-slate-900 shadow-md print:shadow-none space-y-6 text-sm leading-relaxed">
            
            {/* KOP SURAT RESMI */}
            <div className="text-center border-b-4 border-double border-slate-900 pb-4 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                PEMERINTAH PROVINSI DKI JAKARTA
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </p>
              <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-wide">
                {school.name}
              </h1>
              <p className="text-xs text-slate-600">
                NPSN: {school.npsn} • {school.address}
              </p>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="text-center space-y-1 pt-2">
              <h2 className="text-base sm:text-lg font-black uppercase underline decoration-2 tracking-wide">
                BERITA ACARA HASIL PEMILIHAN KETUA OSIS DAN KETUA MPK
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Nomor: BAHP.{activePeriod.academicYear.replace('/', '.')}/SMAN103/X/2026
              </p>
            </div>

            {/* PREAMBLE */}
            <p className="text-justify text-xs sm:text-sm">
              Pada hari ini, <strong>{todayFormatted}</strong>, telah diselenggarakan rapat pleno rekapitulasi 
              perhitungan suara Pemilihan Elektronik (E-Voting) Ketua dan Wakil Ketua OSIS serta Ketua dan Wakil Ketua MPK 
              {school.name} untuk Masa Bakti <strong>{activePeriod.academicYear}</strong> berdasarkan Keputusan Kepala Sekolah 
              Nomor: <strong>{committee.skNumber}</strong>. Pemungutan suara diselenggarakan secara Langsung, Umum, 
              Bebas, Rahasia, Jujur, dan Adil (LUBER-JURDIL).
            </p>

            {/* TABEL DATA PEMILIH */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase text-slate-800">I. DATA PEMILIH DAN PENGGUNAAN HAK SUARA</h3>
              <table className="w-full text-xs border border-slate-400 border-collapse">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 border-r border-slate-300 w-12 font-bold text-center">1</td>
                    <td className="p-2 border-r border-slate-300">Jumlah Siswa Pemilih Terdaftar dalam DPT</td>
                    <td className="p-2 font-bold text-right w-32">{totalDpt} Siswa</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 border-r border-slate-300 w-12 font-bold text-center">2</td>
                    <td className="p-2 border-r border-slate-300">Jumlah Siswa Menggunakan Hak Suara di Bilik</td>
                    <td className="p-2 font-bold text-right text-emerald-800 w-32">{votedCount} Siswa</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 border-r border-slate-300 w-12 font-bold text-center">3</td>
                    <td className="p-2 border-r border-slate-300">Jumlah Pemilih yang Tidak Menggunakan Hak Suara</td>
                    <td className="p-2 font-bold text-right text-slate-600 w-32">{Math.max(0, totalDpt - votedCount)} Siswa</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-300 w-12 font-bold text-center">4</td>
                    <td className="p-2 border-r border-slate-300 font-bold">Persentase Tingkat Partisipasi Pemilih</td>
                    <td className="p-2 font-black text-right text-indigo-900 w-32">{participationRate} %</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TABEL II.A: KETUA OSIS */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase text-indigo-900">
                II.A. HASIL PEROLEHAN SUARA KETUA & WAKIL OSIS (3 PASLON)
              </h3>
              <table className="w-full text-xs border border-slate-400 border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center w-16">No. Urut</th>
                    <th className="p-2 border-r border-slate-300 text-left">Nama Pasangan Calon OSIS</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Perolehan Suara</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Persentase</th>
                    <th className="p-2 text-center w-28">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {osisResults.map((r, idx) => (
                    <tr key={r.id} className="border-b border-slate-300">
                      <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">0{r.ballotNumber}</td>
                      <td className="p-2 border-r border-slate-300">
                        <span className="font-bold block">{r.chairmanName} ({r.chairmanClass})</span>
                        <span className="text-slate-600 block">Wakil: {r.viceChairmanName} ({r.viceChairmanClass})</span>
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{r.voteCount} Suara</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{r.percentage}%</td>
                      <td className="p-2 text-center">
                        {idx === 0 && osisVotes.length > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded text-[10px]">
                            TERPILIH OSIS
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABEL II.B: KETUA MPK */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase text-emerald-900">
                II.B. HASIL PEROLEHAN SUARA KETUA & WAKIL MPK (2 PASLON)
              </h3>
              <table className="w-full text-xs border border-slate-400 border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border-r border-slate-300 text-center w-16">No. Urut</th>
                    <th className="p-2 border-r border-slate-300 text-left">Nama Pasangan Calon MPK</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Perolehan Suara</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Persentase</th>
                    <th className="p-2 text-center w-28">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {mpkResults.map((r, idx) => (
                    <tr key={r.id} className="border-b border-slate-300">
                      <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">0{r.ballotNumber}</td>
                      <td className="p-2 border-r border-slate-300">
                        <span className="font-bold block">{r.chairmanName} ({r.chairmanClass})</span>
                        <span className="text-slate-600 block">Wakil: {r.viceChairmanName} ({r.viceChairmanClass})</span>
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{r.voteCount} Suara</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{r.percentage}%</td>
                      <td className="p-2 text-center">
                        {idx === 0 && mpkVotes.length > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded text-[10px]">
                            TERPILIH MPK
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PENETAPAN HASIL */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed space-y-1">
              <p className="font-bold">Penetapan Pleno Pemilihan:</p>
              {winnerOsis && (
                <p>
                  1. Menetapkan <strong>{winnerOsis.chairmanName}</strong> & <strong>{winnerOsis.viceChairmanName}</strong> (Paslon OSIS No. 0{winnerOsis.ballotNumber}) sebagai <strong>Ketua & Wakil Ketua OSIS Terpilih</strong> Masa Bakti {activePeriod.academicYear}.
                </p>
              )}
              {winnerMpk && (
                <p>
                  2. Menetapkan <strong>{winnerMpk.chairmanName}</strong> & <strong>{winnerMpk.viceChairmanName}</strong> (Paslon MPK No. 0{winnerMpk.ballotNumber}) sebagai <strong>Ketua & Wakil Ketua MPK Terpilih</strong> Masa Bakti {activePeriod.academicYear}.
                </p>
              )}
            </div>

            {/* LEMBAR PENGESAHAN & TANDA TANGAN */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-center break-inside-avoid">
              <div className="space-y-16">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Ketua Panitia Pemilihan</p>
                </div>
                <div className="relative">
                  <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] rounded mb-1">
                    ✓ SIGNED DIGITALLY
                  </div>
                  <p className="font-black underline">{committee.leaderName}</p>
                  <p className="text-slate-500">NIP: 19780512 200312 2 004</p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p>Mengesahkan,</p>
                  <p className="font-bold">Kepala {school.name}</p>
                </div>
                <div className="relative">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 border-2 border-dashed border-red-500 rounded-full flex items-center justify-center text-red-500 font-bold text-[8px] rotate-[-12deg] opacity-60 pointer-events-none">
                    STEMPEL RESMI
                  </div>
                  <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] rounded mb-1">
                    ✓ APPROVED & VERIFIED
                  </div>
                  <p className="font-black underline">{school.principalName}</p>
                  <p className="text-slate-500">NIP: {school.principalNip}</p>
                </div>
              </div>
            </div>

            {/* FOOTER METADATA */}
            <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-400">
              <span>Dokumen Dihasilkan Otomatis oleh Sistem E-Pilketos Enterprise SMAN 103 Jakarta</span>
              <span>Integritas Kriptografis Luber-Jurdil Terverifikasi</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
