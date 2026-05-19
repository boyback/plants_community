'use client';

import { Toaster as HotToaster, toast as hotToast, useToaster as useHotToaster } from 'react-hot-toast';

export const ToastProvider = HotToaster;

export const toast = {
  success: (message: string) => hotToast.success(message),
  error: (message: string) => hotToast.error(message),
  loading: (message: string) => hotToast.loading(message),
  dismiss: (id?: string) => hotToast.dismiss(id),
};

export { hotToast };

export function useToast() {
  const { toasts, handlers } = useHotToaster();

  return {
    toasts: toasts.map((t) => ({
      id: t.id,
      message: typeof t.message === 'string' ? t.message : '',
      type: (t.type === 'success' ? 'success' : t.type === 'error' ? 'error' : 'info') as 'success' | 'error' | 'info',
    })),
    removeToast: handlers.removeToast,
  };
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  if (type === 'error') {
    hotToast.error(message);
  } else {
    hotToast.success(message);
  }
}