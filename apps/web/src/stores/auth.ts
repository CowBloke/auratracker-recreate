import type { SessionUser } from '@aura/contracts';
import { create } from 'zustand';
import { ApiClientError, api, unwrap } from '../lib/api';

type Phase = 'loading' | 'authed' | 'guest';

interface AuthState {
  phase: Phase;
  user: SessionUser | null;
  /** Fetch the current session user (call on boot). */
  refresh: () => Promise<void>;
  setUser: (user: SessionUser) => void;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  phase: 'loading',
  user: null,
  refresh: async () => {
    try {
      const me = unwrap(await api.auth.me());
      set({ user: me, phase: 'authed' });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        set({ user: null, phase: 'guest' });
      } else {
        set({ user: null, phase: 'guest' });
      }
    }
  },
  setUser: (user) => set({ user, phase: 'authed' }),
  logout: async () => {
    try {
      await api.auth.logout({ body: {} });
    } finally {
      set({ user: null, phase: 'guest' });
    }
  },
}));

/** Update just the balances on the cached session user (after a reward/transfer). */
export function patchBalances(balances: { money: number; aura: number }) {
  const { user, setUser } = useAuth.getState();
  if (user) setUser({ ...user, balances });
}
