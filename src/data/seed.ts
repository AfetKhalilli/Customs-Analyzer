import type {
  AppUser, IndividualUser, CompanyUser, Declaration, LogEntry, Notification,
  Department, AttachedDocument, ShipmentInfo, DeclarationTotals, DeclarationKind, DeclarationStatus,
  DocumentTypeCode, DocumentGroup,
} from '../types';
import { DEPARTMENTS } from '../types';
import { uid } from '../lib/utils';
import { runAI } from '../lib/ai';

const STAFF_PW = 'Inspector123';
const DH_PW = 'Depthead123';
const BOSS_PW = 'Boss12345';
const PCA_PW = 'Pcaaudit123';
const USER_PW = 'User1234';
const COMPANY_PW = 'Company123';

export function seedUsers(): AppUser[] {
  const users: AppUser[] = [];

  const inspectorNames = [
    ['Rəşad', 'Əliyev'], ['Nigar', 'Məmmədova'], ['Tural', 'Hüseynov'],
    ['Aysel', 'Quliyeva'], ['Vüqar', 'İsmayılov'], ['Sevda', 'Babayeva'],
    ['Elnur', 'Cəfərov'], ['Lalə', 'Səfərova'], ['Kamran', 'Mehdiyev'],
    ['Aynur', 'Rzayeva'],
  ];
  DEPARTMENTS.forEach((dept, i) => {
    const [f, l] = inspectorNames[i];
    users.push({
      id: `INS${1000 + i}`,
      role: 'inspector', entityType: 'individual',
      firstName: f, lastName: l, fatherName: 'oğlu',
      fin: `INS${1000 + i}`,
      email: `inspector${1000 + i}@customs.gov.az`,
      phone: `+994 50 100 ${(10 + i).toString().padStart(2, '0')} 10`,
      password: STAFF_PW,
      department: dept,
      staffTitle: `${dept} Şöbəsi Müfəttişi`,
      createdAt: new Date(2024, 0, 1).toISOString(),
      status: 'active',
      dateOfBirth: new Date(1985 + i, 5, 15).toISOString().slice(0, 10),
      gender: i % 2 === 0 ? 'Kişi' : 'Qadın',
      citizenship: 'Azərbaycan',
      address: { city: 'Bakı', line: 'Yasamal r., M.Süleymanov küç. 12', postalCode: 'AZ1000' },
    });
  });

  const dhNames = [
    ['Murad', 'Quliyev'], ['Fəridə', 'Əliyeva'], ['Cavid', 'Babayev'],
    ['Lamiyə', 'Hüseynova'], ['Səbuhi', 'Məmmədov'], ['Günay', 'İbrahimova'],
    ['Rauf', 'Nəsibov'], ['Ülviyyə', 'Hacıyeva'], ['Nicat', 'Salmanov'],
    ['Şəbnəm', 'Vəliyeva'],
  ];
  DEPARTMENTS.forEach((dept, i) => {
    const [f, l] = dhNames[i];
    // FIN must be exactly 7 chars to satisfy loginSchema and registration rules.
    const dhFin = `DH0${(2000 + i).toString()}`; // → DH02000…DH02009 (7 chars)
    users.push({
      id: dhFin,
      role: 'departmentHead', entityType: 'individual',
      firstName: f, lastName: l, fatherName: i % 2 === 0 ? 'oğlu' : 'qızı',
      fin: dhFin,
      email: `head${2000 + i}@customs.gov.az`,
      phone: `+994 50 200 ${(20 + i).toString().padStart(2, '0')} 20`,
      password: DH_PW,
      department: dept,
      staffTitle: `${dept} Şöbəsi Rəisi`,
      createdAt: new Date(2023, 0, 1).toISOString(),
      status: 'active',
      dateOfBirth: new Date(1975 + i, 3, 10).toISOString().slice(0, 10),
      gender: i % 2 === 0 ? 'Kişi' : 'Qadın',
      citizenship: 'Azərbaycan',
      address: { city: 'Bakı', line: 'Nəsimi r., 28 May küç. 5' },
    });
  });

  users.push({
    id: 'BOSS001', role: 'boss', entityType: 'individual',
    firstName: 'Murad', lastName: 'Allahverdiyev', fatherName: 'Mehman oğlu',
    fin: 'BOSS001',
    email: 'boss@customs.gov.az',
    phone: '+994 50 555 00 00',
    password: BOSS_PW,
    staffTitle: 'Baş Direktor',
    createdAt: new Date(2022, 0, 1).toISOString(),
    status: 'active',
    dateOfBirth: '1968-04-12',
    gender: 'Kişi',
    citizenship: 'Azərbaycan',
    address: { city: 'Bakı', line: 'Səbail r., Neftçilər prospekti 2' },
  });

  users.push({
    id: 'PCA0001', role: 'pca', entityType: 'individual',
    firstName: 'Elçin', lastName: 'Auditov', fatherName: 'Rəşid oğlu',
    fin: 'PCA0001',
    email: 'audit@customs.gov.az',
    phone: '+994 50 777 11 11',
    password: PCA_PW,
    staffTitle: 'PCA Baş Auditoru',
    createdAt: new Date(2023, 5, 1).toISOString(),
    status: 'active',
    dateOfBirth: '1980-09-22',
    gender: 'Kişi',
    citizenship: 'Azərbaycan',
    address: { city: 'Bakı', line: 'Yasamal r., Şərifzadə küç. 88' },
  });

  // Individuals
  users.push({
    id: 'USR_7CA8FB1', role: 'user', entityType: 'individual',
    firstName: 'Orxan', lastName: 'Quliyev', fatherName: 'Nazim oğlu',
    fin: '7CA8FB1',
    email: 'orxan@example.az', phone: '+994 55 123 45 67',
    password: USER_PW,
    createdAt: new Date(2024, 5, 12).toISOString(),
    status: 'active',
    dateOfBirth: '1992-03-14',
    gender: 'Kişi', citizenship: 'Azərbaycan',
    passportNumber: 'AA1234567',
    address: { city: 'Bakı', line: 'Nizami r., Ə.Naxçıvani küç. 17', postalCode: 'AZ1078' },
  });
  users.push({
    id: 'USR_5DE9AB2', role: 'user', entityType: 'individual',
    firstName: 'Günay', lastName: 'Hüseynova', fatherName: 'Rauf qızı',
    fin: '5DE9AB2',
    email: 'gunay@example.az', phone: '+994 51 987 65 43',
    password: USER_PW,
    createdAt: new Date(2024, 8, 3).toISOString(),
    status: 'active',
    dateOfBirth: '1988-11-30',
    gender: 'Qadın', citizenship: 'Azərbaycan',
    address: { city: 'Sumqayıt', line: '5-ci m/r, ev 23, mənzil 14' },
  });

  // Companies
  users.push({
    id: 'COMP_ABC', role: 'user', entityType: 'company',
    companyName: 'ABC Trading MMC', companyShortName: 'ABC',
    tin: '1234567890', registrationNumber: 'REG12345678',
    legalForm: 'MMC',
    registrationDate: '2019-06-15',
    activityField: 'Ticarət',
    legalAddress: { city: 'Bakı', line: 'Xətai r., Babək prospekti 12' },
    actualAddress: { city: 'Bakı', line: 'Xətai r., Babək prospekti 12' },
    responsiblePerson: {
      firstName: 'Rəşad', lastName: 'Məmmədov', fatherName: 'Akif oğlu',
      position: 'Direktor', fin: 'ABC1234',
      phone: '+994 50 111 22 33', email: 'reshad@abc.az',
    },
    email: 'info@abc.az', phone: '+994 12 555 00 11',
    website: 'https://abc.az',
    password: COMPANY_PW,
    createdAt: new Date(2023, 1, 10).toISOString(),
    status: 'active',
  });
  users.push({
    id: 'COMP_KICIK', role: 'user', entityType: 'company',
    companyName: 'Kiçik Şirkət MMC',
    tin: '9876543210', registrationNumber: 'REG98765432',
    legalForm: 'MMC',
    registrationDate: '2021-09-20',
    activityField: 'İstehsal',
    legalAddress: { city: 'Gəncə', line: 'Nizami küç. 88' },
    responsiblePerson: {
      firstName: 'Səbinə', lastName: 'Əhmədova', fatherName: 'Tofiq qızı',
      position: 'İcraçı Direktor', fin: 'SAB5678',
      phone: '+994 50 222 33 44', email: 'sebine@kicik.az',
    },
    email: 'info@kicik.az', phone: '+994 22 555 11 22',
    password: COMPANY_PW,
    createdAt: new Date(2024, 3, 5).toISOString(),
    status: 'active',
  });

  return users;
}

// stable PRNG so seed never changes between sessions — keeps risk scores reproducible
function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function makeDoc(typeCode: DocumentTypeCode, group: DocumentGroup, fields: Record<string, any>, daysAgo: number): AttachedDocument {
  const seedKey = `${typeCode}_${daysAgo}_${JSON.stringify(fields).length}`;
  const h = stableHash(seedKey);
  return {
    id: uid('doc'),
    typeCode, group,
    fileName: `${typeCode.toLowerCase()}_${1000 + (h % 9000)}.pdf`,
    fileSizeKB: 100 + (h % 800),
    fileMime: 'application/pdf',
    uploadedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    fields,
    isComplete: true,
    visibleTo: ['user', 'inspector', 'departmentHead', 'boss', 'pca'],
  };
}

export function seedDeclarations(users: AppUser[]): Declaration[] {
  const declarants = users.filter((u) => u.role === 'user');
  const inspectors = users.filter((u) => u.role === 'inspector');
  const decls: Declaration[] = [];

  const setups: { kind: DeclarationKind; dept: Department; status: DeclarationStatus; days: number; value: number; cur: string; gross: number; net: number; pkg: number; origin: string; dest: string; hs: string }[] = [
    { kind: 'Idxal', dept: 'Elektronika', status: 'Yoxlanılır',           days: 1,  value: 45000,  cur: 'USD', gross: 1200,  net: 1100,  pkg: 25,  origin: 'CN', dest: 'AZ', hs: '8517.12' },
    { kind: 'Idxal', dept: 'Qida',        status: 'Düzəliş Tələb Olunur', days: 3,  value: 12000,  cur: 'EUR', gross: 8000,  net: 7800,  pkg: 200, origin: 'TR', dest: 'AZ', hs: '0902.30' },
    { kind: 'Ixrac', dept: 'Tekstil',     status: 'Təsdiq',               days: 5,  value: 28000,  cur: 'USD', gross: 3500,  net: 3400,  pkg: 80,  origin: 'AZ', dest: 'RU', hs: '5208.21' },
    { kind: 'Idxal', dept: 'Avtomobil',   status: 'Tamamlanmış',          days: 10, value: 180000, cur: 'EUR', gross: 1800,  net: 1750,  pkg: 1,   origin: 'DE', dest: 'AZ', hs: '8703.23' },
    { kind: 'Idxal', dept: 'Kimya',       status: 'Yüklənib',             days: 0,  value: 8500,   cur: 'USD', gross: 2200,  net: 2100,  pkg: 44,  origin: 'IR', dest: 'AZ', hs: '3402.20' },
    { kind: 'Idxal', dept: 'Tibbi',       status: 'Tamamlanmış',          days: 15, value: 67000,  cur: 'EUR', gross: 450,   net: 420,   pkg: 18,  origin: 'DE', dest: 'AZ', hs: '3004.90' },
    { kind: 'Ixrac', dept: 'Maşınqayırma',status: 'Rədd',                 days: 7,  value: 95000,  cur: 'USD', gross: 12000, net: 11800, pkg: 6,   origin: 'AZ', dest: 'GE', hs: '8479.89' },
    { kind: 'Idxal', dept: 'Mebel',       status: 'Tamamlanmış',          days: 20, value: 22000,  cur: 'EUR', gross: 4200,  net: 4000,  pkg: 30,  origin: 'IT', dest: 'AZ', hs: '9403.30' },
    { kind: 'Tranzit',dept: 'İnşaat',     status: 'Təsdiq',               days: 4,  value: 38000,  cur: 'USD', gross: 22000, net: 21500, pkg: 100, origin: 'RU', dest: 'IR', hs: '6810.11' },
    { kind: 'Idxal', dept: 'Kosmetika',   status: 'Yoxlanılır',           days: 2,  value: 15000,  cur: 'EUR', gross: 800,   net: 750,   pkg: 35,  origin: 'FR', dest: 'AZ', hs: '3304.99' },
    { kind: 'Idxal', dept: 'Elektronika', status: 'Tamamlanmış',          days: 25, value: 220000, cur: 'USD', gross: 950,   net: 920,   pkg: 22,  origin: 'KR', dest: 'AZ', hs: '8528.72' },
    { kind: 'Idxal', dept: 'Qida',        status: 'Tamamlanmış',          days: 30, value: 6500,   cur: 'USD', gross: 12000, net: 11800, pkg: 6000,origin: 'TR', dest: 'AZ', hs: '1905.31' },
  ];

  setups.forEach((s, i) => {
    const owner = declarants[i % declarants.length];
    const insp = inspectors.find((u) => u.entityType === 'individual' && u.department === s.dept);
    const ownerName = owner.entityType === 'individual' ? `${owner.firstName} ${owner.lastName}` : owner.companyName;
    const uploadedAt = new Date(Date.now() - s.days * 86400000).toISOString();

    const docs: AttachedDocument[] = [];
    docs.push(makeDoc('INVOICE', 'FINANCIAL', { invoiceNumber: `INV-${1000 + i}`, invoiceDate: uploadedAt.slice(0, 10), sellerName: 'Foreign Supplier Ltd', sellerAddress: 'Foreign address', buyerName: ownerName, totalAmount: s.value, currency: s.cur }, s.days));
    if (s.dept !== 'Kimya') {
      docs.push(makeDoc('CUSTOMS_DECLARATION', 'CUSTOMS', { declarationNumber: `CD-${5000 + i}`, procedureCode: '40 — Daxili istehlak üçün buraxılış', hsCode: s.hs, goodsDescription: 'Mallar' }, s.days));
    }
    if (owner.entityType === 'company') {
      docs.push(makeDoc('CONTRACT', 'LEGAL', { contractNumber: `CN-${2000 + i}`, contractDate: uploadedAt.slice(0, 10), contractType: 'Alqı-satqı', paymentTerms: 'Avans 50% + 50% göndərmədən sonra', counterpartyName: 'Foreign Supplier Ltd', counterpartyAddress: 'Foreign address', subject: 'İdxal müqaviləsi' }, s.days));
    }
    if (s.status !== 'Yüklənib') {
      docs.push(makeDoc('SHIPPING_DOCUMENT', 'TRANSPORT', { shippingDocType: 'CMR', shippingDocNumber: `CMR-${7000 + i}`, carrierName: 'Global Logistics', vehicleNumber: 'AZ-12-345', loadingDate: uploadedAt.slice(0, 10) }, s.days));
    }

    const shipment: ShipmentInfo = {
      originCountry: s.origin, destinationCountry: s.dest,
      transportMode: s.dept === 'Avtomobil' ? 'Dəniz' : 'Avtomobil',
      transportDocumentNumber: `CMR-${7000 + i}`,
      consignor: s.kind === 'Ixrac' ? ownerName : 'Foreign Supplier Ltd',
      consignorAddress: s.kind === 'Ixrac' ? 'Bakı, AZ' : 'Foreign address 123',
      consignee: s.kind === 'Ixrac' ? 'Foreign Buyer Ltd' : ownerName,
      consigneeAddress: s.kind === 'Ixrac' ? 'Foreign address 456' : 'Bakı, AZ',
      packageCount: s.pkg, grossWeightKg: s.gross, netWeightKg: s.net,
    };

    const totals: DeclarationTotals = {
      currency: s.cur, totalDeclaredValue: s.value, totalQuantity: s.pkg,
      unitOfMeasure: 'ədəd', hsCode: s.hs,
    };

    const ai = runAI({ ownerEntityType: owner.entityType, kind: s.kind, department: s.dept, documents: docs, shipment, totals });

    const decl: Declaration = {
      id: uid('decl'),
      ownerId: owner.id, ownerEntityType: owner.entityType, ownerDisplayName: ownerName,
      kind: s.kind, department: s.dept,
      declarationDate: uploadedAt.slice(0, 10),
      customsPoint: 'Bakı Baş Gömrük İdarəsi',
      referenceNumber: `REF-${100 + i}`,
      documents: docs, shipment, totals,
      status: s.status,
      assignedInspectorId: insp?.id ?? null,
      ai, aiHistory: [ai],
      comments: [],
      uploadedAt,
      completedAt: s.status === 'Tamamlanmış' ? new Date(Date.now() - Math.max(0, s.days - 1) * 86400000).toISOString() : undefined,
    };

    if (s.status === 'Düzəliş Tələb Olunur' && insp) {
      const inspName = insp.entityType === 'individual' ? `${insp.firstName} ${insp.lastName}` : '';
      decl.correctionRequest = {
        id: uid('corr'), inspectorId: insp.id, inspectorDisplayName: inspName,
        summary: 'Hesab-faktura çatışmır',
        details: 'Zəhmət olmasa hesab-fakturanın oxunaqlı PDF nüsxəsini yenidən yükləyin.',
        requestedAt: new Date(Date.now() - Math.max(0, s.days - 1) * 86400000).toISOString(),
      };
    }
    if (s.status === 'Rədd') {
      decl.rejectReason = 'Sənədlərdə ciddi uyğunsuzluqlar aşkar edilib.';
    }

    decls.push(decl);
  });

  return decls;
}

export function seedLogs(decls: Declaration[], users: AppUser[]): LogEntry[] {
  const logs: LogEntry[] = [];
  const userById = new Map(users.map((u) => [u.id, u]));
  const dispName = (u: AppUser) => u.entityType === 'individual' ? `${u.firstName} ${u.lastName}` : u.companyName;

  for (const d of decls) {
    const owner = userById.get(d.ownerId);
    if (!owner) continue;
    logs.push({
      id: uid('log'), declarationId: d.id,
      actorId: owner.id, actorRole: 'user', actorDisplayName: dispName(owner),
      action: 'UPLOAD', description: 'Bəyannamə yükləndi', at: d.uploadedAt,
    });
    logs.push({
      id: uid('log'), declarationId: d.id,
      actorId: 'system', actorRole: 'user', actorDisplayName: 'Sistem',
      action: 'AI_RUN', description: `AI risk skoru: ${d.ai.score} (${d.ai.riskLevel})`,
      meta: { score: d.ai.score, riskLevel: d.ai.riskLevel },
      at: new Date(new Date(d.uploadedAt).getTime() + 1000).toISOString(),
    });
    if (d.assignedInspectorId) {
      const insp = userById.get(d.assignedInspectorId);
      if (insp) {
        logs.push({
          id: uid('log'), declarationId: d.id,
          actorId: 'system', actorRole: 'user', actorDisplayName: 'Sistem',
          action: 'ASSIGNED', description: `Müfəttiş təyin olundu: ${dispName(insp)}`,
          at: new Date(new Date(d.uploadedAt).getTime() + 5000).toISOString(),
        });
      }
    }
    if (d.status !== 'Yüklənib' && d.assignedInspectorId) {
      const insp = userById.get(d.assignedInspectorId)!;
      logs.push({
        id: uid('log'), declarationId: d.id,
        actorId: insp.id, actorRole: 'inspector', actorDisplayName: dispName(insp),
        action: 'STATUS_CHANGE', description: 'Status: Yüklənib → Yoxlanılır',
        at: new Date(new Date(d.uploadedAt).getTime() + 60000).toISOString(),
      });
    }
    if (d.status === 'Düzəliş Tələb Olunur' && d.correctionRequest) {
      logs.push({
        id: uid('log'), declarationId: d.id,
        actorId: d.correctionRequest.inspectorId, actorRole: 'inspector',
        actorDisplayName: d.correctionRequest.inspectorDisplayName,
        action: 'CORRECTION_REQUESTED', description: `Düzəliş tələbi: ${d.correctionRequest.summary}`,
        at: d.correctionRequest.requestedAt,
      });
    }
    if ((d.status === 'Təsdiq' || d.status === 'Rədd' || d.status === 'Tamamlanmış') && d.assignedInspectorId) {
      const insp = userById.get(d.assignedInspectorId)!;
      const isReject = d.status === 'Rədd';
      logs.push({
        id: uid('log'), declarationId: d.id,
        actorId: insp.id, actorRole: 'inspector', actorDisplayName: dispName(insp),
        action: 'DECISION',
        description: isReject ? `Rədd edildi: ${d.rejectReason ?? ''}` : 'Təsdiq edildi',
        at: new Date(new Date(d.uploadedAt).getTime() + 3600000).toISOString(),
      });
    }
    if (d.status === 'Tamamlanmış' && d.completedAt) {
      logs.push({
        id: uid('log'), declarationId: d.id,
        actorId: 'system', actorRole: 'user', actorDisplayName: 'Sistem',
        action: 'AUTO_COMPLETED', description: 'Sistem tərəfindən avtomatik tamamlandı',
        at: d.completedAt,
      });
    }
  }
  return logs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function seedNotifications(decls: Declaration[], users: AppUser[]): Notification[] {
  const notifs: Notification[] = [];
  for (const d of decls) {
    if (d.status === 'Düzəliş Tələb Olunur' && d.correctionRequest) {
      notifs.push({
        id: uid('ntf'), userId: d.ownerId,
        title: 'Düzəliş tələb olunur',
        body: `${d.id.slice(-8)} bəyannaməniz üzrə müfəttiş düzəliş tələb edib.`,
        link: `/declaration/${d.id}`,
        read: false, at: d.correctionRequest.requestedAt,
        type: 'warning',
      });
    }
    if (d.status === 'Təsdiq' || d.status === 'Tamamlanmış') {
      notifs.push({
        id: uid('ntf'), userId: d.ownerId,
        title: 'Bəyannamə təsdiqləndi',
        body: `${d.id.slice(-8)} bəyannaməniz uğurla təsdiqləndi.`,
        link: `/declaration/${d.id}`,
        read: Math.random() > 0.5,
        at: new Date(new Date(d.uploadedAt).getTime() + 3700000).toISOString(),
        type: 'success',
      });
    }
    if (d.status === 'Rədd') {
      notifs.push({
        id: uid('ntf'), userId: d.ownerId,
        title: 'Bəyannamə rədd edildi',
        body: `${d.id.slice(-8)} bəyannaməniz rədd edilib.`,
        link: `/declaration/${d.id}`,
        read: false,
        at: new Date(new Date(d.uploadedAt).getTime() + 3700000).toISOString(),
        type: 'error',
      });
    }
  }

  // Inspector notifications
  for (const d of decls) {
    if (d.assignedInspectorId && d.status !== 'Tamamlanmış') {
      notifs.push({
        id: uid('ntf'), userId: d.assignedInspectorId,
        title: 'Yeni təyinat',
        body: `${d.id.slice(-8)} bəyannaməsi sizə təyin olundu (${d.department}).`,
        link: `/declaration/${d.id}`,
        read: Math.random() > 0.3,
        at: new Date(new Date(d.uploadedAt).getTime() + 5000).toISOString(),
        type: 'info',
      });
    }
  }
  return notifs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
