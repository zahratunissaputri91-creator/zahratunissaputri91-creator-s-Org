import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Voter, School, ElectionPeriod } from '../../types';
import { Printer, X, Filter } from 'lucide-react';

interface Props {
  voters: Voter[];
  school: School;
  activePeriod: ElectionPeriod;
  onClose: () => void;
}

interface VoterWithQr extends Voter {
  qrDataUrl?: string;
}

export const VoterCardsPrintModal: React.FC<Props> = ({
  voters,
  school,
  activePeriod,
  onClose
}) => {
  // Extract unique classes
  const classes = Array.from(new Set(voters.map(v => v.className))).sort();

  // If there are many voters (e.g. 600+), default to first class for blazing fast rendering
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return voters.length > 50 && classes.length > 0 ? classes[0] : 'ALL';
  });
  const [votersWithQr, setVotersWithQr] = useState<VoterWithQr[]>([]);
  const [isLoadingQr, setIsLoadingQr] = useState(true);

  // Filter voters
  const filteredVoters = voters.filter(v => {
    if (selectedClass !== 'ALL' && v.className !== selectedClass) return false;
    return true;
  });

  // Generate QR codes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingQr(true);

    const generateQrs = async () => {
      const results: VoterWithQr[] = await Promise.all(
        filteredVoters.map(async (v) => {
          try {
            // QR Payload encodes NISN and PIN for instant booth scanning
            const payload = JSON.stringify({ nisn: v.nisn, pin: v.pin, period: activePeriod.id });
            const dataUrl = await QRCode.toDataURL(payload, {
              width: 120,
              margin: 1,
              color: {
                dark: '#0f172a',
                light: '#ffffff'
              }
            });
            return { ...v, qrDataUrl: dataUrl };
          } catch {
            return { ...v };
          }
        })
      );

      if (isMounted) {
        setVotersWithQr(results);
        setIsLoadingQr(false);
      }
    };

    generateQrs();

    return () => {
      isMounted = false;
    };
  }, [selectedClass, voters]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print p-4 sm:p-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" />
              <span>Cetak Kartu Token Pemilih (Layout Siap Potong)</span>
            </h3>
            <p className="text-xs text-slate-300">
              Format lembar A4 berisi kartu pemilih resmi dengan NISN, Token PIN 6 Karakter, dan QR-Code login cepat.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter class */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Semua Kelas ({voters.length})</option>
                {classes.map(c => (
                  <option key={c} value={c} className="bg-slate-900">Kelas {c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              disabled={isLoadingQr}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:bg-white print:p-0">
          {isLoadingQr ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Menghasilkan QR-Code dan Kartu Suara...
            </div>
          ) : votersWithQr.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Tidak ada data pemilih untuk kriteria kelas ini.
            </div>
          ) : (
            <div className="max-w-[210mm] mx-auto bg-white p-4 sm:p-6 print:p-0 shadow-md print:shadow-none grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
              {votersWithQr.map((voter) => (
                <div
                  key={voter.id}
                  className="border-2 border-dashed border-slate-400 rounded-2xl p-4 bg-white flex flex-col justify-between text-slate-900 break-inside-avoid relative"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                        KARTU SUARA PEMILIH DIGITAL
                      </div>
                      <div className="text-xs font-black text-slate-900">
                        {school.name}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {activePeriod.periodName}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded">
                        {voter.className}
                      </span>
                    </div>
                  </div>

                  {/* Card Middle: Identity & Token PIN */}
                  <div className="flex items-center justify-between gap-3 my-1">
                    <div className="space-y-1.5 flex-1">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Nama Lengkap</span>
                        <span className="text-xs font-black text-slate-900 block truncate">
                          {voter.fullName}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">NISN Resmi</span>
                        <span className="text-xs font-mono font-bold text-slate-800 block">
                          {voter.nisn}
                        </span>
                      </div>

                      {/* Prominent PIN Box */}
                      <div className="pt-1">
                        <span className="text-[9px] uppercase font-bold text-emerald-700 block">Token PIN Bilik</span>
                        <div className="inline-block px-3 py-1 bg-emerald-50 border-2 border-emerald-500 rounded-lg text-emerald-900 font-mono text-sm font-black tracking-widest">
                          {voter.pin}
                        </div>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="text-center shrink-0">
                      {voter.qrDataUrl ? (
                        <img
                          src={voter.qrDataUrl}
                          alt="QR Code"
                          className="w-20 h-20 border border-slate-200 rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[9px]">
                          QR Code
                        </div>
                      )}
                      <span className="text-[8px] text-slate-500 block mt-0.5">Scan Login</span>
                    </div>
                  </div>

                  {/* Card Footer Rules */}
                  <div className="border-t border-slate-200 pt-1.5 mt-2 flex items-center justify-between text-[8px] text-slate-500">
                    <span>* Rahasiakan PIN Anda (Luber-Jurdil)</span>
                    <span className="font-bold">Panitia Pemilihan OSIS</span>
                  </div>

                  {/* Scissors cut hint */}
                  <div className="absolute -top-2.5 right-6 bg-white px-1 text-[8px] text-slate-400 no-print">
                    ✂ Potong Sesuai Garis
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
