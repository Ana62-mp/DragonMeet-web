import { create } from 'zustand';

export type ToastKind = 'success' | 'error';
type Toast = { id: number; kind: ToastKind; text: string };

const LIFETIME_MS = 3800;
let nextId = 1;

export const useToasts = create<{ items: Toast[]; dismiss: (id: number) => void }>(set => ({
  items: [],
  dismiss: id => set(s => ({ items: s.items.filter(t => t.id !== id) })),
}));

function push(kind: ToastKind, text: string) {
  const id = nextId++;
  useToasts.setState(s => ({ items: [...s.items.slice(-2), { id, kind, text }] }));
  setTimeout(() => useToasts.getState().dismiss(id), LIFETIME_MS);
}

export const toast = {
  success: (text: string) => push('success', text),
  error: (text: string) => push('error', text),
};
