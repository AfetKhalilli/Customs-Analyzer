import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppUser, Declaration, LogEntry, Notification, DeclarationStatus,
  PCACase, PCAFinding, PCAAnomaly, Watchlist, IndividualUser, ThresholdSet, PCAStatus,
  PenaltyRecord, EscalationRecord, EscalationLevel, AuditHistoryEntry, ReopenRecord,
} from '../types';
import { uid } from '../lib/utils';
import { runAI } from '../lib/ai';
import { detectPatterns, pcaRiskBand, pcaDutyAtRisk } from '../lib/pca';
import { seedUsers, seedDeclarations, seedLogs, seedNotifications } from '../data/seed';
import { DEFAULT_THRESHOLDS } from '../lib/referenceData';
import { DEPARTMENTS as DEFAULT_DEPARTMENTS } from '../types';
import { validateDeclaration, ValidationError } from '../lib/validation';
import { calculateInspectionDeadline } from '../lib/i18n';

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
  // PCA workflow records
  penalties: PenaltyRecord[];
  escalations: EscalationRecord[];
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
  // Owner edits a single document on a declaration that's awaiting corrections.
  // Returns errors instead of throwing so the UI can render them inline.
  replaceDeclarationDocument: (declId: string, docId: string, nextDoc: import('../types').AttachedDocument, actor: AppUser) => { ok: boolean; error?: string };
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

  // PCA workflow actions (new — full business operations)
  takeForAudit: (caseId: string, actor: AppUser, opts: { notes?: string; expectedCompletionAt?: string }) => { ok: boolean; error?: string };
  openFindingWithWorkflow: (input: {
    caseId: string;
    declarationId: string;
    companyId: string;
    companyName: string;
    category: PCAFinding['category'];
    severity: PCAFinding['severity'];
    title: string;
    description: string;
    dutyImpact: number;
    legalBasis: string;
    requestExplanation: boolean;
  }, actor: AppUser) => { ok: boolean; error?: string; findingId?: string };
  requestExplanation: (findingId: string, actor: AppUser, message: string) => { ok: boolean; error?: string };
  applyPenalty: (input: {
    caseId: string;
    reason: string;
    legalBasis: string;
    amount: number;
    currency: string;
    dueDate: string;
    comments: string;
  }, actor: AppUser) => { ok: boolean; error?: string; penaltyId?: string };
  escalateCase: (input: {
    caseId: string;
    level: EscalationLevel;
    reason: string;
    details: string;
  }, actor: AppUser) => { ok: boolean; error?: string; escalationId?: string };
  closePCACase: (caseId: string, actor: AppUser, reason: string) => { ok: boolean; error?: string };
  reopenPCACase: (caseId: string, actor: AppUser, reason: string) => { ok: boolean; error?: string };
  reassignCaseAuditor: (caseId: string, auditorId: string, actor: AppUser, note?: string) => { ok: boolean; error?: string };
  addCaseNote: (caseId: string, note: string, actor: AppUser) => { ok: boolean; error?: string };
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
      penalties: [],
      escalations: [],
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
          penalties: [], escalations: [],
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

        // ── Supervisory-role protection ────────────────────────────────────
        // Audit/compliance separation-of-duties: the audited entities (boss,
        // departmentHead) cannot remove the roles that audit them (pca). Only
        // PCA users themselves may delete PCA accounts, and even then must
        // leave at least one active PCA on the system. This eliminates the
        // attack where a non-compliant boss disables their own auditor.
        const actor = actorId ? get().users.find((x) => x.id === actorId) : undefined;
        if (u.role === 'pca' && actor?.role !== 'pca') {
          return { ok: false, error: 'PCA audit rolu yalnız PCA tərəfindən silinə bilər (audit ayrılığı qaydası)' };
        }
        if (u.role === 'pca') {
          const remainingPCA = get().users.filter((x) => x.role === 'pca' && x.id !== id && x.status === 'active').length;
          if (remainingPCA < 1) {
            return { ok: false, error: 'Sistemdə ən azı bir aktiv PCA auditoru qalmalıdır — silmə əməliyyatı qadağandır' };
          }
        }
        // Department Head likewise cannot be deleted by another department's
        // head or by inspectors (only the Boss can manage org structure).
        if (u.role === 'departmentHead' && actor?.role !== 'boss') {
          return { ok: false, error: 'Şöbə Rəisini yalnız Baş Direktor silə bilər' };
        }

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
        // Audit policy: every supervisory role ALWAYS sees uploaded documents.
        // We strip any historical visibleTo restriction the API/wizard might
        // have sent and pin all roles on; owners cannot hide evidence.
        const ALL_ROLES = ['user', 'inspector', 'departmentHead', 'boss', 'pca'] as const;
        const sanitizedDocs = (d.documents ?? []).map((doc) => ({
          ...doc,
          visibleTo: [...ALL_ROLES] as any,
        }));
        d = { ...d, documents: sanitizedDocs };

        // ── HARD GATE: no payload reaches persistence without passing the
        // centralized validator. This kills devtools / API-bypass writes.
        const v = validateDeclaration({
          ownerEntityType: d.ownerEntityType,
          kind: d.kind,
          department: d.department,
          declarationDate: d.declarationDate,
          customsPoint: d.customsPoint,
          referenceNumber: d.referenceNumber,
          documents: d.documents,
          shipment: d.shipment,
          totals: d.totals,
        });
        if (!v.ok) {
          throw new ValidationError(v.errors);
        }

        const id = uid('decl');
        const now = new Date().toISOString();
        const inspectors = get().users.filter((u) => u.role === 'inspector' && u.entityType === 'individual' && (u as IndividualUser).department === d.department);
        // Balanced assignment: pick the lowest-load inspector; when several are
        // tied at the minimum, randomize among them so the same person isn't
        // hit repeatedly with identical timing.
        const activeCounts = inspectors.map((i) => ({
          inspector: i,
          count: get().declarations.filter((dd) => dd.assignedInspectorId === i.id && !['Tamamlanmış', 'Rədd'].includes(dd.status)).length,
        }));
        const minCount = activeCounts.length > 0 ? Math.min(...activeCounts.map((x) => x.count)) : 0;
        const lowest = activeCounts.filter((x) => x.count === minCount);
        const assigned = lowest.length > 0
          ? lowest[Math.floor(Math.random() * lowest.length)].inspector
          : undefined;

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

      updateDeclaration: (id, patch) => {
        // If the patch touches validation-relevant fields, the merged result
        // must pass validation. Status/meta-only patches are allowed through.
        const cur = get().declarations.find((d) => d.id === id);
        if (!cur) return;
        const next = { ...cur, ...patch };
        const touchesCore =
          'documents' in patch || 'shipment' in patch || 'totals' in patch ||
          'kind' in patch || 'department' in patch || 'declarationDate' in patch ||
          'customsPoint' in patch;
        if (touchesCore) {
          const v = validateDeclaration({
            ownerEntityType: next.ownerEntityType,
            kind: next.kind,
            department: next.department,
            declarationDate: next.declarationDate,
            customsPoint: next.customsPoint,
            referenceNumber: next.referenceNumber,
            documents: next.documents,
            shipment: next.shipment,
            totals: next.totals,
          });
          if (!v.ok) throw new ValidationError(v.errors);
        }
        set((s) => ({
          declarations: s.declarations.map((d) => d.id === id ? next : d),
        }));
      },

      replaceDeclarationDocument: (declId, docId, nextDoc, actor) => {
        const d = get().declarations.find((x) => x.id === declId);
        if (!d) return { ok: false, error: 'Bəyannamə tapılmadı' };
        if (d.ownerId !== actor.id) return { ok: false, error: 'Yalnız bəyannamə sahibi sənədi redaktə edə bilər' };
        if (d.status !== 'Düzəliş Tələb Olunur') {
          return { ok: false, error: 'Sənədi yalnız "Düzəliş Tələb Olunur" statusunda dəyişdirmək olar' };
        }
        const exists = d.documents.some((x) => x.id === docId);
        if (!exists) return { ok: false, error: 'Sənəd tapılmadı' };
        const nextDocs = d.documents.map((x) => x.id === docId ? { ...nextDoc, id: docId } : x);
        set((s) => ({
          declarations: s.declarations.map((dd) => dd.id === declId ? { ...dd, documents: nextDocs } : dd),
        }));
        get().addLog({
          declarationId: declId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'COMMENT',
          description: `Sənəd düzəlişi: ${nextDoc.fileName}`,
        });
        return { ok: true };
      },

      resubmitDeclaration: (id, actor) => {
        const d = get().declarations.find((x) => x.id === id);
        if (!d) return;
        // Resubmission must also re-validate.
        const v = validateDeclaration({
          ownerEntityType: d.ownerEntityType,
          kind: d.kind,
          department: d.department,
          declarationDate: d.declarationDate,
          customsPoint: d.customsPoint,
          referenceNumber: d.referenceNumber,
          documents: d.documents,
          shipment: d.shipment,
          totals: d.totals,
        });
        if (!v.ok) throw new ValidationError(v.errors);
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
        // Cannot approve a declaration that no longer passes validation.
        if (next === 'Təsdiq') {
          const v = validateDeclaration({
            ownerEntityType: d.ownerEntityType,
            kind: d.kind,
            department: d.department,
            declarationDate: d.declarationDate,
            customsPoint: d.customsPoint,
            referenceNumber: d.referenceNumber,
            documents: d.documents,
            shipment: d.shipment,
            totals: d.totals,
          });
          if (!v.ok) {
            return { ok: false, error: `Validasiya keçmir (${v.errors.length} səhv) — təsdiq mümkün deyil` };
          }
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
        // Inspection workflow: when audit starts, lock the 2-day deadline.
        if (next === 'Yoxlanılır' && !d.inspectionStartedAt) {
          const startedAt = new Date().toISOString();
          patch.inspectionStartedAt = startedAt;
          patch.inspectionDeadline = calculateInspectionDeadline(startedAt);
        }
        if (next === 'Təsdiq' || next === 'Rədd') {
          patch.inspectionCompletedAt = new Date().toISOString();
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
            auditProgressPct: 0,
            history: [],
            reopenHistory: [],
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
          description: 'PCA Auditoru tərəfindən baxış keçirildi',
        });
      },

      // ── PCA workflow: AUDITƏ GÖTÜR ────────────────────────────────────
      takeForAudit: (caseId, actor, opts) => {
        const cs = get().pcaCases.find((c) => c.id === caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        if (actor.role !== 'pca') return { ok: false, error: 'Yalnız PCA Auditoru audit başlada bilər' };
        if (cs.status === 'Closed') return { ok: false, error: 'Bağlanmış iş üzərində audit başlamaq olmaz — əvvəlcə yenidən açın' };

        const nowIso = new Date().toISOString();
        const expected = opts.expectedCompletionAt || (() => {
          const t = new Date(); t.setDate(t.getDate() + 7); return t.toISOString();
        })();

        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'AUDIT_STARTED',
          description: `Audit başladı. Auditor: ${dispName(actor)}. Gözlənilən bitmə: ${expected.slice(0, 10)}`,
          meta: { auditorId: actor.id, expectedCompletionAt: expected, notes: opts.notes },
        };

        set((s) => ({
          pcaCases: s.pcaCases.map((c) => c.id === caseId ? {
            ...c, status: 'In Review' as PCAStatus,
            auditorId: actor.id,
            auditorDisplayName: dispName(actor),
            auditStartedAt: nowIso,
            auditExpectedCompletionAt: expected,
            auditProgressPct: 10,
            notes: opts.notes ? `${c.notes ? c.notes + '\n' : ''}${nowIso.slice(0, 10)}: ${opts.notes}` : c.notes,
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));

        get().addLog({
          declarationId: cs.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'AUDIT_STARTED',
          description: `Audit prosesi başladı (iş: ${cs.id})`,
          meta: { caseId: cs.id, expectedCompletionAt: expected },
        });
        get().pushNotification({
          userId: cs.companyId, title: 'Audit prosesi başlanıb',
          body: `${cs.id} nömrəli işiniz üzrə audit yoxlaması başlandı.`,
          link: `/declaration/${cs.declarationId}`, type: 'warning',
        });
        // Notify supervisory roles (department head + boss) so they see the audit.
        const supervisors = get().users.filter((u) => u.role === 'departmentHead' || u.role === 'boss');
        for (const sup of supervisors) {
          get().pushNotification({
            userId: sup.id, title: 'PCA auditi başladıldı',
            body: `Auditor ${dispName(actor)} ${cs.companyName} üzrə yoxlamaya başladı.`,
            link: `/pca/company/${cs.companyId}`, type: 'info',
          });
        }
        return { ok: true };
      },

      // ── PCA workflow: TAPINTI AÇ ──────────────────────────────────────
      openFindingWithWorkflow: (input, actor) => {
        const cs = get().pcaCases.find((c) => c.id === input.caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        if (actor.role !== 'pca') return { ok: false, error: 'Yalnız PCA Auditoru tapıntı aça bilər' };
        if (!input.title.trim() || !input.legalBasis.trim()) {
          return { ok: false, error: 'Başlıq və hüquqi əsas mütləqdir' };
        }

        const findingId = uid('find');
        const nowIso = new Date().toISOString();
        const finding: PCAFinding = {
          id: findingId, caseId: input.caseId,
          declarationId: input.declarationId, companyId: input.companyId, companyName: input.companyName,
          category: input.category, severity: input.severity, status: 'Açıq',
          title: input.title.trim(), description: input.description.trim(),
          dutyImpact: input.dutyImpact, legalBasis: input.legalBasis.trim(),
          explanationRequested: input.requestExplanation,
          explanationRequestedAt: input.requestExplanation ? nowIso : undefined,
          investigationStartedAt: nowIso,
          createdBy: actor.id,
          createdByName: dispName(actor),
          createdAt: nowIso,
        };

        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'FINDING_OPENED',
          description: `Tapıntı: ${input.title} (${input.category})`,
          meta: { findingId, category: input.category, severity: input.severity },
        };

        set((s) => ({
          pcaFindings: [finding, ...s.pcaFindings],
          pcaCases: s.pcaCases.map((c) => c.id === input.caseId ? {
            ...c,
            findings: [...c.findings, findingId],
            auditProgressPct: Math.max(c.auditProgressPct ?? 0, 40),
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));

        get().addLog({
          declarationId: input.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'FINDING_OPENED',
          description: `Tapıntı açıldı: ${input.title} · Kateqoriya: ${input.category}`,
          meta: { findingId, caseId: input.caseId },
        });
        get().pushNotification({
          userId: input.companyId, title: 'Audit tapıntısı qeydə alındı',
          body: `${input.companyName} üzrə yeni tapıntı: ${input.title}.${input.requestExplanation ? ' İzahat tələb olunur.' : ''}`,
          link: `/declaration/${input.declarationId}`, type: 'warning',
        });
        if (input.requestExplanation) {
          get().addLog({
            declarationId: input.declarationId, actorId: actor.id, actorRole: actor.role,
            actorDisplayName: dispName(actor), action: 'EXPLANATION_REQUESTED',
            description: `İzahat tələbi: ${input.title}`,
            meta: { findingId },
          });
        }
        return { ok: true, findingId };
      },

      requestExplanation: (findingId, actor, message) => {
        const f = get().pcaFindings.find((x) => x.id === findingId);
        if (!f) return { ok: false, error: 'Tapıntı tapılmadı' };
        if (actor.role !== 'pca') return { ok: false, error: 'Yalnız PCA Auditoru izahat tələb edə bilər' };
        const nowIso = new Date().toISOString();
        set((s) => ({
          pcaFindings: s.pcaFindings.map((x) => x.id === findingId ? {
            ...x, explanationRequested: true, explanationRequestedAt: nowIso,
            description: `${x.description}\n\n[İzahat tələbi ${nowIso.slice(0, 10)}]: ${message}`,
          } : x),
        }));
        get().addLog({
          declarationId: f.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'EXPLANATION_REQUESTED',
          description: `İzahat tələbi göndərildi: ${f.title}`,
        });
        get().pushNotification({
          userId: f.companyId, title: 'İzahat tələb olunur',
          body: `${f.title} tapıntısı üzrə izahat tələb edilir.`,
          link: `/declaration/${f.declarationId}`, type: 'warning',
        });
        return { ok: true };
      },

      // ── PCA workflow: CƏRİMƏ TƏTBİQ ET ─────────────────────────────────
      applyPenalty: (input, actor) => {
        const cs = get().pcaCases.find((c) => c.id === input.caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        if (actor.role !== 'pca') return { ok: false, error: 'Yalnız PCA Auditoru cərimə tətbiq edə bilər' };
        if (!input.reason.trim()) return { ok: false, error: 'Səbəb tələb olunur' };
        if (!input.legalBasis.trim()) return { ok: false, error: 'Hüquqi əsas tələb olunur' };
        if (!input.amount || input.amount <= 0) return { ok: false, error: 'Cərimə məbləği müsbət olmalıdır' };
        if (!input.dueDate) return { ok: false, error: 'Son ödəniş tarixi tələb olunur' };

        const penaltyId = uid('pen');
        const nowIso = new Date().toISOString();
        const penalty: PenaltyRecord = {
          id: penaltyId, caseId: cs.id,
          declarationId: cs.declarationId, companyId: cs.companyId,
          reason: input.reason.trim(), legalBasis: input.legalBasis.trim(),
          amount: input.amount, currency: input.currency || 'AZN',
          dueDate: input.dueDate, comments: input.comments.trim(),
          createdAt: nowIso, createdBy: actor.id, createdByName: dispName(actor),
          status: 'Tətbiq Edildi',
        };

        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'PENALTY_APPLIED',
          description: `Cərimə tətbiq edildi: ${input.amount.toFixed(2)} ${penalty.currency} — ${input.reason.slice(0, 60)}`,
          meta: { penaltyId, amount: input.amount, dueDate: input.dueDate },
        };

        set((s) => ({
          penalties: [penalty, ...s.penalties],
          pcaCases: s.pcaCases.map((c) => c.id === cs.id ? {
            ...c, status: 'Penalty Applied' as PCAStatus,
            auditProgressPct: Math.max(c.auditProgressPct ?? 0, 70),
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));

        get().addLog({
          declarationId: cs.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'PENALTY_APPLIED',
          description: `Cərimə tətbiq edildi: ${input.amount.toFixed(2)} ${penalty.currency}. Səbəb: ${input.reason.slice(0, 80)}`,
          meta: { penaltyId, caseId: cs.id },
        });
        get().pushNotification({
          userId: cs.companyId, title: 'Cərimə tətbiq edildi',
          body: `${cs.id}: ${input.amount.toFixed(2)} ${penalty.currency} cərimə. Son tarix: ${input.dueDate}`,
          link: `/declaration/${cs.declarationId}`, type: 'error',
        });
        const supervisors = get().users.filter((u) => u.role === 'departmentHead' || u.role === 'boss');
        for (const sup of supervisors) {
          get().pushNotification({
            userId: sup.id, title: 'Cərimə qərarı qeydə alındı',
            body: `${cs.companyName} üzrə ${input.amount.toFixed(2)} ${penalty.currency} məbləğində cərimə tətbiq edildi.`,
            link: `/pca/company/${cs.companyId}`, type: 'warning',
          });
        }
        return { ok: true, penaltyId };
      },

      // ── PCA workflow: ESKALƏ ET ───────────────────────────────────────
      escalateCase: (input, actor) => {
        const cs = get().pcaCases.find((c) => c.id === input.caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        if (actor.role !== 'pca') return { ok: false, error: 'Yalnız PCA Auditoru eskaləsiya edə bilər' };
        if (!input.reason.trim()) return { ok: false, error: 'Eskaləsiya səbəbi tələb olunur' };

        // Determine who the case is assigned to based on escalation level.
        const assignTo = (() => {
          if (input.level === 'BaşDirektor') {
            return get().users.find((u) => u.role === 'boss')?.id ?? '';
          }
          if (input.level === 'Departament') {
            const decl = get().declarations.find((d) => d.id === cs.declarationId);
            const dept = decl?.department;
            return get().users.find((u) =>
              u.role === 'departmentHead' && u.entityType === 'individual' &&
              (u as IndividualUser).department === dept,
            )?.id ?? '';
          }
          return '';
        })();

        const escId = uid('esc');
        const nowIso = new Date().toISOString();
        const escalation: EscalationRecord = {
          id: escId, caseId: cs.id,
          declarationId: cs.declarationId, companyId: cs.companyId,
          level: input.level, reason: input.reason.trim(), details: input.details.trim(),
          createdAt: nowIso, createdBy: actor.id, createdByName: dispName(actor),
          assignedTo: assignTo, status: 'Açıq',
        };

        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'CASE_ESCALATED',
          description: `İş eskaləsiya edildi: ${input.level} · ${input.reason.slice(0, 60)}`,
          meta: { escalationId: escId, level: input.level, assignedTo: assignTo },
        };

        set((s) => ({
          escalations: [escalation, ...s.escalations],
          pcaCases: s.pcaCases.map((c) => c.id === cs.id ? {
            ...c, status: 'Escalated' as PCAStatus,
            auditProgressPct: Math.max(c.auditProgressPct ?? 0, 85),
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));

        get().addLog({
          declarationId: cs.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'CASE_ESCALATED',
          description: `İş eskaləsiya edildi (${input.level}): ${input.reason.slice(0, 80)}`,
          meta: { escalationId: escId, caseId: cs.id, level: input.level },
        });
        if (assignTo) {
          get().pushNotification({
            userId: assignTo, title: 'Yeni eskaləsiya alındı',
            body: `${cs.companyName} üzrə audit işi sizə eskaləsiya edildi.`,
            link: `/pca/company/${cs.companyId}`, type: 'warning',
          });
        }
        get().pushNotification({
          userId: cs.companyId, title: 'İşiniz eskaləsiya edildi',
          body: `${cs.id} işiniz yuxarı orqana ötürüldü.`,
          link: `/declaration/${cs.declarationId}`, type: 'warning',
        });
        return { ok: true, escalationId: escId };
      },

      // ── PCA workflow: İŞİ BAĞLA ───────────────────────────────────────
      closePCACase: (caseId, actor, reason) => {
        const cs = get().pcaCases.find((c) => c.id === caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        if (actor.role !== 'pca' && actor.role !== 'boss') {
          return { ok: false, error: 'Yalnız PCA Auditoru və ya Baş Direktor işi bağlaya bilər' };
        }
        if (!reason.trim()) return { ok: false, error: 'Bağlama səbəbi tələb olunur' };

        const nowIso = new Date().toISOString();
        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'CASE_CLOSED',
          description: `İş bağlandı. Səbəb: ${reason.slice(0, 80)}`,
          meta: { reason },
        };

        set((s) => ({
          pcaCases: s.pcaCases.map((c) => c.id === caseId ? {
            ...c, status: 'Closed' as PCAStatus,
            auditProgressPct: 100,
            closedAt: nowIso, closedById: actor.id, closedByName: dispName(actor),
            closeReason: reason,
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));

        get().addLog({
          declarationId: cs.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'CASE_CLOSED',
          description: `İş bağlandı: ${cs.id}. Səbəb: ${reason.slice(0, 80)}`,
          meta: { caseId: cs.id },
        });
        get().pushNotification({
          userId: cs.companyId, title: 'Audit işi bağlandı',
          body: `${cs.id} işiniz bağlanmış statusuna keçirildi.`,
          link: `/declaration/${cs.declarationId}`, type: 'info',
        });
        return { ok: true };
      },

      // ── PCA workflow: İŞİ YENİDƏN AÇ ─────────────────────────────────
      reopenPCACase: (caseId, actor, reason) => {
        const cs = get().pcaCases.find((c) => c.id === caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        if (actor.role !== 'pca' && actor.role !== 'boss') {
          return { ok: false, error: 'Yalnız PCA Auditoru və ya Baş Direktor işi yenidən aça bilər' };
        }
        if (cs.status !== 'Closed') return { ok: false, error: 'Yalnız bağlanmış iş yenidən açıla bilər' };
        if (!reason.trim()) return { ok: false, error: 'Yenidən açma səbəbi tələb olunur' };

        const nowIso = new Date().toISOString();
        const reopenEntry: ReopenRecord = {
          id: uid('reo'), caseId: cs.id, at: nowIso,
          actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), reason: reason.trim(),
        };
        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'CASE_REOPENED',
          description: `İş yenidən açıldı. Səbəb: ${reason.slice(0, 80)}`,
          meta: { reason },
        };

        set((s) => ({
          pcaCases: s.pcaCases.map((c) => c.id === caseId ? {
            ...c, status: 'In Review' as PCAStatus,
            auditProgressPct: 30,
            closedAt: undefined, closedById: undefined, closedByName: undefined, closeReason: undefined,
            reopenHistory: [...(c.reopenHistory ?? []), reopenEntry],
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));

        get().addLog({
          declarationId: cs.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'CASE_REOPENED',
          description: `İş yenidən açıldı: ${cs.id}. Səbəb: ${reason.slice(0, 80)}`,
          meta: { caseId: cs.id },
        });
        get().pushNotification({
          userId: cs.companyId, title: 'Audit işi yenidən açıldı',
          body: `${cs.id} işiniz yenidən nəzərdən keçirilir.`,
          link: `/declaration/${cs.declarationId}`, type: 'warning',
        });
        return { ok: true };
      },

      reassignCaseAuditor: (caseId, auditorId, actor, note) => {
        const cs = get().pcaCases.find((c) => c.id === caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        const newAuditor = get().users.find((u) => u.id === auditorId && u.role === 'pca');
        if (!newAuditor) return { ok: false, error: 'PCA Auditoru tapılmadı' };
        const nowIso = new Date().toISOString();
        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'STATUS_CHANGE',
          description: `Auditor dəyişdirildi: ${dispName(newAuditor)}${note ? ' — ' + note : ''}`,
          meta: { auditorId: newAuditor.id },
        };
        set((s) => ({
          pcaCases: s.pcaCases.map((c) => c.id === caseId ? {
            ...c, auditorId: newAuditor.id, auditorDisplayName: dispName(newAuditor),
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));
        get().pushNotification({
          userId: newAuditor.id, title: 'Yeni audit işi təyinatı',
          body: `${cs.companyName} üzrə audit işi sizə təyin olundu.`,
          link: `/pca/company/${cs.companyId}`, type: 'info',
        });
        return { ok: true };
      },

      addCaseNote: (caseId, note, actor) => {
        const cs = get().pcaCases.find((c) => c.id === caseId);
        if (!cs) return { ok: false, error: 'Audit işi tapılmadı' };
        if (!note.trim()) return { ok: false, error: 'Qeyd boş ola bilməz' };
        const nowIso = new Date().toISOString();
        const histEntry: AuditHistoryEntry = {
          id: uid('hist'), at: nowIso, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'NOTE_ADDED',
          description: note.slice(0, 200),
        };
        set((s) => ({
          pcaCases: s.pcaCases.map((c) => c.id === caseId ? {
            ...c,
            notes: `${c.notes ? c.notes + '\n' : ''}${nowIso.slice(0, 10)} · ${dispName(actor)}: ${note}`,
            history: [...(c.history ?? []), histEntry],
          } : c),
        }));
        get().addLog({
          declarationId: cs.declarationId, actorId: actor.id, actorRole: actor.role,
          actorDisplayName: dispName(actor), action: 'COMMENT',
          description: `Audit qeydi: ${note.slice(0, 80)}${note.length > 80 ? '…' : ''}`,
          meta: { caseId: cs.id },
        });
        return { ok: true };
      },
    }),
    {
      name: 'ca-data',
      // v4: PCA workflow records (penalties, escalations, audit history, reopen),
      //     new finding categories enum, inspection deadlines, dropped visibleTo.
      version: 4,
      migrate: (_persisted, _ver) => undefined as any, // discard any earlier persisted state
    }
  )
);
