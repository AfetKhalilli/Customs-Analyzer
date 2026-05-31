# Consistency Report — PCA Customs Audit Platform

**Hesabat tarixi:** 2026-05-31

## Mərkəzləşdirilmiş Sözlük

Bütün lokallaşdırma `src/lib/i18n.ts`-də yerləşir. Bu fayl artıq aşağıdakı modullar tərəfindən istifadə edilir:

- `src/components/ui/Primitives.tsx` — bütün badge komponentləri
- `src/pages/shared/DeclarationDetail.tsx` — bəyannamə detallarında
- `src/pages/shared/DeclarationsList.tsx` — filtrlər
- `src/pages/shared/LogsPage.tsx` — sistem jurnalı
- `src/pages/inspector/InspectorDashboard.tsx` — yoxlama deadline
- `src/pages/pca/PCADashboard.tsx` — KPI və cədvəl
- `src/pages/pca/FindingsPage.tsx` — yeni 7-kateqoriyalı pozuntu növü
- `src/pages/pca/AnomaliesPage.tsx` — anomaliya patternləri
- `src/pages/pca/AuditTimeline.tsx` — audit tarixçəsi
- `src/pages/pca/Company360.tsx` — şirkət 360°
- `src/pages/pca/WatchlistPage.tsx` — izləmə siyahısı
- `src/pages/pca/PCACompaniesPage.tsx` — şirkətlər
- `src/store/dataStore.ts` — workflow aksiyaları
- `src/data/seed.ts` — seed məlumatları

## Standartlaşdırılmış Terminologiya

| Konsept | Standart termin (AZ) | Bütün UI-da istifadə? |
|---------|----------------------|------------------------|
| İstifadəçi rolu | "İstifadəçi", "Müfəttiş", "Şöbə Rəisi", "Baş Direktor", "PCA Auditoru" | ✅ |
| Bəyannamə statusu | "Təqdim Edilib", "Audit Yoxlamasında", "Düzəliş Tələb Edilir", "Təsdiq Edilib", "Rədd Edilib", "Bağlanmış" | ✅ |
| Audit iş statusu | "Gözləmədə", "Audit Yoxlamasında", "Təsdiq Edilib", "Cərimə Tətbiq Edilib", "Eskaləsiya Edilib", "Bağlanmış" | ✅ |
| Risk səviyyəsi | "Aşağı Risk", "Orta Risk", "Yüksək Risk", "Kritik Risk" | ✅ |
| Seçicilik dəhlizi | "Yaşıl Dəhliz", "Sarı Dəhliz", "Qırmızı Dəhliz" | ✅ |
| Eskaləsiya səviyyəsi | "Şöbə Rəhbərliyinə", "Baş Direktorluğa", "Nazirlər Kabinetinə", "Hüquq Mühafizə Orqanlarına" | ✅ |

## Aradan Qaldırılan Düzəldicilər

| Yer | Əvvəl | Sonra |
|-----|-------|-------|
| `RoleChip` | "PCA Auditor" | "PCA Auditoru" |
| `StatusBadge` | raw enum (Yüklənib, Yoxlanılır, ...) | localized (Təqdim Edilib, Audit Yoxlamasında, ...) |
| `PCAStatusBadge` | İngilis dilində (Pending, In Review, ...) | Azərbaycan dilində (Gözləmədə, Audit Yoxlamasında, ...) |
| FindingCategory | 5 köhnə kateqoriya | 7 yeni rəsmi pozuntu növü |
| Anomaliya filtrləri | pattern code raw | localized (Təkrarlanan Yüksək Risk, ...) |
| Log Page action filter | qısa AZ tərcümələr (LogsPage daxilində duplikat) | i18n.LOG_ACTION_LABEL ilə vahid |
| Channel Pill | "YAŞIL/SARI/QIRMIZI" | "Yaşıl Dəhliz/Sarı Dəhliz/Qırmızı Dəhliz" |

## Verilənlər Bazası vs UI Ayrılması

| Sahə | Backend storage | UI display |
|------|-----------------|------------|
| `PCAStatus` | `Pending`, `In Review`, ... | `PCA_STATUS_LABEL[status]` |
| `DeclarationStatus` | enum unchanged | `DECLARATION_STATUS_LABEL[status]` |
| `RiskLevel` | `LOW/MEDIUM/HIGH/CRITICAL` | `RISK_LEVEL_LABEL[level]` |
| `EscalationLevel` | `Departament/BaşDirektor/NazirlerKabineti/HüquqMühafizə` | `ESCALATION_LEVEL_LABEL[level]` |
| `LogAction` | enum unchanged | `LOG_ACTION_LABEL[action]` |
| `AnomalyPattern` | enum unchanged | `ANOMALY_PATTERN_LABEL[pattern]` |
| `FindingCategory` | yeni rəsmi terminologiya (storage = display) | bu eyni dəyər istifadə olunur |

## Backend Kontraktları Saxlanılıb

- ✅ `Declaration` schema field adları dəyişdirilmədi
- ✅ `PCACase` field adları dəyişdirilmədi (yalnız yeni sahələr əlavə edildi)
- ✅ `PCAStatus` enum dəyərləri eynidir (`Pending`, `In Review`, `Approved`, `Penalty Applied`, `Escalated`, `Closed`)
- ✅ `RiskLevel` enum dəyişdirilmədi
- ✅ `DeclarationStatus` enum dəyərləri eynidir (lakin UI etiketləri yeniləndi)
- ✅ `LogAction` enum genişləndirildi (qoruyucu addition, mövcud dəyərlər silinmədi)

## Qalmayan İnkonsistensiyalar

| Mövzu | Vəziyyət |
|-------|----------|
| Raw enum dəyərinin UI-da göstərilməsi | ❌ Yox (i18n hər yerdə tətbiq olunur) |
| İngilis dilində UI mətni | ❌ Yox |
| visibleTo / "Kim Baxa Bilər" UI | ❌ Tam silinib |
| Düzəliş tələbi terminologiyası | "Düzəliş Tələb Edilir" — vahid |
| Iş bağlanması termini | "Bağlanmış" — vahid |
| `Audit Yoxlamasında` terminoloji uzlaşma | Decl + PCA statusları üçün ortaq |
