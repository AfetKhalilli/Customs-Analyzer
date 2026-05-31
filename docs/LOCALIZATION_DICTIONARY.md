# Localization Dictionary — PCA Customs Audit Platform

**Versiya:** 1.0 (2026-05-31)
**Mənbə fayl:** `src/lib/i18n.ts`

Bütün lokallaşdırma və terminologiya bir mərkəzdən idarə olunur. Backend enum dəyərləri (məs: `Pending`, `In Review`) saxlanılır; UI-da yalnız tərcümə göstərilir.

---

## 1. Rollar (`ROLE_LABEL`)

| Backend dəyər     | UI etiketi      |
|-------------------|-----------------|
| `user`            | İstifadəçi      |
| `inspector`       | Müfəttiş        |
| `departmentHead`  | Şöbə Rəisi      |
| `boss`            | Baş Direktor    |
| `pca`             | PCA Auditoru    |

## 2. Bəyannamə Statusları (`DECLARATION_STATUS_LABEL`)

| Backend dəyər            | UI etiketi              |
|--------------------------|-------------------------|
| `Yüklənib`               | Təqdim Edilib           |
| `Yoxlanılır`             | Audit Yoxlamasında      |
| `Düzəliş Tələb Olunur`   | **Düzəliş Tələb Edilir** |
| `Təsdiq`                 | Təsdiq Edilib           |
| `Rədd`                   | Rədd Edilib             |
| `Tamamlanmış`            | **Bağlanmış**           |

## 3. PCA Audit Statusları (`PCA_STATUS_LABEL`)

| Backend dəyər       | UI etiketi              |
|---------------------|-------------------------|
| `Pending`           | Gözləmədə               |
| `In Review`         | Audit Yoxlamasında      |
| `Approved`          | Təsdiq Edilib           |
| `Penalty Applied`   | Cərimə Tətbiq Edilib    |
| `Escalated`         | Eskaləsiya Edilib       |
| `Closed`            | Bağlanmış               |

## 4. Risk Səviyyələri

### AI Risk (`RISK_LEVEL_LABEL`)
| Backend | UI |
|---------|----|
| `LOW`      | Aşağı Risk |
| `MEDIUM`   | Orta Risk |
| `HIGH`     | Yüksək Risk |
| `CRITICAL` | Kritik Risk |

### PCA Risk Dərəcəsi (`PCA_RISK_BAND_LABEL`)
| Backend | UI |
|---------|----|
| `Aşağı`  | Aşağı Risk |
| `Orta`   | Orta Risk |
| `Yüksək` | Yüksək Risk |
| `Kritik` | Kritik Risk |

## 5. Seçicilik Dəhlizləri (`CHANNEL_LABEL`)

| Backend | UI |
|---------|----|
| `GREEN`  | Yaşıl Dəhliz |
| `YELLOW` | Sarı Dəhliz |
| `RED`    | Qırmızı Dəhliz |

## 6. Tapıntı Növləri (`FINDING_CATEGORY_LABEL`)

Yeni 7-kateqoriyalı enum (storage = display):

| Backend (yeni)                              | UI etiketi                              |
|---------------------------------------------|-----------------------------------------|
| `Gömrük Dəyərinin Təhrif Edilməsi`          | Gömrük Dəyərinin Təhrif Edilməsi        |
| `HS Kodunun Səhv Təsnifləşdirilməsi`        | HS Kodunun Səhv Təsnifləşdirilməsi      |
| `Mənşə Məlumatlarının Saxtalaşdırılması`    | Mənşə Məlumatlarının Saxtalaşdırılması  |
| `Sənəd Saxtakarlığı`                         | Sənəd Saxtakarlığı                      |
| `Gömrük Ödənişlərindən Yayınma`             | Gömrük Ödənişlərindən Yayınma           |
| `Gömrük Prosedurlarının Pozulması`          | Gömrük Prosedurlarının Pozulması        |
| `Digər Pozuntu`                              | Digər Pozuntu                           |

### Köhnə → Yeni Köç (legacy mapping)

| Köhnə dəyər           | Yeni dəyər                              |
|-----------------------|-----------------------------------------|
| `Aşağı qiymət`        | Gömrük Dəyərinin Təhrif Edilməsi        |
| `HS kodu səhvi`       | HS Kodunun Səhv Təsnifləşdirilməsi      |
| `Çəki uyğunsuzluğu`   | Gömrük Prosedurlarının Pozulması        |
| `Sənəd çatışmır`      | Sənəd Saxtakarlığı                      |
| `Digər`               | Digər Pozuntu                           |
| `Valuation Fraud`     | Gömrük Dəyərinin Təhrif Edilməsi        |
| `HS Misclassification`| HS Kodunun Səhv Təsnifləşdirilməsi      |
| `Origin Fraud`        | Mənşə Məlumatlarının Saxtalaşdırılması  |
| `Document Forgery`    | Sənəd Saxtakarlığı                      |
| `Duty Evasion`        | Gömrük Ödənişlərindən Yayınma           |
| `Procedural Violation`| Gömrük Prosedurlarının Pozulması        |
| `Other`               | Digər Pozuntu                           |

## 7. Tapıntı Statusu (`FINDING_STATUS_LABEL`)

| Backend  | UI |
|----------|----|
| `Açıq`    | Açıq Tapıntı |
| `İşlənir` | Araşdırılır |
| `Bağlı`   | Bağlanmış |
| `Əsassız` | Əsassız Sayılıb |

## 8. Eskaləsiya Səviyyələri (`ESCALATION_LEVEL_LABEL`)

| Backend             | UI |
|---------------------|----|
| `Departament`       | Şöbə Rəhbərliyinə |
| `BaşDirektor`       | Baş Direktorluğa |
| `NazirlerKabineti`  | Nazirlər Kabinetinə |
| `HüquqMühafizə`     | Hüquq Mühafizə Orqanlarına |

## 9. Audit Jurnalı Hadisələri (`LOG_ACTION_LABEL`)

| Backend                  | UI |
|--------------------------|----|
| `UPLOAD`                 | Bəyannamə təqdim edildi |
| `AI_RUN`                 | Süni intellekt risk qiymətləndirməsi aparıldı |
| `ASSIGNED`               | Müfəttiş təyinatı aparıldı |
| `STATUS_CHANGE`          | Status dəyişikliyi qeydə alındı |
| `COMMENT`                | Şərh əlavə edildi |
| `CORRECTION_REQUESTED`   | Düzəliş tələbi göndərildi |
| `RESUBMITTED`            | Yenidən təqdim edildi |
| `DECISION`               | Audit qərarı verildi |
| `AUTO_COMPLETED`         | Sistem tərəfindən avtomatik bağlandı |
| `REASSIGNED`             | Müfəttiş yenidən təyin olundu |
| `VIEWED_BY_PCA`          | PCA Auditoru tərəfindən baxış aparıldı |
| `FINDING_OPENED`         | Audit tapıntısı açıldı |
| `WATCHLIST_TOGGLE`       | İzləmə siyahısı yeniləndi |
| `AUDIT_STARTED`          | Audit prosesi başladı |
| `PENALTY_APPLIED`        | Cərimə tətbiq edildi |
| `CASE_ESCALATED`         | İş yuxarı orqana eskaləsiya edildi |
| `CASE_CLOSED`            | İş bağlandı |
| `CASE_REOPENED`          | İş yenidən açıldı |
| `INSPECTION_DEADLINE`    | Yoxlama müddəti qeydə alındı |
| `EXPLANATION_REQUESTED`  | İzahat tələb edildi |

## 10. Anomaliya Növləri (`ANOMALY_PATTERN_LABEL`)

| Backend                  | UI |
|--------------------------|----|
| `REPEATED_HIGH_RISK`     | Təkrarlanan Yüksək Risk |
| `UNDERVALUATION_PATTERN` | Sistematik Aşağı Qiymət |
| `HS_CODE_SWITCHING`      | HS Kodu Manipulyasiyası |
| `VALUE_SPIKE`            | Bəyan Dəyəri Sıçrayışı |
| `POST_REJECTION_APPROVAL`| Rəddən Sonra Təsdiq |

## 11. Yoxlama Qaydaları (`INSPECTION_RULES`)

- `MAX_INSPECTION_DAYS = 2` — maksimum yoxlama müddəti (iş günü)
- `calculateInspectionDeadline(startIso, days?)` — son tarix
- `formatInspectionDeadline(deadlineIso)` — saat saymalı, gecikmə bayrağı
