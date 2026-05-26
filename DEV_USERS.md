# Customs Analyzer — Dev Users

All accounts are seeded by `src/data/seed.ts` on first run (or on `version` bump in
`src/store/dataStore.ts`). Login identifier is **FIN** (individuals/staff) or **VÖEN**
(companies). FIN is case‑insensitive; VÖEN is 10 digits.

Persisted state lives in `localStorage` under key `ca-data`. Clear it (or bump
`version` in `dataStore.ts`) to reset.

---

## End users

| Role | Entity | Display name | FIN / VÖEN | Password |
|---|---|---|---|---|
| user | individual | Orxan Quliyev | `7CA8FB1` | `User1234` |
| user | individual | Günay Hüseynova | `5DE9AB2` | `User1234` |
| user | company | ABC Trading MMC | `1234567890` | `Company123` |
| user | company | Kiçik Şirkət MMC | `9876543210` | `Company123` |

---

## Inspectors (one per department)

All passwords: `Inspector123`.

| FIN | Name | Department |
|---|---|---|
| `INS1000` | Rəşad Əliyev | Qida |
| `INS1001` | Nigar Məmmədova | Tekstil |
| `INS1002` | Tural Hüseynov | Elektronika |
| `INS1003` | Aysel Quliyeva | Kimya |
| `INS1004` | Vüqar İsmayılov | Maşınqayırma |
| `INS1005` | Sevda Babayeva | Tibbi |
| `INS1006` | Elnur Cəfərov | Kosmetika |
| `INS1007` | Lalə Səfərova | Mebel |
| `INS1008` | Kamran Mehdiyev | Avtomobil |
| `INS1009` | Aynur Rzayeva | İnşaat |

---

## Department heads (one per department)

All passwords: `Depthead123`.

| FIN | Name | Department |
|---|---|---|
| `DH02000` | Murad Quliyev | Qida |
| `DH02001` | Fəridə Əliyeva | Tekstil |
| `DH02002` | Cavid Babayev | Elektronika |
| `DH02003` | Lamiyə Hüseynova | Kimya |
| `DH02004` | Səbuhi Məmmədov | Maşınqayırma |
| `DH02005` | Günay İbrahimova | Tibbi |
| `DH02006` | Rauf Nəsibov | Kosmetika |
| `DH02007` | Ülviyyə Hacıyeva | Mebel |
| `DH02008` | Nicat Salmanov | Avtomobil |
| `DH02009` | Şəbnəm Vəliyeva | İnşaat |

---

## Executives & audit

| Role | FIN | Name | Password |
|---|---|---|---|
| boss | `BOSS001` | Murad Allahverdiyev (Baş Direktor) | `Boss12345` |
| pca | `PCA0001` | Elçin Auditov (PCA Baş Auditoru) | `Pcaaudit123` |

---

## Permissions cheat-sheet

- **user** — create declarations, view own, comment.
- **inspector** — review assigned declarations, request correction, approve/reject.
- **departmentHead** — manage inspectors, override status transitions, see all dept declarations.
- **boss** — system-wide admin: staff, departments, thresholds, override anything.
- **pca** — read-only post-clearance audit access (declarations + companies + anomalies + findings).
