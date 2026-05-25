import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppUser, Declaration, LogEntry, Notification, DeclarationStatus,
  PCACase, PCAFinding, PCAAnomaly, Watchlist, IndividualUser, ThresholdSet, PCAStatus,
} from '../types';
import { uid } from '../lib/utils';
import { runAI } from '../lib/ai';
import { detectPatterns, pcaRiskBand, pcaDutyAtRisk } from '../lib/pca';
import { seedUsers, seedDeclarations, seedLogs, seedNotifications } from '../data/seed';
import { DEFAULT_THRESHOLDS } from '../lib/referenceData';
import { DEPARTMENTS as DEFAULT_DEPARTMENTS } from '../types';

interface DataState {
  initialized: boolean;
  users: AppUser[];
  declarations: Declaration[];
  logs: LogEntry[];
  notifications: Notification[];
  pcaCases: PCACase[];
  pcaFindings: PCAFinding[];
  pcaAnomalies: PCAAnomaly[];
  watchlists: Watchlist[];
  departments: string[];        // dynamic — admin can add/remove
  thresholds: ThresholdSet;     // dynamic — admin can edit

  initSeed: () => void;
  resetDemo: () => void;

  // user / staff
  addUser: (u: AppUser) => void;
  updateUser: (id: string, patch: Partial<AppUser>) => void;
  deleteUser: (id: string, actorId?: string) => { ok: boolean; error?: string };

  // departments
  addDepartment: (name: string) => { ok: boolean; error?: string };
  renameDepartment: (oldName: string, newName: string) => { ok: boolean; error?: string };
  deleteDepartment: (name: string) => { ok: boolean; error?: string };

  // thresholds
  updateThresholds: (patch: Partial<ThresholdSet>) => void;

  // PCA status mutation
  setPCACaseStatus: (id: string, status: PCAStatus, actorId: string, note?: string) => void;

  // declarations
  addDeclaration: (d: Omit<Declaration, 'id' | 'uploadedAt' | 'ai' | 'aiHistory' | 'assignedInspectorId' | 'status' | 'comments'> & { ownerId: string; ownerEntityType: 'individual' | 'company'; ownerDisplayName: string; }) => string;
  updateDeclaration: (id: string, patch: Partial<Declaration>) => void;
  resubmitDeclaration: (id: string, actor: AppUser) => void;
  changeStatus: (id: string, next: DeclarationStatus, actor: AppUser, opts?: { rejectReason?: string; correctionSummary?: string; correctionDetails?: string }) => { ok: boolean; error?: string };
  assignInspector: (declId: string, inspectorId: string, actor: AppUser) => void;
  addComment: (declId: string, text: string, actor: AppUser) => void;
  addLog: (l: Omit<LogEntry, 'id' | 'at'>) => void;
  pushNotification: (n: Omit<Notification, 'id' | 'at' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  // PCA
  refreshPCACases: () => void;
  refreshPCAAnomalies: () => void;
  updatePCACase: (id: string, patch: Partial<PCACase>) => void;
  addPCAFinding: (f: Omit<PCAFinding, 'id' | 'createdAt'>) => string;
  updatePCAFinding: (id: string, patch: Partial<PCAFinding>) => void;
  toggleWatchlist: (auditorId: string, companyId: string) => void;
  dismissAnomaly: (id: string) => void;
  logPCAView: (declarationId: string, auditor: AppUser) => void;
}

const ALLOWED_TRANSITIONS: Record<DeclarationStatus, DeclarationStatus[]> = {
  'Yüklənib': ['Yoxlanılır'],
  'Yoxlanılır': ['Düzəliş Tələb Olunur', 'Təsdiq', 'Rədd'],
  'Düzəliş Tələb Olunur': ['Yoxlanılır'],
  'Təsdiq': ['Tamamlanmış'],
  'Rədd': ['Tamamlanmış'],
  'Tamamlanmış': [],
};

const dispName = (u: AppUser) => u.entityType === 'individual' ? `${u.firstName} ${u.lastName}` : u.companyName;

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      initialized: false,
      users: [],
      declarations: [],
      logs: [],
      notifications: [],
      pcaCases: [],
      pcaFindings: [],
      pcaAnomalies: [],
      watchlists: [],
      departments: [...DEFAULT_DEPARTMENTS],
      thresholds: DEFAULT_THRESHOLDS,

      initSeed: () => {
        if (get().initialized) {
          // still ensure PCA derived data exists
          if (get().pcaCases.length === 0) get().refreshPCACases();
          if (get().pcaAnomalies.length === 0) get().refreshPCAAnomalies();
          return;
        }
        const users = seedUsers();
        const declarations = seedDeclarations(users);
        const logs = seedLogs(declarations, users);
        const notifications = seedNotifications(declarations, users);
        set({ users, declarations, logs, notifications, initialized: true });
        setTimeout(() => {
          get().refreshPCACases();
          get().refreshPCAAnomalies();
        }, 0);
      },

      resetDemo: () => {
        const users = seedUsers();
        const declarations = seedDeclarations(users);
        const logs = seedLogs(declarations, users);
        const notifications = seedNotifications(declarations, users);
        set({
          users, declarations, logs, notifications,
          pcaCases: [], pcaFindings: [], pcaAnomalies: [], watchlists: [],
          departments: [...DEFAULT_DEPARTMENTS],
          thresholds: DEFAULT_THRESHOLDS,
          initialized: true,
        });
        setTimeout(() => {
          get().refreshPCACases();
          get().refreshPCAAnomalies();
        }, 0);
      },

      addUser: (u) => set((s) => ({ users: [...s.users, u] })),

      updateUser: (id, patch) => set((s) => ({
        users: s.users.map((u) => u.id === id ? { ...u, ...patch } as AppUser : u),
      })),

      deleteUser: (id, actorId) => {
        const u = get().users.find((x) => x.id === id);
        if (!u) return { ok: false, error: 'İstifadəçi tapılmadı' };
        if (u.role === 'boss') return { ok: false, error: 'Baş direktor silinə bilməz' };
        const hasActiveAssignments = get().declarations.some(
          (d) => d.assignedInspectorId === id && !['Tamamlanmış', 'Rədd'].includes(d.status),
        );
        if (u.role === 'inspector' && hasActiveAssignments) {
          return { ok: false, error: 'Bu müfəttişin aktiv bəyannamələri var. Əvvəlcə yenidən təyin edin.' };
        }
        set((s) => ({
          users: s.users.filter((x) => x.id !== id),
        }));
        if (actorId) {
          get().addLog({
            actorId, actorRole: get().users.find((x) => x.id === actorId)?.role ?? 'boss',
            actorDisplayName: dispName(get().users.find((x) => x.id === actorId) ?? u),
            action: 'STATUS_CHANGE',
            description: `İstifadəçi silindi: ${dispName(u)} (${u.role})`,
          });
        }
        return { ok: true };
      },

      addDepartment: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, error: 'Şöbə adı boş ola bilməz' };
        if (get().departments.includes(trimmed)) return { ok: false, error: 'Bu adda şöbə artıq var' };
        set((s) => ({ departments: [...s.departments, trimmed] }));
        return { ok: true };
      },

      renameDepartment: (oldName, newName) => {
        const trimmed = newName.trim();
        if (!trimmed) return { ok: false, error: 'Yeni ad boş ola bilməz' };
        if (!get().departments.includes(oldName)) return { ok: false, error: 'Köhnə ad tapılmadı' };
        if (get().departments.includes(trimmed) && trimmed !== oldName) {
          return { ok: false, error: 'Bu adda şöbə artıq var' };
        }
        set((s) => ({
          departments: s.departments.map((d) => d === oldName ? trimmed : d),
          users: s.users.map((u) =>
            u.entityType === 'individual' && (u as IndividualUser).department === oldName
              ? { ...u, department: trimmed as any } as AppUser
              : u,
          ),
          declarations: s.declarations.map((d) => d.department === oldName ? { ...d, department: trimmed as any } : d),
        }));
        return { ok: true };
      },

      deleteDepartment: (name) => {
        const hasUsers = get().users.some(
          (u) => u.entityType === 'individual' && (u as IndividualUser).department === name,
        );
        const hasDecls = get().declarations.some((d) => d.department === name);
        if (hasUsers) return { ok: false, error: 'Şöbədə təyin olunmuş əməkdaşlar var' };
        if (hasDecls) return { ok: false, error: 'Şöbədə bəyannamələr mövcuddur' };
        set((s) => ({ departments: s.departments.filter((d) => d !== name) }));
        return { ok: true };
      },

      updateThresholds: (patch) => set((s) => ({ thresholds: { ...s.thresholds, ...patch } })),

      setPCACaseStatus: (id, status, actorId, note) => {
        const c = get().pcaCases.find((x) => x.id === id);
        if (!c) return;
        set((s) => ({
          pcaCases: s.pcaCases.map((x) => x.id === id
            ? { ...x, status, notes: note ? `${x.notes ? x.notes + '\n' : ''}${new Date().toISOString().slice(0, 10)}: ${note}` : x.notes }
            : x),
        }));
        const actor = get().users.find((u) => u.id === actorId);
        if (actor) {
          get().addLog({
            declarationId: c.declarationId,
            actorId, actorRole: actor.role,
            actorDisplayName: dispName(actor),
            action: 'STATUS_CHANGE',
            description: `PCA iş statusu: ${c.status} → ${status}${note ? ` (${note})` : ''}`,
          });
        }
      },

      addDeclaration: (d) => {
        const id = uid('decl');
        const now = new Date().toISOString();
        const inspectors = get().users.filter((u) => u.role === 'inspector' && u.entityType === 'individual' && (u as IndividualUser).department === d.department);
        // round robin: pick the one with fewest active assignments
        const activeCounts = inspectors.map((i) => ({
          inspector: i,
          count: get().declarations.filter((dd) => dd.assignedInspectorId === i.id && !['Tamamlanmış', 'Rədd'].includes(dd.status)).length,
        }));
        activeCounts.sort((a, b) => a.count - b.count);
        const assigned = activeCounts[0]?.inspector;

        const ai = runAI({ ...d, ownerEntityType: d.ownerEntityType }, get().thresholds);

        const decl: Declaration = {
          id,
          ownerId: d.ownerId,
          ownerEntityType: d.ownerEntityType,
          ownerDisplayName: d.ownerDisplayName,
          kind: d.kind, department: d.department,
          declarationDate: d.declarationDate, customsPoint: d.customsPoint, referenceNumber: d.referenceNumber,
          documents: d.documents, shipment: d.shipment, totals: d.totals,
          status: 'Yüklənib',
          assignedInspectorId: assigned?.id ?? null,
          ai, aiHistory: [ai],
          comments: [],
          uploadedAt: now,
        };

        set((s) => ({ declarations: [decl, ...s.declarations] }));

        const owner = get().users.find((u) => u.id === d.ownerId);
        if (owner) {
          get().addLog({
            declarationId: id, actorId: owner.id, actorRole: 'user',
            actorDisplayName: dispName(owner), action: 'UPLOAD',
            description: 'Bəyannamə yükləndi',
          });
        }
        get().addLog({
          declarationId: id, actorId: 'system', actorRole: 'user',
          actorDisplayName: 'Sistem', action: 'AI_RUN',
          description: `AI risk skoru: ${ai.score} (${ai.riskLevel})`,
          meta: { score: ai.score, riskLevel: ai.riskLevel },
        });

        if (assigned) {
          get().addLog({
            declarationId: id, actorId: 'system', actorRole: 'user',
            actorDisplayName: 'Sistem', action: 'ASSIGNED',
            description: `Müfəttiş təyin olundu: ${dispName(assigned)}`,
          });
          get().pushNotification({
            userId: assigned.id, title: 'Yeni bəyannamə',
            body: `${id} bəyannaməsi sizə təyin olundu.`,
            link: `/declaration/${id}`, type: 'info',
          });
        }

        return id;
      },

      updateDeclaration: (id, patch) => set((s) => ({
        declarations: s.declarations.map((d) => d.id === id ? { ...d, ...patch } : d),
      })),

      resubmitDeclaration: (id, actor) => {
        const d = get().declarations.find((x) => x.id === id);
        if (!d) return;
        const ai = runAI(d, get().thresholds);
        set((s) => ({
          declarations: s.declarations.map((dd) =>
            dd.id === id
              ? { ...dd, status: 'Yüklənib', ai, aiHistory: [...dd.aiHistory, ai], correctionRequest: dd.correctionRequest ? { ...dd.correctionRequest, resolvedAt: new Date().toISOString() } : undefined }
              : dd
          ),
        }));
        get().addLog({
          declarationId: id, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'RESUBMITTED',
          description: 'Bəyannamə yenidən təqdim edildi',
        });
        get().addLog({
          declarationId: id, actorId: 'system', actorRole: 'user',
          actorDisplayName: 'Sistem', action: 'AI_RUN',
          description: `AI yenidən qiymətləndirdi: ${ai.score} (${ai.riskLevel})`,
        });
        if (d.assignedInspectorId) {
          get().pushNotification({
            userId: d.assignedInspectorId, title: 'Yenidən təqdim edildi',
            body: `${id} bəyannaməsi düzəlişlərdən sonra yenidən təqdim edildi.`,
            link: `/declaration/${id}`, type: 'info',
          });
        }
      },

      changeStatus: (id, next, actor, opts) => {
        const d = get().declarations.find((x) => x.id === id);
        if (!d) return { ok: false, error: 'Bəyannamə tapılmadı' };
        const allowed = ALLOWED_TRANSITIONS[d.status];
        const isOverride = actor.role === 'departmentHead' || actor.role === 'boss';
        if (!isOverride && !allowed.includes(next)) {
          return { ok: false, error: `Status keçidi qadağandır: ${d.status} → ${next}` };
        }

        const patch: Partial<Declaration> = { status: next };
        if (next === 'Rədd' && opts?.rejectReason) patch.rejectReason = opts.rejectReason;
        if (next === 'Düzəliş Tələb Olunur' && opts?.correctionSummary) {
          patch.correctionRequest = {
            id: uid('corr'), inspectorId: actor.id, inspectorDisplayName: dispName(actor),
            summary: opts.correctionSummary, details: opts.correctionDetails ?? '',
            requestedAt: new Date().toISOString(),
          };
        }
        if (next === 'Tamamlanmış') patch.completedAt = new Date().toISOString();

        set((s) => ({
          declarations: s.declarations.map((dd) => dd.id === id ? { ...dd, ...patch } : dd),
        }));

        get().addLog({
          declarationId: id, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor),
          action: next === 'Düzəliş Tələb Olunur' ? 'CORRECTION_REQUESTED' : (next === 'Təsdiq' || next === 'Rədd') ? 'DECISION' : 'STATUS_CHANGE',
          description: `Status: ${d.status} → ${next}${opts?.rejectReason ? ` (${opts.rejectReason})` : ''}${opts?.correctionSummary ? ` (${opts.correctionSummary})` : ''}`,
        });

        // notify owner
        if (next === 'Təsdiq') {
          get().pushNotification({
            userId: d.ownerId, title: 'Bəyannamə təsdiqləndi',
            body: `${id} bəyannaməniz təsdiqlənib.`, link: `/declaration/${id}`, type: 'success',
          });
        }
        if (next === 'Rədd') {
          get().pushNotification({
            userId: d.ownerId, title: 'Bəyannamə rədd edildi',
            body: `${id} bəyannaməniz rədd edildi. Səbəb: ${opts?.rejectReason ?? '—'}`,
            link: `/declaration/${id}`, type: 'error',
          });
        }
        if (next === 'Düzəliş Tələb Olunur') {
          get().pushNotification({
            userId: d.ownerId, title: 'Düzəliş tələb olunur',
            body: `${id} bəyannaməniz üzrə düzəliş tələbi var.`,
            link: `/declaration/${id}`, type: 'warning',
          });
        }

        // auto-complete 5s later
        if (next === 'Təsdiq' || next === 'Rədd') {
          setTimeout(() => {
            const cur = get().declarations.find((x) => x.id === id);
            if (cur && cur.status === next) {
              set((s) => ({
                declarations: s.declarations.map((dd) =>
                  dd.id === id ? { ...dd, status: 'Tamamlanmış', completedAt: new Date().toISOString() } : dd
                ),
              }));
              get().addLog({
                declarationId: id, actorId: 'system', actorRole: 'user',
                actorDisplayName: 'Sistem', action: 'AUTO_COMPLETED',
                description: 'Sistem tərəfindən avtomatik tamamlandı',
              });
              get().refreshPCACases();
              get().refreshPCAAnomalies();
            }
          }, 5000);
        }

        get().refreshPCACases();
        get().refreshPCAAnomalies();
        return { ok: true };
      },

      assignInspector: (declId, inspectorId, actor) => {
        const insp = get().users.find((u) => u.id === inspectorId);
        if (!insp) return;
        set((s) => ({
          declarations: s.declarations.map((d) => d.id === declId ? { ...d, assignedInspectorId: inspectorId } : d),
        }));
        get().addLog({
          declarationId: declId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'REASSIGNED',
          description: `Müfəttiş dəyişdirildi: ${dispName(insp)}`,
        });
        get().pushNotification({
          userId: inspectorId, title: 'Bəyannamə təyin olundu',
          body: `${declId} bəyannaməsi sizə yenidən təyin olundu.`,
          link: `/declaration/${declId}`, type: 'info',
        });
      },

      addComment: (declId, text, actor) => {
        const comment = {
          id: uid('cmt'), declarationId: declId,
          authorId: actor.id, authorRole: actor.role,
          authorDisplayName: dispName(actor), text,
          at: new Date().toISOString(),
        };
        set((s) => ({
          declarations: s.declarations.map((d) =>
            d.id === declId ? { ...d, comments: [...d.comments, comment] } : d
          ),
        }));
        get().addLog({
          declarationId: declId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'COMMENT',
          description: `Şərh əlavə etdi: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
        });
        const d = get().declarations.find((x) => x.id === declId);
        if (d) {
          if (actor.role === 'user' && d.assignedInspectorId) {
            get().pushNotification({
              userId: d.assignedInspectorId, title: 'Yeni şərh',
              body: `${d.ownerDisplayName}: ${text.slice(0, 80)}`,
              link: `/declaration/${declId}`, type: 'info',
            });
          } else if (actor.role !== 'user') {
            get().pushNotification({
              userId: d.ownerId, title: 'Yeni şərh',
              body: `${dispName(actor)}: ${text.slice(0, 80)}`,
              link: `/declaration/${declId}`, type: 'info',
            });
          }
        }
      },

      addLog: (l) => {
        const entry: LogEntry = { ...l, id: uid('log'), at: new Date().toISOString() };
        set((s) => ({ logs: [entry, ...s.logs] }));
      },

      pushNotification: (n) => {
        const entry: Notification = { ...n, id: uid('ntf'), at: new Date().toISOString(), read: false };
        set((s) => ({ notifications: [entry, ...s.notifications] }));
      },

      markNotificationRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      })),

      markAllNotificationsRead: (userId) => set((s) => ({
        notifications: s.notifications.map((n) => n.userId === userId ? { ...n, read: true } : n),
      })),

      refreshPCACases: () => {
        const decls = get().declarations.filter((d) => ['Təsdiq', 'Rədd', 'Tamamlanmış'].includes(d.status));
        const prev = get().pcaCases;
        const prevById = new Map(prev.map((c) => [c.declarationId, c]));
        const cases: PCACase[] = decls.map((d) => {
          const existing = prevById.get(d.id);
          return existing ?? {
            id: `PCA-${d.id.slice(-6).toUpperCase()}`,
            declarationId: d.id,
            companyName: d.ownerDisplayName,
            companyId: d.ownerId,
            hsCode: d.totals?.hsCode ?? '—',
            riskBand: pcaRiskBand(d.ai.score),
            riskScore: d.ai.score,
            status: 'Pending',
            dutyAtRisk: pcaDutyAtRisk(d),
            createdAt: d.completedAt ?? d.uploadedAt,
            watchlisted: false,
            findings: [],
            notes: '',
          };
        });
        set({ pcaCases: cases });
      },

      refreshPCAAnomalies: () => {
        const anomalies = detectPatterns(get().declarations);
        // preserve dismissed flags
        const prev = get().pcaAnomalies;
        const prevByCode = new Map<string, PCAAnomaly>();
        for (const a of prev) {
          prevByCode.set(`${a.patternCode}_${a.affectedCompanyIds[0] ?? ''}`, a);
        }
        const merged = anomalies.map((a) => {
          const key = `${a.patternCode}_${a.affectedCompanyIds[0] ?? ''}`;
          const old = prevByCode.get(key);
          if (old) return { ...a, id: old.id, dismissed: old.dismissed };
          return a;
        });
        set({ pcaAnomalies: merged });
      },

      updatePCACase: (id, patch) => set((s) => ({
        pcaCases: s.pcaCases.map((c) => c.id === id ? { ...c, ...patch } : c),
      })),

      addPCAFinding: (f) => {
        const id = uid('find');
        const entry: PCAFinding = { ...f, id, createdAt: new Date().toISOString() };
        set((s) => ({
          pcaFindings: [entry, ...s.pcaFindings],
          pcaCases: s.pcaCases.map((c) => c.id === f.caseId ? { ...c, findings: [...c.findings, id] } : c),
        }));
        return id;
      },

      updatePCAFinding: (id, patch) => set((s) => ({
        pcaFindings: s.pcaFindings.map((f) => f.id === id ? { ...f, ...patch } : f),
      })),

      toggleWatchlist: (auditorId, companyId) => {
        const lists = get().watchlists;
        const idx = lists.findIndex((w) => w.auditorId === auditorId);
        if (idx === -1) {
          set({ watchlists: [...lists, { auditorId, companyIds: [companyId] }] });
        } else {
          const list = lists[idx];
          const newIds = list.companyIds.includes(companyId)
            ? list.companyIds.filter((c) => c !== companyId)
            : [...list.companyIds, companyId];
          const next = [...lists];
          next[idx] = { ...list, companyIds: newIds };
          set({ watchlists: next });
        }
      },

      dismissAnomaly: (id) => set((s) => ({
        pcaAnomalies: s.pcaAnomalies.map((a) => a.id === id ? { ...a, dismissed: true } : a),
      })),

      logPCAView: (declarationId, auditor) => {
        get().addLog({
          declarationId, actorId: auditor.id, actorRole: 'pca',
          actorDisplayName: dispName(auditor), action: 'VIEWED_BY_PCA',
          description: 'PCA auditoru baxış keçirdi (oxuma rejimi)',
        });
      },
    }),
    {
      name: 'ca-data',
      // Bump version when shape changes so existing users get re-seeded with fixed DH FINs,
      // new doc.visibleTo fields, AI explainability fields, dynamic departments, thresholds.
      version: 2,
      migrate: (_persisted, _ver) => undefined as any, // discard any earlier persisted state
    }
  )
);
