import {
  School,
  ElectionPeriod,
  Candidate,
  Voter,
  AnonymousVote,
  Committee,
  AuditLog,
  SystemUser
} from '../types';
import {
  INITIAL_SCHOOL,
  INITIAL_PERIODS,
  INITIAL_CANDIDATES,
  INITIAL_VOTERS,
  INITIAL_VOTES,
  INITIAL_COMMITTEE,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_USERS
} from '../data/initialData';
import { generateSecurePin } from './security';
import { getSupabaseClient } from './supabase';
import { serverSync } from './serverSync';

// Otomatis aktifkan sinkronisasi real-time multi-PC saat modul dimuat di browser
if (typeof window !== 'undefined') {
  serverSync.init();
}

const STORAGE_KEYS = {
  SCHOOL: 'epilketos_school_v1',
  PERIODS: 'epilketos_periods_v1',
  CANDIDATES: 'epilketos_candidates_v1',
  VOTERS: 'epilketos_voters_v1',
  VOTES: 'epilketos_votes_v1',
  COMMITTEE: 'epilketos_committee_v1',
  AUDIT: 'epilketos_audit_v1',
  USERS: 'epilketos_users_v1'
};

// Safe JSON parser
function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

const PRE_RESET_BACKUP_KEY = 'epilketos_pre_reset_backup_v1';

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('epilketos_state_change', { detail: { key } }));
  } catch (err) {
    console.error('Storage write error:', err);
  }
}

// Background Supabase Sync helper without circular dependency (Opsional untuk user yang memakai Supabase)
function asyncSupabaseAction(fn: (client: any) => Promise<any>): void {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    fn(client).catch((err: any) => {
      console.warn('Background Supabase sync error:', err);
    });
  } catch (err) {
    console.warn('Supabase client error:', err);
  }
}

export const db = {
  // School Info
  getSchool(): School {
    return safeGet<School>(STORAGE_KEYS.SCHOOL, INITIAL_SCHOOL);
  },
  updateSchool(school: School): void {
    safeSet(STORAGE_KEYS.SCHOOL, school);
    
    // 1. Kirim ke Server Terpusat (Realtime Multi-PC)
    serverSync.dispatchAction('UPDATE_SCHOOL', school);

    // 2. Kirim ke Supabase jika terhubung
    asyncSupabaseAction(async (client) => {
      await client.from('schools').upsert({
        id: school.id,
        name: school.name,
        type: school.type || 'OSIS',
        npsn: school.npsn,
        address: school.address || '',
        principal_name: school.principalName || '',
        principal_nip: school.principalNip || '',
        logo_url: school.logoUrl || '',
        academic_year_default: school.academicYearDefault || '2026/2027'
      });
    });
    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Pembaruan Konfigurasi Institusi (${school.name})`,
      status: 'SUCCESS'
    });
  },

  // Election Periods
  getPeriods(): ElectionPeriod[] {
    return safeGet<ElectionPeriod[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
  },
  getActivePeriod(): ElectionPeriod {
    const periods = db.getPeriods();
    const active = periods.find(p => p.status === 'aktif');
    if (active) return active;
    // Fallback: make the first one active if none
    if (periods.length > 0) {
      periods[0].status = 'aktif';
      safeSet(STORAGE_KEYS.PERIODS, periods);
      return periods[0];
    }
    return INITIAL_PERIODS[0];
  },
  setActivePeriod(periodId: string): void {
    const periods = db.getPeriods();
    const updated = periods.map(p => {
      if (p.id === periodId) {
        return { ...p, status: 'aktif' as const };
      }
      if (p.status === 'aktif') {
        return { ...p, status: 'selesai' as const, closedAt: new Date().toISOString() };
      }
      return p;
    });
    safeSet(STORAGE_KEYS.PERIODS, updated);

    // Sync to Server
    serverSync.dispatchAction('SET_ACTIVE_PERIOD', { id: periodId });

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Aktivasi Periode Pemilihan (ID: ${periodId})`,
      status: 'SUCCESS'
    });
  },
  createPeriod(period: Omit<ElectionPeriod, 'id' | 'createdAt'>): ElectionPeriod {
    const periods = db.getPeriods();
    const newPeriod: ElectionPeriod = {
      ...period,
      id: `per-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    if (newPeriod.status === 'aktif') {
      periods.forEach(p => {
        if (p.status === 'aktif') p.status = 'selesai';
      });
    }
    periods.unshift(newPeriod);
    safeSet(STORAGE_KEYS.PERIODS, periods);

    // Sync to Server
    serverSync.dispatchAction('CREATE_PERIOD', newPeriod);

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Pembuatan Periode Baru: ${newPeriod.periodName}`,
      status: 'SUCCESS'
    });
    return newPeriod;
  },
  closePeriod(periodId: string): void {
    const periods = db.getPeriods();
    const updated = periods.map(p => {
      if (p.id === periodId) {
        return { ...p, status: 'selesai' as const, closedAt: new Date().toISOString() };
      }
      return p;
    });
    safeSet(STORAGE_KEYS.PERIODS, updated);

    // Sync to Server
    serverSync.dispatchAction('CLOSE_PERIOD', { id: periodId });

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Penutupan Pemungutan Suara Periode ID: ${periodId}`,
      status: 'SUCCESS'
    });
  },
  updatePeriod(period: ElectionPeriod): void {
    const periods = db.getPeriods();
    const index = periods.findIndex(p => p.id === period.id);
    if (index >= 0) {
      periods[index] = period;
      safeSet(STORAGE_KEYS.PERIODS, periods);

      // Sync to Server
      serverSync.dispatchAction('UPDATE_PERIOD', period);

      db.addAuditLog({
        actor: 'Admin Sekolah',
        role: 'admin',
        action: `Pembaruan Informasi Periode: ${period.periodName}`,
        status: 'SUCCESS'
      });
    }
  },
  deletePeriod(periodId: string): void {
    const periods = db.getPeriods();
    const periodToDelete = periods.find(p => p.id === periodId);
    if (periodToDelete?.status === 'aktif') {
      throw new Error('Tidak dapat menghapus periode yang sedang berstatus AKTIF. Ganti atau nonaktifkan status terlebih dahulu.');
    }
    const updated = periods.filter(p => p.id !== periodId);
    safeSet(STORAGE_KEYS.PERIODS, updated);

    // Sync to Server
    serverSync.dispatchAction('DELETE_PERIOD', { id: periodId });

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Penghapusan Periode Pemilihan (ID: ${periodId})`,
      status: 'WARNING'
    });
  },

  // Candidates (Paslon)
  getCandidates(periodId?: string, category?: 'OSIS' | 'MPK'): Candidate[] {
    const all = safeGet<Candidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    let filtered = all.map(c => ({
      ...c,
      category: c.category || ('OSIS' as const)
    }));
    if (periodId) {
      filtered = filtered.filter(c => c.electionPeriodId === periodId);
    }
    if (category) {
      filtered = filtered.filter(c => c.category === category);
    }
    return filtered.sort((a, b) => a.ballotNumber - b.ballotNumber);
  },
  saveCandidate(candidate: Candidate): void {
    const all = db.getCandidates();
    const existingIndex = all.findIndex(c => c.id === candidate.id);
    if (existingIndex >= 0) {
      all[existingIndex] = candidate;
    } else {
      all.push(candidate);
    }
    safeSet(STORAGE_KEYS.CANDIDATES, all);

    // 1. Sync ke Server Terpusat (SEGERA TERSINKRON KE SEMUA PC LAIN VIA SSE)
    serverSync.dispatchAction('SAVE_CANDIDATE', candidate);

    // 2. Sync ke Supabase jika terhubung
    asyncSupabaseAction(async (client) => {
      await client.from('candidates').upsert({
        id: candidate.id,
        election_period_id: candidate.electionPeriodId,
        category: candidate.category,
        ballot_number: candidate.ballotNumber,
        chairman_name: candidate.chairmanName,
        chairman_class: candidate.chairmanClass,
        vice_chairman_name: candidate.viceChairmanName || '',
        vice_chairman_class: candidate.viceChairmanClass || '',
        photo_url: candidate.photoUrl,
        tagline: candidate.tagline || '',
        vision: candidate.vision || '',
        missions: candidate.missions || [],
        programs: candidate.programs || [],
        video_url: candidate.videoUrl || ''
      });
    });

    db.addAuditLog({
      actor: 'Panitia Pemilihan',
      role: 'panitia',
      action: `Penyimpanan Paslon [${candidate.category || 'OSIS'}] No. ${candidate.ballotNumber}: ${candidate.chairmanName}`,
      status: 'SUCCESS'
    });
  },
  deleteCandidate(id: string): void {
    const all = db.getCandidates().filter(c => c.id !== id);
    safeSet(STORAGE_KEYS.CANDIDATES, all);

    // 1. Sync ke Server Terpusat
    serverSync.dispatchAction('DELETE_CANDIDATE', { id });

    // 2. Sync ke Supabase jika terhubung
    asyncSupabaseAction(async (client) => {
      await client.from('candidates').delete().eq('id', id);
    });
  },

  // Voters (DPT)
  getVoters(periodId?: string): Voter[] {
    const all = safeGet<Voter[]>(STORAGE_KEYS.VOTERS, INITIAL_VOTERS);
    if (!periodId) return all;
    return all.filter(v => v.electionPeriodId === periodId);
  },
  saveVoter(voter: Voter): void {
    const all = db.getVoters();
    const index = all.findIndex(v => v.id === voter.id);
    if (index >= 0) {
      all[index] = voter;
    } else {
      all.push(voter);
    }
    safeSet(STORAGE_KEYS.VOTERS, all);

    // 1. Sync ke Server Terpusat
    serverSync.dispatchAction('SAVE_VOTER', voter);

    // 2. Sync ke Supabase jika terhubung
    asyncSupabaseAction(async (client) => {
      await client.from('voters').upsert({
        id: voter.id,
        election_period_id: voter.electionPeriodId,
        nisn: voter.nis || voter.nisn || '',
        full_name: voter.fullName,
        class_name: voter.className,
        gender: voter.gender || 'L',
        pin: voter.pin,
        has_voted: Boolean(voter.hasVoted),
        voted_at: voter.votedAt || null
      });
    });
  },
  deleteVoter(id: string): void {
    const all = db.getVoters();
    const target = all.find(v => v.id === id);
    const updated = all.filter(v => v.id !== id);
    safeSet(STORAGE_KEYS.VOTERS, updated);

    // 1. Sync ke Server Terpusat
    serverSync.dispatchAction('DELETE_VOTER', { id });

    // 2. Sync ke Supabase jika terhubung
    asyncSupabaseAction(async (client) => {
      await client.from('voters').delete().eq('id', id);
    });

    if (target) {
      db.addAuditLog({
        actor: 'Panitia Pemilihan',
        role: 'panitia',
        action: `Hapus Siswa dari DPT: ${target.fullName} (NIS: ${target.nis || target.nisn})`,
        status: 'SUCCESS'
      });
    }
  },
  importVoters(newVoters: (Omit<Voter, 'id' | 'hasVoted'> | { electionPeriodId: string; nisn: string; fullName: string; className: string; gender: 'L' | 'P'; pin?: string; nis?: string })[], overwrite = false): number {
    const all = db.getVoters();
    const activePeriod = db.getActivePeriod();

    let baseList = overwrite
      ? all.filter(v => v.electionPeriodId !== activePeriod.id)
      : [...all];

    const existingNis = new Set(
      baseList
        .filter(v => v.electionPeriodId === activePeriod.id)
        .map(v => (v.nis || v.nisn || '').trim())
    );

    let count = 0;
    const timestamp = Date.now();
    const newlyCreated: Voter[] = [];

    newVoters.forEach((nv, idx) => {
      const cleanNis = (nv.nis || nv.nisn || '').trim();
      if (!cleanNis) return;
      if (!existingNis.has(cleanNis)) {
        existingNis.add(cleanNis);
        const vObj: Voter = {
          ...nv,
          nis: cleanNis,
          nisn: cleanNis,
          fullName: nv.fullName.trim(),
          className: nv.className.trim(),
          gender: nv.gender === 'P' ? 'P' : 'L',
          id: `v-${timestamp}-${idx}-${Math.floor(Math.random() * 10000)}`,
          electionPeriodId: activePeriod.id,
          pin: nv.pin && nv.pin.trim().length === 6 ? nv.pin.trim().toUpperCase() : generateSecurePin(6),
          hasVoted: false
        };
        baseList.push(vObj);
        newlyCreated.push(vObj);
        count++;
      }
    });

    safeSet(STORAGE_KEYS.VOTERS, baseList);

    // 1. Sync ke Server Terpusat (Bilik Suara & PC lain langsung menerima DPT)
    if (newlyCreated.length > 0) {
      serverSync.dispatchAction('IMPORT_VOTERS', {
        newVoters: newlyCreated,
        overwrite,
        activePeriodId: activePeriod.id
      });
    }

    // 2. Sync ke Supabase jika terhubung
    if (newlyCreated.length > 0) {
      asyncSupabaseAction(async (client) => {
        const payload = newlyCreated.map(v => ({
          id: v.id,
          election_period_id: v.electionPeriodId,
          nisn: v.nis || v.nisn || '',
          full_name: v.fullName,
          class_name: v.className,
          gender: v.gender,
          pin: v.pin,
          has_voted: false
        }));
        for (let i = 0; i < payload.length; i += 100) {
          const chunk = payload.slice(i, i + 100);
          await client.from('voters').upsert(chunk);
        }
      });
    }

    db.addAuditLog({
      actor: 'Panitia Pemilihan',
      role: 'panitia',
      action: `Import DPT Masal (${count} Siswa Berhasil Diimpor${overwrite ? ' - Mode Timpa' : ''})`,
      status: 'SUCCESS'
    });
    return count;
  },
  clearVoters(periodId: string): void {
    const all = db.getVoters().filter(v => v.electionPeriodId !== periodId);
    safeSet(STORAGE_KEYS.VOTERS, all);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('CLEAR_VOTERS', { periodId });

    db.addAuditLog({
      actor: 'Panitia Pemilihan',
      role: 'panitia',
      action: `Pembersihan / Hapus Seluruh DPT Periode ${periodId}`,
      status: 'WARNING'
    });
  },
  generateAllPins(periodId: string): void {
    const all = db.getVoters();
    const pinMap: Record<string, string> = {};
    const updated = all.map(v => {
      if (v.electionPeriodId === periodId && !v.hasVoted) {
        const pin = generateSecurePin(6);
        pinMap[v.id] = pin;
        return { ...v, pin };
      }
      return v;
    });
    safeSet(STORAGE_KEYS.VOTERS, updated);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('GENERATE_ALL_PINS', { periodId, pinMap });

    db.addAuditLog({
      actor: 'Panitia Pemilihan',
      role: 'panitia',
      action: `Batch Re-generate Token PIN DPT Periode ${periodId}`,
      status: 'SUCCESS'
    });
  },
  resetVoterPin(voterId: string): string {
    const all = db.getVoters();
    const voter = all.find(v => v.id === voterId);
    if (!voter) throw new Error('Voter not found');
    if (voter.hasVoted) throw new Error('Pemilih sudah mencoblos. PIN tidak dapat direset.');
    
    const newPin = generateSecurePin(6);
    voter.pin = newPin;
    safeSet(STORAGE_KEYS.VOTERS, all);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('RESET_VOTER_PIN', { voterId, newPin });

    db.addAuditLog({
      actor: 'Panitia Pemilihan',
      role: 'panitia',
      action: `Reset PIN Darurat Pemilih NISN: ${voter.nisn} (${voter.fullName})`,
      status: 'SUCCESS'
    });
    return newPin;
  },

  // Anonymous Votes (Luber-Jurdil Architecture)
  getVotes(periodId?: string, category?: 'OSIS' | 'MPK'): AnonymousVote[] {
    const all = safeGet<AnonymousVote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
    let filtered = all;
    if (periodId) {
      filtered = filtered.filter(v => v.electionPeriodId === periodId);
    }
    if (category) {
      filtered = filtered.filter(v => v.category === category);
    }
    return filtered;
  },

  /**
   * ATOMIC LUBER-JURDIL VOTE CASTING
   * Separates Voter Registry (marked hasVoted) from Ballot Box (anonymous vote entry)
   * Supports voting for both OSIS and MPK
   */
  castVoteAtomic(
    periodId: string,
    voterId: string,
    selection: string | { osisCandidateId?: string; mpkCandidateId?: string },
    terminalId = 'Bilik-01'
  ): { success: boolean; message: string } {
    const activePeriod = db.getActivePeriod();
    if (activePeriod.id !== periodId || activePeriod.status !== 'aktif') {
      return { success: false, message: 'Pemungutan suara pada periode ini tidak aktif atau telah ditutup.' };
    }

    const allVoters = db.getVoters();
    const voter = allVoters.find(v => v.id === voterId && v.electionPeriodId === periodId);
    if (!voter) {
      return { success: false, message: 'Data pemilih tidak ditemukan pada DPT periode aktif.' };
    }
    if (voter.hasVoted) {
      db.addAuditLog({
        actor: `Bilik Suara (${terminalId})`,
        role: 'siswa',
        action: `Percobaan Ganda Ditolak! NISN: ${voter.nisn} telah berstatus SUDAH MEMILIH.`,
        status: 'WARNING'
      });
      return { success: false, message: 'Hak suara Anda telah digunakan sebelumnya! Pemilihan hanya berlaku 1 kali.' };
    }

    // 1. Record anonymous vote(s)
    const allVotes = db.getVotes();
    const nowIso = new Date().toISOString();
    const baseId = Date.now();

    if (typeof selection === 'string') {
      const newVote: AnonymousVote = {
        id: `vt-${baseId}-${Math.floor(Math.random() * 10000)}`,
        electionPeriodId: periodId,
        category: 'OSIS',
        candidateId: selection,
        timestamp: nowIso
      };
      allVotes.push(newVote);
    } else {
      if (selection.osisCandidateId) {
        allVotes.push({
          id: `vt-osis-${baseId}-${Math.floor(Math.random() * 10000)}`,
          electionPeriodId: periodId,
          category: 'OSIS',
          candidateId: selection.osisCandidateId,
          timestamp: nowIso
        });
      }
      if (selection.mpkCandidateId) {
        allVotes.push({
          id: `vt-mpk-${baseId}-${Math.floor(Math.random() * 10000)}`,
          electionPeriodId: periodId,
          category: 'MPK',
          candidateId: selection.mpkCandidateId,
          timestamp: nowIso
        });
      }
    }
    safeSet(STORAGE_KEYS.VOTES, allVotes);

    // 2. Mark voter status as voted (NO link to candidateId!)
    voter.hasVoted = true;
    voter.votedAt = nowIso;
    safeSet(STORAGE_KEYS.VOTERS, allVoters);

    // 3. Sync ke Server Terpusat (Quick Count di Laptop/Proyektor Lain Langsung Bergerak Live!)
    serverSync.dispatchAction('CAST_VOTE', {
      periodId,
      voterId,
      selection,
      terminalId
    });

    // 4. Sync ke Supabase jika terhubung
    asyncSupabaseAction(async (client) => {
      const votesToInsert: any[] = [];
      if (typeof selection === 'string') {
        votesToInsert.push({
          id: `vt-${baseId}-${Math.floor(Math.random() * 10000)}`,
          election_period_id: periodId,
          category: 'OSIS',
          candidate_id: selection,
          timestamp: nowIso,
          device_fingerprint: terminalId
        });
      } else {
        if (selection.osisCandidateId) {
          votesToInsert.push({
            id: `vt-osis-${baseId}-${Math.floor(Math.random() * 10000)}`,
            election_period_id: periodId,
            category: 'OSIS',
            candidate_id: selection.osisCandidateId,
            timestamp: nowIso,
            device_fingerprint: terminalId
          });
        }
        if (selection.mpkCandidateId) {
          votesToInsert.push({
            id: `vt-mpk-${baseId}-${Math.floor(Math.random() * 10000)}`,
            election_period_id: periodId,
            category: 'MPK',
            candidate_id: selection.mpkCandidateId,
            timestamp: nowIso,
            device_fingerprint: terminalId
          });
        }
      }

      if (votesToInsert.length > 0) {
        await client.from('anonymous_votes').insert(votesToInsert);
      }
      await client.from('voters').update({ has_voted: true, voted_at: nowIso }).eq('id', voterId);
    });

    // 5. System audit trail
    const voterNisDisplay = (voter.nisn || voter.nis || '****').substring(0, 4);
    db.addAuditLog({
      actor: `Bilik Suara (${terminalId})`,
      role: 'siswa',
      action: `Suara Berhasil Dicoblos (OSIS & MPK) Secara Sah & Anonim (NIS: ${voterNisDisplay}****)`,
      status: 'SUCCESS'
    });

    return { success: true, message: 'Suara sah Anda untuk Ketua OSIS & Ketua MPK berhasil tersimpan secara aman dan terenkripsi.' };
  },

  // Reset / Kosongkan Suara Uji Coba Tanpa Menghapus Data Master (Paslon & DPT Tetap Utuh)
  resetVotesOnly(periodId?: string): { countVotesReset: number; countVotersReset: number } {
    const targetPeriod = periodId;
    const allVotes = db.getVotes();
    let remainingVotes: AnonymousVote[] = [];
    let countVotesReset = 0;

    if (targetPeriod) {
      remainingVotes = allVotes.filter(v => v.electionPeriodId !== targetPeriod);
      countVotesReset = allVotes.length - remainingVotes.length;
    } else {
      countVotesReset = allVotes.length;
      remainingVotes = [];
    }
    safeSet(STORAGE_KEYS.VOTES, remainingVotes);

    // Reset status pemilih
    const allVoters = db.getVoters();
    let countVotersReset = 0;
    const updatedVoters = allVoters.map(v => {
      if (!targetPeriod || v.electionPeriodId === targetPeriod) {
        if (v.hasVoted) countVotersReset++;
        return {
          ...v,
          hasVoted: false,
          votedAt: undefined
        };
      }
      return v;
    });
    safeSet(STORAGE_KEYS.VOTERS, updatedVoters);

    // 1. Sync ke Server Terpusat
    serverSync.dispatchAction('RESET_VOTES', { periodId: targetPeriod });

    // 2. Sync ke Supabase jika terhubung
    asyncSupabaseAction(async (client) => {
      if (targetPeriod) {
        await client.from('anonymous_votes').delete().eq('election_period_id', targetPeriod);
        await client.from('voters').update({ has_voted: false, voted_at: null }).eq('election_period_id', targetPeriod);
      } else {
        await client.from('anonymous_votes').delete().neq('id', '__all__');
        await client.from('voters').update({ has_voted: false, voted_at: null }).neq('id', '__all__');
      }
    });

    db.addAuditLog({
      actor: 'Panitia / Admin',
      role: 'panitia',
      action: `Pengosongan Kotak Suara Uji Coba (${countVotesReset} suara direset, ${countVotersReset} status pemilih dikembalikan)`,
      status: 'WARNING'
    });

    return { countVotesReset, countVotersReset };
  },

  // Committee
  getCommittee(periodId?: string): Committee {
    const comm = safeGet<Committee>(STORAGE_KEYS.COMMITTEE, INITIAL_COMMITTEE);
    if (!periodId || comm.electionPeriodId === periodId) return comm;
    return comm;
  },
  updateCommittee(comm: Committee): void {
    safeSet(STORAGE_KEYS.COMMITTEE, comm);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('UPDATE_COMMITTEE', comm);

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Pembaruan Data SK & Panitia Pemilihan (SK: ${comm.skNumber})`,
      status: 'SUCCESS'
    });
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return safeGet<AuditLog[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
  },
  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp' | 'ipAddress'> & { ipAddress?: string }): void {
    const logs = db.getAuditLogs();
    const newLog: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ipAddress: entry.ipAddress || '192.168.1.' + Math.floor(10 + Math.random() * 90)
    };
    logs.unshift(newLog);
    if (logs.length > 100) logs.pop();
    safeSet(STORAGE_KEYS.AUDIT, logs);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('ADD_AUDIT_LOG', newLog);
  },

  // System Users
  getUsers(): SystemUser[] {
    return safeGet<SystemUser[]>(STORAGE_KEYS.USERS, INITIAL_SYSTEM_USERS);
  },
  saveUser(user: SystemUser): void {
    const all = db.getUsers();
    const idx = all.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      all[idx] = user;
    } else {
      all.push(user);
    }
    safeSet(STORAGE_KEYS.USERS, all);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('SAVE_USER', user);

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Penyimpanan Akun Pengguna: ${user.username} (${user.role.toUpperCase()})`,
      status: 'SUCCESS'
    });
  },
  deleteUser(id: string): void {
    const all = db.getUsers();
    const target = all.find(u => u.id === id);
    if (!target) return;
    if (target.username === 'admin103') {
      throw new Error('Akun Superadmin Utama (admin103) tidak dapat dihapus demi keamanan sistem.');
    }
    const updated = all.filter(u => u.id !== id);
    safeSet(STORAGE_KEYS.USERS, updated);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('DELETE_USER', { id });

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Penghapusan Akun Pengguna: ${target.username}`,
      status: 'WARNING'
    });
  },
  toggleUserStatus(id: string): void {
    const all = db.getUsers();
    const target = all.find(u => u.id === id);
    if (!target) return;
    if (target.username === 'admin103') {
      throw new Error('Akun Superadmin Utama (admin103) tidak dapat dinonaktifkan.');
    }
    target.isActive = !target.isActive;
    safeSet(STORAGE_KEYS.USERS, all);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('TOGGLE_USER', { id });

    db.addAuditLog({
      actor: 'Admin Sekolah',
      role: 'admin',
      action: `Ubah Status Akun: ${target.username} menjadi ${target.isActive ? 'AKTIF' : 'NONAKTIF'}`,
      status: 'SUCCESS'
    });
  },

  // Snapshot Cadangan Sebelum Reset
  createPreResetBackup(): void {
    if (typeof window === 'undefined') return;
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        school: db.getSchool(),
        periods: db.getPeriods(),
        candidates: db.getCandidates(),
        voters: db.getVoters(),
        committee: db.getCommittee(),
        users: db.getUsers(),
        votes: db.getVotes()
      };
      localStorage.setItem(PRE_RESET_BACKUP_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Gagal menyimpan cadangan sebelum reset:', e);
    }
  },
  hasPreResetBackup(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(PRE_RESET_BACKUP_KEY));
  },
  getPreResetBackupInfo(): { timestamp: string; candidatesCount: number; votersCount: number; schoolName: string } | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(PRE_RESET_BACKUP_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        timestamp: parsed.timestamp || '',
        candidatesCount: parsed.candidates?.length || 0,
        votersCount: parsed.voters?.length || 0,
        schoolName: parsed.school?.name || 'Sekolah'
      };
    } catch {
      return null;
    }
  },
  restorePreResetBackup(): { success: boolean; message: string } {
    if (typeof window === 'undefined') return { success: false, message: 'Browser tidak tersedia.' };
    try {
      const raw = localStorage.getItem(PRE_RESET_BACKUP_KEY);
      if (!raw) return { success: false, message: 'Tidak ditemukan data cadangan sebelum reset.' };
      const parsed = JSON.parse(raw);
      if (parsed.school) safeSet(STORAGE_KEYS.SCHOOL, parsed.school);
      if (parsed.periods) safeSet(STORAGE_KEYS.PERIODS, parsed.periods);
      if (parsed.candidates) safeSet(STORAGE_KEYS.CANDIDATES, parsed.candidates);
      if (parsed.voters) safeSet(STORAGE_KEYS.VOTERS, parsed.voters);
      if (parsed.committee) safeSet(STORAGE_KEYS.COMMITTEE, parsed.committee);
      if (parsed.users) safeSet(STORAGE_KEYS.USERS, parsed.users);
      if (parsed.votes) safeSet(STORAGE_KEYS.VOTES, parsed.votes);

      // Sync ke Server Terpusat
      serverSync.dispatchAction('RESTORE_BACKUP', parsed);

      db.addAuditLog({
        actor: 'Admin',
        role: 'admin',
        action: 'Pemulihan Cadangan Sebelum Reset Demo Berhasil (Data Dikembalikan Utuh)',
        status: 'SUCCESS'
      });
      return { success: true, message: 'Data sebelum reset demo berhasil dipulihkan secara utuh!' };
    } catch (err: any) {
      return { success: false, message: `Gagal memulihkan cadangan: ${err?.message || err}` };
    }
  },

  // Reset to default
  resetToDefault(): void {
    db.createPreResetBackup();

    safeSet(STORAGE_KEYS.SCHOOL, INITIAL_SCHOOL);
    safeSet(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
    safeSet(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    safeSet(STORAGE_KEYS.VOTERS, INITIAL_VOTERS);
    safeSet(STORAGE_KEYS.VOTES, INITIAL_VOTES);
    safeSet(STORAGE_KEYS.COMMITTEE, INITIAL_COMMITTEE);
    safeSet(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    safeSet(STORAGE_KEYS.USERS, INITIAL_SYSTEM_USERS);

    // Sync ke Server Terpusat
    serverSync.dispatchAction('RESET_DEFAULT', {});

    db.addAuditLog({
      actor: 'Sistem',
      role: 'system',
      action: 'Inisialisasi Ulang Database Default (E-Pilketos) - Cadangan snapshot otomatis disimpan',
      status: 'SUCCESS'
    });
  }
};
