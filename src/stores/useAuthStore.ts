// stores/useAuthStore.ts
import { create } from 'zustand';

interface AuthState {
    email: string | null;
    permissions: Record<string, boolean>;
    setAuth: (email: string, permissions: Record<string, boolean>) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set: (arg0: { email: any; permissions: any; }) => any) => ({
    email: null,
    permissions: {},
    setAuth: (email: any, permissions: any) => set({ email, permissions }),
    clearAuth: () => set({ email: null, permissions: {} }),
}));
