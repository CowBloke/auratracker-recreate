import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'aura';
  icon?: string; // lucide icon name
}

interface UiState {
  toasts: Toast[];
  online: number;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  setOnline: (n: number) => void;
}

export const useUi = create<UiState>((set) => ({
  toasts: [],
  online: 0,
  pushToast: (t) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  setOnline: (n) => set({ online: n }),
}));

export const toast = (t: Omit<Toast, 'id'>) => useUi.getState().pushToast(t);
