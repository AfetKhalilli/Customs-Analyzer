# Workflow Gap Report — PCA Customs Audit Platform

**Hesabat tarixi:** 2026-05-31
**Hesabat müəllifi:** Customs Audit Engineering Team

## Vəziyyət üzrə icmal

| Workflow | Əvvəl | Sonra |
|----------|-------|-------|
| AUDİTƏ GÖTÜR | Tək status dəyişikliyi, audit qeydiyyatı yox | Tam workflow: audit qeydiyyatı, auditor təyini, deadline, bildirişlər, tarixçə |
| TAPINTI AÇ | Sadəcə finding record yaradılırdı | Finding + violation + investigation + explanation request + audit history |
| CƏRİMƏ TƏTBİQ ET | Status dəyişikliyindən başqa heç nə | Ayrı PenaltyRecord (səbəb, hüquqi əsas, məbləğ, son tarix, şərhlər) + jurnal + bildirişlər |
| ESKALƏ ET | Status dəyişikliyi | EscalationRecord, səviyyə seçimi, ünvanlı təyinat, jurnal |
| İŞİ BAĞLA | Status dəyişikliyi | Bağlama səbəbi məcburi, tarixçə, bağlayan istifadəçi, tarixçə qorunur |
| İŞİ YENİDƏN AÇ | Yox idi | ReopenRecord: tarix, istifadəçi, səbəb daimi tarixçəyə yazılır |

## 1. AUDİTƏ GÖTÜR

**Backend əlavələri:**
- `PCACase.auditorId`, `auditorDisplayName`
- `PCACase.auditStartedAt`, `auditExpectedCompletionAt`
- `PCACase.auditProgressPct`
- `PCACase.history: AuditHistoryEntry[]`

**Aksiya:** `takeForAudit(caseId, actor, { notes, expectedCompletionAt })`
- ✅ Audit record yaradır
- ✅ Auditor təyin edir
- ✅ Status → `In Review` (Audit Yoxlamasında)
- ✅ Bildiriş yaradır (şirkət + supervisor)
- ✅ Sistem jurnalına yazır
- ✅ Auditor, timeline, progress %, başlama tarixi, gözlənilən bitmə tarixi, qeydlər saxlanılır

## 2. TAPINTI AÇ

**Backend əlavələri:**
- `PCAFinding.legalBasis`
- `PCAFinding.explanationRequested`, `explanationRequestedAt`
- `PCAFinding.investigationStartedAt`

**Aksiya:** `openFindingWithWorkflow(input, actor)`
- ✅ Tapıntı yaradır
- ✅ Pozuntu (violation) qeydiyyatı (kateqoriya + hüquqi əsas məcburidir)
- ✅ Şərti olaraq izahat tələbi göndərir
- ✅ Araşdırma workflow-u başlayır (`investigationStartedAt`)
- ✅ Bildirişlər (şirkət)
- ✅ Sistem jurnalına yazır

## 3. CƏRİMƏ TƏTBİQ ET

**Backend əlavələri:**
- `PenaltyRecord` — ayrı business obyekt
- Sahələr: `reason`, `legalBasis`, `amount`, `currency`, `dueDate`, `comments`, `status`

**Aksiya:** `applyPenalty(input, actor)`
- ✅ Tapıntı yaratmaqdan ayrı workflow
- ✅ Səbəb, hüquqi əsas, məbləğ, son ödəniş tarixi, şərhlər TƏLƏB OLUNUR
- ✅ Penalty record yaradır
- ✅ Workflow status → `Penalty Applied`
- ✅ Bildirişlər (şirkət + supervisor)
- ✅ Sistem jurnalı

## 4. ESKALƏ ET

**Backend əlavələri:**
- `EscalationRecord` — ayrı business obyekt
- `EscalationLevel`: Departament | BaşDirektor | NazirlerKabineti | HüquqMühafizə

**Aksiya:** `escalateCase(input, actor)`
- ✅ Eskaləsiya record yaradır
- ✅ Yuxarı səlahiyyətli orqan təyin edir (avto: Departament → şöbə rəisi, BaşDirektor → boss)
- ✅ Status → `Escalated`
- ✅ Timeline yaradır (audit history)
- ✅ Bildirişlər (assignedTo + şirkət)
- ✅ Eskaləsiya tarixçəsi UI-da göstərilir

## 5. İŞİ BAĞLA

**Aksiya:** `closePCACase(caseId, actor, reason)`
- ✅ Status → `Closed` (Bağlanmış)
- ✅ İş accessible qalır (history saxlanılır)
- ✅ Reopen / reassign / add note / view history bütün UI-da
- ✅ Səbəb məcburidir
- ✅ Audit jurnalı

## İŞİN YENİDƏN AÇILMASI

**Aksiya:** `reopenPCACase(caseId, actor, reason)`
- ✅ Yalnız `Closed` işdən mümkündür
- ✅ Status → `In Review`
- ✅ `ReopenRecord` yaradır — istifadəçi, tarix, səbəb
- ✅ `reopenHistory` array-də toplanır və UI-da cədvəl şəklində göstərilir
- ✅ Audit jurnalına yazılır

## Daha əvvəl mövcud olmayan workflowlar (yenidən qurulmuş)

1. **İzahat Workflow** — `requestExplanation(findingId, actor, message)` finding-ə bağlı izahat tələbi
2. **Audit Notes** — `addCaseNote(caseId, note, actor)` tam tarixçə ilə
3. **Auditor reassignment** — `reassignCaseAuditor(caseId, auditorId, actor)` audit zəncirini saxlayır
4. **İnspector deadline** — 2 iş günü qaydası `changeStatus()` daxilində avtomatik tətbiq olunur

## Boşluq qalmayan sahələr

| Tələb | Vəziyyət |
|-------|----------|
| Audit record + auditor + status + bildiriş + tarixçə | ✅ Bağlandı |
| Tapıntı + pozuntu + izahat + araşdırma + bildirişlər | ✅ Bağlandı |
| Cərimə workflow (səbəb, hüquqi əsas, məbləğ, son tarix, şərhlər) | ✅ Bağlandı |
| Eskaləsiya record + yuxarı orqan + timeline + bildirişlər | ✅ Bağlandı |
| İşi bağla + reopen + reassign + history | ✅ Bağlandı |
| Inspector 2-day deadline | ✅ Tətbiq edildi |
| Düzəliş workflow (correction → review → resubmission) | ✅ Mövcuddur (artırılıb) |
| FindingType label mapping | ✅ Yeni 7-kateqoriyalı enum |
| Mandatory access (User, Inspector, DepartmentHead, Boss, PCA) | ✅ Tətbiq edildi |
| visibleTo / Kim Baxa Bilər tam silinib | ✅ Silinib |
