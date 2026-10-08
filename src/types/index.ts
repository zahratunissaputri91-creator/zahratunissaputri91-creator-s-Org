export type SchoolType = 'OSIS' | 'OSIM';
export type ElectionCategory = 'OSIS' | 'MPK';

export interface School {
  id: string;
  name: string;
  type: SchoolType;
  npsn: string;
  address: string;
  principalName: string;
  principalNip: string;
  logoUrl?: string;
  academicYearDefault: string;
}

export type PeriodStatus = 'draft' | 'aktif' | 'selesai';

export interface ElectionPeriod {
  id: string;
  schoolId: string;
  periodName: string; // e.g. "Pemilihan Ketua & Wakil OSIS Periode 2026/2027"
  academicYear: string; // e.g. "2026/2027"
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  description?: string;
  createdAt: string;
  closedAt?: string;
}

export interface Candidate {
  id: string;
  electionPeriodId: string;
  category: ElectionCategory; // 'OSIS' (3 calon) or 'MPK' (2 calon)
  ballotNumber: number; // 1, 2, 3 ...
  chairmanName: string; // Nama Calon Kandidat
  chairmanClass: string; // Kelas Calon Kandidat
  viceChairmanName?: string; // Opsional
  viceChairmanClass?: string; // Opsional
  photoUrl: string;
  tagline: string;
  vision: string;
  missions: string[];
  programs: string[];
  videoUrl?: string;
}

export interface Voter {
  id: string;
  electionPeriodId: string;
  nis: string; // Nomor Induk Siswa (NIS)
  nisn?: string; // Opsional backward-compat
  fullName: string;
  className: string;
  gender: 'L' | 'P';
  pin: string; // 6-digit alphanumeric unique
  pinHash?: string;
  hasVoted: boolean;
  votedAt?: string;
}

// Anonymous Vote (Luber-Jurdil: intentionally NO voter_id relation)
export interface AnonymousVote {
  id: string;
  electionPeriodId: string;
  category: ElectionCategory; // 'OSIS' or 'MPK'
  candidateId: string;
  timestamp: string;
  deviceFingerprintHash?: string;
}

export interface Committee {
  id: string;
  electionPeriodId: string;
  skNumber: string;
  skDate: string;
  skDocumentUrl?: string;
  leaderName: string;
  secretaryName: string;
  membersCount: number;
  contactEmail: string;
  username: string;
  password?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: 'admin' | 'panitia' | 'siswa' | 'system';
  action: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  details?: string;
}

export type UserRole = 'publik' | 'siswa' | 'panitia' | 'admin';

export type SystemUserRole = 'admin' | 'panitia' | 'operator' | 'pengawas';

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: SystemUserRole;
  password?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  phoneNumber?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
  lastConnected?: string;
}
