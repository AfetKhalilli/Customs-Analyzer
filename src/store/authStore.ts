import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser, IndividualUser, CompanyUser } from '../types';
import { useDataStore } from './dataStore';

interface AuthState {
  currentUserId: string | null;
  rememberMe: boolean;
  initialized: boolean;
  init: () => void;
  login: (identifier: string, password: string, rememberMe?: boolean) => { ok: boolean; error?: string; userId?: string };
  logout: () => void;
  register: (user: AppUser) => { ok: boolean; error?: string };
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  updateProfile: (patch: Partial<AppUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      rememberMe: false,
      initialized: false,
      init: () => set({ initialized: true }),

      login: (identifier, password, rememberMe = false) => {
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
        useDataStore.getState().updateUser(id, { password: next });
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
