import create from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  clearAuth: () => set({ token: null, user: null }),
}));
