import React, { useState } from 'react';
import { db } from '../../lib/storage';
import { Voter } from '../../types';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle,
  X,
  FileText,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';

interface Props {
  activePeriodId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedRow {
  nisn: string;
  fullName: string;
  className: string;
  gender: 'L' | 'P';
  pin?: string;
  isValid: boolean;
  error?: string;
}

export const ImportVotersModal: React.FC<Props> = ({
  activePeriodId,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'FILE' | 'PASTE' | 'GENERATE' | 'TEMPLATE'>('FILE');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [overwriteDpt, setOverwriteDpt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Template CSV content
  const templateCsv = `NISN,NAMA_LENGKAP,KELAS,JENIS_KELAMIN
0081030001,Aditya Pratama Putra,X-1,L
0081030002,Anindya Zahra Safitri,X-1,P
0081030003,Bagas Dwi Wicaksono,X-2,L
0081030004,Cantika Kirana Putri,X-2,P
0081030005,Dimas Arya Nugraha,XI MIPA 1,L
0081030006,Elsa Rahmawati,XI IPS 1,P
0081030007,Farel Rizky Ramadhan,XII MIPA 1,L
0081030008,Gisela Amanda Putri,XII IPS 2,P`;

  // Download template CSV
  const handleDownloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_dpt_siswa_sman103.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parser function that supports Comma, Semicolon, or Tab (Excel copy-paste)
  const parseRawContent = (content: string) => {
    setErrorMsg(null);
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setParsedData([]);
      return;
    }

    // Determine delimiter (tab, semicolon, or comma)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';

    const rows: ParsedRow[] = [];
    let startIndex = 0;

    // Detect header row (if first row contains 'nisn' or 'nama')
    const lowerFirst = firstLine.toLowerCase();
    if (lowerFirst.includes('nisn') || lowerFirst.includes('nama') || lowerFirst.includes('kelas')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 3) continue;

      const nisn = cols[0] || '';
      const fullName = cols[1] || '';
      const className = cols[2] || '';
      const rawGender = (cols[3] || 'L').toUpperCase();
      const gender: 'L' | 'P' = rawGender.startsWith('P') ? 'P' : 'L';
      const pin = cols[4] ? cols[4].toUpperCase() : undefined;

      const isValid = nisn.length >= 4 && fullName.length >= 2 && className.length >= 1;

      rows.push({
        nisn,
        fullName,
        className,
        gender,
        pin,
        isValid,
        error: !isValid ? 'Format kolom tidak lengkap' : undefined
      });
    }

    setParsedData(rows);
    if (rows.length === 0) {
      setErrorMsg('Tidak dapat membaca data. Pastikan format kolom: NISN, Nama Lengkap, Kelas, Jenis Kelamin (L/P)');
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        parseRawContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Generate 600+ real student simulation for SMAN 103 Jakarta
  const handleGenerate600Students = () => {
    setIsProcessing(true);
    setErrorMsg(null);

    const firstNamesL = ['Aditya', 'Ahmad', 'Alif', 'Arya', 'Bagas', 'Bima', 'Daffa', 'Dimas', 'Fadhil', 'Farhan', 'Gibran', 'Hafiz', 'Ilham', 'Kevin', 'Lutfi', 'Muhammad', 'Naufal', 'Rafi', 'Rizky', 'Wahyu', 'Zaki', 'Joko', 'Fikri', 'Hendra', 'Gilang'];
    const lastNamesL = ['Pratama', 'Saputra', 'Ramadhan', 'Nugroho', 'Kurniawan', 'Akbar', 'Hakim', 'Maulana', 'Hidayat', 'Santoso', 'Siregar', 'Wibowo', 'Kusuma', 'Gunawan', 'Permana', 'Firmansyah', 'Syahputra', 'Setiawan'];

    const firstNamesP = ['Aisyah', 'Amanda', 'Anindya', 'Annisa', 'Bella', 'Cantika', 'Chelsea', 'Dhea', 'Elisa', 'Fanya', 'Gita', 'Hana', 'Intan', 'Jessica', 'Kayla', 'Laras', 'Meisya', 'Nabila', 'Nadia', 'Olivia', 'Putri', 'Qonita', 'Rania', 'Salma', 'Syifa', 'Tiara', 'Zahra'];
    const lastNamesP = ['Maharani', 'Larasati', 'Safitri', 'Wulandari', 'Azzahra', 'Nurhaliza', 'Salsabila', 'Prameswari', 'Rahmawati', 'Kusumawardhani', 'Clarissa', 'Firdaus', 'Hidayah', 'Damayanti', 'Wahyuni'];

    // 20 Rombel classes in SMAN 103 Jakarta:
    // Kelas X: X-1 s.d X-7 (7 kelas)
    // Kelas XI: XI-1 s.d XI-7 (7 kelas)
    // Kelas XII: XII-1 s.d XII-6 (6 kelas)
    // 20 kelas x 32 siswa = 640 siswa!
    const classNames: string[] = [];
    for (let i = 1; i <= 7; i++) classNames.push(`X-${i}`);
    for (let i = 1; i <= 7; i++) classNames.push(`XI-${i}`);
    for (let i = 1; i <= 6; i++) classNames.push(`XII-${i}`);

    const generated: ParsedRow[] = [];
    let studentIdCounter = 1;

    classNames.forEach((cName) => {
      // 32 students per class
      for (let s = 1; s <= 32; s++) {
        const isMale = s % 2 !== 0;
        const fn = isMale
          ? firstNamesL[Math.floor(Math.random() * firstNamesL.length)]
          : firstNamesP[Math.floor(Math.random() * firstNamesP.length)];
        const ln = isMale
          ? lastNamesL[Math.floor(Math.random() * lastNamesL.length)]
          : lastNamesP[Math.floor(Math.random() * lastNamesP.length)];
        
        // 10-digit NISN formatted e.g. 0081030001 ... 0081030640
        const nisn = '008103' + String(studentIdCounter).padStart(4, '0');
        
        generated.push({
          nisn,
          fullName: `${fn} ${ln}`,
          className: cName,
          gender: isMale ? 'L' : 'P',
          isValid: true
        });

        studentIdCounter++;
      }
    });

    setParsedData(generated);
    setFileName(`Simulasi_640_Siswa_SMAN103_Jakarta.csv`);
    setIsProcessing(false);
  };

  // Commit Import to database
  const handleExecuteImport = () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    try {
      const validRows = parsedData.filter(r => r.isValid);
      const votersToImport: Omit<Voter, 'id' | 'hasVoted'>[] = validRows.map(r => ({
        electionPeriodId: activePeriodId,
        nis: r.nisn,
        nisn: r.nisn,
        fullName: r.fullName,
        className: r.className,
        gender: r.gender,
        pin: r.pin || ''
      }));

      const importedCount = db.importVoters(votersToImport, overwriteDpt);
      onSuccess(importedCount);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Gagal mengimpor data: ${message}`);
      setIsProcessing(false);
    }
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Import Masal Data DPT Siswa (Kapasitas 600+ Pemilih)
              </h3>
              <p className="text-xs text-slate-300">
                Mendukung upload file CSV / Excel, copy-paste langsung, atau generator 640 siswa otomatis.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 px-6 gap-2 bg-slate-50 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('FILE')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'FILE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File CSV / Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('PASTE')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'PASTE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste dari Excel / Sheets</span>
          </button>

          <button
            onClick={() => setActiveTab('GENERATE')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'GENERATE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Generator 640 Siswa (SMAN 103)</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATE')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'TEMPLATE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Unduh Format Template</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 text-xs">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD FILE */}
          {activeTab === 'FILE' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center bg-slate-50 hover:bg-slate-100/80 transition flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Pilih File CSV Siswa dari Komputer Anda
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Mendukung ekspor Dapodik atau Excel (.csv, .txt, pemisah koma atau titik-koma)
                  </p>
                </div>

                <label className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition">
                  <span>Pilih Berkas CSV</span>
                  <input
                    type="file"
                    accept=".csv, .txt, .tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {fileName && (
                  <p className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Berkas Terpilih: {fileName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COPY-PASTE DARI EXCEL */}
          {activeTab === 'PASTE' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Tempel (Paste) Langsung Seluruh Baris dari Excel / Google Sheets
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Buka file Excel 600 siswa Anda, blok seluruh kolom (NISN, Nama, Kelas, JK), tekan <strong>Ctrl + C</strong>, lalu tempel (<strong>Ctrl + V</strong>) di kotak bawah ini:
                </p>
              </div>

              <textarea
                rows={8}
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  parseRawContent(e.target.value);
                }}
                placeholder={`Contoh isi tabel yang di-copy dari Excel:
0081030001\tAditya Pratama Putra\tX-1\tL
0081030002\tAnindya Zahra Safitri\tX-1\tP
0081030003\tBagas Dwi Wicaksono\tX-2\tL`}
                className="w-full p-4 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => parseRawContent(pasteText)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Proses & Validasi Teks</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GENERATOR INSTAN 640 SISWA */}
          {activeTab === 'GENERATE' && (
            <div className="p-6 bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50 rounded-3xl border border-indigo-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center font-bold shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">
                    Generator Realistis 640 Siswa SMAN 103 Jakarta
                  </h4>
                  <p className="text-slate-600 text-xs">
                    Solusi instan untuk pengujian pemilihan skala besar tanpa perlu mengetik manual 600 baris.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="font-bold text-slate-900 block text-xs">20 Rombongan Belajar</span>
                  <span className="text-[11px] text-slate-500">X-1 s.d X-7, XI-1 s.d XI-7, XII-1 s.d XII-6</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="font-bold text-slate-900 block text-xs">32 Siswa Per Kelas</span>
                  <span className="text-[11px] text-slate-500">Total akumulasi: 640 Pemilih Tetap</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="font-bold text-slate-900 block text-xs">NISN Resmi & Token PIN</span>
                  <span className="text-[11px] text-slate-500">Otomatis dienkripsi & siap cetak kartu</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate600Students}
                disabled={isProcessing}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Hasilkan 640 Siswa SMAN 103 Jakarta Sekarang</span>
              </button>
            </div>
          )}

          {/* TAB 4: FORMAT TEMPLATE */}
          {activeTab === 'TEMPLATE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Struktur Format File Excel/CSV</h4>
                  <p className="text-slate-500 text-xs">Pastikan susunan kolom terdiri dari 4 kolom berikut:</p>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Template (.csv)</span>
                </button>
              </div>

              <div className="p-4 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-2xl border border-slate-800 overflow-x-auto">
                <pre>{templateCsv}</pre>
              </div>

              <div className="text-slate-600 text-xs space-y-1">
                <p><strong>Ketentuan Pengisian:</strong></p>
                <p>1. <strong>NISN:</strong> Nomor Induk Siswa Nasional (unik per siswa, 4-10 karakter angka).</p>
                <p>2. <strong>NAMA_LENGKAP:</strong> Nama lengkap siswa pemilih.</p>
                <p>3. <strong>KELAS:</strong> Kelas/Rombel siswa (misal: X-1, XI MIPA 2, XII IPS 1).</p>
                <p>4. <strong>JENIS_KELAMIN:</strong> L untuk Laki-laki atau P untuk Perempuan.</p>
              </div>
            </div>
          )}

          {/* PREVIEW HASIL PARSING (JIKA ADA DATA) */}
          {parsedData.length > 0 && (
            <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-sm">
                    Ringkasan Data Siap Diimpor:
                  </span>
                  <span className="px-3 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold font-mono">
                    {validCount} Siswa Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-3 py-0.5 bg-red-100 text-red-800 rounded-full font-bold font-mono">
                      {invalidCount} Baris Tidak Lengkap
                    </span>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteDpt}
                    onChange={(e) => setOverwriteDpt(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Kosongkan / Timpa DPT lama periode ini</span>
                </label>
              </div>

              {/* Sample preview table (first 5 and last 2) */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">NISN</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3">L/P</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.nisn}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{row.fullName}</td>
                        <td className="py-2 px-3 text-slate-600">{row.className}</td>
                        <td className="py-2 px-3 text-slate-600">{row.gender}</td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <span className="text-red-600 font-bold text-[10px]">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td colSpan={6} className="py-2 px-3 text-center text-slate-400 font-medium italic bg-slate-50">
                          ... dan {parsedData.length - 5} baris siswa lainnya terverifikasi ...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={validCount === 0 || isProcessing}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Memproses Impor Masal...'
                : `Impor ${validCount} Siswa ke Database Sekarang`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
