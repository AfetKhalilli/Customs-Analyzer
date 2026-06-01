import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser, IndividualUser, CompanyUser, Role } from '../types';
import { useDataStore } from './dataStore';

interface AuthState {
  currentUserId: string | null;
  rememberMe: boolean;
  initialized: boolean;
  init: () => void;
  // allowedRoles: portal isolation guard. When provided, login is REJECTED
  // (no session created) if the matched account's role is not in the list.
  login: (identifier: string, password: string, rememberMe?: boolean, allowedRoles?: Role[]) => { ok: boolean; error?: string; userId?: string };
  logout: () => void;
  register: (user: AppUser) => { ok: boolean; error?: string };
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  updateProfile: (patch: Partial<AppUser>) => void;

  // Forgot-password flow (demo / no email gateway).
  // 1) requestPasswordReset(identifier, email) verifies the pair and returns a
  //    short reset token bound to the user. In production this would email a
  //    link; here we surface it directly to the UI for the demo.
  // 2) resetPassword(token, newPassword) consumes the token and rewrites the
  //    password. Tokens are single-use and expire after 30 minutes.
  requestPasswordReset: (identifier: string, email: string, allowedRoles?: Role[]) => { ok: boolean; error?: string; token?: string };
  resetPassword: (token: string, newPassword: string) => { ok: boolean; error?: string };
}

interface ResetTicket {
  userId: string;
  token: string;
  expiresAt: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      rememberMe: false,
      initialized: false,
      init: () => set({ initialized: true }),

      login: (identifier, password, rememberMe = false, allowedRoles) => {
        const users = useDataStore.getState().users;
        const isTin = /^\d{10}$/.test(identifier);
        const idUpper = identifier.toUpperCase();

        const found = users.find((u) => {
          if (u.entityType === 'individual') return (u as IndividualUser).fin.toUpperCase() === idUpper;
          if (u.entityType === 'company') return (u as CompanyUser).tin === identifier;
          return false;
        });

        if (!found) return { ok: false, error: isTin ? 'Bu VÖEN ilə istifadəçi tapılmadı' : 'Bu FIN ilə istifadəçi tapılmadı' };
        if (found.password !== password) return { ok: false, error: 'Şifrə yanlışdır' };
        if (found.status === 'suspended') return { ok: false, error: 'Hesabınız müvəqqəti dayandırılıb' };

        // ── PORTAL ISOLATION ───────────────────────────────────────────────
        // Role is verified BEFORE a session is created. A valid credential for
        // the wrong portal is rejected outright — no currentUserId is set, so
        // there is no way to be redirected into the other portal.
        if (allowedRoles && !allowedRoles.includes(found.role)) {
          const error = found.role === 'user'
            ? 'Bu istifadəçi hesabıdır. İstifadəçi Portalından (/portal) daxil olun.'
            : 'Bu əməkdaş hesabıdır. Əməkdaş Portalından (/admin) daxil olun.';
          return { ok: false, error };
        }

        set({ currentUserId: found.id, rememberMe });
        return { ok: true, userId: found.id };
      },

      logout: () => set({ currentUserId: null, rememberMe: false }),

      register: (user) => {
        const users = useDataStore.getState().users;
        if (user.entityType === 'individual') {
          if (users.some((u) => u.entityType === 'individual' && (u as IndividualUser).fin === user.fin)) {
            return { ok: false, error: 'Bu FIN artıq qeydiyyatdadır' };
          }
          if (users.some((u) => u.email === user.email)) {
            return { ok: false, error: 'Bu e-poçt artıq qeydiyyatdadır' };
          }
        } else {
          if (users.some((u) => u.entityType === 'company' && (u as CompanyUser).tin === user.tin)) {
            return { ok: false, error: 'Bu VÖEN artıq qeydiyyatdadır' };
          }
          if (users.some((u) => u.email === user.email)) {
            return { ok: false, error: 'Bu e-poçt artıq qeydiyyatdadır' };
          }
        }
        useDataStore.getState().addUser(user);
        set({ currentUserId: user.id });
        return { ok: true };
      },

      changePassword: (current, next) => {
        const id = get().currentUserId;
        if (!id) return { ok: false, error: 'Daxil olun' };
        const user = useDataStore.getState().users.find((u) => u.id === id);
        if (!user) return { ok: false, error: 'İstifadəçi tapılmadı' };
        if (user.password !== current) return { ok: false, error: 'Cari şifrə yanlışdır' };
        if (current === next) return { ok: false, error: 'Yeni şifrə cari şifrə ilə eyni olmamalıdır' };
        useDataStore.getState().updateUser(id, { password: next });
        return { ok: true };
      },

      requestPasswordReset: (identifier, email, allowedRoles) => {
        const users = useDataStore.getState().users;
        const id = identifier.trim();
        const idUpper = id.toUpperCase();
        const cleanEmail = email.trim().toLowerCase();
        const user = users.find((u) => {
          if (u.entityType === 'individual') {
            return (u as IndividualUser).fin.toUpperCase() === idUpper && u.email.toLowerCase() === cleanEmail;
          }
          return (u as CompanyUser).tin === id && u.email.toLowerCase() === cleanEmail;
        });
        // Portal isolation: an account from the wrong portal is treated exactly
        // like "not found" — same generic message, so neither portal can be
        // used to probe whether an account exists in the other.
        if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
          // Generic message — do not leak which field was wrong (prevents
          // identifier/email enumeration via the reset endpoint).
          return { ok: false, error: 'FİN/VÖEN və e-poçt cütü tapılmadı' };
        }
        if (user.status === 'suspended') {
          return { ok: false, error: 'Hesabınız dayandırılıb. Administratora müraciət edin.' };
        }
        const token = `RST_${user.id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const ticket: ResetTicket = { userId: user.id, token, expiresAt: Date.now() + 30 * 60 * 1000 };
        try {
          const all: ResetTicket[] = JSON.parse(sessionStorage.getItem('ca-reset-tickets') || '[]');
          // drop tickets older than 30 min on every write
          const fresh = all.filter((t) => t.expiresAt > Date.now() && t.userId !== user.id);
          fresh.push(ticket);
          sessionStorage.setItem('ca-reset-tickets', JSON.stringify(fresh));
        } catch { /* sessionStorage may be unavailable in SSR — demo only */ }
        return { ok: true, token };
      },

      resetPassword: (token, newPassword) => {
        if (!token) return { ok: false, error: 'Token tələb olunur' };
        let tickets: ResetTicket[] = [];
        try { tickets = JSON.parse(sessionStorage.getItem('ca-reset-tickets') || '[]'); } catch { /* ignore */ }
        const ticket = tickets.find((t) => t.token === token);
        if (!ticket) return { ok: false, error: 'Token tapılmadı və ya artıq istifadə edilib' };
        if (ticket.expiresAt < Date.now()) {
          return { ok: false, error: 'Tokenin müddəti bitib (30 dəqiqə). Yenidən sorğu göndərin.' };
        }
        const user = useDataStore.getState().users.find((u) => u.id === ticket.userId);
        if (!user) return { ok: false, error: 'İstifadəçi tapılmadı' };
        if (user.password === newPassword) return { ok: false, error: 'Yeni şifrə cari şifrə ilə eyni olmamalıdır' };
        // password strength gate — same rule as schemas.changePasswordSchema
        if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
          return { ok: false, error: 'Şifrə ən azı 8 simvol, bir hərf və bir rəqəm olmalıdır' };
        }
        useDataStore.getState().updateUser(ticket.userId, { password: newPassword });
        // consume token
        try {
          const remaining = tickets.filter((t) => t.token !== token);
          sessionStorage.setItem('ca-reset-tickets', JSON.stringify(remaining));
        } catch { /* ignore */ }
        return { ok: true };
      },

      updateProfile: (patch) => {
        const id = get().currentUserId;
        if (!id) return;
        useDataStore.getState().updateUser(id, patch);
      },
    }),
    { name: 'ca-auth' }
  )
);

export function useCurrentUser(): AppUser | null {
  const id = useAuthStore((s) => s.currentUserId);
  const users = useDataStore((s) => s.users);
  return id ? users.find((u) => u.id === id) ?? null : null;
}

export function useRole() {
  const u = useCurrentUser();
  return u?.role ?? null;
}
