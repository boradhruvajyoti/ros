'use client';

import * as React from 'react';
import type { ToastProps } from '@/components/ui/toast';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

type ToastT = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
};

type State = { toasts: ToastT[] };

let count = 0;
function genId() { return `toast-${++count}`; }

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(state: State) {
  memoryState = state;
  listeners.forEach((l) => l(state));
}

export function toast(props: Omit<ToastT, 'id'>) {
  const id = genId();
  const update = (p: ToastT) => dispatch({
    toasts: memoryState.toasts.map((t) => (t.id === id ? { ...t, ...p } : t)),
  });
  const dismiss = () => dispatch({
    toasts: memoryState.toasts.filter((t) => t.id !== id),
  });

  dispatch({
    toasts: [
      { ...props, id, open: true, onOpenChange: (open: boolean) => { if (!open) dismiss(); } },
      ...memoryState.toasts,
    ].slice(0, TOAST_LIMIT),
  });

  setTimeout(dismiss, TOAST_REMOVE_DELAY);
  return { id, update, dismiss };
}

toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: 'success' as any });
toast.info = (title: string, description?: string) =>
  toast({ title, description });
toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: 'destructive' as any });
toast.warning = (title: string, description?: string) =>
  toast({ title, description, variant: 'warning' as any });

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => { const i = listeners.indexOf(setState); listeners.splice(i, 1); };
  }, []);
  return { ...state, toast, dismiss: (id: string) =>
    dispatch({ toasts: memoryState.toasts.filter((t) => t.id !== id) }) };
}
