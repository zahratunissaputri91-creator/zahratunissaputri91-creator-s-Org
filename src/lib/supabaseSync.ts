import { getSupabaseClient, getSupabaseConfig } from './supabase';
import { db } from './storage';
import { Candidate, Voter, AnonymousVote, ElectionPeriod, School, SystemUser } from '../types';

/**
 * Modul Sinkronisasi Dua Arah Supabase Cloud untuk E-Pilketos
 * Memungkinkan data tersimpan secara persisten antar-PC (Bilik Suara, Admin, Panitia, Quick Count)
 */

export const cloudSync = {
  /**
   * Cek apakah Supabase aktif dan siap digunakan
   */
  isReady(): boolean {
    const client = getSupabaseClient();
    return Boolean(client);
  },

  /**
   * PUSH: Mengunggah seluruh data lokal saat ini ke tabel Supabase Cloud
   */
  async pushAll(): Promise<{ success: boolean; message: string; votersCount: number; candidatesCount: number }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase Cloud belum terhubung atau belum aktif.', votersCount: 0, candidatesCount: 0 };
    }

    try {
      const school = db.getSchool();
      const periods = db.getPeriods();
      const activePeriod = db.getActivePeriod();
      const candidates = db.getCandidates();
      const voters = db.getVoters();
      const votes = db.getVotes();
      const users = db.getUsers();

      // 1. Sync Sekolah
      const { error: errSchool } = await client.from('schools').upsert({
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
      if (errSchool) console.warn('Sync school warning:', errSchool.message);

      // 2. Sync Periode
      if (periods.length > 0) {
        const { error: errPeriods } = await client.from('election_periods').upsert(
          periods.map(p => ({
            id: p.id,
            school_id: p.schoolId,
            period_name: p.periodName,
            academic_year: p.academicYear,
            start_date: p.startDate,
            end_date: p.endDate,
            status: p.status,
            description: p.description || ''
          }))
        );
        if (errPeriods) console.warn('Sync periods warning:', errPeriods.message);
      }

      // 3. Sync Kandidat
      if (candidates.length > 0) {
        const { error: errCandidates } = await client.from('candidates').upsert(
          candidates.map(c => ({
            id: c.id,
            election_period_id: c.electionPeriodId || activePeriod.id,
            category: c.category,
            ballot_number: c.ballotNumber,
            chairman_name: c.chairmanName,
            chairman_class: c.chairmanClass,
            vice_chairman_name: c.viceChairmanName || '',
            vice_chairman_class: c.viceChairmanClass || '',
            photo_url: c.photoUrl,
            tagline: c.tagline || '',
            vision: c.vision || '',
            missions: c.missions || [],
            programs: c.programs || [],
            video_url: c.videoUrl || ''
          }))
        );
        if (errCandidates) console.warn('Sync candidates warning:', errCandidates.message);
      }

      // 4. Sync DPT Pemilih
      if (voters.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < voters.length; i += batchSize) {
          const chunk = voters.slice(i, i + batchSize);
          const { error: errVoters } = await client.from('voters').upsert(
            chunk.map(v => ({
              id: v.id,
              election_period_id: v.electionPeriodId || activePeriod.id,
              nisn: v.nis || v.nisn || '',
              full_name: v.fullName,
              class_name: v.className,
              gender: v.gender || 'L',
              pin: v.pin,
              has_voted: Boolean(v.hasVoted),
              voted_at: v.votedAt || null
            }))
          );
          if (errVoters) console.warn('Sync voters chunk warning:', errVoters.message);
        }
      }

      // 5. Sync Kotak Suara
      if (votes.length > 0) {
        const { error: errVotes } = await client.from('anonymous_votes').upsert(
          votes.map(v => ({
            id: v.id,
            election_period_id: v.electionPeriodId || activePeriod.id,
            category: v.category,
            candidate_id: v.candidateId,
            timestamp: v.timestamp,
            device_fingerprint: v.deviceFingerprintHash || (v as any).deviceFingerprint || 'Cloud-Sync'
          }))
        );
        if (errVotes) console.warn('Sync votes warning:', errVotes.message);
      }

      // 6. Sync Pengguna
      if (users.length > 0) {
        const { error: errUsers } = await client.from('system_users').upsert(
          users.map(u => ({
            id: u.id,
            username: u.username,
            full_name: u.fullName,
            email: u.email,
            role: u.role,
            password: u.password,
            is_active: u.isActive,
            phone_number: u.phoneNumber || ''
          }))
        );
        if (errUsers) console.warn('Sync users warning:', errUsers.message);
      }

      db.addAuditLog({
        actor: 'Sistem Cloud',
        role: 'system',
        action: `Unggah Penuh ke Supabase Cloud: ${voters.length} Pemilih & ${candidates.length} Calon tersimpan`,
        status: 'SUCCESS'
      });

      return {
        success: true,
        message: `Berhasil mengunggah ${voters.length} Pemilih (DPT) dan ${candidates.length} Calon ke Supabase Cloud! Semua PC sekarang dapat mengakses data ini.`,
        votersCount: voters.length,
        candidatesCount: candidates.length
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Gagal mengunggah data ke Supabase: ${msg}`, votersCount: 0, candidatesCount: 0 };
    }
  },

  /**
   * PULL: Menarik seluruh data terbaru dari Supabase Cloud dan memperbarui penyimpanan lokal
   * Sangat krusial saat membuka aplikasi dari laptop/PC lain!
   */
  async pullAll(): Promise<{ success: boolean; message: string; votersCount: number; candidatesCount: number }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase Cloud belum terhubung.', votersCount: 0, candidatesCount: 0 };
    }

    try {
      // 1. Ambil Data Sekolah
      const { data: schoolsData } = await client.from('schools').select('*').limit(1);
      if (schoolsData && schoolsData.length > 0) {
        const s = schoolsData[0];
        db.updateSchool({
          id: s.id,
          name: s.name,
          type: s.type || 'OSIS',
          npsn: s.npsn,
          address: s.address || '',
          principalName: s.principal_name || '',
          principalNip: s.principal_nip || '',
          logoUrl: s.logo_url || '',
          academicYearDefault: s.academic_year_default || '2026/2027'
        });
      }

      // 2. Ambil Periode
      const { data: periodsData } = await client.from('election_periods').select('*');
      if (periodsData && periodsData.length > 0) {
        const mappedPeriods: ElectionPeriod[] = periodsData.map(p => ({
          id: p.id,
          schoolId: p.school_id,
          periodName: p.period_name,
          academicYear: p.academic_year,
          startDate: p.start_date,
          endDate: p.end_date,
          status: p.status,
          description: p.description || '',
          createdAt: p.created_at || new Date().toISOString()
        }));
        (window as any).localStorage.setItem('epilketos_periods_v1', JSON.stringify(mappedPeriods));
      }

      // 3. Ambil Kandidat
      const { data: candidatesData } = await client.from('candidates').select('*').order('ballot_number', { ascending: true });
      let candCount = 0;
      if (candidatesData && candidatesData.length > 0) {
        const mappedCandidates: Candidate[] = candidatesData.map(c => ({
          id: c.id,
          electionPeriodId: c.election_period_id,
          category: c.category,
          ballotNumber: c.ballot_number,
          chairmanName: c.chairman_name,
          chairmanClass: c.chairman_class,
          viceChairmanName: c.vice_chairman_name || '',
          viceChairmanClass: c.vice_chairman_class || '',
          photoUrl: c.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
          tagline: c.tagline || '',
          vision: c.vision || '',
          missions: Array.isArray(c.missions) ? c.missions : [],
          programs: Array.isArray(c.programs) ? c.programs : [],
          videoUrl: c.video_url || ''
        }));
        (window as any).localStorage.setItem('epilketos_candidates_v1', JSON.stringify(mappedCandidates));
        candCount = mappedCandidates.length;
      }

      // 4. Ambil DPT Pemilih
      const { data: votersData } = await client.from('voters').select('*').limit(5000);
      let voterCount = 0;
      if (votersData && votersData.length > 0) {
        const mappedVoters: Voter[] = votersData.map(v => ({
          id: v.id,
          electionPeriodId: v.election_period_id,
          nis: v.nisn,
          nisn: v.nisn,
          fullName: v.full_name,
          className: v.class_name,
          gender: v.gender || 'L',
          pin: v.pin,
          hasVoted: Boolean(v.has_voted),
          votedAt: v.voted_at || undefined
        }));
        (window as any).localStorage.setItem('epilketos_voters_v1', JSON.stringify(mappedVoters));
        voterCount = mappedVoters.length;
      }

      // 5. Ambil Kotak Suara
      const { data: votesData } = await client.from('anonymous_votes').select('*');
      if (votesData) {
        const mappedVotes: AnonymousVote[] = votesData.map(v => ({
          id: v.id,
          electionPeriodId: v.election_period_id,
          category: v.category,
          candidateId: v.candidate_id,
          timestamp: v.timestamp,
          deviceFingerprintHash: v.device_fingerprint || 'Cloud'
        }));
        (window as any).localStorage.setItem('epilketos_votes_v1', JSON.stringify(mappedVotes));
      }

      // Pemicu event state change agar semua komponen React me-render data terbaru
      window.dispatchEvent(new CustomEvent('epilketos_state_change', { detail: { source: 'supabase_pull' } }));

      return {
        success: true,
        message: `Sinkronisasi Sukses: Berhasil menarik ${voterCount} Pemilih dan ${candCount} Calon dari Supabase Cloud!`,
        votersCount: voterCount,
        candidatesCount: candCount
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Gagal menarik data dari Supabase Cloud: ${msg}`, votersCount: 0, candidatesCount: 0 };
    }
  },

  /**
   * Catat Suara Bilik ke Supabase Cloud secara instan
   */
  async recordVote(
    periodId: string,
    voterId: string,
    selections: { osisCandidateId?: string; mpkCandidateId?: string },
    deviceId: string
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const now = new Date().toISOString();
      const votesToInsert: any[] = [];
      if (selections.osisCandidateId) {
        votesToInsert.push({
          id: `vote-osis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          election_period_id: periodId,
          category: 'OSIS',
          candidate_id: selections.osisCandidateId,
          timestamp: now,
          device_fingerprint: deviceId
        });
      }
      if (selections.mpkCandidateId) {
        votesToInsert.push({
          id: `vote-mpk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          election_period_id: periodId,
          category: 'MPK',
          candidate_id: selections.mpkCandidateId,
          timestamp: now,
          device_fingerprint: deviceId
        });
      }

      if (votesToInsert.length > 0) {
        const { error: errVote } = await client.from('anonymous_votes').insert(votesToInsert);
        if (errVote) console.warn('Supabase vote insert warning:', errVote.message);
      }

      // 2. Tandai pemilih sudah mencoblos
      const { error: errVoter } = await client
        .from('voters')
        .update({ has_voted: true, voted_at: now })
        .eq('id', voterId);
      if (errVoter) console.warn('Supabase voter update warning:', errVoter.message);

      return true;
    } catch (err) {
      console.error('Error syncing vote to Supabase:', err);
      return false;
    }
  },

  /**
   * Reset / Kosongkan Suara Testing di Supabase Cloud
   * Menghapus semua surat suara dari anonymous_votes dan mengembalikan has_voted = false di tabel voters
   */
  async clearVotes(periodId?: string): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase client tidak aktif.' };
    }

    try {
      // 1. Hapus suara di periode ini (atau seluruh periode jika tidak dispesifikasi)
      let queryVotes = client.from('anonymous_votes').delete();
      if (periodId) {
        queryVotes = queryVotes.eq('election_period_id', periodId);
      } else {
        queryVotes = queryVotes.neq('id', '__all__');
      }
      const { error: errDeleteVotes } = await queryVotes;
      if (errDeleteVotes) {
        console.warn('Delete anonymous_votes warning:', errDeleteVotes.message);
      }

      // 2. Reset status voters di periode ini
      let queryVoters = client
        .from('voters')
        .update({ has_voted: false, voted_at: null });
      if (periodId) {
        queryVoters = queryVoters.eq('election_period_id', periodId);
      } else {
        queryVoters = queryVoters.neq('id', '__all__');
      }
      const { error: errResetVoters } = await queryVoters;
      if (errResetVoters) {
        console.warn('Reset voters status warning:', errResetVoters.message);
      }

      return {
        success: true,
        message: 'Kotak suara dan status DPT di Supabase Cloud berhasil dikosongkan.'
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error clearing votes in Supabase:', msg);
      return { success: false, message: `Gagal mengosongkan di Supabase: ${msg}` };
    }
  },

  /**
   * Sync single voter to Supabase
   */
  async syncVoter(voter: Voter): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
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
    } catch (e) {
      console.warn('Sync voter error:', e);
    }
  },

  /**
   * Delete single voter from Supabase
   */
  async deleteVoter(voterId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('voters').delete().eq('id', voterId);
    } catch (e) {
      console.warn('Delete voter in Supabase error:', e);
    }
  },

  /**
   * Sync single candidate to Supabase
   */
  async syncCandidate(candidate: Candidate): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
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
    } catch (e) {
      console.warn('Sync candidate error:', e);
    }
  },

  /**
   * Delete single candidate from Supabase
   */
  async deleteCandidate(candidateId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('candidates').delete().eq('id', candidateId);
    } catch (e) {
      console.warn('Delete candidate in Supabase error:', e);
    }
  },

  /**
   * Sync school to Supabase
   */
  async syncSchool(school: School): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
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
    } catch (e) {
      console.warn('Sync school in Supabase error:', e);
    }
  },

  /**
   * Dapatkan Tautan Bagikan Koneksi Supabase untuk PC Lain
   * Memungkinkan Bilik Suara / PC 2 terhubung ke project Supabase yang sama hanya dengan membuka link
   */
  getShareableConnectLink(): string {
    const cfg = getSupabaseConfig();
    if (!cfg.isEnabled || !cfg.url || !cfg.anonKey) return '';
    const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const params = new URLSearchParams({
      sb_url: encodeURIComponent(cfg.url),
      sb_key: encodeURIComponent(cfg.anonKey)
    });
    return `${base}?${params.toString()}`;
  },

  /**
   * Tarik khusus data suara dari Supabase Cloud (hemat bandwidth)
   */
  async pullVotesOnly(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data: votesData } = await client.from('anonymous_votes').select('*');
      if (votesData) {
        const mappedVotes: AnonymousVote[] = votesData.map(v => ({
          id: v.id,
          electionPeriodId: v.election_period_id,
          category: v.category,
          candidateId: v.candidate_id,
          timestamp: v.timestamp,
          deviceFingerprintHash: v.device_fingerprint || 'Cloud'
        }));
        localStorage.setItem('epilketos_votes_v1', JSON.stringify(mappedVotes));
        window.dispatchEvent(new CustomEvent('epilketos_state_change', { detail: { key: 'epilketos_votes_v1' } }));
      }
    } catch (e) {
      console.warn('Pull votes error:', e);
    }
  },

  /**
   * Tarik khusus status DPT Pemilih dari Supabase Cloud
   */
  async pullVotersOnly(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data: votersData } = await client.from('voters').select('*').limit(5000);
      if (votersData && votersData.length > 0) {
        const mappedVoters: Voter[] = votersData.map(v => ({
          id: v.id,
          electionPeriodId: v.election_period_id,
          nis: v.nisn,
          nisn: v.nisn,
          fullName: v.full_name,
          className: v.class_name,
          gender: v.gender || 'L',
          pin: v.pin,
          hasVoted: Boolean(v.has_voted),
          votedAt: v.voted_at || undefined
        }));
        localStorage.setItem('epilketos_voters_v1', JSON.stringify(mappedVoters));
        window.dispatchEvent(new CustomEvent('epilketos_state_change', { detail: { key: 'epilketos_voters_v1' } }));
      }
    } catch (e) {
      console.warn('Pull voters error:', e);
    }
  },

  /**
   * Berlangganan perubahan Realtime Supabase (sinkronisasi live antar bilik suara & layar proyektor)
   */
  subscribeToRealtimeChanges(onUpdate?: () => void): (() => void) | null {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const channel = client
        .channel('epilketos_live_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'anonymous_votes' }, async () => {
          await cloudSync.pullVotesOnly();
          if (onUpdate) onUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, async () => {
          await cloudSync.pullVotersOnly();
          if (onUpdate) onUpdate();
        })
        .subscribe();

      return () => {
        try {
          client.removeChannel(channel);
        } catch {}
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
      return null;
    }
  }
};
