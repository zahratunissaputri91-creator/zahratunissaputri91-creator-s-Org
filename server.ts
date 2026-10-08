import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DB_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DB_DIR, 'epilketos_db.json');

// Ensure data folder exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// In-memory DB state
interface DbState {
  version: number;
  updatedAt: string;
  school: any;
  periods: any[];
  candidates: any[];
  voters: any[];
  votes: any[];
  committee: any;
  auditLogs: any[];
  users: any[];
}

let dbState: DbState;

function loadDatabase(): DbState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading db file, will initialize default:', err);
  }

  // Fallback initial state
  const defaultState: DbState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    school: {
      id: 'sch-001',
      name: 'SMA Negeri 103 Jakarta',
      type: 'OSIS',
      npsn: '20103287',
      address: 'Jl. Mawar Merah VI No.1, RT.6/RW.1, Malaka Jaya, Kec. Duren Sawit, Kota Jakarta Timur',
      principalName: 'Dra. Hj. Sri Wahyuni, M.Pd.',
      principalNip: '19680315 199412 2 002',
      logoUrl: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?w=150&auto=format&fit=crop&q=80',
      academicYearDefault: '2026/2027'
    },
    periods: [],
    candidates: [],
    voters: [],
    votes: [],
    committee: {},
    auditLogs: [],
    users: []
  };
  return defaultState;
}

dbState = loadDatabase();

// Persist database with atomic file write
let saveTimeout: NodeJS.Timeout | null = null;
function persistDatabase() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dbState, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }, 100);
}

// SSE Clients for Real-time Multi-PC Broadcast
const sseClients = new Set<Response>();

function broadcastSSE(type: string, payload: any = {}) {
  const message = `event: ${type}\ndata: ${JSON.stringify({ ...payload, version: dbState.version, updatedAt: dbState.updatedAt })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Heartbeat to keep SSE connections alive
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

async function startServer() {
  const app = express();

  // Support JSON payload up to 50MB (for candidate image uploads & voter CSV imports)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // API ROUTES (REAL-TIME MULTI-PC SYNC)
  // ==========================================

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: dbState.version,
      updatedAt: dbState.updatedAt,
      votersCount: dbState.voters.length,
      candidatesCount: dbState.candidates.length,
      votesCount: dbState.votes.length,
      connectedClients: sseClients.size,
      serverTime: new Date().toISOString()
    });
  });

  // Get full authoritative database state
  app.get('/api/db/state', (_req: Request, res: Response) => {
    res.json({
      success: true,
      version: dbState.version,
      updatedAt: dbState.updatedAt,
      data: dbState
    });
  });

  // Lightweight version check for polling fallback
  app.get('/api/db/version', (_req: Request, res: Response) => {
    res.json({
      version: dbState.version,
      updatedAt: dbState.updatedAt,
      votersCount: dbState.voters.length,
      candidatesCount: dbState.candidates.length,
      votesCount: dbState.votes.length
    });
  });

  // Real-time Server-Sent Events (SSE) Stream
  app.get('/api/db/events', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ version: dbState.version, updatedAt: dbState.updatedAt })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Full state push / sync
  app.post('/api/db/sync', (req: Request, res: Response) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        res.status(400).json({ success: false, message: 'Invalid payload' });
        return;
      }

      if (incoming.school) dbState.school = incoming.school;
      if (incoming.periods) dbState.periods = incoming.periods;
      if (incoming.candidates) dbState.candidates = incoming.candidates;
      if (incoming.voters) dbState.voters = incoming.voters;
      if (incoming.votes) dbState.votes = incoming.votes;
      if (incoming.committee) dbState.committee = incoming.committee;
      if (incoming.auditLogs) dbState.auditLogs = incoming.auditLogs;
      if (incoming.users) dbState.users = incoming.users;

      dbState.version = (dbState.version || 0) + 1;
      dbState.updatedAt = new Date().toISOString();

      persistDatabase();
      broadcastSSE('state_updated', { type: 'FULL_SYNC' });

      res.json({
        success: true,
        version: dbState.version,
        updatedAt: dbState.updatedAt,
        message: 'Data successfully synchronized across all devices!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Atomic Action Dispatcher (Buttons in UI/UX)
  app.post('/api/db/action', (req: Request, res: Response) => {
    try {
      const { type, payload } = req.body;
      if (!type) {
        res.status(400).json({ success: false, message: 'Action type is required' });
        return;
      }

      let mutated = false;

      switch (type) {
        // --- CANDIDATES ---
        case 'SAVE_CANDIDATE': {
          const cand = payload;
          const idx = dbState.candidates.findIndex((c: any) => c.id === cand.id);
          if (idx >= 0) {
            dbState.candidates[idx] = cand;
          } else {
            dbState.candidates.push(cand);
          }
          mutated = true;
          break;
        }

        case 'DELETE_CANDIDATE': {
          const { id } = payload;
          dbState.candidates = dbState.candidates.filter((c: any) => c.id !== id);
          mutated = true;
          break;
        }

        // --- SCHOOL PROFILE ---
        case 'UPDATE_SCHOOL': {
          dbState.school = payload;
          mutated = true;
          break;
        }

        // --- VOTERS (DPT) ---
        case 'SAVE_VOTER': {
          const voter = payload;
          const idx = dbState.voters.findIndex((v: any) => v.id === voter.id);
          if (idx >= 0) {
            dbState.voters[idx] = voter;
          } else {
            dbState.voters.push(voter);
          }
          mutated = true;
          break;
        }

        case 'DELETE_VOTER': {
          const { id } = payload;
          dbState.voters = dbState.voters.filter((v: any) => v.id !== id);
          mutated = true;
          break;
        }

        case 'IMPORT_VOTERS': {
          const { newVoters, overwrite, activePeriodId } = payload;
          let baseList = overwrite
            ? dbState.voters.filter((v: any) => v.electionPeriodId !== activePeriodId)
            : [...dbState.voters];

          const existingNis = new Set(
            baseList
              .filter((v: any) => v.electionPeriodId === activePeriodId)
              .map((v: any) => (v.nis || v.nisn || '').trim())
          );

          newVoters.forEach((nv: any) => {
            const cleanNis = (nv.nis || nv.nisn || '').trim();
            if (!cleanNis || existingNis.has(cleanNis)) return;
            existingNis.add(cleanNis);
            baseList.push(nv);
          });

          dbState.voters = baseList;
          mutated = true;
          break;
        }

        case 'CLEAR_VOTERS': {
          const { periodId } = payload;
          dbState.voters = dbState.voters.filter((v: any) => v.electionPeriodId !== periodId);
          mutated = true;
          break;
        }

        case 'GENERATE_ALL_PINS': {
          const { periodId, pinMap } = payload;
          dbState.voters = dbState.voters.map((v: any) => {
            if (v.electionPeriodId === periodId && !v.hasVoted && pinMap && pinMap[v.id]) {
              return { ...v, pin: pinMap[v.id] };
            }
            return v;
          });
          mutated = true;
          break;
        }

        case 'RESET_VOTER_PIN': {
          const { voterId, newPin } = payload;
          const v = dbState.voters.find((item: any) => item.id === voterId);
          if (v) {
            v.pin = newPin;
            mutated = true;
          }
          break;
        }

        // --- VOTING (COBLOS SUARA) ---
        case 'CAST_VOTE': {
          const { periodId, voterId, selection, terminalId } = payload;
          const voter = dbState.voters.find((v: any) => v.id === voterId && v.electionPeriodId === periodId);
          if (!voter) {
            res.status(404).json({ success: false, message: 'Pemilih tidak ditemukan' });
            return;
          }
          if (voter.hasVoted) {
            res.status(400).json({ success: false, message: 'Pemilih sudah memberikan suara' });
            return;
          }

          const nowIso = new Date().toISOString();
          const baseId = Date.now();

          if (typeof selection === 'string') {
            dbState.votes.push({
              id: `vt-${baseId}-${Math.floor(Math.random() * 10000)}`,
              electionPeriodId: periodId,
              category: 'OSIS',
              candidateId: selection,
              timestamp: nowIso,
              deviceFingerprintHash: terminalId || 'Bilik'
            });
          } else {
            if (selection.osisCandidateId) {
              dbState.votes.push({
                id: `vt-osis-${baseId}-${Math.floor(Math.random() * 10000)}`,
                electionPeriodId: periodId,
                category: 'OSIS',
                candidateId: selection.osisCandidateId,
                timestamp: nowIso,
                deviceFingerprintHash: terminalId || 'Bilik'
              });
            }
            if (selection.mpkCandidateId) {
              dbState.votes.push({
                id: `vt-mpk-${baseId}-${Math.floor(Math.random() * 10000)}`,
                electionPeriodId: periodId,
                category: 'MPK',
                candidateId: selection.mpkCandidateId,
                timestamp: nowIso,
                deviceFingerprintHash: terminalId || 'Bilik'
              });
            }
          }

          voter.hasVoted = true;
          voter.votedAt = nowIso;
          mutated = true;
          break;
        }

        // --- RESET VOTES (KOTAK SUARA) ---
        case 'RESET_VOTES': {
          const { periodId } = payload || {};
          if (periodId) {
            dbState.votes = dbState.votes.filter((v: any) => v.electionPeriodId !== periodId);
            dbState.voters = dbState.voters.map((v: any) => {
              if (v.electionPeriodId === periodId) {
                return { ...v, hasVoted: false, votedAt: undefined };
              }
              return v;
            });
          } else {
            dbState.votes = [];
            dbState.voters = dbState.voters.map((v: any) => ({
              ...v,
              hasVoted: false,
              votedAt: undefined
            }));
          }
          mutated = true;
          break;
        }

        // --- PERIODS ---
        case 'CREATE_PERIOD': {
          dbState.periods.unshift(payload);
          mutated = true;
          break;
        }

        case 'UPDATE_PERIOD': {
          const period = payload;
          const idx = dbState.periods.findIndex((p: any) => p.id === period.id);
          if (idx >= 0) dbState.periods[idx] = period;
          mutated = true;
          break;
        }

        case 'DELETE_PERIOD': {
          const { id } = payload;
          dbState.periods = dbState.periods.filter((p: any) => p.id !== id);
          mutated = true;
          break;
        }

        case 'SET_ACTIVE_PERIOD': {
          const { id } = payload;
          dbState.periods = dbState.periods.map((p: any) => {
            if (p.id === id) return { ...p, status: 'aktif' };
            if (p.status === 'aktif') return { ...p, status: 'selesai', closedAt: new Date().toISOString() };
            return p;
          });
          mutated = true;
          break;
        }

        case 'CLOSE_PERIOD': {
          const { id } = payload;
          dbState.periods = dbState.periods.map((p: any) => {
            if (p.id === id) return { ...p, status: 'selesai', closedAt: new Date().toISOString() };
            return p;
          });
          mutated = true;
          break;
        }

        // --- COMMITTEE ---
        case 'UPDATE_COMMITTEE': {
          dbState.committee = payload;
          mutated = true;
          break;
        }

        // --- USERS ---
        case 'SAVE_USER': {
          const user = payload;
          const idx = dbState.users.findIndex((u: any) => u.id === user.id);
          if (idx >= 0) {
            dbState.users[idx] = user;
          } else {
            dbState.users.push(user);
          }
          mutated = true;
          break;
        }

        case 'DELETE_USER': {
          const { id } = payload;
          dbState.users = dbState.users.filter((u: any) => u.id !== id);
          mutated = true;
          break;
        }

        case 'TOGGLE_USER': {
          const { id } = payload;
          const u = dbState.users.find((item: any) => item.id === id);
          if (u) {
            u.isActive = !u.isActive;
            mutated = true;
          }
          break;
        }

        // --- AUDIT LOG ---
        case 'ADD_AUDIT_LOG': {
          dbState.auditLogs.unshift(payload);
          if (dbState.auditLogs.length > 150) dbState.auditLogs.pop();
          mutated = true;
          break;
        }

        // --- FACTORY RESET / RESTORE ---
        case 'RESET_DEFAULT': {
          // Re-load initial default from initial_data.json
          const defaultData = loadDatabase();
          dbState.school = defaultData.school;
          dbState.periods = defaultData.periods;
          dbState.candidates = defaultData.candidates;
          dbState.voters = defaultData.voters;
          dbState.votes = defaultData.votes;
          dbState.committee = defaultData.committee;
          dbState.users = defaultData.users;
          mutated = true;
          break;
        }

        case 'RESTORE_BACKUP': {
          const b = payload;
          if (b.school) dbState.school = b.school;
          if (b.periods) dbState.periods = b.periods;
          if (b.candidates) dbState.candidates = b.candidates;
          if (b.voters) dbState.voters = b.voters;
          if (b.votes) dbState.votes = b.votes;
          if (b.committee) dbState.committee = b.committee;
          if (b.users) dbState.users = b.users;
          mutated = true;
          break;
        }

        default:
          res.status(400).json({ success: false, message: `Unknown action type: ${type}` });
          return;
      }

      if (mutated) {
        dbState.version = (dbState.version || 0) + 1;
        dbState.updatedAt = new Date().toISOString();
        persistDatabase();
        broadcastSSE('state_updated', { type, payload });
      }

      res.json({
        success: true,
        version: dbState.version,
        updatedAt: dbState.updatedAt,
        type
      });
    } catch (err: any) {
      console.error('Error executing action:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // FRONTEND DEV / PRODUCTION MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 E-Pilketos Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Multi-PC Realtime Synchronization: ACTIVE`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
