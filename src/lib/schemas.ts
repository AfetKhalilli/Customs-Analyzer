import { z } from 'zod';

const nameRegex = /^[A-Za-zçğşöüəıİÇĞŞÖÜƏ\s'’-]+$/;
const finRegex = /^[A-Z0-9]{7}$/;
const tinRegex = /^\d{10}$/;
const phoneRegex = /^\+994\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;
const passportRegex = /^[A-Z]{2}\d{7}$/;
// HS codes can be 4 / 6 / 8 / 10 digit per Azerbaijan customs nomenclature,
// expressed with or without dots. Both "8517.12" and "8517120000" are valid;
// they're canonicalized centrally by lookupHs() in src/lib/hsCodes.ts.
const hsCodeRegex = /^\d{4}(\.\d{2}){0,3}$|^\d{6}$|^\d{8}$|^\d{10}$/;

// Rejects strings that are only symbols / whitespace / repetition like @@@ ### $$$
const junkText = (v: string): boolean => {
  const s = v.trim();
  if (!s) return false;
  // must contain at least one letter (latin/azərbaycan) or digit
  if (!/[A-Za-zçğşöüəıİÇĞŞÖÜƏ0-9]/.test(s)) return false;
  // reject if >40% of chars are non-alphanumeric symbols (excluding spaces/.,-/'’)
  const symbols = (s.match(/[^A-Za-zçğşöüəıİÇĞŞÖÜƏ0-9\s.,'’\-/]/g) || []).length;
  if (symbols / s.length > 0.4) return false;
  return true;
};

const notJunk = (msg = 'Düzgün dəyər daxil edin') =>
  z.string().refine(junkText, { message: msg });

export const individualStep1Schema = z.object({
  firstName: z.string().min(2, 'Ən azı 2 simvol').max(50).regex(nameRegex, 'Yalnız hərflər'),
  lastName: z.string().min(2, 'Ən azı 2 simvol').max(50).regex(nameRegex),
  fatherName: z.string().min(2, 'Ən azı 2 simvol').max(50).regex(nameRegex),
  fin: z.string().regex(finRegex, 'FIN düz 7 simvol (A-Z və 0-9)'),
  dateOfBirth: z.string().refine((v) => {
    if (!v) return false;
    const d = new Date(v);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const age = now.getFullYear() - d.getFullYear();
    return age >= 18 && age <= 100;
  }, 'Yaş 18–100 arası olmalıdır'),
  gender: z.enum(['Kişi', 'Qadın']),
  citizenship: z.string().min(2, 'Vətəndaşlıq seçin'),
  passportNumber: z.string().regex(passportRegex, 'Format: AA1234567').optional().or(z.literal('')),
});

export const individualStep2Schema = z
  .object({
    phone: z.string().regex(phoneRegex, 'Format: +994 XX XXX XX XX'),
    email: z.string().email('Düzgün e-poçt'),
    addressCity: z.string().min(1, 'Şəhər seçin'),
    addressLine: z.string().min(5, 'Ən azı 5 simvol').max(200),
    postalCode: z.string().regex(/^\d{4}$/, '4 rəqəm').optional().or(z.literal('')),
    password: z.string().min(8, 'Ən azı 8 simvol').regex(/[A-Za-z]/, 'Hərf tələb olunur').regex(/\d/, 'Rəqəm tələb olunur'),
    passwordConfirm: z.string(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'İstifadə şərtlərini qəbul edin' }) }),
    acceptPrivacy: z.literal(true, { errorMap: () => ({ message: 'Məxfilik siyasətini qəbul edin' }) }),
  })
  .refine((d) => d.password === d.passwordConfirm, { message: 'Şifrələr uyğun deyil', path: ['passwordConfirm'] });

export const companyStep1Schema = z
  .object({
    companyName: z.string().min(3, 'Ən azı 3 simvol').max(200),
    companyShortName: z.string().max(50).optional().or(z.literal('')),
    tin: z.string().regex(tinRegex, 'VÖEN düz 10 rəqəm'),
    registrationNumber: z.string().min(8, '8–15 simvol').max(15).regex(/^[A-Za-z0-9]+$/, 'Yalnız hərf və rəqəm'),
    legalForm: z.enum(['MMC', 'ASC', 'QSC', 'Fərdi Sahibkar', 'Digər']),
    registrationDate: z.string().refine((v) => v && new Date(v) < new Date(), { message: 'Tarix keçmişdə olmalıdır' }),
    activityField: z.string().min(1, 'Fəaliyyət sahəsi seçin'),
    legalAddressCity: z.string().min(1, 'Şəhər seçin'),
    legalAddressLine: z.string().min(5, 'Ən azı 5 simvol').max(200),
    actualAddressSame: z.boolean(),
    actualAddressCity: z.string().optional(),
    actualAddressLine: z.string().optional(),
  })
  .refine(
    (d) => {
      if (!d.actualAddressSame) {
        return !!d.actualAddressCity && !!d.actualAddressLine && (d.actualAddressLine?.length ?? 0) >= 5;
      }
      return true;
    },
    { message: 'Faktiki ünvanı doldurun', path: ['actualAddressLine'] }
  );

export const companyStep2Schema = z.object({
  responsibleFirstName: z.string().min(2, 'Ən azı 2 simvol').max(50),
  responsibleLastName: z.string().min(2, 'Ən azı 2 simvol').max(50),
  responsibleFatherName: z.string().min(2, 'Ən azı 2 simvol').max(50),
  responsiblePosition: z.string().min(1, 'Vəzifə seçin'),
  responsibleFin: z.string().regex(finRegex, 'FIN düz 7 simvol'),
  responsiblePhone: z.string().regex(phoneRegex, 'Format: +994 XX XXX XX XX'),
  responsibleEmail: z.string().email('Düzgün e-poçt'),
});

export const companyStep3Schema = z
  .object({
    companyEmail: z.string().email('Düzgün e-poçt'),
    companyPhone: z.string().regex(phoneRegex, 'Format: +994 XX XXX XX XX'),
    website: z.string().url('Düzgün URL').optional().or(z.literal('')),
    password: z.string().min(8, 'Ən azı 8 simvol').regex(/[A-Za-z]/, 'Hərf tələb olunur').regex(/\d/, 'Rəqəm tələb olunur'),
    passwordConfirm: z.string(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'İstifadə şərtlərini qəbul edin' }) }),
    acceptPrivacy: z.literal(true, { errorMap: () => ({ message: 'Məxfilik siyasətini qəbul edin' }) }),
  })
  .refine((d) => d.password === d.passwordConfirm, { message: 'Şifrələr uyğun deyil', path: ['passwordConfirm'] });

export const loginSchema = z.object({
  loginIdentifier: z
    .string()
    .min(1, 'FIN və ya VÖEN daxil edin')
    .refine((v) => /^[A-Za-z0-9]{7}$/.test(v) || /^\d{10}$/.test(v), 'FIN (7 simvol) və ya VÖEN (10 rəqəm)'),
  password: z.string().min(1, 'Şifrə daxil edin'),
  rememberMe: z.boolean().optional(),
});

// Staff portal (/admin/login): FIN only — VÖEN is never used for staff login.
// Same shape as loginSchema (so the shared LoginPage form is reused unchanged),
// but the identifier is constrained to a 7-character FIN.
export const staffLoginSchema = z.object({
  loginIdentifier: z
    .string()
    .min(1, 'FİN daxil edin')
    .regex(/^[A-Za-z0-9]{7}$/, 'FİN düz 7 simvol (A-Z və 0-9)'),
  password: z.string().min(1, 'Şifrə daxil edin'),
  rememberMe: z.boolean().optional(),
});

export const declStep1Schema = z.object({
  kind: z.enum(['Idxal', 'Ixrac', 'Tranzit']),
  department: z.string().min(1, 'Şöbə seçin'),
  declarationDate: z.string().refine((v) => v && new Date(v) <= new Date(), { message: 'Tarix gələcəkdə ola bilməz' }),
  customsPoint: z.string().min(1, 'Gömrük postu seçin'),
  referenceNumber: z.string().max(50).optional().or(z.literal('')),
});

export const declStep3Schema = z
  .object({
    originCountry: z.string().min(1, 'Mənşə ölkəsini seçin'),
    destinationCountry: z.string().min(1, 'Təyinat ölkəsini seçin'),
    transportMode: z.string().min(1, 'Nəqliyyat növünü seçin'),
    transportDocumentNumber: z.string().min(5, 'Ən azı 5 simvol').max(30).regex(/^[A-Za-z0-9/\-]+$/, 'Yalnız hərf, rəqəm, / və -'),
    consignor: z.string().min(3, 'Ən azı 3 simvol').max(200).refine(junkText, 'Düzgün ad daxil edin'),
    consignorAddress: z.string().min(5, 'Ən azı 5 simvol').refine(junkText, 'Düzgün ünvan daxil edin'),
    consignee: z.string().min(3, 'Ən azı 3 simvol').max(200).refine(junkText, 'Düzgün ad daxil edin'),
    consigneeAddress: z.string().min(5, 'Ən azı 5 simvol').refine(junkText, 'Düzgün ünvan daxil edin'),
    containerNumber: z.string().optional().or(z.literal('')),
    packageCount: z.coerce.number().int().positive('Müsbət tam ədəd'),
    grossWeightKg: z.coerce.number().positive('Müsbət rəqəm').max(1000000),
    netWeightKg: z.coerce.number().positive('Müsbət rəqəm'),
  })
  .refine((d) => d.netWeightKg <= d.grossWeightKg, { message: 'Netto ≤ Brutto olmalıdır', path: ['netWeightKg'] });

export const declStep4Schema = z.object({
  currency: z.string().min(1, 'Valyuta seçin'),
  totalDeclaredValue: z.coerce.number().positive('Müsbət rəqəm'),
  totalQuantity: z.coerce.number().positive('Müsbət rəqəm'),
  unitOfMeasure: z.string().min(1, 'Ölçü vahidi seçin'),
  // Cascading: goodsCategory drives goodsSubcategory; both mandatory.
  goodsCategory: z.string().min(1, 'Mal kateqoriyasını seçin'),
  goodsSubcategory: z.string().min(1, 'Alt kateqoriyanı seçin'),
  hsCode: z.string().regex(hsCodeRegex, 'HS kodu tələb olunur (4, 6, 8 və ya 10 rəqəm — məs: 8517.12)'),
  originCertificateNo: z.string().optional().or(z.literal('')),
  additionalNotes: z.string().max(1000).optional().or(z.literal('')),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Cari şifrə'),
    newPassword: z.string().min(8, 'Ən azı 8 simvol').regex(/[A-Za-z]/).regex(/\d/),
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, { message: 'Şifrələr uyğun deyil', path: ['newPasswordConfirm'] })
  .refine((d) => d.newPassword !== d.currentPassword, { message: 'Yeni şifrə cari şifrədən fərqli olmalıdır', path: ['newPassword'] });
